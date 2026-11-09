/**
 * Seed main map
 *
 * Assigns every existing node to the main map, the first in order. A project with no map
 * gets one, with its label in the deploy's locales.
 * Idempotent: safe to run repeatedly (skips duplicates).
 *
 * Run: bun run scripts/seed-main-map.ts
 *
 * Env (in .env):
 *   PUBLIC_POCKETBASE_URL — PocketBase URL
 *   PB_SUPERUSER_EMAIL    — superuser email
 *   PB_SUPERUSER_PASSWORD — superuser password
 */

import PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import { createMainMap, deployLocales } from '../src/lib/server/setup';

const PB_URL =
	process.env.PUBLIC_POCKETBASE_URL ||
	process.env.PB_URL ||
	'http://127.0.0.1:8090';
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

// 1. Find or create the main map
const { items: [firstMap] } = await pb.collection('maps').getList<RecordModel>(1, 1, { sort: 'order' });
const mainMapId = firstMap?.id ?? (await createMainMap(pb, await deployLocales(pb), console.log));
console.log(`Main map id: ${mainMapId}`);

// 2. Fetch every node
const allNodes = await pb.collection('nodes').getFullList<RecordModel>({ sort: 'created' });
console.log(`\nFound ${allNodes.length} nodes. Assigning to the main map...\n`);

// 3. Fetch the existing map_nodes to avoid duplicates
const existingMapNodes = await pb.collection('map_nodes').getFullList<RecordModel>({
	filter: `map = "${mainMapId}"`
});
const existingNodeIds = new Set(existingMapNodes.map((mn) => mn.node));

let created = 0;
let skipped = 0;

for (const node of allNodes) {
	if (existingNodeIds.has(node.id)) {
		skipped++;
		continue;
	}
	await pb.collection('map_nodes').create({
		map: mainMapId,
		node: node.id,
		x: null,
		y: null
	});
	created++;
}

console.log(`\nDone. Created: ${created}, Skipped (already existed): ${skipped}`);
