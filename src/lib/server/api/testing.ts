/* What the tests of the MCP and the tools share: a small map in the memory store, a context
   over it and a call to a tool through the server. Not a test itself. */
import { DEFAULT_SETTINGS } from '$lib/settings';
import { mcp } from './mcp';
import type { WriteEntry } from './service';
import { MemoryStore } from './store.memory';
import type { ToolContext } from './tools';

export const ORIGIN = 'https://dam.test';
export const TOKEN = { id: 'tok000000000001', name: 'Sheet', prefix: '0a1b2c3d', lastUsedAt: '' };

export const IDS = {
	agency: 'cat00000000agen',
	service: 'cat00000000serv',
	main: 'map00000000main',
	other: 'map0000000other',
	agencyNode: 'node00000000age',
	portal: 'node0000000port',
	edge: 'edge00000000001',
	journey: 'jour00000000001',
	intro: 'step00000000001',
	step2: 'step00000000002'
};

/** Two categories, two maps, two entities on the main map, one connection and one journey. */
export function seedMap(store: MemoryStore) {
	store.seed('settings', { id: 'set000000000001', name: { en: 'Exampleland' }, locales: ['en', 'pt'], default_locale: 'en', theme: 'legacy', flag: '', journeys: true });
	store.seed('node_types', { id: IDS.agency, slug: 'agency', color_slot: 1, layer_order: 1, base_size: 26 });
	store.seed('node_types', { id: IDS.service, slug: 'service', color_slot: 2, layer_order: 2, base_size: 24 });
	store.seed('node_type_translations', { id: 'ctt0000000000a1', node_type: IDS.agency, locale: 'en', label: 'Agency', label_plural: 'Agencies' });
	store.seed('node_type_translations', { id: 'ctt0000000000a2', node_type: IDS.agency, locale: 'pt', label: 'Órgão', label_plural: 'Órgãos' });
	store.seed('node_type_translations', { id: 'ctt0000000000s1', node_type: IDS.service, locale: 'en', label: 'Service', label_plural: 'Services' });
	store.seed('maps', { id: IDS.main, slug: 'main', order: 1 });
	store.seed('map_translations', { id: 'mpt000000000001', map: IDS.main, locale: 'en', label: 'Main Map' });
	store.seed('maps', { id: IDS.other, slug: 'other', order: 2 });
	store.seed('nodes', { id: IDS.agencyNode, type: IDS.agency, links: [], order: 1 });
	store.seed('node_translations', { id: 'ntr000000000001', node: IDS.agencyNode, locale: 'en', label: 'Example Agency', label_full: 'Example Agency for Digital Services', description: '<p>The agency.</p>' });
	store.seed('node_translations', { id: 'ntr000000000002', node: IDS.agencyNode, locale: 'pt', label: 'Órgão exemplo', label_full: '', description: '' });
	store.seed('map_nodes', { id: 'mn0000000000001', map: IDS.main, node: IDS.agencyNode, x: 320, y: 120 });
	store.seed('nodes', { id: IDS.portal, type: IDS.service, links: [{ label: { en: 'Site' }, url: 'https://portal.example' }], order: 2 });
	store.seed('node_translations', { id: 'ntr000000000003', node: IDS.portal, locale: 'en', label: 'Citizen Portal', label_full: '', description: '' });
	store.seed('map_nodes', { id: 'mn0000000000002', map: IDS.main, node: IDS.portal, x: 0, y: 0 });
	store.seed('edges', { id: IDS.edge, source: IDS.agencyNode, target: IDS.portal });
	store.seed('journeys', { id: IDS.journey, slug: 'example-journey', map: IDS.main, title: { en: 'Who holds the keys' }, description: {}, phases: [{ number: 1, title: { en: 'Start' }, summary: {}, needed: [] }], documents: [], published: null });
	store.seed('journey_steps', { id: IDS.intro, journey: IDS.journey, order: 1, phase: 0, title: { en: 'Intro' }, body: { en: '<p>Hi</p>' }, duration: null, camera: null, highlight_nodes: [], highlight_edges: [] });
	store.seed('journey_steps', { id: IDS.step2, journey: IDS.journey, order: 2, phase: 1, title: { en: 'The agency' }, body: { en: '' }, duration: null, camera: { centerX: 1, centerY: 2, zoom: 1 }, highlight_nodes: [IDS.agencyNode, IDS.portal], highlight_edges: [IDS.edge] });
}

export interface Harness {
	store: MemoryStore;
	written: WriteEntry[];
	context: ToolContext;
	call: (name: string, args?: Record<string, unknown>) => Promise<Record<string, any>>;
	post: (body: unknown, headers?: Record<string, string>) => Promise<{ status: number; body: Body }>;
}

export type Body = { jsonrpc: string; id?: unknown; result?: Record<string, any>; error?: { code: number; message: string; data?: any } };

/** A fresh map and a token over it; `record` keeps the lines, or fails when told to. */
export function harness(options: { recordFails?: boolean; settingsChanged?: () => void } = {}): Harness {
	const store = new MemoryStore();
	seedMap(store);
	const written: WriteEntry[] = [];
	const context: ToolContext = {
		store,
		settings: { ...DEFAULT_SETTINGS, name: { en: 'Exampleland' }, locales: ['en', 'pt'], defaultLocale: 'en' },
		token: TOKEN,
		origin: ORIGIN,
		record: async (entry) => {
			if (options.recordFails) throw new Error('api_writes is down');
			written.push(entry);
		},
		settingsChanged: options.settingsChanged
	};
	const post = async (body: unknown, headers: Record<string, string> = {}) => {
		const request = new Request(`${ORIGIN}/api/v1/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
		const res = await mcp(request, context);
		const text = await res.text();
		return { status: res.status, body: (text ? JSON.parse(text) : null) as Body };
	};
	const call = async (name: string, args: Record<string, unknown> = {}) =>
		(await post({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, { 'mcp-protocol-version': '2025-11-25' })).body.result!;
	return { store, written, context, call, post };
}
