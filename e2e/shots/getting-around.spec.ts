// Screens of "Getting around": the home page and the header every page shares.
import { expect, screens, signIn, test } from './lib';

test('the home page and the header', async ({ page }) => {
	const s = screens(page, 'getting-around');
	await page.goto('/');
	await s.shot(page.getByRole('heading', { name: /of the digital infrastructure of Exampleland/ }));

	const header = page.locator('header.site');
	await expect(page.getByRole('button', { name: 'FR' })).toBeVisible();
	await s.shot(page.getByRole('group', { name: 'Language' }), { of: header });

	await signIn(page);
	await s.shot(page.getByRole('link', { name: 'accounts', exact: true }), { of: header });
	s.end();
});
