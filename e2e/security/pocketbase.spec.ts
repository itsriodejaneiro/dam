// PocketBase stays closed to anyone but an admin account (docs/api-agentes.md § MCP e a REST
// do PocketBase): no collection takes a create, an update or a delete from a visitor, and a
// token of the agents' API means nothing to PocketBase's own REST. Writes only attempts
// that must fail; the one record it creates, a token, it deletes.
import { createHash, randomBytes } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { expect, superuserClient, test } from '../shots/lib';

const PB = process.env.PUBLIC_POCKETBASE_URL!;
const ADMIN_RULE = '@request.auth.role = "admin"';

/** Every collection of the deployment; PocketBase's own (`_superusers`, `_mfas`…) stay out. */
async function collections() {
	const pb = await superuserClient();
	return (await pb.collections.getFullList()).filter((c) => !c.name.startsWith('_'));
}

test('every collection closes its writes to anyone but an admin, in its rules', async () => {
	const all = await collections();
	expect(all.map((c) => c.name)).toEqual(expect.arrayContaining(['nodes', 'edges', 'journeys', 'settings', 'users', 'api_tokens', 'api_writes']));
	for (const c of all) {
		for (const rule of ['createRule', 'updateRule', 'deleteRule'] as const) {
			const value = c[rule];
			expect(value === null || value.startsWith(ADMIN_RULE), `${c.name}.${rule} = ${JSON.stringify(value)}`).toBe(true);
		}
		for (const rule of ['listRule', 'viewRule'] as const) {
			const value = c[rule];
			expect(value === '' || value?.startsWith(ADMIN_RULE), `${c.name}.${rule} = ${JSON.stringify(value)}`).toBe(true);
		}
	}
});

/** A create, an update and a delete on each collection, with these headers: all refused. */
async function refusesWrites(request: APIRequestContext, headers: Record<string, string>, who: string) {
	const pb = await superuserClient();
	for (const c of await collections()) {
		const base = `${PB}/api/collections/${c.name}/records`;
		const created = await request.post(base, { headers, data: { slug: 'intruder', name: 'intruder' } });
		expect(created.status(), `${who} created in ${c.name}`).toBeGreaterThanOrEqual(400);
		const [record] = (await pb.collection(c.name).getList(1, 1)).items;
		if (!record) continue;
		const updated = await request.patch(`${base}/${record.id}`, { headers, data: { slug: 'intruder' } });
		expect(updated.status(), `${who} updated ${c.name}/${record.id}`).toBeGreaterThanOrEqual(400);
		const deleted = await request.delete(`${base}/${record.id}`, { headers });
		expect(deleted.status(), `${who} deleted ${c.name}/${record.id}`).toBeGreaterThanOrEqual(400);
		expect((await pb.collection(c.name).getOne(record.id)).updated).toBe(record.updated);
	}
}

test('a visitor writes nothing, and reads neither the journeys nor the tokens', async ({ request }) => {
	await refusesWrites(request, {}, 'a visitor');
	for (const closed of ['journeys', 'journey_steps', 'pages', 'users', 'api_tokens', 'api_writes']) {
		const res = await request.get(`${PB}/api/collections/${closed}/records`);
		const items = res.ok() ? ((await res.json()) as { items: unknown[] }).items : [];
		expect(items, `a visitor read ${closed}`).toEqual([]);
	}
});

test('a token of the agents\' API is refused by PocketBase\'s REST', async ({ request }) => {
	const pb = await superuserClient();
	const prefix = randomBytes(4).toString('hex');
	const token = `dam_${prefix}_${randomBytes(32).toString('base64url')}`;
	const record = await pb.collection('api_tokens').create({ name: 'e2e', prefix, hash: createHash('sha256').update(token).digest('hex'), created_by: 'e2e' });
	try {
		const headers = { authorization: `Bearer ${token}` };
		await refusesWrites(request, headers, 'the api token');
		const journeys = await request.get(`${PB}/api/collections/journeys/records`, { headers });
		const items = journeys.ok() ? ((await journeys.json()) as { items: unknown[] }).items : [];
		expect(items).toEqual([]);
		// the same token opens the app's API
		const mcp = await request.post('/api/v1/mcp', { headers: { ...headers, 'content-type': 'application/json' }, data: { jsonrpc: '2.0', id: 1, method: 'ping' } });
		expect(mcp.status()).toBe(200);
	} finally {
		await pb.collection('api_tokens').delete(record.id);
	}
});
