// Screens of "Writing a journey": a draft from the list to publication: details, phases, a
// step framed and highlighted on the graph, documents, the preview. The draft is removed at
// the end, so that the other scripts show only the example.
import { expect, screens, signIn, test } from './lib';

const TITLE = 'Renewing a domain';

test('writing a journey', async ({ page }) => {
	const s = screens(page, 'writing-a-journey');
	await signIn(page);
	await page.goto('/admin/journeys');
	await s.shot(page.getByRole('link', { name: 'Who holds the keys of a digital service' }));

	await page.getByRole('button', { name: 'New journey' }).click();
	const form = page.getByRole('dialog').filter({ hasText: 'New journey' });
	await page.locator('#journey-title-en').fill(TITLE);
	await page.locator('#journey-title-fr').fill('Renouveler un domaine');
	await page.locator('#journey-slug').fill('renewing-a-domain');
	await s.shot(form.getByText('Slug'), { of: form });
	await form.getByRole('button', { name: 'Create' }).click();
	await page.waitForURL(/\/admin\/journeys\/[a-z0-9]+$/);
	await page.waitForLoadState('networkidle');

	await page.getByRole('button', { name: 'Add document' }).click();
	const documents = page.locator('.admin-block', { has: page.getByRole('heading', { name: 'Documents' }) });
	await documents.locator('input[id$="-label-en"]').fill('Registration receipt');
	await documents.locator('input[id$="-abbrev-en"]').fill('Receipt');

	// a phase offers its documents only when another phase comes after it
	const phases = page.locator('.admin-block', { has: page.getByRole('heading', { name: 'Phases' }) });
	await page.getByRole('button', { name: 'Add phase' }).click();
	await page.getByRole('button', { name: 'Add phase' }).click();
	await page.locator('#phase-0-title-en').fill('Check the record');
	await page.locator('#phase-0-summary-en').fill('The record shows who holds the domain.');
	await page.locator('#phase-1-title-en').fill('Renew it');
	await phases.getByRole('checkbox', { name: 'Registration receipt' }).check();
	await s.shot(phases.getByText('Documents needed to continue'), { of: phases });

	await page.getByRole('button', { name: 'Add step' }).click();
	const steps = page.locator('.admin-block', { has: page.getByRole('heading', { name: 'Steps' }) });
	await page.locator('#step-title-en').fill('Find who registered the domain');
	await steps.locator('.ProseMirror').first().fill('The registrar keeps the record of the domain.');
	await page.locator('.graph-container .vis-node', { hasText: 'portal.example' }).click();
	await page.locator('.graph-container .vis-node', { hasText: 'Public portal' }).click();
	await expect(page.getByText('2 nodes · 1 connections')).toBeVisible();
	await page.getByRole('button', { name: 'Record camera' }).click();
	await steps.getByRole('heading', { name: 'Steps' }).evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
	await page.evaluate(() => window.scrollBy(0, -110));
	await s.shot(page.getByText('Camera recorded'));

	await documents.locator('select').selectOption({ index: 1 });
	await s.shot(documents.getByText('Appears at step'), { of: documents });

	await page.getByRole('button', { name: 'Save' }).click();
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	await s.shot(page.getByText('Saved', { exact: true }));

	await page.getByRole('button', { name: 'Preview' }).click();
	await page.waitForURL('**/preview');
	await page.waitForLoadState('networkidle');
	await s.shot(page.getByText('Preview: the journey as a visitor sees it.'));

	await page.getByRole('link', { name: '← back to the editor' }).click();
	await page.waitForURL(/\/admin\/journeys\/[a-z0-9]+$/);
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

	await page.goto('/admin/journeys');
	const row = page.locator('tr', { hasText: TITLE });
	await s.shot(row.getByText('published', { exact: true }));

	await row.getByRole('button', { name: 'remove' }).click();
	await page.getByRole('dialog').filter({ hasText: 'Remove journey?' }).getByRole('button', { name: 'Remove' }).click();
	await expect(row).toBeHidden();
	s.end();
});
