import { HOME } from '$lib/page';
import { discardPageEdit, NoBlocksError, publishPage, unpublishPage } from '$lib/server/pages';
import { publishingAction } from '$lib/server/publishing';
import type { Actions } from './$types';

// What the visitor reads of the home changes only through these actions.
const messages = {
	failed: 'home_admin.error.save',
	refusal: (err: unknown) => (err instanceof NoBlocksError ? 'home_admin.error.no_blocks' : null)
} as const;

export const actions: Actions = {
	publish: (event) => publishingAction(event, (pb) => publishPage(pb, HOME), messages),
	discard: (event) => publishingAction(event, (pb) => discardPageEdit(pb, HOME), messages),
	unpublish: (event) => publishingAction(event, (pb) => unpublishPage(pb, HOME), messages)
};
