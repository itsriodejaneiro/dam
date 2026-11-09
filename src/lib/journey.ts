/* What a journey computes from its records: the graph canvas, the camera framing, the
   phase colours and the cards between phases. Shared by the visitor's page and the editor. */

import type { NodeType } from '$lib/services/types';
import type {
	CameraState,
	GraphHighlight,
	Journey,
	JourneyStep,
	PhaseTransition,
	VisNode
} from '$lib/types/journey';
import type { Localized } from '$lib/i18n';

export const VIS_W = 1280;
export const LAYER_H = 160;
export const TOP_PAD = 40;
export const BOTTOM_PAD = 30;

export const canvasHeight = (types: NodeType[]): number =>
	TOP_PAD + BOTTOM_PAD + Math.max(1, types.length) * LAYER_H;

/** The height of a category's lane on the graph. */
export const laneCenter = (layerOrder: number): number =>
	TOP_PAD + Math.max(0, layerOrder - 1) * LAYER_H + LAYER_H / 2;

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

/** What a step lights up; null when it chooses nothing, and the whole graph shows. */
export function stepHighlight(
	step: Pick<JourneyStep, 'highlight_nodes' | 'highlight_edges'>
): GraphHighlight | null {
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
export function phaseTransitions(journey: Journey, steps: JourneyStep[]): PhaseTransition[] {
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
