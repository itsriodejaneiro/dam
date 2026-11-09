import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapeAttribute, safeUrl, sanitizeHtml } from './sanitize';

const LINK = 'target="_blank" rel="noopener noreferrer nofollow"';

/** Every `<` of a clean output opens one of the tags the module writes, in its exact form. */
const STRANGER = new RegExp(
	`<(?!/?(?:p|br|strong|b|em|i|u|ul|ol|li|a)>|a href="[^"<>]*" ${LINK}>|ol start="\\d+">)`
);

test('an attribute value cannot close its quotes or open a tag', () => {
	assert.equal(
		escapeAttribute('en"><script>window.__x=1</script><!--'),
		'en&quot;&gt;&lt;script&gt;window.__x=1&lt;/script&gt;&lt;!--'
	);
	assert.equal(escapeAttribute("a'b&c"), 'a&#39;b&amp;c');
	assert.equal(escapeAttribute('pt'), 'pt');
});

test('what the editor writes comes through', () => {
	const editor =
		'<p>a <strong>b</strong> <em>c</em> <u>d</u><br>e &amp; f</p>' +
		'<ul><li><p>g</p></li></ul><ol start="3"><li><p>h</p></li></ol>';
	assert.equal(sanitizeHtml(editor), editor);
	assert.equal(
		sanitizeHtml(
			'<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.org/?a=1&amp;b=2">x</a></p>'
		),
		`<p><a href="https://example.org/?a=1&amp;b=2" ${LINK}>x</a></p>`
	);
	assert.equal(
		sanitizeHtml('<a href="mailto:someone@example.org">x</a>'),
		`<a href="mailto:someone@example.org" ${LINK}>x</a>`
	);
});

test('the stored payloads of the review do nothing', () => {
	assert.equal(
		sanitizeHtml('<p>ok</p><img src=x onerror="window.__xss=1">'),
		'<p>ok</p>'
	);
	assert.equal(sanitizeHtml('<a id="evil" href="javascript:window.__href=1">click</a>'), 'click');
});

test('a link keeps its text and loses a scheme outside the list', () => {
	for (const href of [
		'javascript:alert(1)',
		'JaVaScRiPt:alert(1)',
		' javascript:alert(1)',
		'java\tscript:alert(1)',
		'java\nscript:alert(1)',
		'&#106;avascript:alert(1)',
		'&#x6a;avascript:alert(1)',
		'&#106avascript:alert(1)',
		'java&Tab;script&colon;alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:msgbox(1)',
		'//example.org/x',
		'/maps/main',
		''
	]) {
		assert.equal(sanitizeHtml(`<a href="${href}">x</a>`), 'x', href);
	}
	assert.equal(sanitizeHtml('<a>x</a>'), 'x');
});

test('safeUrl accepts http, https and mailto only', () => {
	assert.equal(safeUrl('https://example.org/a'), 'https://example.org/a');
	assert.equal(safeUrl('HTTP://example.org'), 'http://example.org/');
	assert.equal(safeUrl('mailto:a@example.org'), 'mailto:a@example.org');
	for (const url of ['javascript:alert(1)', 'java\tscript:alert(1)', 'example.org', '', null, 7, {}]) {
		assert.equal(safeUrl(url), null, String(url));
	}
});

test('attributes do not survive on allowed tags', () => {
	assert.equal(sanitizeHtml('<p onclick="x()" style="color:red" class=y>a</p>'), '<p>a</p>');
	assert.equal(
		sanitizeHtml('<a href="https://example.org" onclick="x()" target="_top">a</a>'),
		`<a href="https://example.org/" ${LINK}>a</a>`
	);
	assert.equal(sanitizeHtml('<ol start="1 onclick=x">a</ol>'), '<ol>a</ol>');
});

test('a quoted > does not end a tag', () => {
	assert.equal(
		sanitizeHtml('<a href="https://example.org" title="><img src=x onerror=y>">a</a>'),
		`<a href="https://example.org/" ${LINK}>a</a>`
	);
});

test('code is dropped with its tag, other unknown tags keep their text', () => {
	assert.equal(sanitizeHtml('a<script>alert(1)</script>b'), 'ab');
	assert.equal(sanitizeHtml('a<SCRIPT >alert(1)</ScRiPt >b'), 'ab');
	assert.equal(sanitizeHtml('a<style>p{color:red}</style>b'), 'ab');
	assert.equal(sanitizeHtml('a<script>alert(1)'), 'a');
	assert.equal(sanitizeHtml('<h1>a</h1><div>b</div><span>c</span>'), 'abc');
	assert.equal(sanitizeHtml('a<!-- <img src=x onerror=y> -->b<!doctype html>c<?x y?>d'), 'abcd');
});

test('text stays text', () => {
	assert.equal(sanitizeHtml('1 < 2 > 0'), '1 &lt; 2 &gt; 0');
	assert.equal(sanitizeHtml('AT&T &amp; &#233; &lt;b&gt;'), 'AT&amp;T &amp; &#233; &lt;b&gt;');
});

test('the output is balanced', () => {
	assert.equal(sanitizeHtml('<strong>a'), '<strong>a</strong>');
	assert.equal(sanitizeHtml('<ul><li><strong>a</ul>b'), '<ul><li><strong>a</strong></li></ul>b');
	assert.equal(sanitizeHtml('a</strong></p>b'), 'ab');
});

test('whatever is not a string renders nothing', () => {
	for (const value of [null, undefined, 7, {}, []]) assert.equal(sanitizeHtml(value), '');
});

test('parser confusion cannot produce a foreign tag', () => {
	for (const payload of [
		'<svg><style><img src=x onerror=y></style>',
		'<math><mtext><table><mglyph><style><!--</style><img src onerror=y>',
		'<noscript><p title="</noscript><img src=x onerror=y>">',
		'<<img src=x onerror=y>>',
		'<img/src=x/onerror=y>',
		'<a href=https://example.org/><img src=x onerror=y></a>',
		'<p/onclick=x>',
		'<a href="https://example.org"',
		'<a "href=javascript:x>y</a>'
	]) {
		const output = sanitizeHtml(payload);
		assert.doesNotMatch(output, STRANGER, payload);
		assert.doesNotMatch(output, /<img|<svg|<style|onerror=y[^&]*>/, payload);
	}
});

test('random mixes of dangerous fragments keep the invariant', () => {
	const fragments = [
		'<', '>', '"', "'", '=', '/', '!', '--', '&', ';', '#', ' ', '\t', '\n', 'a', 'p', 'img', 'href',
		'script', 'style', 'svg', 'onerror', 'javascript:', 'https://example.org', '&#106;', '&lt;',
		'<a ', '</a>', '<p>', '<!--', '-->', '<script>', '</script>', '<img src=x onerror=y>', 'href="'
	];
	let seed = 20261110;
	const next = (n: number) => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return seed % n;
	};
	for (let round = 0; round < 5000; round++) {
		let input = '';
		for (let j = next(30); j >= 0; j--) input += fragments[next(fragments.length)];
		assert.doesNotMatch(sanitizeHtml(input), STRANGER, input);
	}
});

test('a hostile input stays linear', () => {
	for (const piece of ['<a "', '<', '<!--', '<a href=', '&', '<script>', '</p>', '<p>']) {
		const started = performance.now();
		sanitizeHtml(piece.repeat(50000));
		assert.ok(performance.now() - started < 2000, piece);
	}
});

test('pieces that open one tag and close another stay linear', () => {
	for (const [opening, closing] of [
		['<p>', '</li>'],
		['<ul><li>', '</a>'],
		['<b><i>', '</u>']
	]) {
		const started = performance.now();
		sanitizeHtml(opening.repeat(62000) + closing.repeat(62000));
		assert.ok(performance.now() - started < 2000, opening + closing);
	}
});

test('a closing tag closes what is open inside it, and only a tag that is open', () => {
	assert.equal(sanitizeHtml('<p><b><i>a</p>b</i></b>'), '<p><b><i>a</i></b></p>b');
	assert.equal(sanitizeHtml('<b>a<b>c</b>d</b>e</b>'), '<b>a<b>c</b>d</b>e');
	assert.equal(sanitizeHtml('<p>a</br>b</p>'), '<p>ab</p>');
});
