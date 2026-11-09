import type { RecordModel } from 'pocketbase';
import type { AccountRole } from '$lib/roles';
import type {
	Localized,
	NodeTranslation,
	NodeTypeTranslation,
	MapTranslation
} from '$lib/i18n';

// i18n re-exports, so any file importing `from $lib/services` finds
// these types in the same place.
export type {
	Locale,
	Localized,
	Translation,
	NodeTranslation,
	NodeTypeTranslation,
	MapTranslation
} from '$lib/i18n';

export interface NodeType extends RecordModel {
	slug: string;
	color_slot: number;
	layer_order: number;
	base_size: number;
	expand?: { node_type_translations_via_node_type?: NodeTypeTranslation[] };
}

export interface NodeLink {
	label: Localized;
	url: string;
}

export interface Node extends RecordModel {
	type: string;
	links: NodeLink[];
	order: number;
	weight_override: number | null;
	expand?: { node_translations_via_node?: NodeTranslation[] };
}

export interface Edge extends RecordModel {
	source: string;
	target: string;
}

export interface MapRecord extends RecordModel {
	slug: string;
	order: number;
	expand?: { map_translations_via_map?: MapTranslation[] };
}

export interface MapNode extends RecordModel {
	map: string;
	node: string;
	x: number | null;
	y: number | null;
}

export interface Account extends RecordModel {
	email: string;
	/** Empty on an account older than the field: it signs in and writes nothing. */
	role: AccountRole | '';
}

/**
 * "Flattened" views used by the UI: the i18n `localized*()` helper takes
 * the record + expand, picks the translation by the current locale with
 * fallback, and produces these render-ready objects.
 */
export interface NodeView {
	id: string;
	type: string;
	order: number;
	weight_override: number | null;
	links: NodeLink[];
	label: string;
	label_full: string;
	description: string;
}

export interface NodeTypeView {
	id: string;
	slug: string;
	color_slot: number;
	layer_order: number;
	base_size: number;
	label: string;
	label_plural: string;
}

export interface MapView {
	id: string;
	slug: string;
	order: number;
	label: string;
}
