// Screen of "Configure your deployment": the settings form, which then saves.
import { expect, screens, signIn, test } from './lib';

test('the settings of the deployment', async ({ page }) => {
	const s = screens(page, 'configure');
	await signIn(page);
	await page.goto('/admin/settings');
	await s.shot(page.getByRole('heading', { name: 'Settings', exact: true }), { fullPage: true });

	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByText('Settings saved.')).toBeVisible();
	s.end();
});
