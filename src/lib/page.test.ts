import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	blockProblem,
	CARDS_MAX,
	cleanBlock,
	LOGOS_MAX,
	missingByLocale,
	parseBlocks,
	resolveBlocks,
	unusedImages,
	type Lookups
} from './page';
import { samePublished } from './publish';
import type { Block } from './types/page';

const blocks: Block[] = [
	{ id: 'b1', type: 'text', body: { en: '<h2>About</h2><p>The map.</p>', fr: '<p>La carte.</p>' } },
	{ id: 'b2', type: 'image', image: 'a_1.svg', alt: { en: 'Nodes' }, caption: {} },
	{
		id: 'b3',
		type: 'cards',
		cards: [
			{ title: { en: 'Map' }, text: { en: 'All of it' }, target: { kind: 'map', id: 'm1' } },
			{ title: { en: 'Journey' }, text: {}, target: { kind: 'journey', id: 'j1' } },
			{ title: { en: 'Elsewhere' }, text: {}, target: { kind: 'url', url: 'https://example.org/' } }
		]
	},
	{
		id: 'b4',
		type: 'logos',
		logos: [
			{ image: 'l_1.png', name: 'One', url: 'https://example.org/' },
			{ image: 'l_2.png', name: 'Two', url: '' }
		]
	}
];

test('stored blocks read back as they were written', () => {
	assert.deepEqual(parseBlocks(blocks), blocks);
	assert.deepEqual(parseBlocks(JSON.parse(JSON.stringify(blocks))), blocks);
});

test('what is not a block of the four types stays out', () => {
	assert.deepEqual(parseBlocks(null), []);
	assert.deepEqual(parseBlocks({ 0: blocks[0] }), []);
	const read = parseBlocks([
		'text',
		null,
		{ id: 'v', type: 'video', url: 'https://example.org/v.mp4' },
		{ id: 'i', type: 'image' },
		{ id: 't', type: 'text', body: { en: '<p></p>', fr: '  ' } },
		{ id: 'c', type: 'cards', cards: [{ title: { en: 'No target' } }] },
		{ id: 'l', type: 'logos', logos: [{ name: 'No file' }] },
		blocks[0]
	]);
	assert.deepEqual(read, [blocks[0]]);
});

test('a text outside the known locales, or not a string, stays out', () => {
	const [read] = parseBlocks([
		{
			id: 'b',
			type: 'image',
			image: 'a.png',
			alt: JSON.parse('{"en": " Alt ", "xx": "unknown", "__proto__": "x", "fr": 42}'),
			caption: 'not an object'
		}
	]);
	assert.deepEqual(read, { id: 'b', type: 'image', image: 'a.png', alt: { en: 'Alt' }, caption: {} });
});

test('cards and logos keep to their limits', () => {
	const many = <T>(n: number, make: (i: number) => T) => Array.from({ length: n }, (_, i) => make(i));
	const [cards, logos] = parseBlocks([
		{
			id: 'c',
			type: 'cards',
			cards: many(5, (i) => ({ title: { en: `${i}` }, target: { kind: 'map', id: `m${i}` } }))
		},
		{ id: 'l', type: 'logos', logos: many(10, (i) => ({ image: `l${i}.png`, name: `${i}` })) }
	]);
	assert.equal(cards.type === 'cards' && cards.cards.length, CARDS_MAX);
	assert.equal(logos.type === 'logos' && logos.logos.length, LOGOS_MAX);
});

test('a block with no id, or a repeated one, gets one of its own', () => {
	const read = parseBlocks([
		{ type: 'text', body: { en: '<p>a</p>' } },
		{ id: 'x', type: 'text', body: { en: '<p>b</p>' } },
		{ id: 'x', type: 'text', body: { en: '<p>c</p>' } }
	]);
	const ids = read.map((b) => b.id);
	assert.equal(new Set(ids).size, 3);
	assert.equal(ids[1], 'x');
});

test('the saved draft drops blank locales and keeps empty blocks', () => {
	const draft: Block = { id: 'n', type: 'image', image: '', alt: { en: ' A ', fr: '' }, caption: { en: '' } };
	assert.deepEqual(cleanBlock(draft), { id: 'n', type: 'image', image: '', alt: { en: 'A' }, caption: {} });
	assert.deepEqual(blocks.map(cleanBlock), blocks);
});

test('the copy compares equal to the edit whatever order its keys come in', () => {
	const stored = JSON.parse(JSON.stringify(blocks), (_k, v) =>
		v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v
	);
	assert.ok(samePublished(parseBlocks(stored), blocks));
	const moved = [blocks[1], blocks[0], ...blocks.slice(2)];
	assert.equal(samePublished(moved, blocks), false);
});

test('the editor asks for the default locale and a target before it saves', () => {
	assert.equal(blockProblem(blocks[0], 'en'), null);
	assert.equal(blockProblem(blocks[0], 'pt'), 'home_admin.problem.text');
	assert.equal(blockProblem({ ...blocks[1], image: '' } as Block, 'en'), 'home_admin.problem.image');
	const card = (target: object, title = { en: 'T' }) =>
		({ id: 'c', type: 'cards', cards: [{ title, text: {}, target }] }) as Block;
	assert.equal(blockProblem(card({ kind: 'map', id: 'm1' }), 'en'), null);
	assert.equal(blockProblem(card({ kind: 'url', url: '/journeys' }), 'en'), null);
	assert.equal(blockProblem(card({ kind: 'map', id: 'm1' }, { en: ' ' }), 'en'), 'home_admin.problem.card_title');
	assert.equal(blockProblem(card({ kind: 'journey', id: '' }), 'en'), 'home_admin.problem.card_target');
	assert.equal(blockProblem(card({ kind: 'url', url: 'javascript:alert(1)' }), 'en'), 'home_admin.problem.card_target');
	assert.equal(blockProblem(card({ kind: 'url', url: '//evil.example' }), 'en'), 'home_admin.problem.card_target');
	const logo = (l: object) => ({ id: 'l', type: 'logos', logos: [{ image: 'a.png', name: 'A', url: '', ...l }] }) as Block;
	assert.equal(blockProblem(logo({}), 'en'), null);
	assert.equal(blockProblem(logo({ image: '' }), 'en'), 'home_admin.problem.logo_image');
	assert.equal(blockProblem(logo({ name: ' ' }), 'en'), 'home_admin.problem.logo_name');
	assert.equal(blockProblem(logo({ url: 'data:text/html,x' }), 'en'), 'home_admin.problem.logo_url');
});

test('a locale lacks a text written in another, never one blank in all', () => {
	assert.deepEqual(missingByLocale(blocks[0], ['en', 'fr']), { en: 0, fr: 0 });
	// the caption is blank everywhere: optional
	assert.deepEqual(missingByLocale(blocks[1], ['en', 'fr']), { en: 0, fr: 1 });
	assert.deepEqual(missingByLocale(blocks[2], ['en', 'fr', 'pt']), { en: 0, fr: 4, pt: 4 });
	assert.deepEqual(missingByLocale(blocks[3], ['en', 'fr']), { en: 0, fr: 0 });
	const empty: Block = { id: 't', type: 'text', body: { en: '<p></p>', fr: '<p>Oui</p>' } };
	assert.deepEqual(missingByLocale(empty, ['en', 'fr']), { en: 1, fr: 0 });
});

test('Publish removes the files no block uses', () => {
	assert.deepEqual(unusedImages(['a_1.svg', 'old.png', 'l_1.png', 'l_2.png'], blocks), ['old.png']);
	assert.deepEqual(unusedImages(['a_1.svg'], []), ['a_1.svg']);
});

test('the visitor gets addresses, and nothing that points at what is gone', () => {
	const lookups: Lookups = {
		image: (name) => (name === 'l_2.png' ? null : `https://pb.example/${name}`),
		target: (kind, id) => (kind === 'map' && id === 'm1' ? '/maps/main' : null)
	};
	const resolved = resolveBlocks(blocks, lookups);
	assert.deepEqual(resolved[1], { id: 'b2', type: 'image', src: 'https://pb.example/a_1.svg', alt: { en: 'Nodes' }, caption: {} });
	assert.deepEqual(resolved[2], {
		id: 'b3',
		type: 'cards',
		cards: [
			{ title: { en: 'Map' }, text: { en: 'All of it' }, href: '/maps/main', external: false },
			{ title: { en: 'Elsewhere' }, text: {}, href: 'https://example.org/', external: true }
		]
	});
	assert.deepEqual(resolved[3], {
		id: 'b4',
		type: 'logos',
		logos: [{ name: 'One', url: 'https://example.org/', src: 'https://pb.example/l_1.png' }]
	});

	const gone = resolveBlocks(blocks, { image: () => null, target: () => null });
	assert.deepEqual(
		gone.map((b) => b.type),
		['text', 'cards']
	);
	const stored = [{ id: 'u', type: 'cards', cards: [{ title: { en: 'X' }, text: {}, target: { kind: 'url', url: 'javascript:x' } }] }];
	assert.deepEqual(resolveBlocks(stored as Block[], lookups), []);
});
