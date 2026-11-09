/* The project's configuration state (server-side): whether PocketBase has the schema.

   False means one thing: PocketBase answered that there is no schema. Anything else that
   gets in the way of asking (a wrong superuser password, PocketBase down) serves the site,
   since reading the map needs neither, and goes to the log.

   Serving is cached for a minute, so a schema dropped from outside reopens the setup within
   that minute, and a bad password costs one attempt a minute, well under the login's rate
   limit. "No schema" is never cached: it ends the moment /setup runs. */

import { getSuperuserClient } from '$lib/services/pb.server';
import { isConfigured } from './setup';

const TTL_MS = 60_000;

let servingUntil = 0;

/** False only when PocketBase says the project has no schema. Never throws. */
export async function projectConfigured(): Promise<boolean> {
	if (Date.now() < servingUntil) return true;
	let configured = true;
	try {
		configured = await isConfigured(await getSuperuserClient());
	} catch (err) {
		console.error('[config] cannot check the schema, serving the site:', err);
	}
	if (configured) servingUntil = Date.now() + TTL_MS;
	return configured;
}

/** Resets the cache (call after running the setup). */
export function resetConfigCache(): void {
	servingUntil = 0;
}
