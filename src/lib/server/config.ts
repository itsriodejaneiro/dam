/* The project's configuration state (server-side): whether PocketBase has the schema.

   False means one thing: PocketBase answered that there is no schema. It asks as a visitor,
   so a wrong superuser password still reaches /setup, the page that reports it. Anything
   else that gets in the way of asking (PocketBase down) serves the site and goes to the log.

   Serving is cached for a minute, so a schema dropped from outside reopens the setup within
   that minute. "No schema" is never cached: it ends the moment /setup runs. */

import PocketBase from 'pocketbase';
import { serverPbUrl } from '$lib/services/pb.server';
import { isConfigured } from './setup';

const TTL_MS = 60_000;

let servingUntil = 0;

/** False only when PocketBase says the project has no schema. Never throws. */
export async function projectConfigured(): Promise<boolean> {
	if (Date.now() < servingUntil) return true;
	let configured = true;
	try {
		configured = await isConfigured(new PocketBase(serverPbUrl()));
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
