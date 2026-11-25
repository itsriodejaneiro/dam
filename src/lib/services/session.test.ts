import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { deriveSession, msUntilExpiry, NO_SESSION, refreshRejected } from './session';

const admin = { id: 'u1', email: 'ana@example.com', collectionName: 'users', role: 'admin' };
const superuser = { id: 's1', email: 'root@example.com', collectionName: '_superusers' };

function tokenExpiringAt(seconds: number): string {
	const part = (value: object) => btoa(JSON.stringify(value));
	return `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ exp: seconds })}.signature`;
}

describe('deriveSession', () => {
	test('an expired token with a stored admin record is no session', () => {
		const session = deriveSession(false, admin);
		assert.equal(session.isAdmin, false);
		assert.deepEqual(session, NO_SESSION);
	});

	test('an expired token with a stored superuser record is no session', () => {
		assert.deepEqual(deriveSession(false, superuser), NO_SESSION);
	});

	test('a valid token with an admin record is an admin session', () => {
		assert.deepEqual(deriveSession(true, admin), {
			isLoggedIn: true,
			userId: 'u1',
			email: 'ana@example.com',
			isSuperuser: false,
			isAdmin: true
		});
	});

	test('a valid token with a superuser record is a superuser and an admin', () => {
		const session = deriveSession(true, superuser);
		assert.equal(session.isSuperuser, true);
		assert.equal(session.isAdmin, true);
	});

	test('a valid token with a record that has no role is signed in, not an admin', () => {
		const session = deriveSession(true, { ...admin, role: '' });
		assert.equal(session.isLoggedIn, true);
		assert.equal(session.isAdmin, false);
	});

	test('a valid token with no record is no session', () => {
		assert.deepEqual(deriveSession(true, null), NO_SESSION);
	});
});

describe('msUntilExpiry', () => {
	const now = 1_700_000_000_000;

	test('counts down to the exp claim', () => {
		assert.equal(msUntilExpiry(tokenExpiringAt(now / 1000 + 60), now), 60_000);
	});

	test('is 0 for an expired token', () => {
		assert.equal(msUntilExpiry(tokenExpiringAt(now / 1000 - 60), now), 0);
	});

	test('is 0 for a token it cannot read', () => {
		assert.equal(msUntilExpiry('not-a-token', now), 0);
		assert.equal(msUntilExpiry('', now), 0);
	});
});

describe('refreshRejected', () => {
	test('a refused token, account or collection ends the session', () => {
		assert.deepEqual([401, 403, 404].map(refreshRejected), [true, true, true]);
	});

	test('a network failure or a server error keeps it', () => {
		assert.deepEqual([0, 500, 503].map(refreshRejected), [false, false, false]);
	});
});
