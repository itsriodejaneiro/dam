// What a boot writes to a collection: only what differs from the definition, named; and
// what it writes to PocketBase's settings: the batch, only when it is off or short.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type PocketBase from 'pocketbase';
import { BATCH, collectionChanges, ensureBatchOn } from './setup';

// As PocketBase writes a collection back: every field key filled in, the index quoted.
const held = {
	fields: [
		{ id: 'f1', name: 'slug', type: 'text', required: true, min: 0, max: 0, pattern: '' },
		{ id: 'f2', name: 'order', type: 'number', required: true, min: null, max: null }
	],
	indexes: ['CREATE UNIQUE INDEX `idx_maps_slug` ON `maps` (`slug`)'],
	listRule: '',
	viewRule: '',
	createRule: '@request.auth.role = "admin"',
	updateRule: '@request.auth.role = "admin"',
	deleteRule: '@request.auth.role = "admin"'
};

const definition = {
	name: 'maps',
	type: 'base',
	listRule: '',
	viewRule: '',
	createRule: '@request.auth.role = "admin"',
	updateRule: '@request.auth.role = "admin"',
	deleteRule: '@request.auth.role = "admin"',
	fields: [
		{ name: 'slug', type: 'text', required: true },
		{ name: 'order', type: 'number', required: true }
	],
	indexes: ['CREATE UNIQUE INDEX idx_maps_slug ON maps (slug)']
};

describe('collectionChanges', () => {
	test('a collection at the definition needs nothing', () => {
		assert.equal(collectionChanges(held, definition), null);
	});

	test('a new field is added, and the fields PocketBase holds stay', () => {
		const update = collectionChanges(held, {
			...definition,
			fields: [...definition.fields, { name: 'lede', type: 'json', maxSize: 5000 }]
		});
		assert.deepEqual(update?.changes, ['+lede']);
		assert.equal((update?.payload.fields as unknown[]).length, 3);
		assert.equal((update?.payload.fields as { id?: string }[])[0].id, 'f1');
	});

	test('a field whose definition changed is replaced', () => {
		const update = collectionChanges(held, {
			...definition,
			fields: [{ name: 'slug', type: 'text', required: true, max: 80 }, definition.fields[1]]
		});
		assert.deepEqual(update?.changes, ['~slug']);
		assert.equal((update?.payload.fields as { max?: number }[])[0].max, 80);
	});

	test('a type swap counts as a change', () => {
		const update = collectionChanges(held, {
			...definition,
			fields: [definition.fields[0], { name: 'order', type: 'json', maxSize: 100 }]
		});
		assert.deepEqual(update?.changes, ['~order']);
	});

	test('an index is matched by name, however PocketBase quotes it', () => {
		const update = collectionChanges(held, {
			...definition,
			indexes: [...definition.indexes, 'CREATE INDEX idx_maps_order ON maps (`order`)']
		});
		assert.deepEqual(update?.changes, ['+idx_maps_order']);
		assert.equal((update?.payload.indexes as string[]).length, 2);
	});

	test('a rule is compared with null for locked', () => {
		assert.equal(collectionChanges({ ...held, createRule: null }, { ...definition, createRule: null }), null);
		const update = collectionChanges(held, { ...definition, createRule: null });
		assert.deepEqual(update?.changes, ['~createRule']);
		assert.equal(update?.payload.createRule, null);
	});

	test('a rule the definition leaves out is neither compared nor sent', () => {
		const update = collectionChanges({ ...held, manageRule: 'x' }, { ...definition, createRule: null });
		assert.deepEqual(update?.changes, ['~createRule']);
		assert.equal('manageRule' in (update?.payload ?? {}), false);
	});
});

/** A PocketBase whose settings hold `batch`, keeping what an update sends. */
function withSettings(batch: Record<string, unknown>) {
	const updates: Record<string, unknown>[] = [];
	const pb = { settings: { async getAll() { return { batch, trustedProxy: { headers: ['CF-Connecting-IP'] } }; }, async update(data: Record<string, unknown>) { updates.push(data); } } } as unknown as PocketBase;
	return { pb, updates };
}

describe('ensureBatchOn', () => {
	test('a batch that is off goes on, by its key alone, and the log says so', async () => {
		const { pb, updates } = withSettings({ ...BATCH, enabled: false });
		const lines: string[] = [];
		await ensureBatchOn(pb, (l) => lines.push(l.trim()));
		assert.deepEqual(updates, [{ batch: BATCH }]);
		assert.deepEqual(lines, ['~ batch api on']);
	});

	test('a batch that is on, at the size the API needs or more, is left alone', async () => {
		const bigger = withSettings({ ...BATCH, maxRequests: 100, timeout: 30 });
		await ensureBatchOn(bigger.pb, () => assert.fail('nothing to log'));
		assert.deepEqual(bigger.updates, []);
		const exact = withSettings({ ...BATCH });
		await ensureBatchOn(exact.pb);
		assert.deepEqual(exact.updates, []);
	});

	test('a batch below the size the API needs is raised to it', async () => {
		for (const short of [{ maxRequests: 10 }, { timeout: 5 }, { maxBodySize: 1000 }]) {
			const { pb, updates } = withSettings({ ...BATCH, ...short });
			await ensureBatchOn(pb);
			assert.deepEqual(updates, [{ batch: BATCH }], JSON.stringify(short));
		}
	});
});
