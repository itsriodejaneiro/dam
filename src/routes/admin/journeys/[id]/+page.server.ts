import { discardEdit, NoStepsError, publishJourney, unpublishJourney } from '$lib/server/journeys';
import { publishingAction } from '$lib/server/publishing';
import type { Actions } from './$types';

// What the visitor reads changes only through these actions, which the list calls too.
const messages = {
	failed: 'journeys_admin.error.save',
	refusal: (err: unknown) => (err instanceof NoStepsError ? 'journeys_admin.error.no_steps' : null)
} as const;

export const actions: Actions = {
	publish: (event) => publishingAction(event, (pb) => publishJourney(pb, event.params.id), messages),
	discard: (event) => publishingAction(event, (pb) => discardEdit(pb, event.params.id), messages),
	unpublish: (event) =>
		publishingAction(event, (pb) => unpublishJourney(pb, event.params.id), messages)
};
