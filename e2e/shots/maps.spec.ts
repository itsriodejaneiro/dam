// Screens of "Maps": the list, the form and the tabs a second map brings. The second map
// is removed at the end, so that the other scripts show one map.
import { expect, screens, signIn, test } from './lib';

test('the maps of a deployment', async ({ page }) => {
	const s = screens(page, 'maps');
	await signIn(page);
	await page.goto('/admin/maps');

	await page.getByRole('button', { name: 'New map' }).click();
	const form = page.getByRole('dialog').filter({ hasText: 'New map' });
	await page.locator('#map-label-en').fill('Hosting chain');
	await page.locator('#map-slug').fill('hosting-chain');
	await s.shot(form.getByText('Slug'), { of: form });
	await form.getByRole('button', { name: 'Create' }).click();

	const row = page.locator('.row', { hasText: 'Hosting chain' });
	await expect(row).toBeVisible();
	await s.shot(page.locator('.badge', { hasText: 'main' }));

	await page.goto('/maps/main');
	await s.shot(page.getByRole('link', { name: 'Hosting chain' }));

	await page.goto('/admin/maps');
	await row.getByRole('button', { name: 'remove' }).click();
	await page.getByRole('dialog').filter({ hasText: 'Remove map?' }).getByRole('button', { name: 'Remove' }).click();
	await expect(row).toBeHidden();
	s.end();
});
