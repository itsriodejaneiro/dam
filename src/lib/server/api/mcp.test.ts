import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { harness, ORIGIN, type Body, type Harness } from './testing';

/* The MCP without PocketBase: each JSON-RPC method, in both eras of the specification, and
   the read tools over a store in memory with a small map (testing.ts). */

let h: Harness;
beforeEach(() => {
	h = harness();
});

const post = (body: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: Body }> => h.post(body, headers);
const call = (name: string, args: Record<string, unknown> = {}) => h.call(name, args);

/** A request of the `initialize` era, with the version agreed in the header. */
const legacy = (method: string, params?: unknown) => post({ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) }, { 'mcp-protocol-version': '2025-11-25' });

const V = '2026-07-28';
const META = { 'io.modelcontextprotocol/protocolVersion': V, 'io.modelcontextprotocol/clientCapabilities': {} };
/** A request of the current era: the version in `_meta` and the headers that mirror it. */
const modern = (method: string, params: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
	post(
		{ jsonrpc: '2.0', id: 'a', method, params: { ...params, _meta: META } },
		{ 'mcp-protocol-version': V, 'mcp-method': method, ...(typeof params.name === 'string' ? { 'mcp-name': params.name } : {}), ...headers }
	);

test('initialize answers the version asked, the capabilities and the guide; an unknown version gets the newest legacy one', async () => {
	const { status, body } = await post({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'x', version: '1' } } });
	assert.equal(status, 200);
	assert.equal(body.result?.protocolVersion, '2025-06-18');
	assert.deepEqual(body.result?.capabilities, { tools: {} });
	assert.equal(body.result?.serverInfo.name, 'dam');
	assert.match(body.result?.instructions, /Start with get_deployment/);
	const old = await post({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {} } });
	assert.equal(old.body.result?.protocolVersion, '2025-11-25');
});

test('a notification gets 202 and no body; ping answers empty; no version header means 2025-03-26', async () => {
	const n = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
	assert.equal(n.status, 202);
	assert.equal(n.body, null);
	assert.deepEqual((await legacy('ping')).body, { jsonrpc: '2.0', id: 1, result: {} });
	assert.deepEqual((await post({ jsonrpc: '2.0', id: 1, method: 'ping' })).body.result, {});
});

test('a version the server does not speak: 400 with the ones it does; an unknown method: -32601', async () => {
	const { status, body } = await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { 'mcp-protocol-version': '2024-11-05' });
	assert.equal(status, 400);
	assert.equal(body.error?.code, -32022);
	assert.deepEqual(body.error?.data, { supported: ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26'], requested: '2024-11-05' });
	assert.equal((await legacy('resources/list')).body.error?.code, -32601);
});

test('the current era: server/discover, tools/list with a public cache, and the header checks', async () => {
	const discover = await modern('server/discover');
	assert.equal(discover.status, 200);
	assert.equal(discover.body.result?.resultType, 'complete');
	assert.deepEqual(discover.body.result?.supportedVersions, ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26']);
	assert.equal(discover.body.result?.ttlMs, 300_000);
	assert.equal(discover.body.result?._meta['io.modelcontextprotocol/serverInfo'].name, 'dam');
	const list = await modern('tools/list');
	assert.equal(list.body.result?.cacheScope, 'public');
	assert.ok(list.body.result?.tools.length > 0);

	const noCaps = await post({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': V } } }, { 'mcp-protocol-version': V, 'mcp-method': 'tools/list' });
	assert.equal(noCaps.status, 400);
	assert.equal(noCaps.body.error?.code, -32602);
	const mismatch = await modern('tools/call', { name: 'get_deployment' }, { 'mcp-name': 'list_entities' });
	assert.equal(mismatch.status, 400);
	assert.equal(mismatch.body.error?.code, -32020);
	const encoded = await modern('tools/call', { name: 'get_deployment', arguments: {} }, { 'mcp-name': `=?base64?${btoa('get_deployment')}?=` });
	assert.equal(encoded.body.result?.isError, false);
	const ping = await modern('ping');
	assert.equal(ping.status, 404);
	assert.equal(ping.body.error?.code, -32601);
});

test('tools/list shows every tool, with the zod schema as JSON Schema and no $schema key', async () => {
	const tools = (await legacy('tools/list')).body.result?.tools as Record<string, any>[];
	const names = tools.map((t) => t.name);
	for (const name of ['get_deployment', 'get_settings', 'list_entities', 'get_entity', 'list_connections', 'list_journeys', 'get_journey']) assert.ok(names.includes(name), name);
	const list = tools.find((t) => t.name === 'list_entities')!;
	assert.equal(list.inputSchema.$schema, undefined);
	assert.equal(list.inputSchema.additionalProperties, false);
	assert.equal(list.inputSchema.properties.per_page.maximum, 200);
	assert.deepEqual(list.annotations, { readOnlyHint: true });
	const get = tools.find((t) => t.name === 'get_entity')!;
	assert.deepEqual(get.inputSchema.required, ['id']);
});

test('get_deployment: settings, categories in lane order, maps with the main one first, and the token', async () => {
	const result = await call('get_deployment');
	assert.equal(result.isError, false);
	const s = result.structuredContent;
	assert.deepEqual(s.settings.locales, ['en', 'pt']);
	assert.equal(s.settings.default_locale, 'en');
	assert.deepEqual(s.categories.map((c: any) => c.slug), ['agency', 'service']);
	assert.deepEqual(s.categories[0].label, { en: 'Agency', pt: 'Órgão' });
	assert.deepEqual(s.maps.map((m: any) => [m.slug, m.main]), [['main', true], ['other', false]]);
	assert.deepEqual(s.token, { name: 'Sheet', prefix: '0a1b2c3d' });
	assert.equal(s.admin, `${ORIGIN}/admin/journeys`);
	assert.deepEqual(JSON.parse(result.content[0].text), s);
	assert.deepEqual((await call('get_settings')).structuredContent, { settings: s.settings });
});

test('list_entities: whole entities, the filters by text, category and map, and the pages', async () => {
	const all = (await call('list_entities')).structuredContent;
	assert.equal(all.total_items, 2);
	assert.deepEqual(all.items[0], {
		id: 'node00000000age',
		category: 'cat00000000agen',
		category_slug: 'agency',
		label: { en: 'Example Agency', pt: 'Órgão exemplo' },
		label_full: { en: 'Example Agency for Digital Services' },
		description: { en: '<p>The agency.</p>' },
		links: [],
		maps: [{ map: 'map00000000main', slug: 'main', x: 320, y: 120 }],
		order: 1
	});
	// a (0, 0) placement is a node nobody placed
	assert.deepEqual(all.items[1].maps, [{ map: 'map00000000main', slug: 'main', x: null, y: null }]);
	assert.deepEqual((await call('list_entities', { query: 'órgão' })).structuredContent.items.map((e: any) => e.id), ['node00000000age']);
	assert.deepEqual((await call('list_entities', { category: 'service' })).structuredContent.items.map((e: any) => e.id), ['node0000000port']);
	assert.deepEqual((await call('list_entities', { map: 'other' })).structuredContent.items, []);
	const page = (await call('list_entities', { per_page: 1, page: 2 })).structuredContent;
	assert.equal(page.items[0].id, 'node0000000port');
	assert.equal(page.total_pages, 2);
	const missing = await call('list_entities', { category: 'nope' });
	assert.equal(missing.isError, true);
	assert.equal(missing.structuredContent.error, 'not_found');
});

test('get_entity, list_connections, list_journeys and get_journey read the rest', async () => {
	assert.equal((await call('get_entity', { id: 'node0000000port' })).structuredContent.links[0].url, 'https://portal.example');
	assert.equal((await call('get_entity', { id: 'node0000000none' })).structuredContent.error, 'not_found');
	const edges = (await call('list_connections', { entity: 'node0000000port' })).structuredContent;
	assert.deepEqual(edges.items, [{ id: 'edge00000000001', source: 'node00000000age', target: 'node0000000port', source_label: 'Example Agency', target_label: 'Citizen Portal' }]);
	const journeys = (await call('list_journeys')).structuredContent;
	assert.deepEqual(journeys.items.map((j: any) => [j.slug, j.published, j.steps]), [['example-journey', false, 2]]);
	const journey = (await call('get_journey', { id: 'example-journey' })).structuredContent;
	assert.equal(journey.id, 'jour00000000001');
	assert.deepEqual(journey.steps[1].entities, ['node00000000age', 'node0000000port']);
	assert.deepEqual(journey.steps[1].connections, ['edge00000000001']);
	assert.equal(h.written.length, 0);
});

test('arguments out of shape, unknown or missing: isError with what to fix; an unknown tool: -32602', async () => {
	const bad = await call('get_entity', { id: 'x', extra: 1 });
	assert.equal(bad.isError, true);
	assert.match(bad.structuredContent.message, /id: a record id has 15/);
	assert.match(bad.structuredContent.message, /Unrecognized key: "extra"/);
	assert.equal((await legacy('tools/call', { name: 'drop_everything' })).body.error?.code, -32602);
	assert.equal((await legacy('tools/call', { name: 'get_entity', arguments: [1] })).body.error?.code, -32602);
});

test('the request: broken JSON, an empty body, a batch, a foreign origin', async () => {
	const broken = await post('{"jsonrpc":');
	assert.equal(broken.status, 400);
	assert.deepEqual(broken.body, { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } });
	const empty = await post('');
	assert.equal(empty.status, 400);
	assert.equal(empty.body.error?.code, -32600);
	assert.match(empty.body.error?.message ?? '', /Content-Type/);
	for (const msg of [[{ jsonrpc: '2.0', id: 1, method: 'ping' }], { id: 1, method: 'ping' }, { jsonrpc: '2.0', id: null, method: 'ping' }, { jsonrpc: '2.0', id: 1, method: 'ping', params: [1] }]) {
		assert.equal((await post(msg)).body.error?.code, -32600);
	}
	assert.equal((await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { origin: 'https://evil.test' })).status, 403);
	assert.equal((await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { origin: ORIGIN })).status, 200);
});
