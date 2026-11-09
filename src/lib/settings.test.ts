import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS, knownLocales, placeName, storedName } from './settings';

test('stored locales keep the known codes, each once, in their order', () => {
	assert.deepEqual(knownLocales(['en', 'en']), ['en']);
	assert.deepEqual(knownLocales(['fr', 'en', 'fr', 'zz', 5, null, 'en']), ['fr', 'en']);
});

test('stored locales that are not a list are no locales', () => {
	for (const value of [null, undefined, 5, 'en', { en: true }]) assert.deepEqual(knownLocales(value), []);
});

test('a stored name keeps only text under a known locale', () => {
	assert.deepEqual(storedName({ en: 'A', pt: 5, fr: null, es: { x: 1 } }), { en: 'A' });
	assert.deepEqual(storedName(JSON.parse('{"__proto__":"x","en":"A","zz":"B"}')), { en: 'A' });
	assert.equal(Object.keys(storedName(JSON.parse('{"__proto__":"x"}'))).length, 0);
});

test('a stored name that is not an object is no name', () => {
	for (const value of [null, undefined, 5, 'A', []]) assert.deepEqual(storedName(value), {});
});

test('a name of numbers leaves the place name empty', () => {
	const settings = { ...DEFAULT_SETTINGS, name: storedName({ en: 5 }) };
	assert.equal(placeName(settings, 'en'), null);
});
