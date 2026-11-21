import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SlidingWindow } from './limit';

test('the limit counts a sliding minute per key, and says how long to wait', () => {
	const window = new SlidingWindow(3, 60_000);
	const t0 = 1_000_000;
	assert.equal(window.take('a', t0), 0);
	assert.equal(window.take('a', t0 + 1000), 0);
	assert.equal(window.take('a', t0 + 2000), 0);
	// the fourth within the minute waits for the first to leave the window
	assert.equal(window.take('a', t0 + 3000), 57_000);
	// another key has its own count
	assert.equal(window.take('b', t0 + 3000), 0);
	// a refused request does not count: the wait shrinks as time passes
	assert.equal(window.take('a', t0 + 30_000), 30_000);
	// the first hit left the window: room for one
	assert.equal(window.take('a', t0 + 60_001), 0);
	// full again: the oldest live hit, at t0 + 1000, leaves 998 ms later
	assert.equal(window.take('a', t0 + 60_002), 998);
});

test('keys with nothing in the window are forgotten', () => {
	const window = new SlidingWindow(120, 60_000);
	for (let i = 0; i < 500; i++) window.take(`token-${i}`, 0);
	assert.equal(window.size, 500);
	window.take('later', 61_000);
	assert.equal(window.size, 1);
});
