import { deserialize } from '$app/forms';
import { pb } from './pb';
import type { MessageKey } from '$lib/i18n';

export type PublishAction = 'publish' | 'discard' | 'unpublish';

/** A publishing action the server refused; `key` is the message that says why. */
export class PublishActionError extends Error {
	constructor(readonly key: MessageKey) {
		super(key);
	}
}

/**
 * Runs one of the server's publishing actions on the editor's route (`?/publish`,
 * `?/discard`, `?/unpublish`) with the signed-in account's token. Returns the copy after
 * it: null once unpublished. `failed` is the message when the server says nothing more.
 */
export async function runPublishAction<T>(
	path: string,
	action: PublishAction,
	failed: MessageKey
): Promise<T | null> {
	const body = new FormData();
	body.set('token', pb.authStore.token);
	const response = await fetch(`${path}?/${action}`, {
		method: 'POST',
		body,
		headers: { 'x-sveltekit-action': 'true' }
	});
	const result = deserialize(await response.text());
	if (result.type === 'success') return (result.data as { published: T | null }).published;
	if (result.type === 'failure') throw new PublishActionError((result.data as { error: MessageKey }).error);
	throw new PublishActionError(failed);
}
