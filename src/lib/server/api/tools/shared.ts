/* What the tools share: the input shapes, the rules the screens enforce and the API
   enforces again (docs/api-agentes.md § Regras que só as telas cobram hoje), and the
   readers that turn the collections into the whole entity the agent sees. */
import { randomBytes } from 'node:crypto';
import type { RecordModel } from 'pocketbase';
import { z } from 'zod';
import { safeUrl, sanitizeHtml } from '$lib/sanitize';
import type { Localized } from '$lib/i18n';
import type { Store } from '../store';
import { ToolError, type ToolContext } from './types';

// ── Input shapes ──

export const RECORD_ID = /^[a-z0-9]{15}$/;
export const RecordId = z.string().regex(RECORD_ID, 'a record id has 15 lowercase letters or digits');
/** A record by its id, or a category, map or journey by its slug. */
export const Ref = z.string().min(1).max(100).describe('a record id, or a slug');
export const Slug = z.string().regex(/^[a-z0-9-]+$/, 'a slug has lowercase letters, digits and hyphens').max(100);
export const LocalizedText = z.record(z.string().regex(/^[a-z]{2}$/), z.string().max(5000)).describe('text per locale code, such as {"pt": "…", "en": "…"}: only the locales of the deployment');
export const LocalizedHtml = z.record(z.string().regex(/^[a-z]{2}$/), z.string().max(125000)).describe('HTML per locale code: paragraphs, headings h2 and h3, bold, italic, underline, lists and links (http, https, mailto); anything else is dropped');

/** A record id the agent chose, as the editor does in the browser. */
export function newRecordId(): string {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	return Array.from(randomBytes(15), (b) => alphabet[b % alphabet.length]).join('');
}

// ── The rules ──

/** Every key is a locale of the deployment, and the texts are trimmed. */
export function checkLocales(ctx: ToolContext, text: Localized | undefined, field: string): Localized {
	const clean: Localized = {};
	for (const [code, value] of Object.entries(text ?? {})) {
		if (!ctx.settings.locales.includes(code)) {
			throw new ToolError('bad_request', `${field}: "${code}" is not a locale of this deployment (${ctx.settings.locales.join(', ')}).`, { field });
		}
		clean[code] = value.trim();
	}
	return clean;
}

/** The text has the default locale: what the screens require of a label. */
export function requireDefault(ctx: ToolContext, text: Localized, field: string): Localized {
	const code = ctx.settings.defaultLocale;
	if (!text[code]) throw new ToolError('bad_request', `${field} needs the text in the default locale, "${code}".`, { field });
	return text;
}

/** Stored HTML, reduced to what the editor writes, in each locale. */
export function cleanHtml(ctx: ToolContext, html: Localized | undefined, field: string): Localized {
	const checked = checkLocales(ctx, html, field);
	return Object.fromEntries(Object.entries(checked).map(([code, value]) => [code, sanitizeHtml(value)]));
}

/** A link's address: http, https or mailto, in its normal form. */
export function checkUrl(url: string, field: string): string {
	const safe = safeUrl(url);
	if (!safe) throw new ToolError('bad_request', `${field}: "${url}" is not an http, https or mailto address.`, { field });
	return safe;
}

export function notFound(what: string, ref: string): ToolError {
	return new ToolError('not_found', `No ${what} "${ref}". list_entities, get_deployment and list_journeys show the ids and slugs that exist.`, { ref });
}

// ── Readers ──

export interface Translation extends RecordModel {
	locale: string;
	label: string;
	label_plural?: string;
	label_full?: string;
	description?: string;
}

/** The translations of a record, by the field name that points at the parent. */
export function groupTranslations(rows: Translation[], parent: 'node' | 'node_type' | 'map'): Map<string, Translation[]> {
	const byParent = new Map<string, Translation[]>();
	for (const row of rows) {
		const id = row[parent] as string;
		byParent.set(id, [...(byParent.get(id) ?? []), row]);
	}
	return byParent;
}

/** One field of a record's translations, as text per locale. */
export const localized = (rows: Translation[] | undefined, field: keyof Translation): Localized =>
	Object.fromEntries((rows ?? []).filter((r) => r[field]).map((r) => [r.locale, String(r[field])]));

export interface CategoryView {
	id: string;
	slug: string;
	color_slot: number;
	layer_order: number;
	base_size: number;
	label: Localized;
	label_plural: Localized;
}

export interface MapView {
	id: string;
	slug: string;
	order: number;
	label: Localized;
	/** The first map is the main one: never edited or removed. */
	main: boolean;
}

export async function loadCategories(store: Store): Promise<CategoryView[]> {
	const [types, translations] = await Promise.all([store.list('node_types'), store.list<Translation>('node_type_translations')]);
	const texts = groupTranslations(translations, 'node_type');
	return types
		.map((t) => ({
			id: t.id,
			slug: String(t.slug),
			color_slot: Number(t.color_slot),
			layer_order: Number(t.layer_order),
			base_size: Number(t.base_size),
			label: localized(texts.get(t.id), 'label'),
			label_plural: localized(texts.get(t.id), 'label_plural')
		}))
		.sort((a, b) => a.layer_order - b.layer_order);
}

export async function loadMaps(store: Store): Promise<MapView[]> {
	const [maps, translations] = await Promise.all([store.list('maps'), store.list<Translation>('map_translations')]);
	const texts = groupTranslations(translations, 'map');
	return maps
		.map((m) => ({ id: m.id, slug: String(m.slug), order: Number(m.order), label: localized(texts.get(m.id), 'label'), main: false }))
		.sort((a, b) => a.order - b.order)
		.map((m, i) => ({ ...m, main: i === 0 }));
}

/** A record by its id or its slug. */
export function byRef<T extends { id: string; slug: string }>(records: T[], ref: string): T | undefined {
	return records.find((r) => r.id === ref) ?? records.find((r) => r.slug === ref);
}

export interface EntityLink {
	label: Localized;
	url: string;
}

export interface Placement {
	map: string;
	slug: string;
	x: number | null;
	y: number | null;
}

/** An entity as the agent sees it: the node, its texts per locale and its places on the maps. */
export interface EntityView {
	id: string;
	category: string;
	category_slug: string;
	label: Localized;
	label_full: Localized;
	description: Localized;
	links: EntityLink[];
	maps: Placement[];
	order: number;
}

export interface MapNodeRow extends RecordModel {
	map: string;
	node: string;
	x: number | null;
	y: number | null;
}

export interface EntitySet {
	entities: EntityView[];
	categories: CategoryView[];
	maps: MapView[];
	/** The rows behind the views, for the writes. */
	rows: { nodes: RecordModel[]; translations: Map<string, Translation[]>; placements: MapNodeRow[] };
}

/** Every entity of the deployment, with what the writes need to compare against. */
export async function loadEntities(store: Store): Promise<EntitySet> {
	const [categories, maps, nodes, translations, placements] = await Promise.all([
		loadCategories(store),
		loadMaps(store),
		store.list('nodes'),
		store.list<Translation>('node_translations'),
		store.list<MapNodeRow>('map_nodes')
	]);
	const texts = groupTranslations(translations, 'node');
	const categoryById = new Map(categories.map((c) => [c.id, c]));
	const mapById = new Map(maps.map((m) => [m.id, m]));
	const placed = new Map<string, Placement[]>();
	for (const row of placements) {
		const map = mapById.get(row.map);
		if (!map) continue;
		// PocketBase stores an empty number as 0: (0, 0) is a node nobody has placed.
		const at = row.x || row.y ? { x: row.x, y: row.y } : { x: null, y: null };
		placed.set(row.node, [...(placed.get(row.node) ?? []), { map: map.id, slug: map.slug, ...at }]);
	}
	const entities = nodes.map((n) => ({
		id: n.id,
		category: String(n.type),
		category_slug: categoryById.get(String(n.type))?.slug ?? '',
		label: localized(texts.get(n.id), 'label'),
		label_full: localized(texts.get(n.id), 'label_full'),
		description: localized(texts.get(n.id), 'description'),
		links: Array.isArray(n.links) ? (n.links as EntityLink[]) : [],
		maps: placed.get(n.id) ?? [],
		order: Number(n.order ?? 0)
	}));
	return { entities, categories, maps, rows: { nodes, translations: texts, placements } };
}

/** A page of a list, for the agent to ask for the next one. */
export function pageOf<T>(items: T[], page: number, perPage: number) {
	const total = items.length;
	return {
		items: items.slice((page - 1) * perPage, page * perPage),
		page,
		per_page: perPage,
		total_items: total,
		total_pages: Math.max(1, Math.ceil(total / perPage))
	};
}
