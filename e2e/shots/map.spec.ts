// Screens of "The map": the graph for a visitor, a node's panel, a layer with its names on
// hover, and what an editor adds.
import { expect, screens, signIn, superuserClient, test } from './lib';

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

	// the credentials layer keeps its names for hover, for the length of one picture
	const pb = await superuserClient();
	const credential = await pb.collection('node_types').getFirstListItem('slug = "credential"');
	await pb.collection('node_types').update(credential.id, { show_labels: false });
	try {
		await page.goto('/maps/main');
		const account = page.locator('.vis-node', { hasText: 'Administrator account' });
		const name = account.locator('.node-label');
		await expect(name).toHaveClass(/on-demand/);
		await expect(name).not.toHaveClass(/named/);
		await account.hover();
		await expect(name).toHaveClass(/named/);
		await s.shot(page.locator('.tooltip.visible'), { hover: true });
	} finally {
		await pb.collection('node_types').update(credential.id, { show_labels: true });
	}

	await signIn(page);
	await page.goto('/maps/main');
	await node.click();
	await s.shot(page.getByRole('button', { name: 'connection' }), { of: page.locator('aside.info') });
	s.end();
});
