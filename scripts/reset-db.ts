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
 * Env (in .env): PB_URL or PUBLIC_POCKETBASE_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD
 */

import { resetProject } from '../src/lib/server/setup';
import { connectSuperuser } from './superuser';

if (!process.argv.includes('--yes')) {
	console.error('⚠  DESTRUCTIVE: this deletes ALL the project collections.');
	console.error('   Run again with --yes to confirm:');
	console.error('   bun run scripts/reset-db.ts --yes');
	process.exit(1);
}

const pb = await connectSuperuser();

console.log('Dropping all project collections...');
await resetProject(pb);
console.log('\nReset done. Next step: bun run db:setup');
