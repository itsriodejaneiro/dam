/* How the API reaches PocketBase (docs/api-agentes.md § MCP e a REST do PocketBase): as the
   service account, an admin in `users` the setup creates, so the collections' rules decide
   what a tool reaches. The superuser client asks PocketBase for a short, non-refreshable
   token of that account (`impersonate`), by `send` on the server's own client, which signs
   in again when PocketBase answers 401; the SDK's `impersonate` method would build another
   client, outside that retry. The record of every write goes to `api_writes` as superuser:
   only the server writes there. */
import PocketBase, { type RecordModel } from 'pocketbase';
import { SERVICE_ACCOUNT_EMAIL, type WriteAction } from '$lib/api';
import { getSuperuserClient, serverPbUrl } from '$lib/services/pb.server';
import type { ApiToken } from './tokens';

/** The impersonation token's life, in seconds, and how long this process keeps it. */
const TOKEN_SECONDS = 600;
const KEEP_MS = (TOKEN_SECONDS - 60) * 1000;

let accountId: string | null = null;
let cached: { client: PocketBase; until: number } | null = null;

async function serviceAccountId(pb: PocketBase): Promise<string> {
	if (accountId) return accountId;
	const found = await pb
		.collection('users')
		.getFirstListItem(pb.filter('email = {:email}', { email: SERVICE_ACCOUNT_EMAIL }), { fields: 'id' })
		.catch((err: unknown) => {
			if ((err as { status?: number }).status === 404) return null;
			throw err;
		});
	if (!found) throw new Error(`the api's service account (${SERVICE_ACCOUNT_EMAIL}) is missing: run \`bun run db:setup\``);
	accountId = found.id;
	return found.id;
}

/** A client signed in as the service account, shared by every request while its token lasts. */
export async function serviceClient(): Promise<PocketBase> {
	if (cached && Date.now() < cached.until) return cached.client;
	const su = await getSuperuserClient();
	const id = await serviceAccountId(su);
	const { token, record } = await su.send<{ token: string; record: RecordModel }>(`/api/collections/users/impersonate/${id}`, {
		method: 'POST',
		body: { duration: TOKEN_SECONDS }
	});
	const client = new PocketBase(serverPbUrl());
	client.autoCancellation(false);
	client.authStore.save(token, record);
	cached = { client, until: Date.now() + KEEP_MS };
	return client;
}

/** A line of `api_writes`. */
export interface WriteEntry {
	tool: string;
	collection: string;
	record: string;
	action: WriteAction;
	/** What an update or a delete replaces; null on a create. */
	previous: unknown;
}

/**
 * The record of a write, before the write: a tool that cannot record writes nothing, and
 * the caller sees the error. The token goes as text, so the line outlives the token.
 */
export async function recordWrite(token: ApiToken, entry: WriteEntry): Promise<void> {
	const pb = await getSuperuserClient();
	await pb.collection('api_writes').create({
		token_prefix: token.prefix,
		token_name: token.name,
		tool: entry.tool,
		collection: entry.collection,
		record: entry.record,
		action: entry.action,
		actor: '',
		previous: entry.previous ?? null
	});
}

/** The record of a token created or deleted in the admin, with the account that did it. */
export async function recordTokenChange(token: Pick<ApiToken, 'prefix' | 'name' | 'id'>, action: 'create' | 'delete', actor: string): Promise<void> {
	const pb = await getSuperuserClient();
	await pb.collection('api_writes').create({
		token_prefix: token.prefix,
		token_name: token.name,
		tool: '',
		collection: 'api_tokens',
		record: token.id,
		action,
		actor,
		previous: null
	});
}
