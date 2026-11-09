/**
 * PocketBase reset (destructive)
 *
 * Drops ALL the project's collections, schema and data, back to a fresh
 * install. Then run `bun run db:setup` (or the web setup at /setup) to recreate
 * everything empty. The deletion order lives in src/lib/server/setup.ts
 * (resetProject), the single source also used by the web reset.
 *
 * Run: bun run scripts/reset-db.ts --yes
 * The `--yes` flag is required, as a guard against an accidental run.
 *
 * Env (in .env): PUBLIC_POCKETBASE_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD
 */

import PocketBase from 'pocketbase';
import { resetProject } from '../src/lib/server/setup';

const PB_URL =
	process.env.PUBLIC_POCKETBASE_URL || process.env.PB_URL || 'http://127.0.0.1:8090';
const PB_EMAIL = process.env.PB_SUPERUSER_EMAIL || process.env.PB_EMAIL;
const PB_PASSWORD = process.env.PB_SUPERUSER_PASSWORD || process.env.PB_PASSWORD;

if (!process.argv.includes('--yes')) {
	console.error('⚠  DESTRUCTIVE: this deletes ALL the project collections.');
	console.error('   Run again with --yes to confirm:');
	console.error('   bun run scripts/reset-db.ts --yes');
	process.exit(1);
}

if (!PB_EMAIL || !PB_PASSWORD) {
	console.error('Missing superuser credentials.');
	console.error('Set PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD in .env');
	process.exit(1);
}

const pb = new PocketBase(PB_URL);

console.log(`Connecting to ${PB_URL}...`);
await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASSWORD);
console.log('Authenticated as superuser.\n');

console.log('Dropping all project collections...');
await resetProject(pb);
console.log('\nReset done. Next step: bun run db:setup');
