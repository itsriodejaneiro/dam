import PocketBase, { ClientResponseError, type SendOptions } from 'pocketbase';
import { env as publicEnv } from '$env/dynamic/public';
import { env } from '$env/dynamic/private';

/** Where the server reaches PocketBase: PB_URL in a deploy, the browser's URL otherwise. */
export const serverPbUrl = (): string => env.PB_URL || publicEnv.PUBLIC_POCKETBASE_URL;

const AUTH_CALL = /\/auth-(with-password|refresh)$/;

/* A restored backup or a new password revokes the stored token while it still looks
   valid, and only PocketBase can tell: a 401 signs in again, once, and repeats the call.
   The 401 comes from the collection routes, which every flow here calls first; on a
   record route PocketBase takes a revoked token for a guest. */
class SuperuserClient extends PocketBase {
	override async send<T = any>(path: string, options: SendOptions): Promise<T> {
		const token = this.authStore.token;
		try {
			return await super.send<T>(path, options);
		} catch (err) {
			const refused = err instanceof ClientResponseError && err.status === 401;
			if (!refused || AUTH_CALL.test(path)) throw err;
			// Another call may have signed in while this one was on its way.
			if (this.authStore.token === token) await signIn();
			return super.send<T>(path, options);
		}
	}
}

const superuser = new SuperuserClient(serverPbUrl());
// Every request shares this client: the SDK's default would abort one visitor's call
// when another makes the same one.
superuser.autoCancellation(false);
let signingIn: Promise<void> | null = null;

async function authenticate() {
	const { PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD } = env;
	if (!PB_SUPERUSER_EMAIL || !PB_SUPERUSER_PASSWORD) {
		throw new Error('PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD must be set');
	}
	await superuser.collection('_superusers').authWithPassword(
		PB_SUPERUSER_EMAIL,
		PB_SUPERUSER_PASSWORD,
		{ autoRefreshThreshold: 30 * 60 }
	);
}

/** One sign-in at a time: every visitor behind a revoked token waits on the same one. */
function signIn(): Promise<void> {
	signingIn ??= authenticate().finally(() => {
		signingIn = null;
	});
	return signingIn;
}

export async function getSuperuserClient(): Promise<PocketBase> {
	if (!superuser.authStore.isValid) await signIn();
	return superuser;
}
