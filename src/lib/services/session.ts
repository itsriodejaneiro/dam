import { getTokenPayload } from 'pocketbase';

/** What the auth store keeps of the signed-in record. */
export interface StoredRecord {
	id?: string;
	email?: string;
	collectionName?: string;
	role?: string;
}

export interface Session {
	isLoggedIn: boolean;
	userId: string | null;
	email: string | null;
	isSuperuser: boolean;
	/** May use the admin screens: a superuser, or an account with the admin role. */
	isAdmin: boolean;
}

export const NO_SESSION: Session = {
	isLoggedIn: false,
	userId: null,
	email: null,
	isSuperuser: false,
	isAdmin: false
};

/** The session the screens read. The auth store keeps the record after its token expires,
    and PocketBase answers an expired token as a visitor: without a valid token there is no
    session, whatever record is stored. */
export function deriveSession(tokenValid: boolean, record: StoredRecord | null): Session {
	if (!tokenValid || !record) return NO_SESSION;
	const isSuperuser = record.collectionName === '_superusers';
	return {
		isLoggedIn: true,
		userId: record.id ?? null,
		email: record.email ?? null,
		isSuperuser,
		isAdmin: isSuperuser || record.role === 'admin'
	};
}

/** Milliseconds until the token expires, 0 for an expired or unreadable one. */
export function msUntilExpiry(token: string, now = Date.now()): number {
	const exp = Number(getTokenPayload(token).exp);
	return Number.isFinite(exp) ? Math.max(0, exp * 1000 - now) : 0;
}

/** What a failed auth refresh says about the session: PocketBase refused the token (401),
    the account (403) or the collection (404). Anything else, a network failure included,
    says nothing, and the session stays. */
export function refreshRejected(status: number): boolean {
	return status === 401 || status === 403 || status === 404;
}
