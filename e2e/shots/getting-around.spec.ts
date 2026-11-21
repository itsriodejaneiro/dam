// Screens of "Getting around": the home page and the header every page shares.
import { expect, screens, signIn, test } from './lib';

test('the home page and the header', async ({ page }) => {
	const s = screens(page, 'getting-around');
	await page.goto('/');
	await s.shot(page.getByRole('heading', { name: /The chain behind a digital public service/ }));

	const header = page.locator('header.site');
	await expect(page.getByRole('button', { name: 'FR' })).toBeVisible();
	await s.shot(page.getByRole('group', { name: 'Language' }), { of: header });

	await signIn(page);
	await page.goto('/');
	await page.getByRole('button', { name: 'Admin', exact: true }).click();
	const menu = page.getByRole('menu');
	await s.shot(menu.getByRole('menuitem', { name: 'accounts' }), { of: [header, menu] });

	await menu.getByRole('menuitem', { name: 'journeys' }).click();
	await page.waitForURL('**/admin/journeys');
	await s.shot(page.getByRole('button', { name: 'Admin: journeys' }), { of: header });
	s.end();
});
