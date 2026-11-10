import { fail, type RequestEvent } from '@sveltejs/kit';
import PocketBase, { ClientResponseError } from 'pocketbase';
import { discardEdit, NoStepsError, publishJourney, unpublishJourney } from '$lib/server/journeys';
import { serverPbUrl } from '$lib/services/pb.server';
import type { PublishedJourney } from '$lib/types/journey';
import type { Actions } from './$types';

type Write = (pb: PocketBase, id: string) => Promise<PublishedJourney | null>;

// What the visitor reads changes only through these actions, which the list calls too. Each
// writes with the editor's own token, so the collection's update rule is the guard, and
// answers with the journey's copy as it stands after the write.
async function act({ request, params }: RequestEvent, write: Write) {
	const form = await request.formData();
	const pb = new PocketBase(serverPbUrl());
	pb.authStore.save(String(form.get('token') ?? ''), null);
	try {
		return { published: await write(pb, params.id!) };
	} catch (err) {
		if (err instanceof NoStepsError) {
			return fail(400, { error: 'journeys_admin.error.no_steps' as const });
		}
		console.error('[journeys] publishing failed:', err);
		// PocketBase answers a 4xx to a token its rules refuse.
		const refused = err instanceof ClientResponseError && err.status >= 400 && err.status < 500;
		return fail(refused ? 403 : 500, { error: 'journeys_admin.error.save' as const });
	}
}

export const actions: Actions = {
	publish: (event) => act(event, publishJourney),
	discard: (event) => act(event, discardEdit),
	unpublish: (event) => act(event, unpublishJourney)
};
