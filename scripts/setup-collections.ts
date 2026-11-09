/**
 * PocketBase collections setup (CLI)
 *
 * Creates or updates the project's collections and seeds a new project in the
 * locales of its settings record. Safe to run repeatedly: new fields are added
 * without touching existing data, and the seed writes only into an empty project.
 *
 * The schema and the seed live in src/lib/server/setup.ts, the single source also
 * used by the web endpoint.
 *
 * Run: bun run scripts/setup-collections.ts
 *
 * Env (in .env): PUBLIC_POCKETBASE_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD
 */

import PocketBase from 'pocketbase';
import { deployLocales, seedBaseData, setupCollections } from '../src/lib/server/setup';

const PB_URL =
	process.env.PUBLIC_POCKETBASE_URL || process.env.PB_URL || 'http://127.0.0.1:8090';
const PB_EMAIL = process.env.PB_SUPERUSER_EMAIL || process.env.PB_EMAIL;
const PB_PASSWORD = process.env.PB_SUPERUSER_PASSWORD || process.env.PB_PASSWORD;

if (!PB_EMAIL || !PB_PASSWORD) {
	console.error('Missing superuser credentials.');
	console.error('Set PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD in .env');
	process.exit(1);
}

const pb = new PocketBase(PB_URL);

console.log(`Connecting to ${PB_URL}...`);
await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASSWORD);
console.log('Authenticated as superuser.\n');

console.log('Upserting collections...');
await setupCollections(pb);
console.log('Seeding base data...');
await seedBaseData(pb, await deployLocales(pb), console.log);
console.log('\nAll done. Collections created or updated.');
