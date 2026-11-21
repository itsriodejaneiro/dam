import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { harness, IDS, ORIGIN, type Harness } from './testing';
import { ToolError } from './tools';

/* The write tools over the memory store: saving twice leaves the map as it is, the rules
   the screens enforce hold here too, HTML is cleaned before it is stored, and the line of
   api_writes comes before the write. */

let h: Harness;
beforeEach(() => {
	h = harness();
});

const rows = (collection: string) => [...(h.store.data.get(collection)?.values() ?? [])];
const ok = async (name: string, args: Record<string, unknown>) => {
	const result = await h.call(name, args);
	assert.equal(result.isError, false, JSON.stringify(result.structuredContent));
	return result.structuredContent;
};
const refused = async (name: string, args: Record<string, unknown>, code: string, pattern?: RegExp) => {
	const result = await h.call(name, args);
	assert.equal(result.isError, true, `${name} accepted ${JSON.stringify(args)}`);
	assert.equal(result.structuredContent.error, code, result.structuredContent.message);
	if (pattern) assert.match(result.structuredContent.message, pattern);
	return result.structuredContent;
};

const registry = { category: 'agency', label: { en: 'Civil Registry', pt: 'Registo Civil' }, description: { en: '<p>Births <b>and</b> deaths<script>x()</script><img onerror=1></p>' }, links: [{ label: { en: 'Site' }, url: 'https://registry.example/' }], maps: ['main'] };

test('save_entities: the same sheet twice leaves the map as it is; with no id, the label in the default locale finds the entity', async () => {
	const first = await ok('save_entities', { entities: [registry, { category: 'service', label: { en: 'Citizen Portal' }, maps: ['main', 'other'] }] });
	assert.deepEqual(first.items.map((i: any) => i.created), [true, false]);
	assert.equal(first.items[1].id, IDS.portal);
	const again = await ok('save_entities', { entities: [registry] });
	assert.deepEqual(again.items, [{ id: first.items[0].id, created: false, label: 'Civil Registry' }]);
	assert.equal(rows('nodes').length, 3);
	assert.equal(rows('node_translations').filter((t) => t.node === first.items[0].id).length, 2);
	// the portal is on both maps now, with its place on the main one kept
	const portalMaps = rows('map_nodes').filter((p) => p.node === IDS.portal);
	assert.deepEqual(portalMaps.map((p) => p.map).sort(), [IDS.main, IDS.other].sort());
	assert.equal(portalMaps.find((p) => p.map === IDS.main)?.id, 'mn0000000000002');
});

test('save_entities and save_category: a batch PocketBase refuses comes back with its cause and, for the sheet, what is saved', async () => {
	const refusal = new ToolError('internal', 'PocketBase refused the batch write (403 Batch requests are not allowed.): its Batch API is off. Restart the app.');
	const ids = await ok('save_entities', { entities: [registry] });
	const store = h.store;
	const real = store.batch.bind(store);
	let calls = 0;
	store.batch = async (ops) => (++calls === 2 ? Promise.reject(refusal) : real(ops));
	const result = await refused('save_entities', { entities: [{ ...registry, label: { en: 'Civil Registry' } }, { category: 'service', label: { en: 'Tax Portal' }, maps: ['main'] }] }, 'internal', /entities\[1\] failed to save\. PocketBase refused the batch write \(403 Batch requests are not allowed\.\).*Restart the app\. The entities before it are saved: /);
	assert.deepEqual(result.saved.map((i: { id: string }) => i.id), [ids.items[0].id]);
	store.batch = async () => Promise.reject(refusal);
	await refused('save_category', { slug: 'court', color_slot: 3, label: { en: 'Court' } }, 'internal', /^PocketBase refused the batch write/);
});

test('save_entities: an entity arrives whole, its HTML cleaned, its maps the full set, with its given id', async () => {
	const id = 'reg000000000001';
	await ok('save_entities', { entities: [{ ...registry, id }] });
	const saved = (await ok('get_entity', { id })) as any;
	assert.equal(saved.description.en, '<p>Births <b>and</b> deaths</p>');
	assert.deepEqual(saved.links, [{ label: { en: 'Site' }, url: 'https://registry.example/' }]);
	assert.deepEqual(saved.maps, [{ map: IDS.main, slug: 'main', x: null, y: null }]);
	// taking the main map out of the set removes its place; the other map comes in
	await ok('save_entities', { entities: [{ ...registry, id, maps: ['other'] }] });
	assert.deepEqual(((await ok('get_entity', { id })) as any).maps, [{ map: IDS.other, slug: 'other', x: null, y: null }]);
	// a known id updates even when the label changed; links and description left out stay
	await ok('save_entities', { entities: [{ id, category: 'agency', label: { en: 'Civil Registry Office' }, maps: ['other'] }] });
	assert.equal(rows('nodes').length, 3);
	const kept = (await ok('get_entity', { id })) as any;
	assert.deepEqual([kept.label.en, kept.links.length, kept.description.en], ['Civil Registry Office', 1, '<p>Births <b>and</b> deaths</p>']);
});

test('save_entities: the rules, checked before any write', async () => {
	const before = rows('nodes').length;
	await refused('save_entities', { entities: [{ ...registry, label: { pt: 'Só em português' } }] }, 'bad_request', /default locale, "en"/);
	await refused('save_entities', { entities: [{ ...registry, label: { en: 'X', fr: 'Y' } }] }, 'bad_request', /"fr" is not a locale/);
	await refused('save_entities', { entities: [{ ...registry, maps: ['nowhere'] }] }, 'not_found');
	await refused('save_entities', { entities: [{ ...registry, category: 'nowhere' }] }, 'not_found');
	await refused('save_entities', { entities: [{ ...registry, links: [{ label: {}, url: 'javascript:alert(1)' }] }] }, 'bad_request', /not an http, https or mailto/);
	await refused('save_entities', { entities: [{ ...registry, label: { en: 'Civil Registry' }, description: { pt: '<p>x</p>' } }] }, 'bad_request', /"pt" has a description but no label/);
	await refused('save_entities', { entities: [registry, { ...registry, label: { en: 'Civil Registry' } }] }, 'bad_request', /repeats the label/);
	// the second entity is wrong: the first is not written either
	await refused('save_entities', { entities: [registry, { ...registry, label: { en: 'Other' }, maps: [] }] }, 'bad_request');
	assert.equal(rows('nodes').length, before);
	assert.equal(h.written.length, 0);
});

test('save_connections: a pair that exists comes back with its id; a loop and an unknown end are refused', async () => {
	const id = 'reg000000000001';
	await ok('save_entities', { entities: [{ ...registry, id }] });
	const first = await ok('save_connections', { connections: [{ source: IDS.agencyNode, target: IDS.portal }, { source: IDS.portal, target: id }] });
	assert.deepEqual(first.items[0], { id: IDS.edge, created: false });
	assert.equal(first.items[1].created, true);
	const again = await ok('save_connections', { connections: [{ source: IDS.portal, target: id }, { id: 'edge00000000new', source: id, target: IDS.agencyNode }] });
	assert.deepEqual(again.items[0], { id: first.items[1].id, created: false });
	assert.deepEqual(again.items[1], { id: 'edge00000000new', created: true });
	assert.equal(rows('edges').length, 3);
	await refused('save_connections', { connections: [{ source: id, target: id }] }, 'bad_request', /does not connect to itself/);
	await refused('save_connections', { connections: [{ source: id, target: 'node0000000none' }] }, 'not_found');
	await refused('save_connections', { connections: [{ id: 'edge00000000new', source: IDS.portal, target: id }] }, 'conflict');
});

test('save_connections: a pair that points up a layer is written and warned about; the same layer and downward are quiet', async () => {
	const same = 'srv000000000001';
	await ok('save_entities', { entities: [{ id: same, category: 'service', label: { en: 'Tax Portal' }, maps: ['main'] }] });
	const result = await ok('save_connections', { connections: [{ source: IDS.portal, target: IDS.agencyNode }, { source: IDS.portal, target: same }, { source: IDS.agencyNode, target: same }] });
	assert.equal(result.items.length, 3);
	assert.equal(rows('edges').length, 4);
	assert.equal(result.warnings.length, 1);
	assert.ok(result.warnings[0].includes(`"Citizen Portal" (${IDS.portal})`) && result.warnings[0].includes(`"Example Agency" (${IDS.agencyNode})`), result.warnings[0]);
	assert.deepEqual((await ok('save_connections', { connections: [{ source: IDS.agencyNode, target: IDS.portal }] })).warnings, []);
});

test('save_category and save_map: the slug finds the record, the main map is not edited', async () => {
	const created = await ok('save_category', { slug: 'domain', color_slot: 3, label: { en: 'Domain' } });
	assert.equal(created.created, true);
	assert.equal(created.category.layer_order, 3);
	const updated = await ok('save_category', { slug: 'domain', color_slot: 4, label: { en: 'Domain', pt: 'Domínio' }, label_plural: { en: 'Domains' } });
	assert.deepEqual([updated.created, updated.id], [false, created.id]);
	assert.deepEqual(updated.category.label, { en: 'Domain', pt: 'Domínio' });
	await refused('save_category', { id: IDS.service, slug: 'agency', color_slot: 1, label: { en: 'X' } }, 'conflict');
	// the labels switch: on by default, kept when the sheet leaves it out, read back by get_deployment
	assert.equal(created.category.show_labels, true);
	const quiet = await ok('save_category', { slug: 'domain', color_slot: 4, show_labels: false, label: { en: 'Domain' } });
	assert.equal(quiet.category.show_labels, false);
	const kept = await ok('save_category', { slug: 'domain', color_slot: 4, label: { en: 'Domain' } });
	assert.equal(kept.category.show_labels, false);
	const deployment = await ok('get_deployment', {});
	assert.deepEqual(deployment.categories.map((c: any) => [c.slug, c.show_labels]), [['agency', true], ['service', true], ['domain', false]]);
	await refused('save_map', { slug: 'main', label: { en: 'Renamed' } }, 'bad_request', /main map/);
	await refused('save_map', { id: IDS.main, slug: 'principal', label: { en: 'Renamed' } }, 'bad_request', /main map/);
	const map = await ok('save_map', { slug: 'regional', label: { en: 'Regional' } });
	assert.deepEqual([map.created, map.map.order, map.map.main], [true, 3, false]);
	await ok('save_map', { slug: 'regional', label: { en: 'Regional map' } });
	assert.equal(rows('maps').length, 3);
});

test('save_settings: only what is given changes, with the form\'s checks, and the server\'s cache is told', async () => {
	let told = 0;
	h = harness({ settingsChanged: () => told++ });
	const saved = await ok('save_settings', { name: { en: 'Atlantis', pt: 'Atlântida' }, theme: 'green' });
	assert.deepEqual(saved.settings, { name: { en: 'Atlantis', pt: 'Atlântida' }, locales: ['en', 'pt'], default_locale: 'en', theme: 'green', journeys: true, flag: null, logo: null });
	assert.equal(told, 1);
	assert.equal(rows('settings')[0].theme, 'green');
	await refused('save_settings', { default_locale: 'fr' }, 'bad_request', /not among the locales/);
	await refused('save_settings', { locales: ['fr'], name: { en: 'x' } }, 'bad_request', /not among the locales/);
	await refused('save_settings', { theme: 'neon' }, 'bad_request');
	await refused('save_settings', { name: { en: 'x'.repeat(121) } }, 'bad_request', /120/);
	assert.deepEqual(h.written.at(-1), { tool: 'save_settings', collection: 'settings', record: 'set000000000001', action: 'update', previous: { name: { en: 'Exampleland' }, locales: ['en', 'pt'], default_locale: 'en', theme: 'legacy', journeys: true } });
});

test('place_entities: on the map, both coordinates or neither', async () => {
	await ok('place_entities', { map: 'main', positions: [{ entity: IDS.portal, x: 640, y: 300 }, { entity: IDS.agencyNode, x: null, y: null }] });
	const placed = rows('map_nodes');
	assert.deepEqual([placed[1].x, placed[1].y, placed[0].x, placed[0].y], [640, 300, null, null]);
	await refused('place_entities', { map: 'other', positions: [{ entity: IDS.portal, x: 1, y: 1 }] }, 'bad_request', /not on the map "other"/);
	await refused('place_entities', { map: 'main', positions: [{ entity: IDS.portal, x: 1, y: null }] }, 'bad_request', /both/);
});

test('save_journey: the slug finds it, a phase with steps stays, a new map clears the steps\' framing', async () => {
	const created = await ok('save_journey', { slug: 'permit', map: 'main', title: { en: 'Building permit' }, phases: [{ number: 1, title: { en: 'Land' }, needed: ['id'] }], documents: [{ id: 'id', label: { en: 'ID card' }, abbrev: { en: 'ID' } }] });
	assert.equal(created.created, true);
	assert.equal(created.preview, `${ORIGIN}/admin/journeys/${created.id}/preview`);
	assert.equal((await ok('save_journey', { slug: 'permit', map: 'main', title: { en: 'Building permit, revised' } })).id, created.id);
	assert.equal(rows('journeys').length, 2);
	await refused('save_journey', { slug: 'example-journey', map: 'main', title: { en: 'X' }, phases: [] }, 'bad_request', /Phase 1 has steps/);
	await refused('save_journey', { id: created.id, slug: 'example-journey', map: 'main', title: { en: 'X' } }, 'conflict');
	await refused('save_journey', { slug: 'x', map: 'main', title: { en: 'X' }, phases: [{ number: 1, title: { en: 'A' }, needed: ['nope'] }] }, 'bad_request', /"nope"/);
	// the example journey moves to the other map: step 2 loses its camera and highlights
	await ok('save_journey', { slug: 'example-journey', map: 'other', title: { en: 'Who holds the keys' } });
	const step2 = rows('journey_steps').find((s) => s.id === IDS.step2)!;
	assert.deepEqual([step2.camera, step2.highlight_nodes, step2.highlight_edges], [null, [], []]);
	assert.deepEqual(h.written.at(-1), { tool: 'save_journey', collection: 'journey_steps', record: IDS.step2, action: 'update', previous: { camera: { centerX: 1, centerY: 2, zoom: 1 }, highlight_nodes: [IDS.agencyNode, IDS.portal], highlight_edges: [IDS.edge] } });
});

test('save_journey_steps: the whole list, the connections among the lit entities, a step off the list goes', async () => {
	const saved = await ok('save_journey_steps', {
		journey: 'example-journey',
		steps: [
			{ id: IDS.step2, phase: 1, title: { en: 'The agency, first' }, body: { en: '<p>Go<script>x()</script></p>' }, entities: [IDS.agencyNode, IDS.portal] },
			{ id: 'step0000000new1', phase: 1, title: { en: 'The portal' }, entities: [IDS.portal] }
		]
	});
	assert.deepEqual(saved.steps, [{ id: IDS.step2, order: 1, connections: 1 }, { id: 'step0000000new1', order: 2, connections: 0 }]);
	const steps = rows('journey_steps').sort((a, b) => a.order - b.order);
	assert.deepEqual(steps.map((s) => s.id), [IDS.step2, 'step0000000new1']);
	assert.deepEqual(steps[0].highlight_edges, [IDS.edge]);
	assert.equal(steps[0].body.en, '<p>Go</p>');
	assert.deepEqual(h.written.map((w) => [w.action, w.record]), [['delete', IDS.intro], ['update', IDS.step2], ['create', 'step0000000new1']]);
	await refused('save_journey_steps', { journey: 'example-journey', steps: [{ phase: 2, title: { en: 'x' } }] }, 'bad_request', /no phase 2/);
	await ok('save_entities', { entities: [{ ...registry, id: 'reg000000000001', maps: ['other'] }] });
	await refused('save_journey_steps', { journey: 'example-journey', steps: [{ phase: 1, title: { en: 'x' }, entities: ['reg000000000001'] }] }, 'bad_request', /not on the journey's map/);
});

test('publish_journey copies the edit, and refuses a journey with no steps', async () => {
	const published = await ok('publish_journey', { id: 'example-journey' });
	assert.deepEqual(published, { id: IDS.journey, slug: 'example-journey', url: `${ORIGIN}/journeys/example-journey`, steps: 2 });
	const copy = rows('journeys')[0].published;
	assert.equal(copy.map, IDS.main);
	assert.deepEqual(copy.steps.map((s: any) => s.id), [IDS.intro, IDS.step2]);
	assert.deepEqual(h.written[0], { tool: 'publish_journey', collection: 'journeys', record: IDS.journey, action: 'update', previous: { published: null } });
	const empty = await ok('save_journey', { slug: 'empty', map: 'main', title: { en: 'Empty' } });
	await refused('publish_journey', { id: empty.id }, 'bad_request', /no steps/);
});

test('the delete tools: the screens\' refusals, and the whole record kept', async () => {
	await refused('delete_category', { id: 'agency' }, 'bad_request', /has 1 entities/);
	await ok('delete_category', { id: 'agency', move_entities_to: 'service' });
	assert.equal(rows('nodes').find((n) => n.id === IDS.agencyNode)?.type, IDS.service);
	assert.deepEqual(h.written.map((w) => [w.tool, w.collection, w.action]), [['delete_category', 'nodes', 'update'], ['delete_category', 'node_types', 'delete']]);
	await refused('delete_map', { id: 'main' }, 'bad_request', /main map/);
	await ok('save_journey', { slug: 'example-journey', map: 'other', title: { en: 'Who holds the keys' } });
	await refused('delete_map', { id: 'other' }, 'conflict', /walked by example-journey/);
	await ok('delete_journey', { id: 'example-journey' });
	assert.ok(Array.isArray(h.written.at(-1)!.previous && (h.written.at(-1)!.previous as any).steps));
	await ok('delete_map', { id: 'other' });
	await ok('delete_connection', { id: IDS.edge });
	await ok('delete_entity', { id: IDS.portal });
	assert.equal((h.written.at(-1)!.previous as any).label.en, 'Citizen Portal');
	await refused('delete_entity', { id: IDS.portal }, 'not_found');
});

test('no line in api_writes, no write', async () => {
	h = harness({ recordFails: true });
	const before = JSON.stringify([...h.store.data]);
	const result = await h.call('save_entities', { entities: [registry] });
	assert.equal(result.isError, true);
	assert.equal(result.structuredContent.error, 'internal');
	assert.equal(JSON.stringify([...h.store.data]), before);
	assert.equal((await h.call('delete_entity', { id: IDS.portal })).isError, true);
	assert.equal(JSON.stringify([...h.store.data]), before);
});
