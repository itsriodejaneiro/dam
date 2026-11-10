import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fromPublished, samePublished, toPublished } from './journey';
import type { Journey, JourneyStep } from './types/journey';

const journey = {
	id: 'j1',
	collectionId: 'c1',
	collectionName: 'journeys',
	slug: 'renewing',
	map: 'm1',
	published: null,
	title: { en: 'Renewing', fr: 'Renouveler' },
	description: { en: 'How it goes' },
	phases: [{ number: 1, title: { en: 'Check' }, summary: { en: 'Done' }, needed: ['d1'] }],
	documents: [{ id: 'd1', label: { en: 'Receipt' }, abbrev: { en: 'R' }, unlockedAt: 's2' }]
} as Journey;

const step = (id: string, order: number, extra: Partial<JourneyStep> = {}) =>
	({
		id,
		collectionId: 'c2',
		collectionName: 'journey_steps',
		journey: 'j1',
		order,
		phase: 1,
		title: { en: `Step ${id}` },
		body: { en: `<p>${id}</p>` },
		duration: null,
		camera: null,
		highlight_nodes: ['n1'],
		highlight_edges: [],
		...extra
	}) as JourneyStep;

const steps = [step('s2', 2, { camera: { centerX: 1, centerY: 2, zoom: 1.5 } }), step('s1', 1)];

test('the copy holds what the visitor reads, the steps in their order', () => {
	const copy = toPublished(journey, steps);
	assert.deepEqual(Object.keys(copy).sort(), ['description', 'documents', 'map', 'phases', 'steps', 'title']);
	assert.deepEqual(copy.steps.map((s) => s.id), ['s1', 's2']);
	assert.deepEqual(Object.keys(copy.steps[0]).sort(), [
		'body',
		'camera',
		'duration',
		'highlight_edges',
		'highlight_nodes',
		'id',
		'phase',
		'title'
	]);
	assert.deepEqual(copy.steps[1].camera, { centerX: 1, centerY: 2, zoom: 1.5 });
});

test('a record with empty fields gives a copy with empty texts and lists', () => {
	const bare = { ...journey, title: null, description: null, phases: null, documents: null };
	const copy = toPublished(bare as unknown as Journey, [
		step('s1', 1, { title: null, body: null, highlight_nodes: null } as unknown as Partial<JourneyStep>)
	]);
	assert.deepEqual([copy.title, copy.description, copy.phases, copy.documents], [{}, {}, [], []]);
	assert.deepEqual([copy.steps[0].title, copy.steps[0].body, copy.steps[0].highlight_nodes], [{}, {}, []]);
});

test('the edit restored from a copy numbers its steps from 1 and keeps their ids', () => {
	const copy = toPublished(journey, steps);
	const edit = fromPublished(copy);
	assert.deepEqual(edit.journey, {
		map: 'm1',
		title: journey.title,
		description: journey.description,
		phases: journey.phases,
		documents: journey.documents
	});
	assert.deepEqual(edit.steps.map((s) => [s.id, s.order]), [['s1', 1], ['s2', 2]]);
	assert.deepEqual(toPublished(edit.journey, edit.steps), copy);
});

test('the key order PocketBase stores a copy in is no change', () => {
	const copy = toPublished(journey, steps);
	const stored = JSON.parse(
		JSON.stringify(copy, (_k, v) =>
			v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v
		)
	);
	assert.notEqual(JSON.stringify(stored), JSON.stringify(copy));
	assert.ok(samePublished(copy, stored));
});

test('a change in a text, the order or a highlight is a change', () => {
	const copy = toPublished(journey, steps);
	const changed = [
		toPublished({ ...journey, title: { en: 'Renewed' } }, steps),
		toPublished(journey, [{ ...steps[0], order: 1 }, { ...steps[1], order: 2 }]),
		toPublished(journey, [steps[0], step('s1', 1, { highlight_nodes: ['n1', 'n2'] })]),
		toPublished({ ...journey, map: 'm2' }, steps)
	];
	for (const other of changed) assert.equal(samePublished(copy, other), false);
});
