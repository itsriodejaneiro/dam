import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SERVICE_ACCOUNT_EMAIL } from '../api';
import { listAccounts } from './accountList';

const records = [
	{ id: 'u2', email: 'zoe@example.com', role: 'admin' },
	{ id: 'u0', email: SERVICE_ACCOUNT_EMAIL, role: 'admin' },
	{ id: 'u1', email: 'ana@example.com', role: 'admin' }
];

function users() {
	const calls: unknown[][] = [];
	return {
		calls,
		getFullList: async <T>(...args: unknown[]) => {
			calls.push(args);
			return records as T[];
		}
	};
}

describe('listAccounts', () => {
	test('the query names no e-mail: PocketBase hides from an admin account every row such a filter reaches', async () => {
		const source = users();
		await listAccounts(source);
		assert.equal(source.calls.length, 1);
		assert.doesNotMatch(JSON.stringify(source.calls), /email/);
	});

	test('lists the people by e-mail, without the service account', async () => {
		const list = await listAccounts(users());
		assert.deepEqual(
			list.map((account) => account.email),
			['ana@example.com', 'zoe@example.com']
		);
	});
});
