import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NON_PAGE_CSP, allowPocketBase, originOf, secureHeaders } from './headers';

const PAGE =
	"default-src 'self'; script-src 'self' 'nonce-abc'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'";

test('PocketBase joins img-src and connect-src, and nothing else', () => {
	assert.equal(
		allowPocketBase(PAGE, 'https://pb.example.org'),
		"default-src 'self'; script-src 'self' 'nonce-abc'; img-src 'self' data: blob: https://pb.example.org; connect-src 'self' https://pb.example.org; frame-ancestors 'none'"
	);
});

test('the origin drops the path and keeps the port', () => {
	assert.equal(originOf('http://127.0.0.1:8373/'), 'http://127.0.0.1:8373');
	assert.equal(originOf('https://pb.example.org/sub/path'), 'https://pb.example.org');
	assert.equal(originOf(undefined), null);
	assert.equal(originOf('/pb'), null);
});

test('a page keeps its nonce and gains PocketBase; every response gets the rest', () => {
	const page = new Headers({ 'content-security-policy': PAGE });
	secureHeaders(page, 'http://127.0.0.1:8373');
	assert.match(page.get('content-security-policy')!, /'nonce-abc'/);
	assert.match(page.get('content-security-policy')!, /connect-src 'self' http:\/\/127\.0\.0\.1:8373/);
	assert.equal(page.get('x-content-type-options'), 'nosniff');
	assert.equal(page.get('referrer-policy'), 'strict-origin-when-cross-origin');
	assert.equal(page.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
	assert.equal(page.get('x-frame-options'), null);
});

test('a response with no policy gets the closed one', () => {
	const svg = new Headers({ 'content-type': 'image/svg+xml' });
	secureHeaders(svg, 'http://127.0.0.1:8373');
	assert.equal(svg.get('content-security-policy'), NON_PAGE_CSP);
	assert.equal(svg.get('x-content-type-options'), 'nosniff');
});
