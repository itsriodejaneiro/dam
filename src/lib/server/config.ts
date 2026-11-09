/* The project's configuration state (server-side). Checks whether PocketBase
   already has the schema. Caches a positive result: once configured, always
   configured (the schema does not vanish on its own). While not configured, it
   re-checks on every request (a transient first-boot state). */

import { getSuperuserClient } from '$lib/services/pb.server';
import { isConfigured } from './setup';

let cached: boolean | null = null;

/** True if the project already has a schema in PocketBase. */
export async function projectConfigured(): Promise<boolean> {
	if (cached === true) return true;
	const pb = await getSuperuserClient();
	const ok = await isConfigured(pb);
	if (ok) cached = true;
	return ok;
}

/** Resets the cache (call after running the setup). */
export function resetConfigCache(): void {
	cached = null;
}
