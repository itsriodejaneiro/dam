import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

/** The lines Compose reads, in order: no comments, no blank lines and no `build:` block. */
function serviceLines(file: string): string[] {
	const lines: string[] = [];
	let build: number | null = null;
	for (const line of readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').split('\n')) {
		if (!line.trim() || line.trim().startsWith('#')) continue;
		const indent = line.length - line.trimStart().length;
		if (build !== null && indent > build) continue;
		build = line.trim() === 'build:' ? indent : null;
		if (build === null) lines.push(line.trimEnd());
	}
	return lines;
}

// A deploy from the published images runs what a deploy from a clone builds: a variable or a
// setting added to one file and not the other breaks one of the two paths.
test('compose.deploy.yaml is compose.yaml without the builds', () => {
	assert.deepEqual(serviceLines('compose.deploy.yaml'), serviceLines('compose.yaml'));
});
