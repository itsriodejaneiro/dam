import { deserialize } from '$app/forms';
import { pb } from './pb';
import * as nodeTypes from './nodeTypes';
import * as nodesApi from './nodes';
import * as edgesApi from './edges';
import * as mapNodes from './mapNodes';
import { heightInLane, laneTops, LAYER_H, VIS_W } from '$lib/journey';
import type {
	Journey,
	JourneyDocument,
	JourneyGraphData,
	JourneyPhase,
	JourneyStep,
	PublishedJourney,
	VisEdge
} from '$lib/types/journey';
import type { MessageKey } from '$lib/i18n';
import type { Localized, MapNode } from './types';

export interface JourneyInput {
	slug: string;
	map: string;
	title: Localized;
	description: Localized;
	phases: JourneyPhase[];
	documents: JourneyDocument[];
}

export type StepInput = Pick<
	JourneyStep,
	| 'id'
	| 'order'
	| 'phase'
	| 'title'
	| 'body'
	| 'duration'
	| 'camera'
	| 'highlight_nodes'
	| 'highlight_edges'
>;

/** Every journey with its steps: the admin list compares each edit with its copy. */
export async function getJourneys(): Promise<Journey[]> {
	return await pb
		.collection('journeys')
		.getFullList<Journey>({ sort: 'created', expand: 'journey_steps_via_journey' });
}

/** True when a published copy shows this map: PocketBase guards only the edit's `map`. */
export async function publishedOnMap(mapId: string): Promise<boolean> {
	const { totalItems } = await pb
		.collection('journeys')
		.getList(1, 1, { filter: pb.filter('published.map = {:mapId}', { mapId }) });
	return totalItems > 0;
}

export async function getJourney(id: string): Promise<Journey> {
	return await pb.collection('journeys').getOne<Journey>(id);
}

export async function createJourney(data: JourneyInput): Promise<Journey> {
	return await pb.collection('journeys').create<Journey>(data);
}

/** Writes the edit; what the visitor reads changes only through `runJourneyAction`. */
export async function updateJourney(id: string, data: Partial<JourneyInput>): Promise<Journey> {
	return await pb.collection('journeys').update<Journey>(id, data);
}

export type JourneyAction = 'publish' | 'discard' | 'unpublish';

/** A publishing action the server refused; `key` is the message that says why. */
export class JourneyActionError extends Error {
	constructor(readonly key: MessageKey) {
		super(key);
	}
}

/**
 * Runs one of the server's publishing actions (`/admin/journeys/[id]`) with the signed-in
 * account's token. Returns the journey's copy after it: null once unpublished.
 */
export async function runJourneyAction(
	id: string,
	action: JourneyAction
): Promise<PublishedJourney | null> {
	const body = new FormData();
	body.set('token', pb.authStore.token);
	const response = await fetch(`/admin/journeys/${id}?/${action}`, {
		method: 'POST',
		body,
		headers: { 'x-sveltekit-action': 'true' }
	});
	const result = deserialize(await response.text());
	if (result.type === 'success') return (result.data as { published: PublishedJourney | null }).published;
	if (result.type === 'failure') throw new JourneyActionError((result.data as { error: MessageKey }).error);
	throw new JourneyActionError('journeys_admin.error.save');
}

/** PocketBase refused the record for the unique index on `slug`. */
export function isSlugTaken(err: unknown): boolean {
	const data = (err as { response?: { data?: Record<string, unknown> } }).response?.data;
	return data?.slug !== undefined;
}

export async function deleteJourney(id: string): Promise<void> {
	await pb.collection('journeys').delete(id);
}

export async function getSteps(journeyId: string): Promise<JourneyStep[]> {
	return await pb.collection('journey_steps').getFullList<JourneyStep>({
		filter: pb.filter('journey = {:journeyId}', { journeyId }),
		sort: 'order'
	});
}

/** A record id made in the browser, so a document can point at a step not yet saved. */
export function newRecordId(): string {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/**
 * Writes the editor's steps: deletes the removed, creates the new, updates the known.
 * Keeps `knownIds` and `removedIds` current as it goes, so a retry resumes after a failure.
 */
export async function saveSteps(
	journeyId: string,
	steps: StepInput[],
	knownIds: Set<string>,
	removedIds: string[]
): Promise<void> {
	while (removedIds.length > 0) {
		await pb.collection('journey_steps').delete(removedIds[0]);
		removedIds.shift();
	}
	for (const step of steps) {
		const data = { ...step, journey: journeyId };
		if (knownIds.has(step.id)) {
			await pb.collection('journey_steps').update(step.id, data);
		} else {
			await pb.collection('journey_steps').create(data);
			knownIds.add(step.id);
		}
	}
}

/** The map's nodes at their saved positions and the connections among them. */
export async function getJourneyGraph(mapId: string): Promise<JourneyGraphData> {
	const [allTypes, allNodes, allEdges, placements] = await Promise.all([
		nodeTypes.getNodeTypes(),
		nodesApi.getNodes(),
		edgesApi.getEdges(),
		mapNodes.getMapNodes(mapId)
	]);

	const types = allTypes.sort((a, b) => a.layer_order - b.layer_order);
	const typeById = new Map(allTypes.map((t) => [t.id, t]));
	const tops = laneTops(types);
	const placementByNode = new Map<string, MapNode>(placements.map((mn) => [mn.node, mn]));

	const onMap = allNodes.filter((n) => placementByNode.has(n.id));
	const onMapIds = new Set(onMap.map((n) => n.id));
	const connections = allEdges.filter((e) => onMapIds.has(e.source) && onMapIds.has(e.target));

	const degree = new Map<string, number>();
	for (const e of connections) {
		degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
		degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
	}

	const nodes = onMap.map((n) => {
		const type = typeById.get(n.type)!;
		const top = tops.get(type.id)!;
		const mn = placementByNode.get(n.id);
		// PocketBase stores an empty number as 0: (0, 0) is a node nobody has placed.
		const placed = mn?.x || mn?.y ? mn : null;
		return {
			id: n.id,
			raw: n,
			type,
			degree: degree.get(n.id) ?? 0,
			x: placed ? placed.x! : VIS_W / 2,
			y: placed ? heightInLane(placed.y!, top) : top + LAYER_H / 2,
			index: 0,
			vx: 0,
			vy: 0
		};
	});

	const nodeById = new Map(nodes.map((n) => [n.id, n]));
	const edges = connections.map((e) => ({
		id: e.id,
		source: nodeById.get(e.source) ?? e.source,
		target: nodeById.get(e.target) ?? e.target
	})) as VisEdge[];

	return { types, nodes, edges };
}
