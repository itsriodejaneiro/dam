// Screens of "Entities": the catalog, its filters and the entity form.
import { expect, screens, signIn, test } from './lib';

test('the catalog of entities', async ({ page }) => {
	const s = screens(page, 'entities');
	await signIn(page);
	await page.goto('/admin/entities');
	await s.shot(page.getByText('Example Agency', { exact: true }));

	await page.getByRole('button', { name: /^Service/ }).click();
	await page.waitForURL('**/admin/entities?type=service');
	await expect(page.getByText('Example Agency', { exact: true })).toBeHidden();
	await s.shot(page.getByText('Public portal', { exact: true }));

	await page.getByRole('button', { name: 'New entity' }).click();
	const dialog = page.getByRole('dialog');
	await page.locator('#node-label-en').fill('Citizen helpdesk');
	await page.locator('#node-label-full-en').fill('Citizen helpdesk of the portal');
	await s.shot(dialog.getByText('Related links'), { of: dialog });
	s.end();
});
