import type { RecordModel } from 'pocketbase';
import type { Node, NodeType } from '$lib/services/types';
import type { Localized } from '$lib/i18n';
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';

export interface CameraState {
	centerX: number;
	centerY: number;
	zoom: number;
}

/** A `journey_steps` record. */
export interface JourneyStep extends RecordModel {
	journey: string;
	order: number;
	/** Number of the phase it belongs to. 0 = introduction, before the first phase. */
	phase: number;
	title: Localized;
	body: Localized;
	duration: Localized | null;
	/** null = frame the highlighted nodes automatically. */
	camera: CameraState | null;
	highlight_nodes: string[];
	highlight_edges: string[];
}

/** An item of `journeys.phases`. */
export interface JourneyPhase {
	number: number;
	title: Localized;
	/** Text of the card that closes the phase. Empty = no card. */
	summary: Localized;
	/** Document IDs needed for what comes after the phase. */
	needed: string[];
}

/** An item of `journeys.documents`. */
export interface JourneyDocument {
	id: string;
	label: Localized;
	abbrev: Localized;
	/** Step ID where this document is obtained. null = citizen already has it. */
	unlockedAt: string | null;
}

export interface DocumentState extends JourneyDocument {
	/** Phase of the step that unlocks it (0 = pre-existing). */
	phase: number;
	unlocked: boolean;
	justUnlocked: boolean;
}

export interface PhaseTransition {
	fromPhase: number;
	/** 0 = the journey ends here. */
	toPhase: number;
	summary: Localized;
	/** Document IDs obtained during the completed phase. */
	obtained: string[];
	/** Document IDs needed for the next phase. */
	needed: string[];
}

/** A `journeys` record. */
export interface Journey extends RecordModel {
	slug: string;
	map: string;
	published: boolean;
	title: Localized;
	description: Localized;
	phases: JourneyPhase[];
	documents: JourneyDocument[];
	/** The step's phase is all the lists ask for. */
	expand?: { journey_steps_via_journey?: Pick<JourneyStep, 'phase'>[] };
}

/** What the side timeline reads from a step or from a phase-end milestone. */
export type TimelineEntry = Pick<JourneyStep, 'id' | 'phase' | 'title'>;

export interface VisNode extends SimulationNodeDatum {
	id: string;
	/** Raw node: labels, description and links come from it via localizedNode(raw, code). */
	raw: Node;
	type: NodeType;
	degree: number;
}

export interface VisEdge extends SimulationLinkDatum<VisNode> {
	id: string;
}

export interface JourneyGraphData {
	types: NodeType[];
	nodes: VisNode[];
	edges: VisEdge[];
}

/** What stands out on the graph. null = the whole graph, nothing dimmed. */
export interface GraphHighlight {
	nodes: Set<string>;
	edges: Set<string>;
}
