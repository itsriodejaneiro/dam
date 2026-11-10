import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, test } from 'node:test';
import { SuperuserClient } from './superuser';

/* A PocketBase that knows one superuser and one admin-only collection, `journeys`. Changing
   the password revokes every token: the collection route answers 401 to it, and the record
   route reads it as a guest's, for whom the collection's rules hide every record. */
const fake = {
	journeys: [] as { id: string; slug: string }[],
	tokens: new Set<string>(),
	issued: 0,
	calls: [] as string[]
};

function token(): string {
	const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
	const exp = Math.floor(Date.now() / 1000) + 24 * 3600;
	return `${part({ alg: 'HS256' })}.${part({ id: 'su1', type: 'auth', exp, n: ++fake.issued })}.sig`;
}

let server: Server;
let url: string;

before(async () => {
	server = createServer((req, res) => {
		const path = new URL(req.url!, 'http://fake').pathname;
		const call = `${req.method} ${path}`;
		fake.calls.push(call);
		const send = (status: number, body: object) => {
			res.writeHead(status, { 'content-type': 'application/json' });
			res.end(JSON.stringify(body));
		};
		const signedIn = fake.tokens.has(req.headers.authorization ?? '');
		if (call === 'POST /api/collections/_superusers/auth-with-password') {
			const issued = token();
			fake.tokens.add(issued);
			return send(200, { token: issued, record: { id: 'su1', collectionName: '_superusers' } });
		}
		if (call === 'GET /api/collections/journeys') {
			return signedIn ? send(200, { id: 'pbc_journeys' }) : send(401, { message: 'Unauthorized' });
		}
		if (call === 'GET /api/collections/journeys/records') {
			const items = signedIn ? fake.journeys : [];
			return send(200, { page: 1, perPage: 1000, totalItems: -1, totalPages: -1, items });
		}
		send(404, { message: 'Not found' });
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

beforeEach(() => {
	fake.journeys = [];
	fake.tokens.clear();
});

async function signedInClient(): Promise<SuperuserClient> {
	const client = await new SuperuserClient(url, () => ({ email: 'su@example.org', password: 'x' })).ready();
	fake.calls = [];
	return client;
}

test('a valid token and an empty list: one confirmation, and no second read', async () => {
	const client = await signedInClient();
	assert.deepEqual(await client.collection('journeys').getFullList(), []);
	assert.deepEqual(fake.calls, ['GET /api/collections/journeys/records', 'GET /api/collections/journeys']);
});

test('a revoked token: the confirmation gets 401, signs in again, and the read returns the records', async () => {
	const client = await signedInClient();
	fake.journeys = [{ id: 'j1', slug: 'renewing' }];
	fake.tokens.clear();
	const records = await client.collection('journeys').getFullList();
	assert.deepEqual(
		records.map((r) => r.slug),
		['renewing']
	);
	assert.deepEqual(fake.calls, [
		'GET /api/collections/journeys/records',
		'GET /api/collections/journeys',
		'POST /api/collections/_superusers/auth-with-password',
		'GET /api/collections/journeys',
		'GET /api/collections/journeys/records'
	]);
});

test('a revoked token: getFirstListItem finds the record instead of a 404', async () => {
	const client = await signedInClient();
	fake.journeys = [{ id: 'j1', slug: 'renewing' }];
	fake.tokens.clear();
	const record = await client.collection('journeys').getFirstListItem('slug = "renewing"');
	assert.equal(record.id, 'j1');
});

test('a record list with records costs no confirmation', async () => {
	const client = await signedInClient();
	fake.journeys = [{ id: 'j1', slug: 'renewing' }];
	await client.collection('journeys').getFullList();
	assert.deepEqual(fake.calls, ['GET /api/collections/journeys/records']);
});
