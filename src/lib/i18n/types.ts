import type { RecordModel } from 'pocketbase';

/**
 * Supported locale. Comes from the deploy's settings.
 * `id` equals `code`: the code IS the real identity (the translation
 * tables store the code in the `locale` field). Kept as a separate field
 * for compatibility with the rest of the app (byId/byCode, #each keys).
 */
export interface Locale {
	id: string;
	code: string;
	label: string;
	is_default: boolean;
	sort_order: number;
	direction: 'ltr' | 'rtl';
}

/**
 * Shape of inline JSON keyed by locale (used in NodeLink.label).
 * Relational tables use the Translation<T> shape below.
 */
export type Localized = Record<string, string>;

/**
 * Generic shape of a translation. The `locale` field stores the locale CODE
 * (e.g. 'pt') as text.
 */
export interface Translation extends RecordModel {
	locale: string;
}

export interface NodeTranslation extends Translation {
	node: string;
	label: string;
	label_full: string;
	description: string;
}

export interface NodeTypeTranslation extends Translation {
	node_type: string;
	label: string;
	label_plural: string;
}

export interface MapTranslation extends Translation {
	map: string;
	label: string;
}
