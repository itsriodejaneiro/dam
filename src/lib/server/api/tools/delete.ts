/* The delete tools (docs/api-agentes.md § Escrita). What a screen refuses, these refuse: a
   category with entities goes only once they move, the main map stays, a map a published
   journey shows stays. PocketBase cascades what hangs off a record (translations, places on
   maps, connections, steps), and the record of the write keeps the whole thing. */
import { z } from 'zod';
import type { Journey, JourneyStep } from '$lib/types/journey';
import { loadJourneys } from './read';
import { byRef, loadCategories, loadEntities, loadMaps, notFound, RecordId, Ref } from './shared';
import { tool, ToolError } from './types';

export const deleteEntity = tool({
	name: 'delete_entity',
	title: 'Delete an entity',
	description: 'Deletes an entity, with its texts, its places on the maps and its connections. A journey step that highlighted it keeps going without it.',
	input: z.strictObject({ id: RecordId }),
	annotations: { destructiveHint: true, idempotentHint: true },
	async run(ctx, { id }) {
		const { entities } = await loadEntities(ctx.store);
		const entity = entities.find((e) => e.id === id);
		if (!entity) throw notFound('entity', id);
		await ctx.record({ tool: 'delete_entity', collection: 'nodes', record: id, action: 'delete', previous: entity });
		await ctx.store.remove('nodes', id);
		return { deleted: id };
	}
});

export const deleteConnection = tool({
	name: 'delete_connection',
	title: 'Delete a connection',
	description: 'Deletes a connection between two entities.',
	input: z.strictObject({ id: RecordId }),
	annotations: { destructiveHint: true, idempotentHint: true },
	async run(ctx, { id }) {
		const edge = await ctx.store.one('edges', id);
		if (!edge) throw notFound('connection', id);
		await ctx.record({ tool: 'delete_connection', collection: 'edges', record: id, action: 'delete', previous: { source: edge.source, target: edge.target } });
		await ctx.store.remove('edges', id);
		return { deleted: id };
	}
});

export const deleteCategory = tool({
	name: 'delete_category',
	title: 'Delete a category',
	description: 'Deletes a category. One with entities needs move_entities_to, another category the entities move to first; the map never loses an entity by losing its category.',
	input: z.strictObject({ id: Ref, move_entities_to: Ref.optional() }),
	annotations: { destructiveHint: true },
	async run(ctx, { id: ref, move_entities_to }) {
		const { entities, categories } = await loadEntities(ctx.store);
		const category = byRef(categories, ref);
		if (!category) throw notFound('category', ref);
		const inside = entities.filter((e) => e.category === category.id);
		if (inside.length > 0) {
			if (!move_entities_to) throw new ToolError('bad_request', `The category "${category.slug}" has ${inside.length} entities: name move_entities_to, the category they go to.`, { entities: inside.map((e) => e.id) });
			const target = byRef(categories, move_entities_to);
			if (!target) throw notFound('category', move_entities_to);
			if (target.id === category.id) throw new ToolError('bad_request', 'move_entities_to is the category being deleted.');
			for (const e of inside) {
				await ctx.record({ tool: 'delete_category', collection: 'nodes', record: e.id, action: 'update', previous: { type: e.category } });
				await ctx.store.update('nodes', e.id, { type: target.id });
			}
		}
		await ctx.record({ tool: 'delete_category', collection: 'node_types', record: category.id, action: 'delete', previous: category });
		await ctx.store.remove('node_types', category.id);
		return { deleted: category.id, moved: inside.length };
	}
});

export const deleteMap = tool({
	name: 'delete_map',
	title: 'Delete a map',
	description: 'Deletes a map and the places of entities on it; the entities stay. The main map stays, and so does a map a journey walks.',
	input: z.strictObject({ id: Ref }),
	annotations: { destructiveHint: true },
	async run(ctx, { id: ref }) {
		const maps = await loadMaps(ctx.store);
		const map = byRef(maps, ref);
		if (!map) throw notFound('map', ref);
		if (map.main) throw new ToolError('bad_request', 'The main map is never deleted.', { id: map.id });
		const journeys = await ctx.store.list<Journey>('journeys');
		const walking = journeys.filter((j) => j.map === map.id || j.published?.map === map.id);
		if (walking.length > 0) throw new ToolError('conflict', `The map "${map.slug}" is walked by ${walking.map((j) => j.slug).join(', ')}: move the journey to another map, or delete it, first.`, { journeys: walking.map((j) => j.id) });
		await ctx.record({ tool: 'delete_map', collection: 'maps', record: map.id, action: 'delete', previous: map });
		await ctx.store.remove('maps', map.id);
		return { deleted: map.id };
	}
});

export const deleteJourney = tool({
	name: 'delete_journey',
	title: 'Delete a journey',
	description: 'Deletes a journey, its steps and its published copy: it leaves the site at once.',
	input: z.strictObject({ id: Ref }),
	annotations: { destructiveHint: true },
	async run(ctx, { id: ref }) {
		const found = byRef(await loadJourneys(ctx.store), ref);
		if (!found) throw notFound('journey', ref);
		const journey = (await ctx.store.one<Journey>('journeys', found.id)) as Journey;
		const steps = (await ctx.store.list<JourneyStep>('journey_steps')).filter((s) => s.journey === journey.id);
		await ctx.record({ tool: 'delete_journey', collection: 'journeys', record: journey.id, action: 'delete', previous: { ...journey, steps } });
		await ctx.store.remove('journeys', journey.id);
		return { deleted: journey.id };
	}
});

export const DELETE_TOOLS = [deleteEntity, deleteConnection, deleteCategory, deleteMap, deleteJourney];
