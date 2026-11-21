import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authenticate, bearer, newToken, sha256, tokenPrefix, touchDue, type TokenRecord } from './tokens';

const record = (t: ReturnType<typeof newToken>): TokenRecord => ({ id: 'tok000000000001', name: 'Sheet', prefix: t.prefix, hash: t.hash, last_used_at: '' });

test('a new token has the shape, and its prefix and hash are what the record keeps', () => {
	const t = newToken();
	assert.match(t.token, /^dam_[0-9a-f]{8}_[A-Za-z0-9_-]{43}$/);
	assert.equal(tokenPrefix(t.token), t.prefix);
	assert.equal(t.hash, sha256(t.token).toString('hex'));
	assert.notEqual(newToken().token, t.token);
});

test('the bearer header: the token, whatever the case of the scheme; nothing else', () => {
	assert.equal(bearer('Bearer dam_x'), 'dam_x');
	assert.equal(bearer('  bearer   dam_x '), 'dam_x');
	assert.equal(bearer('Basic abc'), null);
	assert.equal(bearer('Bearer'), null);
	assert.equal(bearer(null), null);
});

test('authenticate: the whole token against the record; anything else is invalid, and no token is missing', async () => {
	const t = newToken();
	const find = async (prefix: string) => (prefix === t.prefix ? record(t) : null);
	assert.deepEqual(await authenticate(t.token, find), { ok: true, token: { id: 'tok000000000001', name: 'Sheet', prefix: t.prefix, lastUsedAt: '' } });
	assert.deepEqual(await authenticate(null, find), { ok: false, error: 'missing' });
	assert.deepEqual(await authenticate('', find), { ok: false, error: 'missing' });
	// the right prefix with another secret, a prefix nobody has, and another shape
	assert.deepEqual(await authenticate(`dam_${t.prefix}_${'A'.repeat(43)}`, find), { ok: false, error: 'invalid' });
	assert.deepEqual(await authenticate(newToken().token, find), { ok: false, error: 'invalid' });
	assert.deepEqual(await authenticate('its_abc_def', find), { ok: false, error: 'invalid' });
	assert.deepEqual(await authenticate(t.token.slice(0, -1), find), { ok: false, error: 'invalid' });
});

test('a lookup is made only for a token in the right shape', async () => {
	let asked = 0;
	const find = async () => {
		asked++;
		return null;
	};
	await authenticate('nonsense', find);
	assert.equal(asked, 0);
	await authenticate(newToken().token, find);
	assert.equal(asked, 1);
});

test('last use is written at most once a minute', () => {
	const now = Date.parse('2026-11-21T12:00:00Z');
	const token = { id: 'x', name: 'x', prefix: 'x', lastUsedAt: '' };
	assert.equal(touchDue(token, now), true);
	assert.equal(touchDue({ ...token, lastUsedAt: new Date(now - 30_000).toISOString() }, now), false);
	assert.equal(touchDue({ ...token, lastUsedAt: new Date(now - 61_000).toISOString() }, now), true);
	assert.equal(touchDue({ ...token, lastUsedAt: 'not a date' }, now), true);
});
