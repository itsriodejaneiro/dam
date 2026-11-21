// What a boot writes to a collection: only what differs from the definition, named.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { collectionChanges } from './setup';

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
