/* The guard of `/api/v1/*` (docs/api-agentes.md § Segurança), run by hooks.server.ts before
   any route: the API reads no cookie and no session, only `Authorization: Bearer <token>`.
   No token or a token that is not valid: 401, with the reason. Each token has its requests
   per minute: 429, with how long to wait. */
import { json, type Handle, type RequestEvent } from '@sveltejs/kit';
import { MCP_PATH, REQUESTS_PER_MINUTE } from '$lib/api';
import { getSuperuserClient } from '$lib/services/pb.server';
import { SlidingWindow } from './limit';
import { authenticate, bearer, touchDue, type ApiToken, type AuthFailure, type TokenRecord } from './tokens';

export interface ApiErrorBody {
	error: string;
	message: string;
	[detail: string]: unknown;
}

const NO_STORE = { 'cache-control': 'no-store' };

/** An error in the API's shape: a code, a message that says what to do, and details. */
export const apiError = (status: number, body: ApiErrorBody, headers: Record<string, string> = {}) =>
	json(body, { status, headers: { ...NO_STORE, ...headers } });

/** The method a path does not take: the MCP only receives (POST). */
export const methodNotAllowed = () =>
	apiError(405, { error: 'method_not_allowed', message: `This path takes only POST: the MCP server is at POST ${MCP_PATH}.` }, { allow: 'POST' });

export const unknownPath = () =>
	apiError(404, { error: 'not_found', message: `This path does not exist in the API. The MCP server is at POST ${MCP_PATH}.` });

const NEW_TOKEN = 'ask an admin of this deployment for a token, created in /admin/tokens.';

const UNAUTHORIZED: Record<AuthFailure, string> = {
	missing: `The token is missing. Send it with every request, in the header Authorization: Bearer <token>; ${NEW_TOKEN}`,
	invalid: `This token is not valid: deleted, or not the whole token. Check the header Authorization: Bearer <token>; if it is lost, ${NEW_TOKEN}`
};

export const unauthorized = (reason: AuthFailure) =>
	apiError(401, { error: 'unauthorized', reason, message: UNAUTHORIZED[reason] }, { 'www-authenticate': reason === 'missing' ? 'Bearer' : 'Bearer error="invalid_token"' });

export const tooManyRequests = (waitMs: number) => {
	const seconds = Math.max(1, Math.ceil(waitMs / 1000));
	return apiError(
		429,
		{ error: 'too_many_requests', retry_after: seconds, message: `This token passed its ${REQUESTS_PER_MINUTE} requests a minute. Try again in ${seconds} s; to write much, send more per call (save_entities takes 50, save_connections 200).` },
		{ 'retry-after': String(seconds) }
	);
};

/** One window per process, keyed by the token's id. */
export const requests = new SlidingWindow(REQUESTS_PER_MINUTE, 60_000);

/** The record of a prefix, read as superuser: the hash is hidden from everyone else. A
    missing collection (a database before `db:setup`) reads as no token. */
async function findToken(prefix: string): Promise<TokenRecord | null> {
	const pb = await getSuperuserClient();
	try {
		return await pb
			.collection('api_tokens')
			.getFirstListItem<TokenRecord>(pb.filter('prefix = {:prefix}', { prefix }), { fields: 'id,name,prefix,hash,last_used_at' });
	} catch (err) {
		if ((err as { status?: number }).status === 404) return null;
		throw err;
	}
}

/** `last_used_at`, at most once a minute; best effort, it never fails the request. */
async function touch(token: ApiToken, now = Date.now()): Promise<void> {
	if (!touchDue(token, now)) return;
	try {
		const pb = await getSuperuserClient();
		await pb.collection('api_tokens').update(token.id, { last_used_at: new Date(now).toISOString() });
	} catch (err) {
		console.error('[api] last use not written', token.id, err instanceof Error ? err.message : err);
	}
}

export async function guardApi(event: RequestEvent, resolve: Parameters<Handle>[0]['resolve']): Promise<Response> {
	const auth = await authenticate(bearer(event.request.headers.get('authorization')), findToken);
	if (!auth.ok) return unauthorized(auth.error);
	const wait = requests.take(auth.token.id);
	if (wait > 0) return tooManyRequests(wait);
	event.locals.apiToken = auth.token;
	void touch(auth.token);
	return resolve(event);
}
