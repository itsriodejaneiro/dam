/* The server's PocketBase client, signed in as the superuser. A restored backup or a new
   password revokes the stored token while it still looks valid, and only PocketBase can
   tell: a collection route answers 401, and a record route takes the token for a guest's,
   so an admin-only collection reads empty. A 401 signs in again, once, and repeats the
   call; an empty read asks a collection route about the token and, when that signed in,
   reads again, once. A write that starts a flow on a record route gets neither. */

import PocketBase, { ClientResponseError, type SendOptions } from 'pocketbase';

export interface Credentials {
	email: string;
	password: string;
}

const AUTH_CALL = /\/auth-(with-password|refresh)$/;
const RECORD_LIST = /^\/api\/collections\/([^/]+)\/records$/;

export class SuperuserClient extends PocketBase {
	private readonly credentials: () => Credentials;
	private signingIn: Promise<void> | null = null;

	/** `credentials` is read at each sign-in. */
	constructor(url: string, credentials: () => Credentials) {
		super(url);
		this.credentials = credentials;
		// Every request shares this client: the SDK's default would abort one visitor's call
		// when another makes the same one.
		this.autoCancellation(false);
	}

	/** The client, signed in. */
	async ready(): Promise<this> {
		if (!this.authStore.isValid) await this.signIn();
		return this;
	}

	/** One sign-in at a time: every visitor behind a revoked token waits on the same one. */
	private signIn(): Promise<void> {
		this.signingIn ??= this.authenticate().finally(() => {
			this.signingIn = null;
		});
		return this.signingIn;
	}

	private async authenticate() {
		const { email, password } = this.credentials();
		await this.collection('_superusers').authWithPassword(email, password, {
			autoRefreshThreshold: 30 * 60
		});
	}

	override async send<T = any>(path: string, options: SendOptions): Promise<T> {
		const token = this.authStore.token;
		let result: T;
		try {
			result = await super.send<T>(path, options);
		} catch (err) {
			const refused = err instanceof ClientResponseError && err.status === 401;
			if (!refused || AUTH_CALL.test(path)) throw err;
			// Another call may have signed in while this one was on its way.
			if (this.authStore.token === token) await this.signIn();
			return super.send<T>(path, options);
		}
		const collection = options.method === 'GET' ? RECORD_LIST.exec(path)?.[1] : undefined;
		if (!collection || !emptyFirstPage(result)) return result;
		// A revoked token gets 401 here, and the catch above signs in again.
		await this.collections.getOne(decodeURIComponent(collection), { fields: 'id' });
		return this.authStore.token === token ? result : super.send<T>(path, options);
	}
}

/** A list response with nothing on its first page: getList, getFullList, getFirstListItem. */
function emptyFirstPage(result: unknown): boolean {
	const list = result as { page?: unknown; items?: unknown } | null;
	return list?.page === 1 && Array.isArray(list.items) && list.items.length === 0;
}
