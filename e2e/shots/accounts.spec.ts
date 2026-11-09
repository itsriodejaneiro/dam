// Screens of "Accounts": the form for a new account and the list with it.
import { expect, screens, signIn, test } from './lib';

test('the accounts of a deployment', async ({ page }) => {
	const s = screens(page, 'accounts');
	await signIn(page);
	await page.goto('/admin/accounts');
	await expect(page.getByRole('heading', { name: 'Accounts', exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'New account' }).click();
	const form = page.getByRole('dialog').filter({ hasText: 'New account' });
	await page.locator('#account-email').fill('editor@example.test');
	await page.locator('#account-password').fill('example-password');
	await s.shot(form.getByRole('button', { name: 'Create' }), { of: form });
	await form.getByRole('button', { name: 'Create' }).click();

	await s.shot(page.getByText('editor@example.test'));
	s.end();
});
