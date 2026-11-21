// The refusal of a batch by PocketBase, as the agent reads it: the batch off or over its
// limit is named, with the fix; a failed record inside the batch, or any other error, passes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ClientResponseError } from 'pocketbase';
import { batchRefusal } from './store';
import { ToolError } from './tools/types';

const answer = (status: number, message: string, data: Record<string, unknown> = {}) => new ClientResponseError({ status, response: { status, message, data } });

test('the batch api off (403) is a refusal that names the cause and the fix', () => {
	const refusal = batchRefusal(answer(403, 'Batch requests are not allowed.'));
	assert.ok(refusal instanceof ToolError);
	assert.equal(refusal.code, 'internal');
	assert.match(refusal.message, /403 Batch requests are not allowed\./);
	assert.match(refusal.message, /Batch API is off/);
	assert.match(refusal.message, /Restart the app/);
	assert.match(refusal.message, /Settings > Application/);
});

test('a batch over the limit (400 on the requests list) is the same refusal', () => {
	const refusal = batchRefusal(answer(400, 'Invalid batch request data.', { requests: { code: 'validation_length_too_long', message: 'The length must be no more than 2.' } }));
	assert.match(refusal?.message ?? '', /400 Invalid batch request data\./);
});

test('a record that failed inside the batch, and any other error, are not the batch\'s refusal', () => {
	assert.equal(batchRefusal(answer(400, 'Batch transaction failed.', { requests: { '0': { code: 'batch_request_failed', message: 'Batch request failed.' } } })), null);
	assert.equal(batchRefusal(answer(404, 'Not found.')), null);
	assert.equal(batchRefusal(answer(500, 'Something went wrong.')), null);
	assert.equal(batchRefusal(new Error('network down')), null);
});
