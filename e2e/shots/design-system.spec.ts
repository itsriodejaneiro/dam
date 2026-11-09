// Screen of "Design system": the /ds showcase.
import { screens, signIn, test } from './lib';

test('the design system showcase', async ({ page }) => {
	const s = screens(page, 'design-system');
	await signIn(page);
	await page.goto('/ds');
	await s.shot(page.getByRole('heading', { name: 'Palette' }));
	s.end();
});
