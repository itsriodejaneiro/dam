// The top a home starts with: the phrase per locale, with or without the deploy's name, and
// the boot that writes it once into an empty top.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type PocketBase from 'pocketbase';
import { defaultTop, isTopEmpty, seedHomeTop } from './home-top';
import type { Page } from '../types/page';

const named = { name: { en: 'Exampleland', fr: 'Exemplie' }, locales: ['en', 'fr', 'pt'], defaultLocale: 'en' };

describe('defaultTop', () => {
	test('the name goes in italics in the title and plain in the lede, per locale', () => {
		const top = defaultTop(named);
		assert.equal(
			top.title.en,
			'<p>Digital Assets Map<br>of the digital infrastructure of <em>Exampleland</em>.</p>'
		);
		assert.equal(
			top.lede.en,
			'Mapping the ecosystem of identity, credentials, information systems and public services of the State of Exampleland.'
		);
		assert.equal(top.title.fr, "<p>Digital Assets Map<br>de l'infrastructure numérique de <em>Exemplie</em>.</p>");
		assert.match(top.lede.fr, /de l'État de Exemplie\.$/);
	});

	test('a locale with no name of its own takes the default locale\'s', () => {
		const top = defaultTop(named);
		assert.equal(top.title.pt, '<p>Digital Assets Map<br>da infraestrutura digital de <em>Exampleland</em>.</p>');
		assert.match(top.lede.pt, /do Estado de Exampleland\.$/);
	});

	test('only the deploy\'s locales are written', () => {
		assert.deepEqual(Object.keys(defaultTop(named).title), ['en', 'fr', 'pt']);
		assert.deepEqual(Object.keys(defaultTop({ ...named, locales: ['es'] }).lede), ['es']);
	});

	test('a deploy with no name of its own, blank or the product\'s, gets the phrase without it', () => {
		const unnamed: Record<string, string>[] = [{}, { en: '  ' }, { en: 'Digital Assets Map' }];
		for (const name of unnamed) {
			const top = defaultTop({ name, locales: ['en', 'es'], defaultLocale: 'en' });
			assert.equal(top.title.en, '<p>Digital Assets Map<br>of the digital infrastructure.</p>');
			assert.equal(top.lede.en, 'Mapping the ecosystem of identity, credentials, information systems and public services.');
			assert.equal(top.title.es, '<p>Digital Assets Map<br>de la infraestructura digital.</p>');
			assert.equal(top.lede.es, 'Mapeo del ecosistema de identidad, credenciales, sistemas de información y servicios públicos.');
		}
	});

	test('a name is text inside the title\'s HTML', () => {
		const top = defaultTop({ name: { en: 'A <b>& B' }, locales: ['en'], defaultLocale: 'en' });
		assert.equal(top.title.en, '<p>Digital Assets Map<br>of the digital infrastructure of <em>A &lt;b&gt;&amp; B</em>.</p>');
		assert.match(top.lede.en, /of A <b>& B\.$/);
	});
});

/** A PocketBase with the settings record and the writes to `pages`. */
function fake(settings: Record<string, unknown> | null) {
	const updates: { id: string; data: Record<string, unknown> }[] = [];
	const pb = {
		collection(name: string) {
			return {
				async getFirstListItem() {
					if (name === 'settings' && settings) return settings;
					throw Object.assign(new Error('not found'), { status: 404 });
				},
				async update(id: string, data: Record<string, unknown>) {
					updates.push({ id, data });
				}
			};
		}
	} as unknown as PocketBase;
	return { pb, updates };
}

const home = (fields: Partial<Page>): Page =>
	({ id: 'h1', slug: 'home', title: null, lede: null, blocks: [], published: null, images: [], ...fields }) as Page;

const record = { name: { en: 'Exampleland' }, locales: ['en', 'fr'], default_locale: 'en' };

describe('seedHomeTop', () => {
	test('an empty top gets the default in the deploy\'s locales, and the log says so', async () => {
		const { pb, updates } = fake(record);
		const lines: string[] = [];
		await seedHomeTop(pb, home({ title: { en: '<p></p>' }, lede: {} }), (l) => lines.push(l.trim()));
		assert.equal(updates.length, 1);
		assert.equal(updates[0].id, 'h1');
		assert.deepEqual(Object.keys(updates[0].data.title as object), ['en', 'fr']);
		assert.match((updates[0].data.title as Record<string, string>).en, /<em>Exampleland<\/em>/);
		assert.equal('published' in updates[0].data, false);
		assert.deepEqual(lines, ['~ pages: home top seeded']);
	});

	test('a top someone wrote, a title or a lede in one locale, stays', async () => {
		const { pb, updates } = fake(record);
		await seedHomeTop(pb, home({ title: {}, lede: { fr: 'Le nôtre.' } }), () => {});
		await seedHomeTop(pb, home({ title: { en: '<p>Ours.</p>' }, lede: {} }), () => {});
		assert.equal(updates.length, 0);
	});

	test('a published home with an empty top gets the text in its copy too', async () => {
		const { pb, updates } = fake(record);
		const blocks = [{ id: 'b1', type: 'text', body: { en: '<p>About.</p>' } }];
		// the copy from before the top had fields is the list of blocks alone
		await seedHomeTop(pb, home({ published: blocks as Page['published'] }), () => {});
		const copy = updates[0].data.published as { title: Record<string, string>; blocks: unknown[] };
		assert.match(copy.title.en, /Exampleland/);
		assert.equal(copy.blocks.length, 1);
	});

	test('a copy with a top of its own keeps it', async () => {
		const { pb, updates } = fake(record);
		const published = { title: { en: '<p>Ours.</p>' }, lede: {}, blocks: [] };
		await seedHomeTop(pb, home({ published }), () => {});
		assert.equal(updates.length, 1);
		assert.equal('published' in updates[0].data, false);
	});

	test('before /setup named the deploy, nothing is written', async () => {
		const { pb, updates } = fake(null);
		await seedHomeTop(pb, home({}), () => {});
		assert.equal(updates.length, 0);
	});
});

test('isTopEmpty', () => {
	assert.equal(isTopEmpty({ title: {}, lede: {} }), true);
	assert.equal(isTopEmpty({ title: {}, lede: { en: 'x' } }), false);
});
