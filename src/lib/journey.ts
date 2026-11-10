/* What a journey computes from its records: the graph canvas, the camera framing, the
   phase colours, the cards between phases, and the copy Publish writes from the edit.
   Shared by the visitor's page, the editor and the server. */

import type { NodeType } from '$lib/services/types';
import type {
	CameraState,
	GraphHighlight,
	Journey,
	JourneyGraphData,
	JourneyStep,
	PhaseTransition,
	PublishedJourney,
	PublishedStep,
	VisNode
} from '$lib/types/journey';
import type { Localized } from '$lib/i18n';

export const VIS_W = 1280;
export const LAYER_H = 160; // height of each layer; raise it for more breathing room
export const TOP_PAD = 40;
export const BOTTOM_PAD = 30;

export const canvasHeight = (types: NodeType[]): number =>
	TOP_PAD + BOTTOM_PAD + Math.max(1, types.length) * LAYER_H;

/** The height of the centre of the lane at this place among the categories, from 1. */
export const laneCenter = (place: number): number =>
	TOP_PAD + Math.max(0, place - 1) * LAYER_H + LAYER_H / 2;

/**
 * Where each category's lane starts, by category id. A lane is the category's place in the
 * sorted list: `layer_order` only orders, and removing a category leaves a gap in its
 * numbers while the canvas counts categories.
 */
export function laneTops(types: NodeType[]): Map<string, number> {
	const sorted = [...types].sort((a, b) => a.layer_order - b.layer_order);
	return new Map(sorted.map((t, i) => [t.id, TOP_PAD + i * LAYER_H]));
}

/**
 * A saved height in the lane that starts at `top`, as far down the lane as it was saved.
 * Removing or moving a category shifts the lanes under the positions already saved.
 */
export const heightInLane = (y: number, top: number): number =>
	top + ((((y - TOP_PAD) % LAYER_H) + LAYER_H) % LAYER_H);

/** The whole map in view. */
export const fullCamera = (types: NodeType[]): CameraState => ({
	centerX: VIS_W / 2,
	centerY: canvasHeight(types) / 2,
	zoom: 1
});

/** Frames the given nodes; with none of them on the graph, the whole map. */
export function fitCamera(nodeIds: string[], nodes: VisNode[], types: NodeType[]): CameraState {
	const framed = nodes.filter((n) => nodeIds.includes(n.id));
	if (framed.length === 0) return fullCamera(types);

	const PAD = 120;
	const MAX_ZOOM = 2.5;
	const xs = framed.map((n) => n.x ?? 0);
	const ys = framed.map((n) => n.y ?? 0);
	const [minX, maxX, minY, maxY] = [
		Math.min(...xs),
		Math.max(...xs),
		Math.min(...ys),
		Math.max(...ys)
	];
	return {
		centerX: (minX + maxX) / 2,
		centerY: (minY + maxY) / 2,
		zoom: Math.min(
			VIS_W / Math.max(maxX - minX + PAD * 2, 200),
			canvasHeight(types) / Math.max(maxY - minY + PAD * 2, 200),
			MAX_ZOOM
		)
	};
}

type StepHighlight = Pick<JourneyStep, 'highlight_nodes' | 'highlight_edges'>;

/**
 * A step's choices that are still on the graph. A node taken off a map, and its
 * connections, stay in the step's record, and would dim the graph around nothing.
 */
export function liveHighlight(
	step: StepHighlight,
	graph: Pick<JourneyGraphData, 'nodes' | 'edges'>
): StepHighlight {
	const nodes = new Set(graph.nodes.map((n) => n.id));
	const edges = new Set(graph.edges.map((e) => e.id));
	return {
		highlight_nodes: step.highlight_nodes.filter((id) => nodes.has(id)),
		highlight_edges: step.highlight_edges.filter((id) => edges.has(id))
	};
}

/** What a step lights up; null when it chooses nothing, and the whole graph shows. */
export function stepHighlight(step: StepHighlight): GraphHighlight | null {
	if (step.highlight_nodes.length === 0 && step.highlight_edges.length === 0) return null;
	return { nodes: new Set(step.highlight_nodes), edges: new Set(step.highlight_edges) };
}

const PHASE_COLORS = ['3', '6', '1'] as const;

export function phaseColor(phaseNum: number): string {
	if (phaseNum <= 0) return '3';
	return PHASE_COLORS[(phaseNum - 1) % PHASE_COLORS.length];
}

const hasText = (value: Localized | null | undefined): boolean =>
	Object.values(value ?? {}).some((text) => text.trim() !== '');

/** Steps inside a phase; the introduction does not count. */
export const countedSteps = (steps: Pick<JourneyStep, 'phase'>[]): number =>
	steps.filter((s) => s.phase > 0).length;

/** "1.1", "1.2", "2.1" by step ID: position within its phase, in step order. */
export function stepNumbers(steps: Pick<JourneyStep, 'id' | 'phase'>[]): Map<string, string> {
	const numbers = new Map<string, string>();
	const perPhase = new Map<number, number>();
	for (const step of steps) {
		if (step.phase <= 0) continue;
		const idx = (perPhase.get(step.phase) ?? 0) + 1;
		perPhase.set(step.phase, idx);
		numbers.set(step.id, `${step.phase}.${idx}`);
	}
	return numbers;
}

/** The cards between phases: one per phase with a summary, the last closing the journey. */
export function phaseTransitions(
	journey: Pick<PublishedJourney, 'phases' | 'documents'>,
	steps: Pick<PublishedStep, 'id' | 'phase'>[]
): PhaseTransition[] {
	const phaseOfStep = new Map(steps.map((s) => [s.id, s.phase]));
	const docIds = new Set(journey.documents.map((d) => d.id));
	return journey.phases
		.map((phase, i) => ({ phase, next: journey.phases[i + 1] }))
		.filter(({ phase }) => hasText(phase.summary))
		.map(({ phase, next }) => ({
			fromPhase: phase.number,
			toPhase: next?.number ?? 0,
			summary: phase.summary,
			obtained: journey.documents
				.filter((d) => d.unlockedAt && phaseOfStep.get(d.unlockedAt) === phase.number)
				.map((d) => d.id),
			needed: next ? phase.needed.filter((id) => docIds.has(id)) : []
		}));
}

// ── The edit and its published copy ──

type EditFields = Pick<Journey, 'map' | 'title' | 'description' | 'phases' | 'documents'>;

/** The copy Publish writes: the edit as the visitor reads it, the steps in their order. */
export function toPublished(
	journey: EditFields,
	steps: (PublishedStep & { order?: number })[]
): PublishedJourney {
	return {
		map: journey.map,
		title: journey.title ?? {},
		description: journey.description ?? {},
		phases: journey.phases ?? [],
		documents: journey.documents ?? [],
		steps: [...steps]
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map((step) => ({
				id: step.id,
				phase: step.phase,
				title: step.title ?? {},
				body: step.body ?? {},
				duration: step.duration ?? null,
				camera: step.camera ?? null,
				highlight_nodes: step.highlight_nodes ?? [],
				highlight_edges: step.highlight_edges ?? []
			}))
	};
}

/**
 * The edit Discard writes back from the copy: the journey's fields and its steps, numbered
 * in order. The steps keep their ids, which the documents point at.
 */
export function fromPublished(copy: PublishedJourney): {
	journey: EditFields;
	steps: (PublishedStep & { order: number })[];
} {
	const { steps, ...journey } = toPublished(copy, copy.steps);
	return { journey, steps: steps.map((step, i) => ({ ...step, order: i + 1 })) };
}
