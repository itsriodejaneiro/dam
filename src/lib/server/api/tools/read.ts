/* The read tools (docs/api-agentes.md § Leitura): the deployment as a whole, the entities,
   the connections and the journeys with their edit. Any token reads all of it. */
import { z } from 'zod';
import type { Journey, JourneyStep } from '$lib/types/journey';
import { byRef, loadCategories, loadEntities, loadMaps, notFound, pageOf, RecordId, Ref } from './shared';
import { tool } from './types';

const stepView = (s: JourneyStep) => ({
	id: s.id,
	order: s.order,
	phase: s.phase,
	title: s.title ?? {},
	body: s.body ?? {},
	duration: s.duration ?? null,
	camera: s.camera ?? null,
	entities: s.highlight_nodes ?? [],
	connections: s.highlight_edges ?? []
});

/** The edit of a journey: the record without its published copy, and whether there is one. */
const journeyView = (j: Journey, steps: JourneyStep[]) => ({
	id: j.id,
	slug: j.slug,
	map: j.map,
	title: j.title ?? {},
	description: j.description ?? {},
	phases: j.phases ?? [],
	documents: j.documents ?? [],
	published: j.published != null,
	steps: steps.filter((s) => s.journey === j.id).sort((a, b) => a.order - b.order).map(stepView)
});

export const JOURNEY_FIELDS = 'id,slug,map,title,description,phases,documents,published,created,updated';

/** Journeys without the copy: `published` comes back as true or false only. */
export async function loadJourneys(store: import('../store').Store): Promise<Journey[]> {
	return store.list<Journey>('journeys', { fields: JOURNEY_FIELDS });
}

export const getDeployment = tool({
	name: 'get_deployment',
	title: 'The deployment',
	description:
		'Start here. The deployment\'s settings (name per locale, locales and the default one, theme, feature flags), its categories, its maps and what this token is. ' +
		'Every text the other tools take is per locale code, and only the locales listed here are accepted. The first map is the main one.',
	input: z.strictObject({}),
	annotations: { readOnlyHint: true },
	async run(ctx) {
		const [categories, maps] = await Promise.all([loadCategories(ctx.store), loadMaps(ctx.store)]);
		const { name, locales, defaultLocale, theme, flag, logo, journeys } = ctx.settings;
		return {
			settings: { name, locales, default_locale: defaultLocale, theme, flag, logo, journeys },
			categories,
			maps,
			token: { name: ctx.token.name, prefix: ctx.token.prefix },
			site: ctx.origin,
			admin: `${ctx.origin}/admin/journeys`
		};
	}
});

export const listEntities = tool({
	name: 'list_entities',
	title: 'List entities',
	description:
		'The entities (the nodes of the map), each with its texts per locale, its links and the maps it is on, with its position when someone placed it. ' +
		'Filter by a text in any label, by category and by map; paginate with page and per_page.',
	input: z.strictObject({
		query: z.string().max(200).optional().describe('a text to find in the labels, in any locale, case-insensitive'),
		category: Ref.optional().describe('a category, by id or slug'),
		map: Ref.optional().describe('a map, by id or slug'),
		page: z.int().min(1).default(1),
		per_page: z.int().min(1).max(200).default(50)
	}),
	annotations: { readOnlyHint: true },
	async run(ctx, { query, category, map, page, per_page }) {
		const { entities, categories, maps } = await loadEntities(ctx.store);
		let items = entities;
		if (category) {
			const found = byRef(categories, category);
			if (!found) throw notFound('category', category);
			items = items.filter((e) => e.category === found.id);
		}
		if (map) {
			const found = byRef(maps, map);
			if (!found) throw notFound('map', map);
			items = items.filter((e) => e.maps.some((p) => p.map === found.id));
		}
		if (query) {
			const needle = query.trim().toLocaleLowerCase();
			items = items.filter((e) => [...Object.values(e.label), ...Object.values(e.label_full)].some((text) => text.toLocaleLowerCase().includes(needle)));
		}
		return pageOf(items, page, per_page);
	}
});

export const getEntity = tool({
	name: 'get_entity',
	title: 'One entity',
	description: 'An entity by its id, whole: texts per locale, links and the maps it is on.',
	input: z.strictObject({ id: RecordId }),
	annotations: { readOnlyHint: true },
	async run(ctx, { id }) {
		const { entities } = await loadEntities(ctx.store);
		const found = entities.find((e) => e.id === id);
		if (!found) throw notFound('entity', id);
		return found;
	}
});

export const listConnections = tool({
	name: 'list_connections',
	title: 'List connections',
	description: 'The connections between entities: source and target ids, with their labels in the default locale. Filter by an entity at either end.',
	input: z.strictObject({ entity: RecordId.optional().describe('an entity at either end') }),
	annotations: { readOnlyHint: true },
	async run(ctx, { entity }) {
		const [{ entities }, edges] = await Promise.all([loadEntities(ctx.store), ctx.store.list('edges')]);
		const label = new Map(entities.map((e) => [e.id, e.label[ctx.settings.defaultLocale] ?? Object.values(e.label)[0] ?? '']));
		const items = edges
			.filter((e) => !entity || e.source === entity || e.target === entity)
			.map((e) => ({ id: e.id, source: String(e.source), target: String(e.target), source_label: label.get(String(e.source)) ?? '', target_label: label.get(String(e.target)) ?? '' }));
		return { items, total_items: items.length };
	}
});

export const listJourneys = tool({
	name: 'list_journeys',
	title: 'List journeys',
	description: 'The journeys, with their edit (what the editor shows) and whether a published copy is on the site. Steps come with get_journey.',
	input: z.strictObject({}),
	annotations: { readOnlyHint: true },
	async run(ctx) {
		const [journeys, steps] = await Promise.all([loadJourneys(ctx.store), ctx.store.list<JourneyStep>('journey_steps', { fields: 'id,journey,order,phase' })]);
		return {
			items: journeys.map((j) => {
				const { steps: own, ...rest } = journeyView(j, steps);
				return { ...rest, steps: own.length };
			})
		};
	}
});

export const getJourney = tool({
	name: 'get_journey',
	title: 'One journey',
	description: 'A journey by id or slug, with its edit: phases, documents and the steps in order, each with the entities and connections it highlights.',
	input: z.strictObject({ id: Ref }),
	annotations: { readOnlyHint: true },
	async run(ctx, { id }) {
		const journeys = await loadJourneys(ctx.store);
		const found = byRef(journeys, id);
		if (!found) throw notFound('journey', id);
		const steps = await ctx.store.list<JourneyStep>('journey_steps');
		return journeyView(found, steps);
	}
});

export const READ_TOOLS = [getDeployment, listEntities, getEntity, listConnections, listJourneys, getJourney];
