/* The schema on boot: before the app serves its first request (the `init` hook,
   src/hooks.server.ts), it brings PocketBase's collections to its own version, so a deploy
   that received a new image runs no command by hand, and its log says what the boot did.

   Schema only: the seed and the settings record stay with /setup, the wizard of an empty
   project, and a database the boot just created still falls into it, because what makes a
   project configured is its settings record (setup.ts, isConfigured).

   No lock: a deploy runs one app process on one PocketBase, and every step is idempotent
   (upsertCollection writes only what differs), so the next boot, or /setup right after
   this one, finds nothing to do. Two processes on one database would at worst see one of
   them fail a create the other just made, logged here, with the schema whole. */

import { ClientResponseError } from 'pocketbase';
import { getSuperuserClient } from '$lib/services/pb.server';
import { setupSchema } from './setup';

/** PocketBase may still be starting: Compose waits for its health check, but a panel's
    restart or a restore does not. A refusal (a wrong password, a bad definition) gets no
    second try, since nothing changes in between. */
const ATTEMPTS = 5;
const PAUSE_MS = 3000;

/** Runs the schema, with a few tries when PocketBase is not answering yet. Never throws:
    the app serves either way, and the log has the outcome. */
export async function updateSchemaOnBoot(): Promise<void> {
	for (let attempt = 1; ; attempt++) {
		let changes = 0;
		try {
			const pb = await getSuperuserClient();
			await setupSchema(pb, (line) => {
				changes++;
				console.log(`[schema] ${line.trim()}`);
			});
			console.log(changes > 0 ? `[schema] updated: ${changes} change${changes > 1 ? 's' : ''}` : '[schema] up to date');
			return;
		} catch (err) {
			const again = attempt < ATTEMPTS && unreachable(err);
			const next = again ? `again in ${PAUSE_MS / 1000}s` : 'serving with the schema as it is';
			console.error(`[schema] attempt ${attempt} failed, ${next}: ${describe(err)}`);
			if (!again) return;
			await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
		}
	}
}

/** No answer, or PocketBase's own failure: worth another try. */
function unreachable(err: unknown): boolean {
	return err instanceof ClientResponseError && (err.status === 0 || err.status >= 500);
}

function describe(err: unknown): string {
	if (err instanceof ClientResponseError) {
		const cause = err.originalError instanceof Error ? ` (${err.originalError.message})` : '';
		return `${err.status} ${err.message}${cause}`;
	}
	return err instanceof Error ? err.message : String(err);
}
