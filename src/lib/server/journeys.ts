/* Publishing a journey, on the server only. The edit is the record's fields and its
   journey_steps; `published` is the copy the visitor reads. These writes stay apart from
   the edit's (services/journeys.ts), so that an API can offer those and refuse these.
   Each takes a client signed in as whoever acts, and the collection's rules decide.
   Relative imports: the CLI setup runs this module outside SvelteKit. */

import type PocketBase from 'pocketbase';
import { fromPublished, toPublished } from '../journey';
import type { Journey, JourneyStep, PublishedJourney } from '../types/journey';

/** Publish refuses a journey with no steps: the visitor would open an empty page. */
export class NoStepsError extends Error {}

async function stepsOf(pb: PocketBase, journeyId: string): Promise<JourneyStep[]> {
	return await pb.collection('journey_steps').getFullList<JourneyStep>({
		filter: pb.filter('journey = {:journeyId}', { journeyId }),
		sort: 'order'
	});
}

async function existingIds(pb: PocketBase, collection: string): Promise<Set<string>> {
	const records = await pb.collection(collection).getFullList({ fields: 'id' });
	return new Set(records.map((r) => r.id));
}

/** Copies the edit to `published` in one write, and returns the copy. */
export async function publishJourney(pb: PocketBase, id: string): Promise<PublishedJourney> {
	const [journey, steps] = await Promise.all([
		pb.collection('journeys').getOne<Journey>(id),
		stepsOf(pb, id)
	]);
	if (steps.length === 0) throw new NoStepsError();
	const copy = toPublished(journey, steps);
	await pb.collection('journeys').update(id, { published: copy });
	return copy;
}

/** Takes the journey off the site and leaves the edit as it is. */
export async function unpublishJourney(pb: PocketBase, id: string): Promise<null> {
	await pb.collection('journeys').update(id, { published: null });
	return null;
}

/**
 * Writes the copy back over the edit: the journey's fields, then its steps, deleted and
 * created again with their ids. A node or connection removed since the publish stays out
 * of the highlights, as removing it took it out of the edit. The copy itself is never
 * written here, so a retry after a failure starts over from it. Returns the copy.
 */
export async function discardEdit(pb: PocketBase, id: string): Promise<PublishedJourney | null> {
	const record = await pb.collection('journeys').getOne<Journey>(id);
	if (!record.published) return null;
	const { journey, steps } = fromPublished(record.published);
	const [nodes, edges] = await Promise.all([existingIds(pb, 'nodes'), existingIds(pb, 'edges')]);

	await pb.collection('journeys').update(id, journey);
	for (const step of await stepsOf(pb, id)) await pb.collection('journey_steps').delete(step.id);
	for (const step of steps) {
		await pb.collection('journey_steps').create({
			...step,
			journey: id,
			highlight_nodes: step.highlight_nodes.filter((nodeId) => nodes.has(nodeId)),
			highlight_edges: step.highlight_edges.filter((edgeId) => edges.has(edgeId))
		});
	}
	return record.published;
}
