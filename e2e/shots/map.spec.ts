// Screens of "The map": the graph for a visitor, a node's panel, and what an editor adds.
import { expect, screens, signIn, test } from './lib';

test('the map, for a visitor and for an editor', async ({ page }) => {
	const s = screens(page, 'map');
	await page.goto('/maps');
	await page.waitForURL('**/maps/main');
	await s.shot(page.locator('.lane-label', { hasText: 'Agencies' }), { fullPage: true });

	// the hover label scrambles in before it settles on the entity's full name
	const node = page.locator('.vis-node', { hasText: 'Public portal' });
	await node.hover();
	await expect(page.locator('.tooltip')).toHaveText('Public services portal');
	await s.shot(page.locator('.tooltip.visible'), { hover: true });

	await node.click();
	await s.shot(page.locator('aside.info h3', { hasText: 'Public portal' }));

	await signIn(page);
	await page.goto('/maps/main');
	await node.click();
	await s.shot(page.getByRole('button', { name: 'connection' }), { of: page.locator('aside.info') });
	s.end();
});
