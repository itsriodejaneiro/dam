/* The write tools of the map (docs/api-agentes.md § Escrita): categories, maps, the
   deployment's settings, entities, their places on the maps and the connections. Each write
   is recorded before it happens (ctx.record), and repeating a call leaves the map as it is:
   an existing id updates, a new id creates with it, and no id finds the record by what
   identifies it (the slug, the label in the default locale within a category, the pair). */
import { z } from 'zod';
import { LOCALE_CODES } from '$lib/i18n/messages';
import { isPack, PACKS } from '$lib/theme';
import type { BatchOp } from '../store';
import {
	byRef,
	checkLocales,
	checkUrl,
	cleanHtml,
	loadCategories,
	loadEntities,
	loadMaps,
	LocalizedHtml,
	LocalizedText,
	newRecordId,
	notFound,
	RecordId,
	Ref,
	requireDefault,
	Slug,
	type CategoryView,
	type MapView,
	type Translation
} from './shared';
import { tool, ToolError, type ToolContext } from './types';

/** The operations that leave the translations of a record as the input says, in the locales given. */
function translationOps(
	collection: string,
	parent: string,
	parentId: string,
	existing: Translation[],
	texts: Record<string, Record<string, string>>
): BatchOp[] {
	const ops: BatchOp[] = [];
	for (const [locale, fields] of Object.entries(texts)) {
		const current = existing.find((t) => t.locale === locale);
		const data = { [parent]: parentId, locale, ...fields };
		ops.push(current ? { op: 'update', collection, id: current.id, data } : { op: 'create', collection, data });
	}
	return ops;
}

/** The locales of a labelled record, from its label and the other texts given alongside. */
function textsByLocale(ctx: ToolContext, label: Record<string, string>, field: string, extra: Record<string, Record<string, string> | undefined>): Record<string, Record<string, string>> {
	const texts: Record<string, Record<string, string>> = {};
	for (const [code, value] of Object.entries(label)) if (value) texts[code] = { label: value };
	for (const [name, byLocale] of Object.entries(extra)) {
		for (const [code, value] of Object.entries(byLocale ?? {})) {
			if (!texts[code]) throw new ToolError('bad_request', `${field}: the locale "${code}" has a ${name} but no label.`, { field });
			texts[code][name] = value;
		}
	}
	return texts;
}

// ── Categories ──

const CategoryInput = z.strictObject({
	id: RecordId.optional().describe('the category to update; a new id creates it with that id'),
	slug: Slug.describe('identifies the category when there is no id'),
	color_slot: z.int().min(1).max(8).describe('one of the 8 colours of the theme'),
	layer_order: z.int().min(1).optional().describe('its lane on the map, from the top; a new category goes last'),
	base_size: z.int().min(8).max(80).optional().describe('the size of its nodes, 24 by default'),
	show_labels: z.boolean().optional().describe('whether its nodes carry their name on the map, true by default; off, the name shows on hover, focus, selection and highlight'),
	label: LocalizedText,
	label_plural: LocalizedText.optional()
});

export const saveCategory = tool({
	name: 'save_category',
	title: 'Save a category',
	description: 'Creates or updates a category (a lane of the map): slug, colour, size, order, whether its nodes show their labels, label and plural per locale. With no id, the slug finds it.',
	input: CategoryInput,
	annotations: { idempotentHint: true },
	async run(ctx, input) {
		const label = requireDefault(ctx, checkLocales(ctx, input.label, 'label'), 'label');
		const plural = checkLocales(ctx, input.label_plural, 'label_plural');
		const categories = await loadCategories(ctx.store);
		const current = (input.id && categories.find((c) => c.id === input.id)) || (!input.id && categories.find((c) => c.slug === input.slug)) || null;
		const taken = categories.find((c) => c.slug === input.slug && c.id !== current?.id);
		if (taken) throw new ToolError('conflict', `The slug "${input.slug}" belongs to the category ${taken.id}.`, { id: taken.id });
		const id = current?.id ?? input.id ?? newRecordId();
		const fields = {
			slug: input.slug,
			color_slot: input.color_slot,
			layer_order: input.layer_order ?? current?.layer_order ?? Math.max(0, ...categories.map((c) => c.layer_order)) + 1,
			base_size: input.base_size ?? current?.base_size ?? 24,
			show_labels: input.show_labels ?? current?.show_labels ?? true
		};
		const existing = await ctx.store.list<Translation>('node_type_translations');
		const texts = textsByLocale(ctx, label, 'label', { label_plural: plural });
		await ctx.record({ tool: 'save_category', collection: 'node_types', record: id, action: current ? 'update' : 'create', previous: current });
		await ctx.store.batch([
			current ? { op: 'update', collection: 'node_types', id, data: fields } : { op: 'create', collection: 'node_types', data: { id, ...fields } },
			...translationOps('node_type_translations', 'node_type', id, existing.filter((t) => t.node_type === id), texts)
		]);
		const saved = (await loadCategories(ctx.store)).find((c) => c.id === id) as CategoryView;
		return { id, created: !current, category: saved };
	}
});

// ── Maps ──

const MapInput = z.strictObject({
	id: RecordId.optional().describe('the map to update; a new id creates it with that id'),
	slug: Slug.describe('identifies the map when there is no id; its address is /maps/<slug>'),
	order: z.int().min(2).optional().describe('its place in the list, after the main map; a new map goes last'),
	label: LocalizedText
});

export const saveMap = tool({
	name: 'save_map',
	title: 'Save a map',
	description: 'Creates or updates a map: slug, order and label per locale. The main map, the first, is never edited here. With no id, the slug finds it.',
	input: MapInput,
	annotations: { idempotentHint: true },
	async run(ctx, input) {
		const label = requireDefault(ctx, checkLocales(ctx, input.label, 'label'), 'label');
		const maps = await loadMaps(ctx.store);
		const current = (input.id && maps.find((m) => m.id === input.id)) || (!input.id && maps.find((m) => m.slug === input.slug)) || null;
		if (current?.main) throw new ToolError('bad_request', 'The main map is not edited by the API: its label changes in /admin/maps.', { id: current.id });
		const taken = maps.find((m) => m.slug === input.slug && m.id !== current?.id);
		if (taken) throw new ToolError('conflict', `The slug "${input.slug}" belongs to the map ${taken.id}.`, { id: taken.id });
		const id = current?.id ?? input.id ?? newRecordId();
		const fields = { slug: input.slug, order: input.order ?? current?.order ?? Math.max(1, ...maps.map((m) => m.order)) + 1 };
		const existing = await ctx.store.list<Translation>('map_translations');
		await ctx.record({ tool: 'save_map', collection: 'maps', record: id, action: current ? 'update' : 'create', previous: current });
		await ctx.store.batch([
			current ? { op: 'update', collection: 'maps', id, data: fields } : { op: 'create', collection: 'maps', data: { id, ...fields } },
			...translationOps('map_translations', 'map', id, existing.filter((t) => t.map === id), textsByLocale(ctx, label, 'label', {}))
		]);
		const saved = (await loadMaps(ctx.store)).find((m) => m.id === id) as MapView;
		return { id, created: !current, map: saved };
	}
});

// ── Settings ──

const NAME_MAX_CHARS = 120;

export const saveSettings = tool({
	name: 'save_settings',
	title: 'Save the settings',
	description:
		'Updates the deployment\'s identity: name per locale, the locales it offers and the default one, the theme, and whether the journeys section shows. Only what is given changes. ' +
		'The flag and the logo are files: they change in /admin/settings.',
	input: z.strictObject({
		name: LocalizedText.optional().describe('the name of the place or sector mapped, per locale, up to 120 characters'),
		locales: z.array(z.enum(LOCALE_CODES)).min(1).optional().describe('the locales the site offers, in order'),
		default_locale: z.enum(LOCALE_CODES).optional().describe('one of the locales'),
		theme: z.enum(PACKS).optional(),
		journeys: z.boolean().optional().describe('whether the journeys section shows')
	}),
	annotations: { idempotentHint: true },
	async run(ctx, input) {
		const [record] = await ctx.store.list('settings');
		if (!record) throw new ToolError('internal', 'This deployment has no settings record: run the setup.');
		const locales = [...new Set(input.locales ?? ctx.settings.locales)];
		const defaultLocale = input.default_locale ?? ctx.settings.defaultLocale;
		if (!locales.includes(defaultLocale)) throw new ToolError('bad_request', `default_locale "${defaultLocale}" is not among the locales (${locales.join(', ')}).`, { field: 'default_locale' });
		const theme = input.theme ?? ctx.settings.theme;
		if (!isPack(theme)) throw new ToolError('bad_request', `theme "${theme}" is not one of ${PACKS.join(', ')}.`, { field: 'theme' });
		const name: Record<string, string> = {};
		for (const [code, value] of Object.entries(input.name ?? ctx.settings.name)) {
			if (!locales.includes(code)) {
				if (input.name) throw new ToolError('bad_request', `name: "${code}" is not among the locales (${locales.join(', ')}).`, { field: 'name' });
				continue;
			}
			const text = value.trim();
			if (text.length > NAME_MAX_CHARS) throw new ToolError('bad_request', `name: up to ${NAME_MAX_CHARS} characters.`, { field: 'name' });
			if (text) name[code] = text;
		}
		const data = { name, locales, default_locale: defaultLocale, theme, journeys: input.journeys ?? ctx.settings.journeys };
		const { name: oldName, locales: oldLocales, default_locale, theme: oldTheme, journeys } = record;
		await ctx.record({ tool: 'save_settings', collection: 'settings', record: record.id, action: 'update', previous: { name: oldName, locales: oldLocales, default_locale, theme: oldTheme, journeys } });
		await ctx.store.update('settings', record.id, data);
		ctx.settingsChanged?.();
		return { settings: { ...data, flag: ctx.settings.flag, logo: ctx.settings.logo } };
	}
});

// ── Entities ──

export const ENTITIES_PER_CALL = 50;

const LinkInput = z.strictObject({ label: LocalizedText, url: z.string().max(2000).describe('http, https or mailto') });

const EntityInput = z.strictObject({
	id: RecordId.optional().describe('the entity to update; a new id creates it with that id'),
	category: Ref.describe('a category, by id or slug'),
	label: LocalizedText.describe('the short name, per locale; the default locale is required'),
	label_full: LocalizedText.optional().describe('the full name, per locale'),
	description: LocalizedHtml.optional(),
	links: z.array(LinkInput).max(20).optional(),
	maps: z.array(Ref).min(1).max(20).describe('the maps it is on, by id or slug: the whole set'),
	order: z.int().optional()
});

export const saveEntities = tool({
	name: 'save_entities',
	title: 'Save entities',
	description:
		`Creates or updates up to ${ENTITIES_PER_CALL} entities, each whole: category, texts per locale, links and the maps it is on. ` +
		'With no id, an entity of the same category with the same label in the default locale is the one updated. On an update, what is left out stays (texts of a locale not given, links, order); maps is always the whole set. Each entity is one transaction; the call checks every entity before it writes any. ' +
		'A new entity on a map gets its position from the automatic layout; place_entities sets one.',
	input: z.strictObject({ entities: z.array(EntityInput).min(1).max(ENTITIES_PER_CALL) }),
	annotations: { idempotentHint: true },
	async run(ctx, { entities }) {
		const set = await loadEntities(ctx.store);
		const defaultLocale = ctx.settings.defaultLocale;
		const plans = entities.map((input, index) => {
			const at = `entities[${index}]`;
			const category = byRef(set.categories, input.category);
			if (!category) throw notFound('category', input.category);
			const label = requireDefault(ctx, checkLocales(ctx, input.label, `${at}.label`), `${at}.label`);
			const texts = textsByLocale(ctx, label, `${at}.label`, {
				label_full: checkLocales(ctx, input.label_full, `${at}.label_full`),
				description: cleanHtml(ctx, input.description, `${at}.description`)
			});
			const maps = input.maps.map((ref) => {
				const map = byRef(set.maps, ref);
				if (!map) throw notFound('map', ref);
				return map.id;
			});
			const current =
				(input.id && set.entities.find((e) => e.id === input.id)) ||
				(!input.id && set.entities.find((e) => e.category === category.id && e.label[defaultLocale] === label[defaultLocale])) ||
				null;
			// what an update leaves out stays: the links and the order, like the texts of a locale not given
			const links = input.links ? input.links.map((l, i) => ({ label: checkLocales(ctx, l.label, `${at}.links[${i}].label`), url: checkUrl(l.url, `${at}.links[${i}].url`) })) : (current?.links ?? []);
			return { input, at, category, texts, maps: [...new Set(maps)], links, current, id: current?.id ?? input.id ?? newRecordId() };
		});
		const seen = new Map<string, string>();
		for (const plan of plans) {
			const key = `${plan.category.id}\n${plan.texts[defaultLocale].label}`;
			const other = seen.get(key);
			if (other && other !== plan.id) throw new ToolError('bad_request', `${plan.at} repeats the label "${plan.texts[defaultLocale].label}" of ${other} in the same category.`);
			seen.set(key, plan.id);
		}

		const items: { id: string; created: boolean; label: string }[] = [];
		for (const plan of plans) {
			const { id, current } = plan;
			const data = { type: plan.category.id, links: plan.links, order: plan.input.order ?? current?.order ?? 0 };
			const ops: BatchOp[] = [current ? { op: 'update', collection: 'nodes', id, data } : { op: 'create', collection: 'nodes', data: { id, ...data } }];
			ops.push(...translationOps('node_translations', 'node', id, set.rows.translations.get(id) ?? [], plan.texts));
			const placed = set.rows.placements.filter((p) => p.node === id);
			for (const map of plan.maps) if (!placed.some((p) => p.map === map)) ops.push({ op: 'create', collection: 'map_nodes', data: { map, node: id, x: null, y: null } });
			for (const p of placed) if (!plan.maps.includes(p.map)) ops.push({ op: 'delete', collection: 'map_nodes', id: p.id });
			try {
				await ctx.record({ tool: 'save_entities', collection: 'nodes', record: id, action: current ? 'update' : 'create', previous: current });
				await ctx.store.batch(ops);
			} catch (err) {
				// a refusal the store already named (the batch off) keeps its message; the rest is logged here
				if (!(err instanceof ToolError)) console.error('[api] save_entities failed', plan.at, err);
				const why = err instanceof ToolError ? ` ${err.message}` : '';
				throw new ToolError('internal', `${plan.at} failed to save.${why} The entities before it are saved: ${items.map((i) => i.id).join(', ') || 'none'}. Send the rest again.`, { saved: items });
			}
			items.push({ id, created: !current, label: plan.texts[defaultLocale].label });
		}
		return { items };
	}
});

// ── Positions ──

const PositionInput = z.strictObject({
	entity: RecordId,
	x: z.number().nullable().describe('in graph units, 0 to 1280 across; null with y null returns the entity to the automatic layout'),
	y: z.number().nullable().describe('in graph units, within the lane of its category')
});

export const placeEntities = tool({
	name: 'place_entities',
	title: 'Place entities',
	description: 'Sets where entities sit on one map, in graph units; x and y both null give the position back to the automatic layout. The entity must already be on the map (save_entities puts it there).',
	input: z.strictObject({ map: Ref, positions: z.array(PositionInput).min(1).max(200) }),
	annotations: { idempotentHint: true },
	async run(ctx, { map: ref, positions }) {
		const set = await loadEntities(ctx.store);
		const map = byRef(set.maps, ref);
		if (!map) throw notFound('map', ref);
		const rows = positions.map((p, i) => {
			if ((p.x === null) !== (p.y === null)) throw new ToolError('bad_request', `positions[${i}]: x and y are both numbers, or both null.`);
			const row = set.rows.placements.find((r) => r.map === map.id && r.node === p.entity);
			if (!row) throw new ToolError('bad_request', `positions[${i}]: the entity ${p.entity} is not on the map "${map.slug}". save_entities adds it to the map first.`, { entity: p.entity });
			return { row, x: p.x, y: p.y };
		});
		for (const { row, x, y } of rows) {
			await ctx.record({ tool: 'place_entities', collection: 'map_nodes', record: row.id, action: 'update', previous: { map: row.map, node: row.node, x: row.x, y: row.y } });
			await ctx.store.update('map_nodes', row.id, { x, y });
		}
		return { placed: rows.length };
	}
});

// ── Connections ──

export const CONNECTIONS_PER_CALL = 200;

const ConnectionInput = z.strictObject({
	id: RecordId.optional().describe('the connection to update; a new id creates it with that id'),
	source: RecordId.describe('the entity the connection starts at'),
	target: RecordId.describe('the entity it points at')
});

export const saveConnections = tool({
	name: 'save_connections',
	title: 'Save connections',
	description: `Creates up to ${CONNECTIONS_PER_CALL} connections between entities, source to target. A pair that already exists comes back with its id and is not written again. A connection points from the upper layer to the lower one, in the order of the categories get_deployment returns (a document to its base, a base to its operator, the operator to its manager, the manager to the policy); every pair is written, and warnings lists the ones that point upward.`,
	input: z.strictObject({ connections: z.array(ConnectionInput).min(1).max(CONNECTIONS_PER_CALL) }),
	annotations: { idempotentHint: true },
	async run(ctx, { connections }) {
		const [set, edges] = await Promise.all([loadEntities(ctx.store), ctx.store.list('edges')]);
		const entityById = new Map(set.entities.map((e) => [e.id, e]));
		const layerOf = new Map(set.categories.map((c) => [c.id, c.layer_order]));
		const defaultLocale = ctx.settings.defaultLocale;
		const name = (id: string) => `"${entityById.get(id)!.label[defaultLocale] ?? Object.values(entityById.get(id)!.label)[0] ?? ''}" (${id})`;
		const warnings: string[] = [];
		const pairs = new Map(edges.map((e) => [`${e.source}>${e.target}`, e.id]));
		const byId = new Map(edges.map((e) => [e.id, e]));
		const items: { id: string; created: boolean }[] = [];
		for (const [i, c] of connections.entries()) {
			const at = `connections[${i}]`;
			if (c.source === c.target) throw new ToolError('bad_request', `${at}: an entity does not connect to itself.`);
			for (const end of [c.source, c.target]) if (!entityById.has(end)) throw notFound('entity', end);
			const key = `${c.source}>${c.target}`;
			const from = entityById.get(c.source)!;
			const to = entityById.get(c.target)!;
			if ((layerOf.get(from.category) ?? 0) > (layerOf.get(to.category) ?? 0)) warnings.push(`${at}: ${name(c.source)} points up to ${name(c.target)}, a higher layer; connections point from the upper layer to the lower one. It is saved as given.`);
			const existingId = pairs.get(key);
			if (existingId && (!c.id || existingId === c.id)) {
				items.push({ id: existingId, created: false });
				continue;
			}
			if (existingId) throw new ToolError('conflict', `${at}: the pair already exists as ${existingId}.`, { id: existingId });
			const current = c.id ? byId.get(c.id) : undefined;
			const id = c.id ?? newRecordId();
			await ctx.record({ tool: 'save_connections', collection: 'edges', record: id, action: current ? 'update' : 'create', previous: current ? { source: current.source, target: current.target } : null });
			if (current) {
				pairs.delete(`${current.source}>${current.target}`);
				await ctx.store.update('edges', id, { source: c.source, target: c.target });
			} else await ctx.store.create('edges', { id, source: c.source, target: c.target });
			pairs.set(key, id);
			items.push({ id, created: !current });
		}
		return { items, warnings };
	}
});

export const WRITE_TOOLS = [saveCategory, saveMap, saveSettings, saveEntities, placeEntities, saveConnections];

