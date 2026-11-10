// Screens of "Writing a journey": a draft from the list to publication: details, phases, a
// step framed and highlighted on the graph, documents, the preview, then an edit that stays
// off the site until it is published or discarded. The journey is removed at the end, so
// that the other scripts show only the example.
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
	await page.waitForLoadState('networkidle');
	const editor = page.url();
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeHidden();
	await expect(page.getByRole('link', { name: 'view published' })).toHaveAttribute('href', '/journeys/renewing-a-domain');

	// a saved edit stays off the site: visitors read what was published
	await page.locator('#journey-title-en').fill('Renewing a domain name');
	await page.locator('#step-title-en').fill('Look up the registrar');
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByText('Saved', { exact: true })).toBeVisible();
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	await s.shot(page.getByText('Unpublished changes', { exact: true }));
	await page.goto('/journeys/renewing-a-domain');
	await expect(page.getByRole('heading', { level: 1, name: TITLE, exact: true })).toBeVisible();
	await expect(page.locator('.step-card', { hasText: 'Find who registered the domain' })).toBeVisible();

	// the list offers the same three actions
	await page.goto('/admin/journeys');
	const edited = page.locator('tr', { hasText: 'Renewing a domain name' });
	await expect(edited.getByRole('button', { name: 'discard edit' })).toBeVisible();
	await s.shot(edited.getByText('unpublished changes', { exact: true }));

	// discarding the edit brings back what visitors read
	await page.goto(editor);
	await page.getByRole('button', { name: 'Discard edit' }).click();
	const discard = page.getByRole('dialog').filter({ hasText: 'Discard the edit?' });
	await discard.getByRole('button', { name: 'Discard edit' }).click();
	await expect(page.locator('#journey-title-en')).toHaveValue(TITLE);
	await expect(page.getByText('Unpublished changes', { exact: true })).toBeHidden();
	await expect(page.getByRole('button', { name: 'Discard edit' })).toBeHidden();
	await expect(page.locator('#step-title-en')).toHaveValue('Find who registered the domain');

	await page.goto('/admin/journeys');
	const row = page.locator('tr', { hasText: TITLE });
	await expect(row.getByText('unpublished changes', { exact: true })).toBeHidden();
	await row.getByRole('button', { name: 'remove' }).click();
	await page.getByRole('dialog').filter({ hasText: 'Remove journey?' }).getByRole('button', { name: 'Remove' }).click();
	await expect(row).toBeHidden();
	s.end();
});
