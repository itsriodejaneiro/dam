// The security headers and the Content-Security-Policy (svelte.config.js, src/hooks.server.ts),
// on the seeded example. Reads only: nothing is saved. Against a production build, the same
// command with its URL: APP_URL=http://localhost:4173 bun run e2e:security
import type { Page } from '@playwright/test';
import { expect, signIn, superuserClient, test } from '../shots/lib';

const PB_ORIGIN = new URL(process.env.PUBLIC_POCKETBASE_URL!).origin;

/** Each CSP violation of the page: the event, listened to before any document's first byte, and Chrome's own line. */
async function watchCsp(page: Page): Promise<string[]> {
	const violations: string[] = [];
	page.on('console', (message) => {
		const text = message.text();
		if (text.startsWith('csp:') || text.includes('Content Security Policy')) {
			violations.push(`${page.url()} ${text}`);
		}
	});
	await page.addInitScript(() => {
		document.addEventListener('securitypolicyviolation', (e) =>
			console.error(`csp: ${e.violatedDirective} ${e.blockedURI}`)
		);
	});
	return violations;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('a page carries a CSP with a fresh nonce, and the other headers', async ({ request }) => {
	const first = await request.get('/login');
	const csp = first.headers()['content-security-policy'];
	const nonce = csp.match(/script-src 'self' 'nonce-([^']+)'/)?.[1];
	expect(nonce, csp).toBeTruthy();
	// the header's nonce is the one on SvelteKit's scripts and app.html's
	expect(await first.text()).toContain(`<script nonce="${nonce}">`);
	expect(csp).toContain("frame-ancestors 'none'");
	expect(csp).toContain("object-src 'none'");
	expect(csp).toContain("base-uri 'self'");
	expect(csp).toMatch(new RegExp(`img-src [^;]*${escape(PB_ORIGIN)}`));
	expect(csp).toMatch(new RegExp(`connect-src [^;]*${escape(PB_ORIGIN)}`));
	expect(first.headers()).toMatchObject({
		'x-content-type-options': 'nosniff',
		'referrer-policy': 'strict-origin-when-cross-origin',
		'permissions-policy': 'camera=(), microphone=(), geolocation=()'
	});

	const second = await request.get('/login');
	expect(second.headers()['content-security-policy']).not.toContain(nonce);
});

test('a response that is not a page gets the closed policy', async ({ request }) => {
	const flag = await request.get('/flags/mz.svg');
	expect(flag.headers()['content-security-policy']).toBe(
		"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"
	);
	expect(flag.headers()['x-content-type-options']).toBe('nosniff');
});

test('an inline event handler that reaches the page does not run', async ({ page }) => {
	const violations = await watchCsp(page);
	await page.goto('/login');
	await page.evaluate(() => {
		const holder = document.createElement('div');
		holder.innerHTML = `<img src="/no-such-image.png" onerror="document.title='owned'">`;
		document.body.append(holder);
	});
	await expect.poll(() => violations.join('\n')).toContain('script-src-attr');
	expect(await page.evaluate(() => document.title)).not.toBe('owned');
});

test('every screen opens and works with no CSP violation', async ({ page }) => {
	const pb = await superuserClient();
	const map = await pb.collection('maps').getFirstListItem('');
	const journey = await pb.collection('journeys').getFirstListItem('published != null');
	const violations = await watchCsp(page);

	await page.goto('/');
	await page.goto('/journeys');
	await page.goto(`/journeys/${journey.slug}`);
	// the camera glides from step to step
	for (const card of (await page.locator('.step-card').all()).slice(0, 3)) {
		await card.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
		await expect(card).toHaveClass(/active/);
		await page.waitForTimeout(1200);
	}

	await page.goto(`/maps/${map.slug}`);
	const node = page.locator('.vis-node').first();
	await node.hover();
	await expect(page.locator('.tooltip.visible')).toBeVisible();
	await node.click();
	await expect(page.locator('aside.info h3')).toBeVisible();

	await signIn(page);
	for (const path of [
		'/setup',
		'/ds',
		'/admin/entities',
		'/admin/connections',
		'/admin/categories',
		'/admin/maps',
		'/admin/settings',
		'/admin/accounts',
		'/admin/journeys',
		`/admin/journeys/${journey.id}/preview`
	]) {
		await page.goto(path);
	}

	// the editor frames each step on the graph, highlights nodes and edits the step's text
	await page.goto(`/admin/journeys/${journey.id}`);
	const steps = page.locator('.step-pick');
	await steps.nth(1).click();
	await page.waitForTimeout(1200);
	await steps.nth(2).click();
	await page.waitForTimeout(1200);
	// a node the step highlights is in the frame; clicking it takes it out of the highlight
	await page.locator('.graph-container .vis-node.highlighted').first().click();
	await page.locator('.ProseMirror').first().click();
	await page.keyboard.type(' More.');

	expect(violations).toEqual([]);
});
