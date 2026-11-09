import PocketBase from 'pocketbase';
import { env as publicEnv } from '$env/dynamic/public';
import { env } from '$env/dynamic/private';

/** Where the server reaches PocketBase: PB_URL in a deploy, the browser's URL otherwise. */
export const serverPbUrl = (): string => env.PB_URL || publicEnv.PUBLIC_POCKETBASE_URL;

const superuser = new PocketBase(serverPbUrl());
let authenticated = false;

async function ensureAuth() {
	if (authenticated && superuser.authStore.isValid) return;
	const { PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD } = env;
	if (!PB_SUPERUSER_EMAIL || !PB_SUPERUSER_PASSWORD) {
		throw new Error('PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD must be set');
	}
	await superuser.collection('_superusers').authWithPassword(
		PB_SUPERUSER_EMAIL,
		PB_SUPERUSER_PASSWORD,
		{ autoRefreshThreshold: 30 * 60 }
	);
	authenticated = true;
}

export async function getSuperuserClient(): Promise<PocketBase> {
	await ensureAuth();
	return superuser;
}
