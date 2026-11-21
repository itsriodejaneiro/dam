import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fromPublished, labelShown, stepHighlight, toPublished } from './journey';
import { samePublished } from './publish';
import type { Journey, JourneyGraphData, JourneyStep } from './types/journey';

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

test('labelShown: a category with the switch on names its nodes always; off, only while someone looks at the node', () => {
	const always = { show_labels: true };
	const onDemand = { show_labels: false };
	assert.equal(labelShown(always, {}), true);
	assert.equal(labelShown(always, { hovered: false, focused: false, selected: false, highlighted: false }), true);
	assert.equal(labelShown(onDemand, {}), false);
	assert.equal(labelShown(onDemand, { hovered: false, focused: false, selected: false, highlighted: false, matched: false }), false);
	for (const key of ['hovered', 'focused', 'selected', 'highlighted', 'matched'] as const) {
		assert.equal(labelShown(onDemand, { [key]: true }), true, key);
	}
});

/** A graph from arrows written "a>b"; a connection's id is its arrow. */
const graphOf = (...arrows: string[]) => {
	const ids = [...new Set(arrows.flatMap((arrow) => arrow.split('>')))];
	return {
		nodes: ids.map((id) => ({ id })),
		edges: arrows.map((arrow) => ({ id: arrow, source: arrow.split('>')[0], target: arrow.split('>')[1] }))
	} as unknown as Pick<JourneyGraphData, 'nodes' | 'edges'>;
};

const lit = (nodes: string[], graph: ReturnType<typeof graphOf>, stored: string[] = []) => {
	const h = stepHighlight({ highlight_nodes: nodes, highlight_edges: stored }, graph);
	const sorted = (set: Set<string>) => [...set].sort();
	return h && {
		nodes: sorted(h.nodes),
		edges: sorted(h.edges),
		secondaryNodes: sorted(h.secondary.nodes),
		secondaryEdges: sorted(h.secondary.edges)
	};
};

test('stepHighlight: a step that chooses nothing shows the whole graph', () => {
	const graph = graphOf('a>b');
	assert.equal(lit([], graph), null);
	assert.equal(lit(['gone'], graph, ['gone>too']), null);
});

test('stepHighlight: every connection between two entities of the step lights up, stored or not', () => {
	const graph = graphOf('a>b', 'b>a', 'b>c', 'c>d');
	assert.deepEqual(lit(['a', 'b', 'c'], graph), {
		nodes: ['a', 'b', 'c'],
		edges: ['a>b', 'b>a', 'b>c'],
		secondaryNodes: [],
		secondaryEdges: []
	});
});

test('stepHighlight: two entities with no connection light the shortest path along the arrows, in the secondary tone', () => {
	// a reaches d in two hops by x, and in three by y and z; d reaches a only the long way round.
	const graph = graphOf('a>x', 'x>d', 'a>y', 'y>z', 'z>d', 'd>p', 'p>q', 'q>a');
	assert.deepEqual(lit(['a', 'd'], graph), {
		nodes: ['a', 'd'],
		edges: [],
		secondaryNodes: ['x'],
		secondaryEdges: ['a>x', 'x>d']
	});
	// The pair in the other order finds the same path.
	assert.deepEqual(lit(['d', 'a'], graph)?.secondaryEdges, ['a>x', 'x>d']);
});

test('stepHighlight: paths of the same length all light up, whichever end they start from', () => {
	assert.deepEqual(lit(['a', 'd'], graphOf('a>x', 'x>d', 'a>y', 'y>d')), {
		nodes: ['a', 'd'],
		edges: [],
		secondaryNodes: ['x', 'y'],
		secondaryEdges: ['a>x', 'a>y', 'x>d', 'y>d']
	});
	assert.deepEqual(lit(['a', 'd'], graphOf('a>x', 'x>d', 'd>y', 'y>a'))?.secondaryEdges, ['a>x', 'd>y', 'x>d', 'y>a']);
});

test('stepHighlight: a path through an entity of the step is made of what is already lit', () => {
	assert.deepEqual(lit(['a', 'b', 'c'], graphOf('a>b', 'b>c')), {
		nodes: ['a', 'b', 'c'],
		edges: ['a>b', 'b>c'],
		secondaryNodes: [],
		secondaryEdges: []
	});
});

test('stepHighlight: with no path along the arrows, nothing more lights up', () => {
	// Both arrows arrive at x: neither end reaches the other.
	assert.deepEqual(lit(['a', 'd'], graphOf('a>x', 'd>x')), {
		nodes: ['a', 'd'],
		edges: [],
		secondaryNodes: [],
		secondaryEdges: []
	});
});

test('stepHighlight: a stored connection outside the step lights up as it is; one off the graph does not', () => {
	assert.deepEqual(lit(['a', 'b'], graphOf('a>b', 'c>d'), ['c>d', 'gone']), {
		nodes: ['a', 'b'],
		edges: ['a>b', 'c>d'],
		secondaryNodes: [],
		secondaryEdges: []
	});
});
