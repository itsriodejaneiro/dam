// Screens of "Journeys for visitors": the index, the opening, a step, a phase card and an entity.
import { expect, screens, test } from './lib';

const TITLE = 'Who holds the keys of a digital service';

test('a journey, as a visitor reads it', async ({ page }) => {
	const s = screens(page, 'journeys');
	await page.goto('/journeys');
	await s.shot(page.getByRole('heading', { name: TITLE }));

	await page.getByRole('heading', { name: TITLE }).click();
	await page.waitForURL('**/journeys/example-journey');
	await expect(page.locator('.scrolly-layout')).toBeVisible();
	await page.waitForLoadState('networkidle');
	await s.shot(page.getByText('8 steps'));

	/** Brings a card to the middle of the window, where the scroll trigger makes it active. */
	async function readTo(card: ReturnType<typeof page.locator>) {
		await card.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
		await expect(card).toHaveClass(/active/);
		// the camera glides for about a second to the new framing
		await page.waitForTimeout(1500);
	}

	const step = page.locator('.step-card', { hasText: 'One credential opens the code and the servers' });
	await readTo(step);
	await s.shot(step.getByRole('heading', { name: /One credential opens/ }));

	const phaseCard = page.locator('.transition-card').first();
	await readTo(phaseCard);
	await s.shot(phaseCard.getByText('Phase 1 complete'));

	await readTo(step);
	await page.locator('.graph-area .vis-node', { hasText: 'Administrator account' }).click();
	const entity = page.getByRole('dialog');
	await s.shot(entity.getByText('Administrator account', { exact: true }).first(), { of: entity });
	s.end();
});
