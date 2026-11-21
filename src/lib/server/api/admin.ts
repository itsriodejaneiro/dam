/* /admin/tokens on the server (docs/api-agentes.md § Gerenciador de tokens): creating and
   deleting a token. The action receives the token of the account that edits, as
   /admin/settings does, and checks the role here, because `api_tokens` takes no write but
   the superuser's. The token itself exists outside the server only in the answer of create. */
import PocketBase from 'pocketbase';
import { serverPbUrl, getSuperuserClient } from '$lib/services/pb.server';
import { recordTokenChange } from './service';
import { newToken } from './tokens';

export const TOKEN_NAME_MAX = 60;

/** The account behind an auth token, when it may manage tokens: an admin, or the superuser. */
export async function actorOf(authToken: string): Promise<{ email: string } | null> {
	if (!authToken) return null;
	const pb = new PocketBase(serverPbUrl());
	pb.authStore.save(authToken, null);
	for (const collection of ['users', '_superusers']) {
		try {
			const { record } = await pb.collection(collection).authRefresh();
			const allowed = collection === '_superusers' || record.role === 'admin';
			return allowed ? { email: String(record.email ?? '') } : null;
		} catch {
			continue;
		}
	}
	return null;
}

export type TokenError = 'not_admin' | 'name' | 'not_found' | 'failed';

/**
 * Creates the token and returns it, the one time it exists outside whoever receives it.
 * Records the creation in `api_writes`; with no line, the token goes: no agent gets access
 * with no trace.
 */
export async function createToken(actor: { email: string }, name: string): Promise<{ ok: true; token: string } | { ok: false; error: TokenError }> {
	const clean = name.trim();
	if (!clean || clean.length > TOKEN_NAME_MAX) return { ok: false, error: 'name' };
	const pb = await getSuperuserClient();
	// the prefix has 32 bits: a collision is rare, and the unique index refuses it; another draw is enough
	for (let attempt = 0; attempt < 3; attempt++) {
		const { token, prefix, hash } = newToken();
		const record = await pb
			.collection('api_tokens')
			.create({ name: clean, prefix, hash, created_by: actor.email })
			.catch(() => null);
		if (!record) continue;
		try {
			await recordTokenChange({ id: record.id, prefix, name: clean }, 'create', actor.email);
		} catch (err) {
			console.error('[api] token creation not recorded, token undone', record.id, err);
			await pb.collection('api_tokens').delete(record.id);
			return { ok: false, error: 'failed' };
		}
		return { ok: true, token };
	}
	return { ok: false, error: 'failed' };
}

/** Deletes the token: it stops working at the next request. Taking access away never waits
    for the record: when the line fails, the token is gone and the failure goes to the log. */
export async function deleteToken(actor: { email: string }, id: string): Promise<{ ok: true } | { ok: false; error: TokenError }> {
	const pb = await getSuperuserClient();
	const record = await pb
		.collection('api_tokens')
		.getOne(id)
		.catch((err: unknown) => {
			if ((err as { status?: number }).status === 404) return null;
			throw err;
		});
	if (!record) return { ok: false, error: 'not_found' };
	await pb.collection('api_tokens').delete(id);
	try {
		await recordTokenChange({ id, prefix: String(record.prefix), name: String(record.name) }, 'delete', actor.email);
	} catch (err) {
		console.error('[api] token deleted, deletion not recorded', id, err);
	}
	return { ok: true };
}
