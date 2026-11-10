/* The server's side of a publishing action (Publish, Discard edit, Unpublish), shared by
   the editors of a journey and of a page. The write runs with the editor's own token, so
   the collection's update rule is the guard, and the action answers with the copy as it
   stands after the write. */

import { fail, type RequestEvent } from '@sveltejs/kit';
import PocketBase, { ClientResponseError } from 'pocketbase';
import type { MessageKey } from '$lib/i18n';
import { serverPbUrl } from '$lib/services/pb.server';

interface Messages {
	/** The message of a failed write. */
	failed: MessageKey;
	/** The message of a refusal the write knows by name, or null for any other error. */
	refusal?: (err: unknown) => MessageKey | null;
}

export async function publishingAction<T>(
	{ request }: RequestEvent,
	write: (pb: PocketBase) => Promise<T>,
	{ failed, refusal }: Messages
) {
	const form = await request.formData();
	const pb = new PocketBase(serverPbUrl());
	pb.authStore.save(String(form.get('token') ?? ''), null);
	try {
		return { published: await write(pb) };
	} catch (err) {
		const known = refusal?.(err);
		if (known) return fail(400, { error: known });
		console.error('[publishing] the write failed:', err);
		// PocketBase answers a 4xx to a token its rules refuse.
		const refused = err instanceof ClientResponseError && err.status >= 400 && err.status < 500;
		return fail(refused ? 403 : 500, { error: failed });
	}
}
