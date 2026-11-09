/**
 * The superuser connection of the CLI scripts.
 *
 * The URL comes in the app's order (serverPbUrl in src/lib/services/pb.server.ts). The
 * scripts run outside SvelteKit, so they read process.env themselves.
 *
 * Env (in .env): PB_URL or PUBLIC_POCKETBASE_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD
 */

import PocketBase from 'pocketbase';

export async function connectSuperuser(): Promise<PocketBase> {
	const url = process.env.PB_URL || process.env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
	const email = process.env.PB_SUPERUSER_EMAIL || process.env.PB_EMAIL;
	const password = process.env.PB_SUPERUSER_PASSWORD || process.env.PB_PASSWORD;

	if (!email || !password) {
		console.error('Missing superuser credentials.');
		console.error('Set PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD in .env');
		process.exit(1);
	}

	const pb = new PocketBase(url);

	console.log(`Connecting to ${url}...`);
	await pb.collection('_superusers').authWithPassword(email, password);
	console.log('Authenticated as superuser.\n');

	return pb;
}
