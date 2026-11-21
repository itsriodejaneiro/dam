/* The journey tools (docs/api-agentes.md § Escrita): the journey and its steps go to the
   edit, which only an admin sees; the public copy changes with publish_journey alone, after
   the person has seen the preview and said yes. The rules are the editor's: a new map
   clears the steps' camera and highlights, a phase with steps stays, a step highlights
   entities on the journey's map and the connections among them come along. */
import { z } from 'zod';
import { toPublished } from '$lib/journey';
import type { Journey, JourneyDocument, JourneyPhase, JourneyStep } from '$lib/types/journey';
import { loadJourneys } from './read';
import { byRef, checkLocales, cleanHtml, loadMaps, LocalizedHtml, LocalizedText, newRecordId, notFound, RecordId, Ref, requireDefault, Slug, type MapNodeRow } from './shared';
import { tool, ToolError, type ToolContext } from './types';

const PhaseInput = z.strictObject({
	number: z.int().min(1),
	title: LocalizedText,
	summary: LocalizedText.optional().describe('the card that closes the phase; empty, no card'),
	needed: z.array(z.string().max(100)).max(50).optional().describe('ids of the documents needed for what comes after')
});

const DocumentInput = z.strictObject({
	id: z.string().regex(/^[a-z0-9-]{1,40}$/).describe('an id the journey uses to name the document'),
	label: LocalizedText,
	abbrev: LocalizedText.describe('the short form shown in the inventory'),
	unlockedAt: RecordId.nullable().optional().describe('the step where the citizen obtains it; null, or absent, when they already have it')
});

const JourneyInput = z.strictObject({
	id: RecordId.optional().describe('the journey to update; a new id creates it with that id'),
	slug: Slug.describe('identifies the journey when there is no id; its address is /journeys/<slug>'),
	map: Ref.describe('the map the journey walks, by id or slug; changing it clears the camera and highlights of every step'),
	title: LocalizedText,
	description: LocalizedText.optional(),
	phases: z.array(PhaseInput).max(50).optional(),
	documents: z.array(DocumentInput).max(100).optional()
});

async function journeyByRef(ctx: ToolContext, ref: string): Promise<Journey> {
	const found = byRef(await loadJourneys(ctx.store), ref);
	if (!found) throw notFound('journey', ref);
	return found;
}

const stepsOf = async (ctx: ToolContext, journeyId: string): Promise<JourneyStep[]> =>
	(await ctx.store.list<JourneyStep>('journey_steps')).filter((s) => s.journey === journeyId).sort((a, b) => a.order - b.order);

const edit = (j: Journey) => ({ slug: j.slug, map: j.map, title: j.title ?? {}, description: j.description ?? {}, phases: j.phases ?? [], documents: j.documents ?? [] });

export const saveJourney = tool({
	name: 'save_journey',
	title: 'Save a journey',
	description:
		'Creates or updates a journey\'s edit: slug, map, title, description, phases and documents. The visitor keeps seeing the published copy until publish_journey. With no id, the slug finds it. Steps go with save_journey_steps.',
	input: JourneyInput,
	annotations: { idempotentHint: true },
	async run(ctx, input) {
		const title = requireDefault(ctx, checkLocales(ctx, input.title, 'title'), 'title');
		const description = checkLocales(ctx, input.description, 'description');
		const [journeys, maps] = await Promise.all([loadJourneys(ctx.store), loadMaps(ctx.store)]);
		const map = byRef(maps, input.map);
		if (!map) throw notFound('map', input.map);
		const current = (input.id && journeys.find((j) => j.id === input.id)) || (!input.id && journeys.find((j) => j.slug === input.slug)) || null;
		const taken = journeys.find((j) => j.slug === input.slug && j.id !== current?.id);
		if (taken) throw new ToolError('conflict', `The slug "${input.slug}" belongs to the journey ${taken.id}.`, { id: taken.id });
		const id = current?.id ?? input.id ?? newRecordId();
		const steps = current ? await stepsOf(ctx, id) : [];

		const phases: JourneyPhase[] = (input.phases ?? current?.phases ?? []).map((p, i) => ({
			number: p.number,
			title: requireDefault(ctx, checkLocales(ctx, p.title, `phases[${i}].title`), `phases[${i}].title`),
			summary: checkLocales(ctx, (p as { summary?: Record<string, string> }).summary, `phases[${i}].summary`),
			needed: p.needed ?? []
		}));
		const numbers = phases.map((p) => p.number);
		if (new Set(numbers).size !== numbers.length) throw new ToolError('bad_request', 'phases: each number once.');
		const orphan = steps.find((s) => s.phase > 0 && !numbers.includes(s.phase));
		if (orphan) throw new ToolError('bad_request', `Phase ${orphan.phase} has steps: move them to another phase with save_journey_steps before removing it.`, { phase: orphan.phase });
		const documents: JourneyDocument[] = (input.documents ?? current?.documents ?? []).map((d, i) => ({
			id: d.id,
			label: requireDefault(ctx, checkLocales(ctx, d.label, `documents[${i}].label`), `documents[${i}].label`),
			abbrev: checkLocales(ctx, d.abbrev, `documents[${i}].abbrev`),
			unlockedAt: d.unlockedAt ?? null
		}));
		const docIds = new Set(documents.map((d) => d.id));
		if (docIds.size !== documents.length) throw new ToolError('bad_request', 'documents: each id once.');
		for (const p of phases) for (const need of p.needed) if (!docIds.has(need)) throw new ToolError('bad_request', `phases: the document "${need}" needed by phase ${p.number} is not in documents.`);

		const data = { slug: input.slug, map: map.id, title, description, phases, documents };
		await ctx.record({ tool: 'save_journey', collection: 'journeys', record: id, action: current ? 'update' : 'create', previous: current ? edit(current) : null });
		if (current) await ctx.store.update('journeys', id, data);
		else await ctx.store.create('journeys', { id, ...data, published: null });
		// another map: the camera and the highlights of every step belonged to the old one
		if (current && current.map !== map.id) {
			for (const step of steps) {
				if (!step.camera && step.highlight_nodes.length === 0 && step.highlight_edges.length === 0) continue;
				await ctx.record({ tool: 'save_journey', collection: 'journey_steps', record: step.id, action: 'update', previous: { camera: step.camera, highlight_nodes: step.highlight_nodes, highlight_edges: step.highlight_edges } });
				await ctx.store.update('journey_steps', step.id, { camera: null, highlight_nodes: [], highlight_edges: [] });
			}
		}
		return { id, created: !current, slug: input.slug, preview: `${ctx.origin}/admin/journeys/${id}/preview` };
	}
});

const CameraInput = z.strictObject({ centerX: z.number(), centerY: z.number(), zoom: z.number().positive() });

const StepInput = z.strictObject({
	id: RecordId.optional().describe('the step to keep; a new id creates it with that id, so a document can point at it'),
	phase: z.int().min(0).describe('the number of its phase; 0 is the introduction, before the first phase'),
	title: LocalizedText,
	body: LocalizedHtml.optional(),
	duration: LocalizedText.optional().describe('how long this step takes, as text'),
	camera: CameraInput.nullable().optional().describe('leave it out: the graph frames the highlighted entities, and the editor records a camera when someone wants one'),
	entities: z.array(RecordId).max(200).optional().describe('the entities this step lights up; the connections among them come along')
});

export const saveJourneySteps = tool({
	name: 'save_journey_steps',
	title: 'Save the steps of a journey',
	description:
		'Writes the whole list of steps of a journey, in order, as the editor saves it: a step with a known id is updated, a new one created, and a step not in the list is deleted. ' +
		'Each step names the entities it highlights, on the journey\'s map; the connections between them are highlighted too.',
	input: z.strictObject({ journey: Ref, steps: z.array(StepInput).max(200) }),
	annotations: { idempotentHint: true },
	async run(ctx, { journey: ref, steps }) {
		const journey = await journeyByRef(ctx, ref);
		const [current, placements, edges] = await Promise.all([stepsOf(ctx, journey.id), ctx.store.list<MapNodeRow>('map_nodes'), ctx.store.list('edges')]);
		const onMap = new Set(placements.filter((p) => p.map === journey.map).map((p) => p.node));
		const phases = new Set((journey.phases ?? []).map((p) => p.number));
		const ids = new Set<string>();
		const plans = steps.map((s, i) => {
			const at = `steps[${i}]`;
			if (s.phase > 0 && !phases.has(s.phase)) throw new ToolError('bad_request', `${at}: the journey has no phase ${s.phase}; save_journey adds it.`, { phase: s.phase });
			const id = s.id ?? newRecordId();
			if (ids.has(id)) throw new ToolError('bad_request', `${at}: the id ${id} repeats.`);
			ids.add(id);
			const entities = [...new Set(s.entities ?? [])];
			for (const e of entities) if (!onMap.has(e)) throw new ToolError('bad_request', `${at}: the entity ${e} is not on the journey's map. save_entities puts it there.`, { entity: e });
			const lit = new Set(entities);
			const connections = edges.filter((e) => lit.has(String(e.source)) && lit.has(String(e.target))).map((e) => e.id);
			return {
				id,
				data: {
					journey: journey.id,
					order: i + 1,
					phase: s.phase,
					title: requireDefault(ctx, checkLocales(ctx, s.title, `${at}.title`), `${at}.title`),
					body: cleanHtml(ctx, s.body, `${at}.body`),
					duration: s.duration ? checkLocales(ctx, s.duration, `${at}.duration`) : null,
					camera: s.camera ?? null,
					highlight_nodes: entities,
					highlight_edges: connections
				}
			};
		});
		const known = new Map(current.map((s) => [s.id, s]));
		for (const step of current) {
			if (ids.has(step.id)) continue;
			await ctx.record({ tool: 'save_journey_steps', collection: 'journey_steps', record: step.id, action: 'delete', previous: step });
			await ctx.store.remove('journey_steps', step.id);
		}
		for (const { id, data } of plans) {
			const before = known.get(id);
			await ctx.record({ tool: 'save_journey_steps', collection: 'journey_steps', record: id, action: before ? 'update' : 'create', previous: before ?? null });
			if (before) await ctx.store.update('journey_steps', id, data);
			else await ctx.store.create('journey_steps', { id, ...data });
		}
		// a document unlocked at a step that left points at nothing
		const documents = (journey.documents ?? []).map((d) => (d.unlockedAt && !ids.has(d.unlockedAt) ? { ...d, unlockedAt: null } : d));
		if (JSON.stringify(documents) !== JSON.stringify(journey.documents ?? [])) {
			await ctx.record({ tool: 'save_journey_steps', collection: 'journeys', record: journey.id, action: 'update', previous: { documents: journey.documents } });
			await ctx.store.update('journeys', journey.id, { documents });
		}
		return { journey: journey.id, steps: plans.map((p) => ({ id: p.id, order: p.data.order, connections: p.data.highlight_edges.length })), preview: `${ctx.origin}/admin/journeys/${journey.id}/preview` };
	}
});

export const publishJourney = tool({
	name: 'publish_journey',
	title: 'Publish a journey',
	description:
		'Copies the journey\'s edit to the public site, as the Publish button of /admin/journeys does. ' +
		'Before calling it, point the person to the preview (the `preview` address save_journey returns, under /admin/journeys) and ask whether to publish; call it only after they say yes. A journey with no steps is not published.',
	input: z.strictObject({ id: Ref }),
	annotations: { idempotentHint: true },
	async run(ctx, { id: ref }) {
		const found = await journeyByRef(ctx, ref);
		const journey = (await ctx.store.one<Journey>('journeys', found.id)) as Journey;
		const steps = await stepsOf(ctx, journey.id);
		if (steps.length === 0) throw new ToolError('bad_request', 'The journey has no steps: save_journey_steps first.');
		const copy = toPublished(journey, steps);
		await ctx.record({ tool: 'publish_journey', collection: 'journeys', record: journey.id, action: 'update', previous: { published: journey.published } });
		await ctx.store.update('journeys', journey.id, { published: copy });
		return { id: journey.id, slug: journey.slug, url: `${ctx.origin}/journeys/${journey.slug}`, steps: copy.steps.length };
	}
});

export const JOURNEY_TOOLS = [saveJourney, saveJourneySteps, publishJourney];

