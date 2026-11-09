import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapeAttribute } from './sanitize';

test('an attribute value cannot close its quotes or open a tag', () => {
	assert.equal(
		escapeAttribute('en"><script>window.__x=1</script><!--'),
		'en&quot;&gt;&lt;script&gt;window.__x=1&lt;/script&gt;&lt;!--'
	);
	assert.equal(escapeAttribute("a'b&c"), 'a&#39;b&amp;c');
	assert.equal(escapeAttribute('pt'), 'pt');
});
