// Screens of "API tokens" and "Connect an agent": the token shown once, and the list with it.
import { expect, screens, signIn, test } from './lib';

test('the tokens of the agents\' api', async ({ page }) => {
	const s = screens(page, 'tokens');
	await signIn(page);
	await page.goto('/admin/tokens');
	await expect(page.getByRole('heading', { name: 'API tokens', exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'New token' }).click();
	await page.locator('#token-name').fill('Sheet import');
	await page.getByRole('button', { name: 'Create', exact: true }).click();
	const issued = page.getByRole('dialog').filter({ hasText: 'Token created' });
	await expect(issued.locator('code.box.secret')).toHaveText(/^dam_[0-9a-f]{8}_/);
	await s.shot(issued.getByRole('button', { name: 'Copy' }).first(), { of: issued });
	await issued.getByRole('button', { name: 'Done' }).click();

	await s.shot(page.getByRole('cell', { name: 'Sheet import' }), { fullPage: false });
	s.end();
});
