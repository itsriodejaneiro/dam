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
 * Env (in .env): PB_URL or PUBLIC_POCKETBASE_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD
 */

import { deployLocales, seedBaseData, setupCollections } from '../src/lib/server/setup';
import { connectSuperuser } from './superuser';

const pb = await connectSuperuser();

console.log('Upserting collections...');
await setupCollections(pb);
console.log('Seeding base data...');
await seedBaseData(pb, await deployLocales(pb), console.log);
console.log('\nAll done. Collections created or updated.');
