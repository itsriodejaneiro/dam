/* The tokens of the agents' API (docs/api-agentes.md § Gerenciador de tokens): the token
   shows once, when created; the database keeps the prefix, in the clear, and the SHA-256 of
   the whole token. The fast hash is enough: the secret has 256 bits, and nobody guesses it
   from the hash as they would a password. A token has no owner and no expiry: it is valid
   until an admin deletes it, and the guard reads the record on every request. */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { TOKEN_PATTERN, TOKEN_PREFIX } from '$lib/api';

/** The token behind a request: what the guard hands the routes. */
export interface ApiToken {
	id: string;
	name: string;
	prefix: string;
	lastUsedAt: string;
}

/** What the record of a token holds, read by the superuser (the hash is `hidden`). */
export interface TokenRecord {
	id: string;
	name: string;
	prefix: string;
	hash: string;
	last_used_at: string;
}

export const sha256 = (value: string) => createHash('sha256').update(value).digest();

/** A new token, `dam_<prefix>_<secret>`, with the hash that is stored. */
export function newToken(): { token: string; prefix: string; hash: string } {
	const prefix = randomBytes(4).toString('hex');
	const token = `${TOKEN_PREFIX}_${prefix}_${randomBytes(32).toString('base64url')}`;
	return { token, prefix, hash: sha256(token).toString('hex') };
}

/** The token of `Authorization: Bearer <token>`, or null. */
export function bearer(header: string | null): string | null {
	const found = /^Bearer[ ]+(\S+)$/i.exec(header?.trim() ?? '');
	return found?.[1] ?? null;
}

/** The prefix of a token in the right shape, or null. */
export const tokenPrefix = (raw: string): string | null => TOKEN_PATTERN.exec(raw)?.[1] ?? null;

export type AuthFailure = 'missing' | 'invalid';

/**
 * The token a request carries, if it is valid. Finds the record by the prefix and compares
 * the hash in constant time. A token in another shape, a prefix with no record and a hash
 * that does not match all come out the same (`invalid`): whoever tries learns nothing.
 */
export async function authenticate(
	raw: string | null,
	find: (prefix: string) => Promise<TokenRecord | null>
): Promise<{ ok: true; token: ApiToken } | { ok: false; error: AuthFailure }> {
	if (!raw) return { ok: false, error: 'missing' };
	const prefix = tokenPrefix(raw);
	if (!prefix) return { ok: false, error: 'invalid' };
	const record = await find(prefix);
	const given = sha256(raw);
	const stored = Buffer.from(record?.hash ?? '', 'hex');
	if (!record || stored.length !== given.length || !timingSafeEqual(stored, given)) {
		return { ok: false, error: 'invalid' };
	}
	return {
		ok: true,
		token: { id: record.id, name: record.name, prefix: record.prefix, lastUsedAt: record.last_used_at ?? '' }
	};
}

export const TOUCH_EVERY_MS = 60_000;

/** Whether `last_used_at` is due a write: at most once a minute. */
export function touchDue(token: ApiToken, now = Date.now()): boolean {
	const last = token.lastUsedAt ? Date.parse(token.lastUsedAt) : NaN;
	return !(Number.isFinite(last) && now - last < TOUCH_EVERY_MS);
}
