// Screens of "Connections": the list, the form and the duplicates report.
import { expect, screens, signIn, superuserClient, test } from './lib';

test('the list of connections', async ({ page }) => {
	const s = screens(page, 'connections');
	await signIn(page);
	await page.goto('/admin/connections');
	await s.shot(page.getByRole('heading', { name: 'Connections.', exact: true }));

	await page.getByRole('button', { name: 'New connection' }).click();
	const form = page.getByRole('dialog');
	await page.locator('#edge-source').selectOption({ index: 1 });
	await s.shot(form.getByRole('button', { name: 'Create connection' }), { of: form });
	await form.getByRole('button', { name: 'Cancel' }).click();

	// the form refuses a duplicate: only an import or the API can leave one behind
	const pb = await superuserClient();
	const { source, target } = await pb.collection('edges').getFirstListItem('');
	await pb.collection('edges').create({ source, target });
	await page.reload();
	await page.waitForLoadState('networkidle');

	await page.getByRole('button', { name: /duplicate connection/ }).click();
	const report = page.getByRole('dialog').filter({ hasText: 'Duplicate connections' });
	await s.shot(report.getByRole('button', { name: 'Remove all 1 duplicates' }), { of: report });

	await report.getByRole('button', { name: 'Remove all 1 duplicates' }).click();
	await expect(page.getByRole('button', { name: /duplicate connection/ })).toBeHidden();
	s.end();
});
