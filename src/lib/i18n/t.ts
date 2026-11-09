import { fallbackChain, localesState } from './config.svelte';
import type {
	Localized,
	NodeTranslation,
	NodeTypeTranslation,
	MapTranslation,
	Translation
} from './types';

/**
 * Reads a localized JSON value (Localized) with fallback.
 * Also accepts a raw string (legacy pre-migration data) and returns it as is.
 * Accepts null/undefined and returns ''.
 *
 * Used for NodeLink.label, which is JSON nested in nodes.links.
 */
export function t(value: Localized | string | null | undefined, code: string): string {
	if (value == null) return '';
	if (typeof value === 'string') return value;
	for (const c of fallbackChain(code)) {
		const v = value[c];
		if (v) return v;
	}
	return '';
}

/**
 * Picks the right translation from a list expanded via PB.
 * Each item carries its `locale` code.
 * Walks the fallback chain until one matches; returns null if none does.
 */
export function pickTranslation<T extends Translation>(translations: T[], code: string): T | null {
	if (!translations || translations.length === 0) return null;
	for (const c of fallbackChain(code)) {
		const target = localesState.byCode(c);
		if (!target) continue;
		const hit = translations.find((t) => t.locale === target.id);
		if (hit) return hit;
	}
	return null;
}

/** True if the Localized object has a non-empty value for that locale. */
export function hasLocalized(value: Localized | string | null | undefined, code: string): boolean {
	if (value == null) return false;
	if (typeof value === 'string') return code === localesState.default;
	return !!value[code];
}

/**
 * True when the displayed value did NOT come from the requested locale: either
 * the translation fell back to another language in the chain, or none exists
 * and the value is read from the legacy field (assumed to be the default locale).
 */
function isFallback(pick: Translation | null, code: string): boolean {
	if (!pick) return code !== localesState.default;
	const fromCode = localesState.byId(pick.locale)?.code;
	return fromCode !== code;
}

// ────────────────────────────────────────────────────
// Specialized helpers for the app's 3 entity types
// ────────────────────────────────────────────────────

interface RecordWithNodeTranslations {
	id: string;
	type: string;
	order: number;
	weight_override: number | null;
	links: { label: Localized | string; url: string }[];
	expand?: { node_translations_via_node?: NodeTranslation[] };
	// Legacy fields, tolerated during the transition
	label?: string;
	label_full?: string;
	description?: string;
}

export function localizedNode(node: RecordWithNodeTranslations, code: string) {
	const translations = node.expand?.node_translations_via_node ?? [];
	const pick = pickTranslation(translations, code);
	return {
		id: node.id,
		type: node.type,
		order: node.order,
		weight_override: node.weight_override,
		links: (node.links ?? []).map((l) => ({
			label: typeof l.label === 'string' ? { pt: l.label } : (l.label ?? {}),
			url: l.url
		})),
		label: pick?.label ?? node.label ?? '',
		label_full: pick?.label_full ?? node.label_full ?? '',
		description: pick?.description ?? node.description ?? '',
		is_fallback: isFallback(pick, code)
	};
}

interface RecordWithNodeTypeTranslations {
	id: string;
	slug: string;
	color_slot: number;
	layer_order: number;
	base_size: number;
	expand?: { node_type_translations_via_node_type?: NodeTypeTranslation[] };
	label?: string;
	label_plural?: string;
}

export function localizedNodeType(nt: RecordWithNodeTypeTranslations, code: string) {
	const translations = nt.expand?.node_type_translations_via_node_type ?? [];
	const pick = pickTranslation(translations, code);
	return {
		id: nt.id,
		slug: nt.slug,
		color_slot: nt.color_slot,
		layer_order: nt.layer_order,
		base_size: nt.base_size,
		label: pick?.label ?? nt.label ?? '',
		label_plural: pick?.label_plural ?? nt.label_plural ?? '',
		is_fallback: isFallback(pick, code)
	};
}

interface RecordWithMapTranslations {
	id: string;
	slug: string;
	order: number;
	expand?: { map_translations_via_map?: MapTranslation[] };
	label?: string;
}

export function localizedMap(m: RecordWithMapTranslations, code: string) {
	const translations = m.expand?.map_translations_via_map ?? [];
	const pick = pickTranslation(translations, code);
	return {
		id: m.id,
		slug: m.slug,
		order: m.order,
		label: pick?.label ?? m.label ?? '',
		is_fallback: isFallback(pick, code)
	};
}
