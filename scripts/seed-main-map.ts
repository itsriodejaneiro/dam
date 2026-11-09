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
 *   PB_URL or PUBLIC_POCKETBASE_URL — PocketBase URL
 *   PB_SUPERUSER_EMAIL              — superuser email
 *   PB_SUPERUSER_PASSWORD           — superuser password
 */

import type { RecordModel } from 'pocketbase';
import { createMainMap, deployLocales } from '../src/lib/server/setup';
import { connectSuperuser } from './superuser';

const pb = await connectSuperuser();

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
