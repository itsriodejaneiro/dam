import type PocketBase from 'pocketbase';
import { env as publicEnv } from '$env/dynamic/public';
import { env } from '$env/dynamic/private';
import { SuperuserClient } from '$lib/server/superuser';

/** Where the server reaches PocketBase: PB_URL in a deploy, the browser's URL otherwise. */
export function serverPbUrl(): string {
	const url = env.PB_URL || publicEnv.PUBLIC_POCKETBASE_URL;
	if (!url) throw new Error('PB_URL or PUBLIC_POCKETBASE_URL must be set');
	return url;
}

function credentials() {
	const { PB_SUPERUSER_EMAIL: email, PB_SUPERUSER_PASSWORD: password } = env;
	if (!email || !password) {
		throw new Error('PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD must be set');
	}
	return { email, password };
}

let superuser: SuperuserClient | null = null;

/** Built on first use: the build imports this module with no environment. */
export async function getSuperuserClient(): Promise<PocketBase> {
	superuser ??= new SuperuserClient(serverPbUrl(), credentials);
	return superuser.ready();
}
