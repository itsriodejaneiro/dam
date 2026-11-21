/* Project setup (server-side): creates the PocketBase schema and seeds the
   base data of a new project. Takes a `pb` client already authenticated as
   superuser; with no env dependency, it serves both the CLI
   (scripts/setup-collections.ts) and the web endpoint (/setup).

   - setupSchema(pb): creates/updates every collection, with the data a change carries, the
     home page record, the agents' API's service account and PocketBase's batch on: what the
     app runs when it boots (boot.ts). Idempotent.
   - setupCollections(pb): the schema, PocketBase's own settings (the rate limit of the auth
     routes, the proxy header, the batch), the settings record and, in a project nobody set
     up, the removal of the accounts that came before it: what /setup and the CLI run.
     Idempotent.
   - seedBaseData(pb, locales): fills a new project with the base categories (node_types),
     the main map, the example and the home (seed-example.ts), in the deploy's locales.
     The node_type slug comes from the label in the default locale (locales[0]).
   - isConfigured(pb): true once the project has its settings record. */

import { randomBytes } from 'node:crypto';
import type PocketBase from 'pocketbase';
import { SERVICE_ACCOUNT_EMAIL, WRITE_ACTIONS } from '../api';
import { LOCALE_CODES, type LocaleCode } from '../i18n/messages';
import { laneCenter } from '../journey';
import { HOME, IMAGES_MAX, parseBlocks, parseTop } from '../page';
import { ACCOUNT_ROLES } from '../roles';
import { DEFAULT_SETTINGS, LOGO_MAX_BYTES, LOGO_TYPES } from '../settings';
import type { Block, Page } from '../types/page';
import { PACKS } from '../theme';
import { defaultTop, isTopEmpty, seedHomeTop, topSettings } from './home-top';
import { NoStepsError, publishJourney } from './journeys';
import { pageBySlug, publishPage } from './pages';
import {
	EXAMPLE_EDGES,
	EXAMPLE_HOME,
	EXAMPLE_JOURNEY,
	EXAMPLE_NODES,
	type ExampleNodeKey
} from './seed-example';

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

/* A journey and its steps, and a page, are an edit read by an admin alone. The visitor reads
   the copy, `published`, through the site's server (server/journeys.ts, server/pages.ts):
   the API is always by token, and no edit goes to the anonymous REST. */
const EDIT_RULES = { ...EDITORIAL_RULES, listRule: ADMIN_ONLY, viewRule: ADMIN_ONLY } as const;

/** PocketBase's answer when a collection, or a record, is not there. */
function is404(err: unknown): boolean {
	return !!err && typeof err === 'object' && 'status' in err && (err as { status: unknown }).status === 404;
}

type Definition = Record<string, unknown>;
type Field = { name: string } & Definition;
const RULES = ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule', 'manageRule'] as const;

/** The name in an index statement, as PocketBase writes it back, quoted or not. */
function indexName(sql: string): string | undefined {
	return sql.match(/INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?([^`"\s(]+)/i)?.[1];
}

/**
 * What an update brings a collection: the payload, and a word per difference between the
 * definition and what PocketBase holds; null when they agree, so a boot on a current
 * database writes nothing and logs nothing. A field is compared on the keys the definition
 * names, since PocketBase fills in the rest. A field or index the definition no longer
 * names stays: a change of mind about one is a migration written here, as the swap of
 * `journeys.published` is.
 */
export function collectionChanges(
	existing: Definition,
	definition: Definition
): { payload: Definition; changes: string[] } | null {
	const changes: string[] = [];

	const fields = [...((existing.fields ?? []) as Field[])];
	for (const field of (definition.fields ?? []) as Field[]) {
		const idx = fields.findIndex((f) => f.name === field.name);
		if (idx < 0) {
			fields.push(field);
			changes.push(`+${field.name}`);
			continue;
		}
		const held = fields[idx];
		const differs = Object.keys(field).some(
			(key) => JSON.stringify(held[key] ?? null) !== JSON.stringify(field[key] ?? null)
		);
		if (differs) {
			fields[idx] = field;
			changes.push(`~${field.name}`);
		}
	}

	const indexes = [...((existing.indexes ?? []) as string[])];
	for (const index of (definition.indexes ?? []) as string[]) {
		const name = indexName(index);
		if (indexes.some((held) => indexName(held) === name)) continue;
		indexes.push(index);
		changes.push(`+${name ?? 'index'}`);
	}

	const payload: Definition = { fields, indexes };
	for (const rule of RULES) {
		if (!(rule in definition)) continue;
		payload[rule] = definition[rule];
		if ((existing[rule] ?? null) !== (definition[rule] ?? null)) changes.push(`~${rule}`);
	}

	return changes.length > 0 ? { payload, changes } : null;
}

/** Creates the collection if missing; otherwise updates it when the definition differs,
    and says what changed. Idempotent. */
async function upsertCollection(
	pb: PocketBase,
	name: string,
	definition: Definition,
	log: Logger = noop
): Promise<string> {
	let existing;
	try {
		existing = await pb.collections.getOne(name);
	} catch (err: unknown) {
		if (!is404(err)) throw err;
		const created = await pb.collections.create(definition);
		log(`  + ${name}`);
		return created.id;
	}
	const update = collectionChanges(existing, definition);
	if (update) {
		await pb.collections.update(existing.id, update.payload);
		log(`  ~ ${name}: ${update.changes.join(', ')}`);
	}
	return existing.id;
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

/** The agents' API writes an entity, its translations and its places on the maps in one
    transactional `POST /api/batch` (server/api): the batch ships off, and this turns it on.
    The size is one entity's: its record, a translation per locale and a row per map. */
export const BATCH = { enabled: true, maxRequests: 50, timeout: 10, maxBodySize: 0 };

type BatchSettings = Partial<typeof BATCH>;

/** What a batch of the API's size needs: on, and with the room and the time of BATCH. A body
    limit of 0 is PocketBase's "none". */
export function batchBelow(batch: BatchSettings | undefined): boolean {
	if (!batch?.enabled) return true;
	return (batch.maxRequests ?? 0) < BATCH.maxRequests || (batch.timeout ?? 0) < BATCH.timeout || (batch.maxBodySize ?? 0) !== BATCH.maxBodySize;
}

/** The batch is the one PocketBase setting the boot owns: the API's writes fail without it,
    and nobody tunes it by hand, so turning it on undoes no one's work. The rest of the
    settings a deploy may adjust in the panel (the proxy header behind a CDN, a rate limit),
    and the boot leaves them as they are: /setup and `db:setup` write them whole. PocketBase
    merges a partial update, so only the `batch` key goes, and only when it is off or short. */
export async function ensureBatchOn(pb: PocketBase, log: Logger = noop): Promise<void> {
	const { batch } = (await pb.settings.getAll()) as { batch?: BatchSettings };
	if (!batchBelow(batch)) return;
	await pb.settings.update({ batch: BATCH });
	log('  ~ batch api on');
}

/** PocketBase ships with rate limits off, and its stock rule list would limit every route
    once on, so the list is written whole. A deploy sits behind one reverse proxy, the only
    way to reach PocketBase: without the header every visitor counts as the proxy's address,
    and the rightmost entry is the one that proxy wrote, while the rest is the client's word. */
async function writePocketBaseSettings(pb: PocketBase, log: Logger): Promise<void> {
	await pb.settings.update({
		rateLimits: { enabled: true, rules: AUTH_RATE_LIMITS },
		trustedProxy: { headers: ['X-Forwarded-For'], useLeftmostIP: false },
		batch: BATCH
	});
	log('  ~ auth rate limit, batch on');
}

/** The tokens of the agents' API and the record of what each one wrote: an admin reads
    them in /admin/tokens, and only the server writes them (server/api). */
const SERVER_ONLY_RULES = {
	listRule: ADMIN_ONLY,
	viewRule: ADMIN_ONLY,
	createRule: null,
	updateRule: null,
	deleteRule: null
} as const;

/**
 * The account the agents' API writes as: an admin like any other to the collections'
 * rules, with a password drawn here and kept nowhere, so nobody signs in as it. The server
 * impersonates it from its superuser client. Idempotent: it finds the account by its e-mail.
 */
async function ensureServiceAccount(pb: PocketBase, log: Logger): Promise<void> {
	const existing = await pb
		.collection('users')
		.getFirstListItem(pb.filter('email = {:email}', { email: SERVICE_ACCOUNT_EMAIL }), { fields: 'id,role' })
		.catch((err: unknown) => {
			if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) return null;
			throw err;
		});
	if (existing) {
		if (existing.role !== 'admin') await pb.collection('users').update(existing.id, { role: 'admin' });
		return;
	}
	const password = randomBytes(32).toString('base64url');
	await pb.collection('users').create({
		email: SERVICE_ACCOUNT_EMAIL,
		password,
		passwordConfirm: password,
		verified: true,
		role: 'admin'
	});
	log('  + account: the agents\' api');
}

/** Until the first setup closes it, anyone can sign up in `users`. In an empty project an
    account with no role came through that window, and it goes before the deploy opens. */
async function removeEarlySignups(pb: PocketBase, log: Logger): Promise<void> {
	const early = await pb.collection('users').getFullList({ filter: 'role = ""' });
	for (const { id } of early) await pb.collection('users').delete(id);
	if (early.length > 0) log(`  - accounts from before the setup: ${early.length}`);
}

/** A project nobody set up yet: no settings record and nothing of its own. A database from
    before the settings collection has its maps, and keeps its accounts. */
async function emptyProject(pb: PocketBase): Promise<boolean> {
	return !(await isConfigured(pb)) && !(await hasOwnData(pb));
}

/** The schema and what a project needs around it: what /setup and `bun run db:setup` run.
    Idempotent. */
export async function setupCollections(pb: PocketBase, log: Logger = noop): Promise<void> {
	await writePocketBaseSettings(pb, log);
	const empty = await emptyProject(pb);
	await setupSchema(pb, log);
	if (empty) await removeEarlySignups(pb, log);
	await ensureSettingsRecord(pb, log);
}

/** Creates/updates every collection, with the data a change carries (a field swapped, the
    home record the editor opens), and what the agents' API needs around them: its account
    and PocketBase's batch on. Idempotent, and what the app runs when it boots (boot.ts), so
    a deploy on a new version has its schema before the first request. */
export async function setupSchema(pb: PocketBase, log: Logger = noop): Promise<void> {
	const up = (name: string, definition: Definition) => upsertCollection(pb, name, definition, log);

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

	// Texts are JSON {code: text}: a journey is always read and edited whole.
	const flagged = await journeysPublishedByFlag(pb);
	const journeysId = await up('journeys', {
		name: 'journeys',
		type: 'base',
		...EDIT_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'slug', type: 'text', required: true },
			// Not cascading: removing a map never takes an authored journey with it.
			{ name: 'map', type: 'relation', required: true, collectionId: mapsId, cascadeDelete: false, maxSelect: 1 },
			{ name: 'published', type: 'json', maxSize: 5000000 },
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
		...EDIT_RULES,
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
	if (flagged) await publishFlagged(pb, flagged, log);

	// A page is a record: the home is the one the app has. Its top is a title and a lede per
	// locale; its files are the blocks' pictures, under the logo's limits, and anyone with a
	// file's address reads it.
	await up('pages', {
		name: 'pages',
		type: 'base',
		...EDIT_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'slug', type: 'text', required: true },
			{ name: 'title', type: 'json', maxSize: 5000 },
			{ name: 'lede', type: 'json', maxSize: 5000 },
			{ name: 'blocks', type: 'json', maxSize: 2000000 },
			{ name: 'published', type: 'json', maxSize: 2000000 },
			{
				name: 'images',
				type: 'file',
				maxSelect: IMAGES_MAX,
				maxSize: LOGO_MAX_BYTES,
				mimeTypes: LOGO_TYPES
			}
		],
		indexes: ['CREATE UNIQUE INDEX idx_pages_slug ON pages (slug)']
	});
	let home = await pageBySlug(pb, HOME);
	if (!home) {
		home = await pb.collection('pages').create<Page>({ slug: HOME, blocks: [], published: null });
		log('  + page: home');
	}
	// A deploy from before the top had a text: its empty top gets the default once (home-top.ts).
	await seedHomeTop(pb, home, log);

	// The agents' API (server/api): a token is a name, a prefix and the hash of the whole
	// token; `hidden` keeps the hash from every client but the superuser's. `created_by` is
	// text, who created it, and a token outlives that account.
	await up('api_tokens', {
		name: 'api_tokens',
		type: 'base',
		...SERVER_ONLY_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'name', type: 'text', required: true, max: 60 },
			{ name: 'prefix', type: 'text', required: true, pattern: '^[0-9a-f]{8}$' },
			{ name: 'hash', type: 'text', required: true, hidden: true },
			{ name: 'created_by', type: 'text' },
			{ name: 'last_used_at', type: 'date' }
		],
		indexes: ['CREATE UNIQUE INDEX idx_api_tokens_prefix ON api_tokens (prefix)']
	});

	// One row per write by a tool, written before the write, and one per token created or
	// deleted. The token goes as text, so the history outlives the token. `previous` is the
	// content an update or a delete replaced, for a recovery by hand.
	await up('api_writes', {
		name: 'api_writes',
		type: 'base',
		...SERVER_ONLY_RULES,
		fields: [
			...AUTODATE_FIELDS,
			{ name: 'token_prefix', type: 'text', required: true },
			{ name: 'token_name', type: 'text' },
			{ name: 'tool', type: 'text' },
			{ name: 'collection', type: 'text', required: true },
			{ name: 'record', type: 'text', required: true },
			{ name: 'action', type: 'select', required: true, maxSelect: 1, values: [...WRITE_ACTIONS] },
			{ name: 'actor', type: 'text' },
			{ name: 'previous', type: 'json', maxSize: 5000000 }
		],
		indexes: ['CREATE INDEX idx_api_writes_token ON api_writes (token_prefix)']
	});

	await ensureServiceAccount(pb, log);
	await ensureBatchOn(pb, log);
}

/**
 * The journeys whose `published` is still the flag that came before the copy, with the
 * flag on; null once the field holds the copy. Read before the schema swaps the field,
 * which empties it.
 */
async function journeysPublishedByFlag(pb: PocketBase): Promise<string[] | null> {
	try {
		const { fields } = await pb.collections.getOne('journeys');
		const field = (fields as { name: string; type: string }[]).find((f) => f.name === 'published');
		if (field?.type !== 'bool') return null;
	} catch (err: unknown) {
		if (is404(err)) return null;
		throw err;
	}
	const flagged = await pb.collection('journeys').getFullList({ filter: 'published = true', fields: 'id' });
	return flagged.map((r) => r.id);
}

/** A journey published by the flag gets its copy from the edit, as Publish writes it. */
async function publishFlagged(pb: PocketBase, ids: string[], log: Logger): Promise<void> {
	for (const id of ids) {
		try {
			await publishJourney(pb, id);
			log(`  ~ journey published as a copy: ${id}`);
		} catch (err) {
			if (!(err instanceof NoStepsError)) throw err;
			log(`  ~ journey with no steps, left unpublished: ${id}`);
		}
	}
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

/** A text of the example in the deploy's locales. */
const inLocales = (byLocale: Record<LocaleCode, string>, locales: string[]) =>
	Object.fromEntries(locales.map((loc) => [loc, pickLabel(byLocale, loc)!]));

/** Writes the example: the nodes in their place on the map, the connections, and the
    journey through them. The journey is published last, once it is whole: its copy is
    the edit the seed wrote. Returns the journey's id. */
async function seedExample(
	pb: PocketBase,
	mapId: string,
	nodeTypeIds: string[],
	locales: string[],
	log: Logger
): Promise<string> {
	const inDeploy = (byLocale: Record<LocaleCode, string>) => inLocales(byLocale, locales);

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
		documents: documents.map((doc) => ({
			id: doc.id,
			label: inDeploy(doc.label),
			abbrev: inDeploy(doc.abbrev),
			unlockedAt: doc.atStep === null ? null : stepIds[doc.atStep]
		}))
	});
	await publishJourney(pb, journey.id);
	log(`  + journey: ${slug}`);
	return journey.id;
}

/** True once the home holds blocks or a copy: a project's own home is never seeded over. A
    top alone, the default or a written one, stops nothing, and seedHome keeps it. */
const homeWritten = (home: Page | null): boolean =>
	parseBlocks(home?.blocks).length > 0 || home?.published != null;

/** Writes the home, published: the default top with the deploy's name (home-top.ts), unless
    a top is already written, and the example's text, picture and cards to the main map and
    to the journey. The picture goes first, since a block names its file. */
async function seedHome(
	pb: PocketBase,
	ids: { map: string; journey: string },
	locales: string[],
	log: Logger
): Promise<void> {
	const home = await pageBySlug(pb, HOME);
	if (!home) return;
	const inDeploy = (byLocale: Record<LocaleCode, string>) => inLocales(byLocale, locales);
	const { text, image, cards } = EXAMPLE_HOME;
	const settings = await topSettings(pb);
	const top = isTopEmpty(parseTop(home)) && settings ? defaultTop(settings) : parseTop(home);

	const file = new File([image.svg], image.name, { type: 'image/svg+xml' });
	const { images } = await pb.collection('pages').update<Page>(home.id, { images: [file] });
	const blocks: Block[] = [
		{ id: 'about', type: 'text', body: inDeploy(text) },
		{
			id: 'picture',
			type: 'image',
			image: images[0],
			alt: inDeploy(image.alt),
			caption: inDeploy(image.caption)
		},
		{
			id: 'start',
			type: 'cards',
			cards: [
				{
					title: inDeploy(cards.map.title),
					text: inDeploy(cards.map.text),
					target: { kind: 'map', id: ids.map }
				},
				{
					title: inDeploy(cards.journey.title),
					text: inDeploy(cards.journey.text),
					target: { kind: 'journey', id: ids.journey }
				}
			]
		}
	];
	await pb.collection('pages').update(home.id, { ...top, blocks });
	await publishPage(pb, HOME);
	log('  + home');
}

/**
 * Seeds a new project: categories (node_types + translations), the main map, the example
 * and the home. Writes nothing once the project has a map, a node, a journey or a home with
 * blocks or a copy. The main map cannot be removed from the app, so a seeded project always
 * has one and what its admin deleted stays deleted. The node_type slug comes from the label
 * in the default locale (locales[0]); every translation covers the deploy's locales.
 */
export async function seedBaseData(
	pb: PocketBase,
	locales: string[],
	log: Logger = noop
): Promise<void> {
	if (await hasOwnData(pb)) {
		log('  ~ base data: this project already has its own');
		return;
	}
	if (homeWritten(await pageBySlug(pb, HOME))) {
		log('  ~ base data: this project already has its own home');
		return;
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
	const journeyId = await seedExample(pb, mapId, nodeTypeIds, locales, log);
	await seedHome(pb, { map: mapId, journey: journeyId }, locales, log);
}

/** Deletion order: dependants before parents (avoids relation errors). */
const RESET_ORDER = [
	'api_writes',
	'api_tokens',
	'pages',
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
			if (!is404(err)) throw err;
		}
	}
}

/** True once the project has its settings record, what /setup (or `db:setup`) writes. The
    collections say nothing: the boot brings them to any database (boot.ts). */
export async function isConfigured(pb: PocketBase): Promise<boolean> {
	try {
		// the record route and a public collection: any client can ask, signed in or not
		const { items } = await pb.collection('settings').getList(1, 1, { skipTotal: true });
		return items.length > 0;
	} catch (err: unknown) {
		if (is404(err)) return false;
		throw err;
	}
}

/** Whether the project has a map, a node or a journey of its own; a collection not there
    yet holds none. */
async function hasOwnData(pb: PocketBase): Promise<boolean> {
	for (const collection of ['maps', 'nodes', 'journeys']) {
		try {
			if ((await pb.collection(collection).getList(1, 1)).totalItems > 0) return true;
		} catch (err: unknown) {
			if (!is404(err)) throw err;
		}
	}
	return false;
}
