// Screens of "Categories": the layers, the form with its colors, and moving nodes on removal.
import { screens, signIn, test } from './lib';

test('the categories of the graph', async ({ page }) => {
	const s = screens(page, 'categories');
	await signIn(page);
	await page.goto('/admin/categories');
	await s.shot(page.getByText('Agencies', { exact: true }), { fullPage: true });

	const firstRow = page.locator('.row', { hasText: 'Agencies' });
	await firstRow.getByRole('button', { name: 'edit' }).click();
	const form = page.getByRole('dialog').filter({ hasText: 'Edit category' });
	await s.shot(form.getByText('Base size'), { of: form });
	await form.getByRole('button', { name: 'Cancel' }).click();

	await firstRow.getByRole('button', { name: 'remove' }).click();
	const reassign = page.getByRole('dialog').filter({ hasText: 'Reassign nodes' });
	await s.shot(reassign.getByRole('button', { name: 'Move nodes and remove' }), { of: reassign });
	s.end();
});
