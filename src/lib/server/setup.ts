/* Project setup (server-side): creates the PocketBase schema and seeds the
   base data of a new project. Takes a `pb` client already authenticated as
   superuser; with no env dependency, it serves both the CLI
   (scripts/setup-collections.ts) and the web endpoint (/setup).

   - setupCollections(pb): creates/updates every collection and the settings record,
     and turns on the rate limit of the auth routes (idempotent).
   - seedBaseData(pb, locales): fills a new project with the base categories (node_types),
     the main map and the example (seed-example.ts), in the deploy's locales. The
     node_type slug comes from the label in the default locale (locales[0]).
   - isConfigured(pb): true if the schema already exists. */

import type PocketBase from 'pocketbase';
import { LOCALE_CODES, type LocaleCode } from '../i18n/messages';
import { laneCenter } from '../journey';
import { ACCOUNT_ROLES } from '../roles';
import { DEFAULT_SETTINGS, LOGO_MAX_BYTES, LOGO_TYPES } from '../settings';
import { PACKS } from '../theme';
import { EXAMPLE_EDGES, EXAMPLE_JOURNEY, EXAMPLE_NODES, type ExampleNodeKey } from './seed-example';

// ─────────────────────────────────────────────────────────
// SCHEMA (collections)
// ─────────────────────────────────────────────────────────

/** Progress callback: receives one line at a time (for the /setup terminal). */
export type Logger = (msg: string) => void;
const noop: Logger = () => {};

const AUTODATE_FIELDS = [
	{ name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
	{ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
];

// Who writes: an account with the admin role. A superuser passes every rule.
const ADMIN_ONLY = '@request.auth.role = "admin"';

// App content: anyone reads it, an admin creates, edits and removes it.
const EDITORIAL_RULES = {
	listRule: '',
	viewRule: '',
	createRule: ADMIN_ONLY,
	updateRule: ADMIN_ONLY,
	deleteRule: ADMIN_ONLY
} as const;

/** A draft journey can hold what is not out yet: an admin reads it, the public API does not. */
function publishedOrAdminRead(publishedField: string) {
	const rule = `${publishedField} = true || ${ADMIN_ONLY}`;
	return { listRule: rule, viewRule: rule };
}

/** Creates the collection if missing; otherwise merges fields and indexes. Idempotent. */
async function upsertCollection(
	pb: PocketBase,
	name: string,
	definition: Record<string, unknown>,
	log: Logger = noop
): Promise<string> {
	try {
		const existing = await pb.collections.getOne(name);

		const existingFields = (existing.fields || []) as Array<{ name: string }>;
		const newFields = (definition.fields || []) as Array<{ name: string }>;
		const mergedFields = [...existingFields];
		for (const field of newFields) {
			const idx = mergedFields.findIndex((f) => f.name === field.name);
			if (idx >= 0) mergedFields[idx] = field;
			else mergedFields.push(field);
		}

		const existingIndexes = (existing.indexes || []) as string[];
		const newIndexes = (definition.indexes || []) as string[];
		const mergedIndexes = [...existingIndexes];
		for (const idx of newIndexes) {
			const newName = idx.match(/INDEX\s+(\S+)/i)?.[1];
			const already = mergedIndexes.some(
				(e) => e.match(/INDEX\s+(\S+)/i)?.[1] === newName
			);
			if (!already) mergedIndexes.push(idx);
		}

		const payload: Record<string, unknown> = { fields: mergedFields, indexes: mergedIndexes };
		for (const rule of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule', 'manageRule']) {
			if (rule in definition) payload[rule] = definition[rule];
		}
		await pb.collections.update(existing.id, payload);
		log(`  ~ ${name}`);
		return existing.id;
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
			const created = await pb.collections.create(definition);
			log(`  + ${name}`);
			return created.id;
		}
		throw err;
	}
}

/** The deploy's identity: one record, so only a superuser creates or deletes one. */
const SETTINGS_RULES = {
	listRule: '',
	viewRule: '',
	createRule: null,
	updateRule: ADMIN_ONLY,
	deleteRule: null
} as const;

/** The accounts that edit the map, never open to public signup: an admin adds one and
    manages the others, and none deletes itself. */
const ACCOUNT_RULES = {
	listRule: ADMIN_ONLY,
	viewRule: ADMIN_ONLY,
	createRule: ADMIN_ONLY,
	updateRule: ADMIN_ONLY,
	deleteRule: `${ADMIN_ONLY} && id != @request.auth.id`,
	manageRule: ADMIN_ONLY
} as const;

/** Creates the settings record with the defaults when there is none. */
async function ensureSettingsRecord(pb: PocketBase, log: Logger): Promise<void> {
	if ((await pb.collection('settings').getList(1, 1)).totalItems > 0) return;
	const { name, locales, defaultLocale, theme, journeys } = DEFAULT_SETTINGS;
	await pb.collection('settings').create({
		name,
		locales,
		default_locale: defaultLocale,
		theme,
		journeys
	});
	log('  + settings: defaults');
}

/** The default locale of a database where the field is still text, and the record that
    holds it. PocketBase replaces a column whose field changes type, which would blank
    the value. A stored value the app does not know gives way to one it does. */
async function textDefaultLocale(pb: PocketBase): Promise<{ id: string; code: string } | null> {
	const [collection] = await pb.collections.getFullList({ filter: 'name = "settings"' });
	const field = (collection?.fields ?? []).find((f) => f.name === 'default_locale');
	if (field?.type !== 'text') return null;
	const [record] = (await pb.collection('settings').getList(1, 1)).items;
	if (!record) return null;
	const stored: unknown[] = [record.default_locale, ...(record.locales ?? [])];
	const code = stored.find((c) => (LOCALE_CODES as readonly unknown[]).includes(c));
	return { id: record.id, code: (code as string) ?? DEFAULT_SETTINGS.defaultLocale };
}

/** Logins, by password or otherwise, and the two public routes that send mail. PocketBase
    counts per address and per auth collection, so the app's form, which tries `users` and
    then `_superusers`, spends one login attempt of each. */
const AUTH_RATE_LIMITS = [
	{ label: '*:auth', audience: '', duration: 60, maxRequests: 20 },
	{ label: '*:requestPasswordReset', audience: '', duration: 60, maxRequests: 5 },
	{ label: '*:requestVerification', audience: '', duration: 60, maxRequests: 5 }
];

/** PocketBase ships with rate limits off, and its stock rule list would limit every route
    once on, so the list is written whole. A deploy sits behind one reverse proxy, the only
    way to reach PocketBase: without the header every visitor counts as the proxy's address,
    and the rightmost entry is the one that proxy wrote, while the rest is the client's word. */
async function limitAuthRoutes(pb: PocketBase, log: Logger): Promise<void> {
	await pb.settings.update({
		rateLimits: { enabled: true, rules: AUTH_RATE_LIMITS },
		trustedProxy: { headers: ['X-Forwarded-For'], useLeftmostIP: false }
	});
	log('  ~ auth rate limit');
}

/** Until the first setup closes it, anyone can sign up in `users`. In an empty project an
    account with no role came through that window, and it goes before the deploy opens. */
async function removeEarlySignups(pb: PocketBase, log: Logger): Promise<void> {
	const early = await pb.collection('users').getFullList({ filter: 'role = ""' });
	for (const { id } of early) await pb.collection('users').delete(id);
	if (early.length > 0) log(`  - accounts from before the setup: ${early.length}`);
}

/** Creates/updates every project collection and the settings record. Idempotent. */
export async function setupCollections(pb: PocketBase, log: Logger = noop): Promise<void> {
	const up = (name: string, definition: Record<string, unknown>) =>
		upsertCollection(pb, name, definition, log);

	await limitAuthRoutes(pb, log);
	const empty = !(await isConfigured(pb));

	// A new PocketBase ships `users` open to public signup: these rules close it.
	await up('users', {
		name: 'users',
		type: 'auth',
		...ACCOUNT_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'role', type: 'select', required: true, maxSelect: 1, values: [...ACCOUNT_ROLES] }
		]
	});
	if (empty) await removeEarlySignups(pb, log);

	const nodeTypesId = await up('node_types', {
		name: 'node_types',
		type: 'base',
		...EDITORIAL_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'slug', type: 'text', required: true },
			{ name: 'color_slot', type: 'number', required: true, min: 1, max: 8 },
			{ name: 'layer_order', type: 'number', required: true },
			{ name: 'base_size', type: 'number', required: true }
		],
		indexes: ['CREATE UNIQUE INDEX idx_node_types_slug ON node_types (slug)']
	});

	const nodesId = await up('nodes', {
		name: 'nodes',
		type: 'base',
		...EDITORIAL_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'type', type: 'relation', required: true, collectionId: nodeTypesId, cascadeDelete: false, maxSelect: 1 },
			{ name: 'links', type: 'json', maxSize: 50000 },
			{ name: 'order', type: 'number' },
			{ name: 'weight_override', type: 'number' }
		]
	});

	const edgesId = await up('edges', {
		name: 'edges',
		type: 'base',
		...EDITORIAL_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'source', type: 'relation', required: true, collectionId: nodesId, cascadeDelete: true, maxSelect: 1 },
			{ name: 'target', type: 'relation', required: true, collectionId: nodesId, cascadeDelete: true, maxSelect: 1 }
		]
	});

	const mapsId = await up('maps', {
		name: 'maps',
		type: 'base',
		...EDITORIAL_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'slug', type: 'text', required: true },
			{ name: 'order', type: 'number', required: true }
		],
		indexes: ['CREATE UNIQUE INDEX idx_maps_slug ON maps (slug)']
	});

	await up('map_nodes', {
		name: 'map_nodes',
		type: 'base',
		...EDITORIAL_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'map', type: 'relation', required: true, collectionId: mapsId, cascadeDelete: true, maxSelect: 1 },
			{ name: 'node', type: 'relation', required: true, collectionId: nodesId, cascadeDelete: true, maxSelect: 1 },
			{ name: 'x', type: 'number' },
			{ name: 'y', type: 'number' }
		],
		indexes: ['CREATE UNIQUE INDEX idx_map_nodes_pair ON map_nodes (map, node)']
	});

	await up('node_type_translations', {
		name: 'node_type_translations',
		type: 'base',
		...EDITORIAL_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'node_type', type: 'relation', required: true, collectionId: nodeTypesId, cascadeDelete: true, maxSelect: 1 },
			{ name: 'locale', type: 'text', required: true },
			{ name: 'label', type: 'text', required: true },
			{ name: 'label_plural', type: 'text' }
		],
		indexes: ['CREATE UNIQUE INDEX idx_node_type_translations_pair ON node_type_translations (node_type, locale)']
	});

	await up('node_translations', {
		name: 'node_translations',
		type: 'base',
		...EDITORIAL_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'node', type: 'relation', required: true, collectionId: nodesId, cascadeDelete: true, maxSelect: 1 },
			{ name: 'locale', type: 'text', required: true },
			{ name: 'label', type: 'text', required: true },
			{ name: 'label_full', type: 'text' },
			// One locale's share of a journey step's `body`, which holds all four.
			{ name: 'description', type: 'editor', maxSize: 125000 }
		],
		indexes: ['CREATE UNIQUE INDEX idx_node_translations_pair ON node_translations (node, locale)']
	});

	await up('map_translations', {
		name: 'map_translations',
		type: 'base',
		...EDITORIAL_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'map', type: 'relation', required: true, collectionId: mapsId, cascadeDelete: true, maxSelect: 1 },
			{ name: 'locale', type: 'text', required: true },
			{ name: 'label', type: 'text', required: true }
		],
		indexes: ['CREATE UNIQUE INDEX idx_map_translations_pair ON map_translations (map, locale)']
	});

	const textLocale = await textDefaultLocale(pb);
	await up('settings', {
		name: 'settings',
		type: 'base',
		...SETTINGS_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'name', type: 'json', maxSize: 5000 },
			{ name: 'locales', type: 'json', required: true, maxSize: 1000 },
			{ name: 'default_locale', type: 'select', required: true, maxSelect: 1, values: [...LOCALE_CODES] },
			{ name: 'theme', type: 'select', required: true, maxSelect: 1, values: [...PACKS] },
			{ name: 'logo', type: 'file', maxSelect: 1, maxSize: LOGO_MAX_BYTES, mimeTypes: LOGO_TYPES },
			{ name: 'flag', type: 'text', pattern: '^[a-z]{2}$' },
			{ name: 'journeys', type: 'bool' }
		]
	});
	if (textLocale) {
		await pb.collection('settings').update(textLocale.id, { default_locale: textLocale.code });
	}
	await ensureSettingsRecord(pb, log);

	// Texts are JSON {code: text}: a journey is always read and edited whole.
	const journeysId = await up('journeys', {
		name: 'journeys',
		type: 'base',
		...EDITORIAL_RULES,
		...publishedOrAdminRead('published'),
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'slug', type: 'text', required: true },
			// Not cascading: removing a map never takes an authored journey with it.
			{ name: 'map', type: 'relation', required: true, collectionId: mapsId, cascadeDelete: false, maxSelect: 1 },
			{ name: 'published', type: 'bool' },
			{ name: 'title', type: 'json', maxSize: 5000 },
			{ name: 'description', type: 'json', maxSize: 20000 },
			{ name: 'phases', type: 'json', maxSize: 200000 },
			{ name: 'documents', type: 'json', maxSize: 200000 }
		],
		indexes: ['CREATE UNIQUE INDEX idx_journeys_slug ON journeys (slug)']
	});

	await up('journey_steps', {
		name: 'journey_steps',
		type: 'base',
		...EDITORIAL_RULES,
		...publishedOrAdminRead('journey.published'),
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'journey', type: 'relation', required: true, collectionId: journeysId, cascadeDelete: true, maxSelect: 1 },
			{ name: 'order', type: 'number', required: true },
			{ name: 'phase', type: 'number' },
			{ name: 'title', type: 'json', maxSize: 5000 },
			{ name: 'body', type: 'json', maxSize: 500000 },
			{ name: 'duration', type: 'json', maxSize: 5000 },
			{ name: 'camera', type: 'json', maxSize: 1000 },
			{ name: 'highlight_nodes', type: 'relation', collectionId: nodesId, cascadeDelete: false, maxSelect: 999 },
			{ name: 'highlight_edges', type: 'relation', collectionId: edgesId, cascadeDelete: false, maxSelect: 999 }
		],
		indexes: ['CREATE INDEX idx_journey_steps_journey ON journey_steps (journey)']
	});
}

// ─────────────────────────────────────────────────────────
// BASE DATA (categories + main map)
// ─────────────────────────────────────────────────────────

interface CategoryLabel {
	label: string;
	label_plural: string;
}

interface BaseCategory {
	color_slot: number;
	layer_order: number;
	base_size: number;
	/** Labels per locale: every supported language (see LocaleCode). */
	labels: Record<LocaleCode, CategoryLabel>;
}

/** A project's base categories, from the institutional authority (top) to the
    human owner (bottom). 8 types, one per color slot. */
export const BASE_CATEGORIES: BaseCategory[] = [
	{
		color_slot: 1,
		layer_order: 1,
		base_size: 26,
		labels: {
			pt: { label: 'Órgão', label_plural: 'Órgãos' },
			en: { label: 'Agency', label_plural: 'Agencies' },
			fr: { label: 'Organisme', label_plural: 'Organismes' },
			es: { label: 'Organismo', label_plural: 'Organismos' }
		}
	},
	{
		color_slot: 2,
		layer_order: 2,
		base_size: 24,
		labels: {
			pt: { label: 'Serviço', label_plural: 'Serviços' },
			en: { label: 'Service', label_plural: 'Services' },
			fr: { label: 'Service', label_plural: 'Services' },
			es: { label: 'Servicio', label_plural: 'Servicios' }
		}
	},
	{
		color_slot: 3,
		layer_order: 3,
		base_size: 24,
		labels: {
			pt: { label: 'Domínio', label_plural: 'Domínios' },
			en: { label: 'Domain', label_plural: 'Domains' },
			fr: { label: 'Domaine', label_plural: 'Domaines' },
			es: { label: 'Dominio', label_plural: 'Dominios' }
		}
	},
	{
		color_slot: 4,
		layer_order: 4,
		base_size: 24,
		labels: {
			pt: { label: 'Hospedagem', label_plural: 'Hospedagens' },
			en: { label: 'Hosting', label_plural: 'Hosting' },
			fr: { label: 'Hébergement', label_plural: 'Hébergements' },
			es: { label: 'Alojamiento', label_plural: 'Alojamientos' }
		}
	},
	{
		color_slot: 5,
		layer_order: 5,
		base_size: 22,
		labels: {
			pt: { label: 'Ambiente de desenvolvimento', label_plural: 'Ambientes de desenvolvimento' },
			en: { label: 'Dev environment', label_plural: 'Dev environments' },
			fr: { label: 'Environnement de développement', label_plural: 'Environnements de développement' },
			es: { label: 'Entorno de desarrollo', label_plural: 'Entornos de desarrollo' }
		}
	},
	{
		color_slot: 6,
		layer_order: 6,
		base_size: 22,
		labels: {
			pt: { label: 'Repositório', label_plural: 'Repositórios' },
			en: { label: 'Repository', label_plural: 'Repositories' },
			fr: { label: 'Dépôt', label_plural: 'Dépôts' },
			es: { label: 'Repositorio', label_plural: 'Repositorios' }
		}
	},
	{
		color_slot: 7,
		layer_order: 7,
		base_size: 22,
		labels: {
			pt: { label: 'Credencial', label_plural: 'Credenciais' },
			en: { label: 'Credential', label_plural: 'Credentials' },
			fr: { label: 'Identifiant', label_plural: 'Identifiants' },
			es: { label: 'Credencial', label_plural: 'Credenciales' }
		}
	},
	{
		color_slot: 8,
		layer_order: 8,
		base_size: 20,
		labels: {
			pt: { label: 'Pessoa', label_plural: 'Pessoas' },
			en: { label: 'Person', label_plural: 'People' },
			fr: { label: 'Personne', label_plural: 'Personnes' },
			es: { label: 'Persona', label_plural: 'Personas' }
		}
	}
];

/** Main map label per locale. */
const MAIN_MAP_LABELS: Record<LocaleCode, string> = {
	pt: 'Mapa Principal',
	en: 'Main Map',
	fr: 'Carte principale',
	es: 'Mapa Principal'
};

/** Slug from a text: lowercase, no accents, non-alphanumeric → hyphen. */
export function slugify(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** Picks a category/map label in a locale, falling back to en, then the first. */
function pickLabel<T>(byLocale: Record<string, T>, locale: string): T | undefined {
	return byLocale[locale] ?? byLocale.en ?? Object.values(byLocale)[0];
}

async function existsIn(pb: PocketBase, collection: string, filter: string): Promise<string | null> {
	try {
		const rec = await pb.collection(collection).getFirstListItem(filter);
		return rec.id;
	} catch {
		return null;
	}
}

/** The deploy's locales from the settings record, the default first: what seedBaseData takes. */
export async function deployLocales(pb: PocketBase): Promise<string[]> {
	const { locales, default_locale: first } = await pb.collection('settings').getFirstListItem('');
	return [first, ...(locales as string[]).filter((code) => code !== first)];
}

/** Creates the main map with its label in the deploy's locales. Its slug is data in
    English, like the routes. */
export async function createMainMap(
	pb: PocketBase,
	locales: string[],
	log: Logger = noop
): Promise<string> {
	const { id } = await pb.collection('maps').create({ slug: 'main', order: 1 });
	log('  + map: main');
	for (const loc of locales) {
		const label = MAIN_MAP_LABELS[loc as LocaleCode] ?? MAIN_MAP_LABELS.en;
		await pb.collection('map_translations').create({ map: id, locale: loc, label });
	}
	return id;
}

/** Writes the example: the nodes in their place on the map, the connections, and the
    journey through them. The journey is published last, once it is whole. */
async function seedExample(
	pb: PocketBase,
	mapId: string,
	nodeTypeIds: string[],
	locales: string[],
	log: Logger
): Promise<void> {
	const inDeploy = (byLocale: Record<LocaleCode, string>) =>
		Object.fromEntries(locales.map((loc) => [loc, pickLabel(byLocale, loc)!]));

	const nodeIds = new Map<ExampleNodeKey, string>();
	for (const [i, example] of EXAMPLE_NODES.entries()) {
		const node = await pb
			.collection('nodes')
			.create({ type: nodeTypeIds[example.category], order: i + 1, links: [] });
		nodeIds.set(example.key, node.id);
		log(`  + node: ${pickLabel(example.labels, locales[0])?.label ?? node.id}`);
		for (const loc of locales) {
			await pb
				.collection('node_translations')
				.create({ node: node.id, locale: loc, ...pickLabel(example.labels, loc)! });
		}
		// Saved positions: the journey's graph draws a node with none at the centre of its lane.
		await pb.collection('map_nodes').create({
			map: mapId,
			node: node.id,
			x: example.x,
			y: laneCenter(BASE_CATEGORIES[example.category].layer_order)
		});
	}

	const edges: { id: string; ends: ExampleNodeKey[] }[] = [];
	for (const [source, target] of EXAMPLE_EDGES) {
		const { id } = await pb
			.collection('edges')
			.create({ source: nodeIds.get(source), target: nodeIds.get(target) });
		edges.push({ id, ends: [source, target] });
	}
	log(`  + connections: ${edges.length}`);

	const { slug, title, description, phases, documents, steps } = EXAMPLE_JOURNEY;
	const journey = await pb.collection('journeys').create({
		slug,
		map: mapId,
		published: false,
		title: inDeploy(title),
		description: inDeploy(description),
		phases: phases.map((phase) => ({
			number: phase.number,
			title: inDeploy(phase.title),
			summary: inDeploy(phase.summary),
			needed: phase.needed
		})),
		documents: []
	});

	const stepIds: string[] = [];
	for (const [i, step] of steps.entries()) {
		const { id } = await pb.collection('journey_steps').create({
			journey: journey.id,
			order: i + 1,
			phase: step.phase,
			title: inDeploy(step.title),
			body: inDeploy(step.body),
			duration: step.duration && inDeploy(step.duration),
			camera: null,
			highlight_nodes: step.nodes.map((key) => nodeIds.get(key)),
			highlight_edges: edges
				.filter((edge) => edge.ends.every((key) => step.nodes.includes(key)))
				.map((edge) => edge.id)
		});
		stepIds.push(id);
	}

	await pb.collection('journeys').update(journey.id, {
		published: true,
		documents: documents.map((doc) => ({
			id: doc.id,
			label: inDeploy(doc.label),
			abbrev: inDeploy(doc.abbrev),
			unlockedAt: doc.atStep === null ? null : stepIds[doc.atStep]
		}))
	});
	log(`  + journey: ${slug}`);
}

/**
 * Seeds a new project: categories (node_types + translations), the main map and the
 * example. Writes nothing once the project has a map, a node or a journey. The main map
 * cannot be removed from the app, so a seeded project always has one and what its admin
 * deleted stays deleted. The node_type slug comes from the label in the default locale
 * (locales[0]); every translation covers the deploy's locales.
 */
export async function seedBaseData(
	pb: PocketBase,
	locales: string[],
	log: Logger = noop
): Promise<void> {
	for (const collection of ['maps', 'nodes', 'journeys']) {
		if ((await pb.collection(collection).getList(1, 1)).totalItems > 0) {
			log('  ~ base data: this project already has its own');
			return;
		}
	}

	const defaultLocale = locales[0] ?? 'en';

	const nodeTypeIds: string[] = [];
	for (const cat of BASE_CATEGORIES) {
		const defLabel = pickLabel(cat.labels, defaultLocale)!;
		const slug = slugify(defLabel.label);

		let ntId = await existsIn(pb, 'node_types', `slug = "${slug}"`);
		if (!ntId) {
			const created = await pb.collection('node_types').create({
				slug,
				color_slot: cat.color_slot,
				layer_order: cat.layer_order,
				base_size: cat.base_size
			});
			ntId = created.id;
			log(`  + category: ${slug}`);
		} else {
			log(`  ~ category: ${slug}`);
		}
		nodeTypeIds.push(ntId);

		for (const loc of locales) {
			const l = pickLabel(cat.labels, loc);
			if (!l) continue;
			const existing = await existsIn(pb, 'node_type_translations', `node_type = "${ntId}" && locale = "${loc}"`);
			if (existing) continue;
			await pb.collection('node_type_translations').create({
				node_type: ntId,
				locale: loc,
				label: l.label,
				label_plural: l.label_plural
			});
		}
	}

	const mapId = await createMainMap(pb, locales, log);
	await seedExample(pb, mapId, nodeTypeIds, locales, log);
}

/** Deletion order: dependants before parents (avoids relation errors). */
const RESET_ORDER = [
	'journey_steps',
	'journeys',
	'node_type_translations',
	'node_translations',
	'map_translations',
	'map_nodes',
	'edges',
	'nodes',
	'maps',
	'node_types',
	'settings',
	'users'
];

/** Drops every project collection, back to a fresh-install state.
    Idempotent (ignores those already gone). DESTRUCTIVE. */
export async function resetProject(pb: PocketBase): Promise<void> {
	for (const name of RESET_ORDER) {
		try {
			const existing = await pb.collections.getOne(name);
			await pb.collections.delete(existing.id);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
				continue;
			}
			throw err;
		}
	}
}

/** True if the project already has a schema (the `maps` collection exists). */
export async function isConfigured(pb: PocketBase): Promise<boolean> {
	try {
		// the record route and a public collection: any client can ask, signed in or not
		await pb.collection('maps').getList(1, 1, { skipTotal: true });
		return true;
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
			return false;
		}
		throw err;
	}
}
