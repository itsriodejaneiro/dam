// Screens of "Sign in" and "Install": the first boot, through the /setup wizard. Runs before
// every other script, because it leaves the database with nothing but the example seed.
import { DEPLOY_NAME, expect, screens, submitSignIn, superuserClient, test } from './lib';

// A fictional mark: a deployment's real logo or flag never reaches the manual.
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#C75A1A"/><g stroke="#fff" stroke-width="2"><path d="M10 10l12 6-12 6z" fill="none"/></g><g fill="#fff"><circle cx="10" cy="10" r="3"/><circle cx="22" cy="16" r="3"/><circle cx="10" cy="22" r="3"/></g></svg>`;

/** The screens erase the stack they run on: only an empty database, or their own, may go on. */
async function refuseSomeoneElsesData(): Promise<'empty' | 'ours'> {
	const pb = await superuserClient();
	const maps = await pb.collections.getOne('maps').catch((err) => {
		if (err.status === 404) return null;
		throw err;
	});
	if (!maps) return 'empty';
	const settings = await pb.collection('settings').getFirstListItem('');
	if (settings.name?.en !== DEPLOY_NAME) {
		throw new Error(
			`This stack holds a project the screens did not create (${JSON.stringify(settings.name)}). ` +
				'They show and then erase what is in the database they run on: empty it with `bun run db:reset --yes`, or use another stack.'
		);
	}
	return 'ours';
}

test('the first boot: sign in, the wizard, the danger zone', async ({ page }) => {
	const state = await refuseSomeoneElsesData();

	const signIn = screens(page, 'sign-in');
	await page.goto('/setup');
	await page.waitForURL('**/login?redirect=/setup');
	await signIn.shot(page.getByRole('heading', { name: 'Sign in.' }));
	signIn.end();

	await submitSignIn(page);
	await page.waitForURL('**/setup');

	if (state === 'ours') {
		await page.getByLabel('Type RESET to confirm').fill('RESET');
		await page.getByRole('button', { name: 'Reset project' }).click();
	}

	const install = screens(page, 'install');
	await expect(page.getByText('has no data yet')).toBeVisible();
	await page.getByRole('checkbox', { name: 'Français' }).check();
	await page.locator('input[placeholder="English"]').fill(DEPLOY_NAME);
	await page.locator('input[placeholder="Français"]').fill(DEPLOY_NAME);
	await page.locator('#settings-logo').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(LOGO) });
	await install.shot(page.getByText('Say what this map is called'), { fullPage: true });

	// The app leaves for /maps the moment the run ends: holding that request keeps the log on screen.
	let release = () => {};
	const held = new Promise<void>((resolve) => (release = resolve));
	await page.route('**/__data.json*', async (route) => {
		await held;
		await route.continue();
	});
	await page.getByRole('button', { name: 'Set up project' }).click();
	await install.shot(page.locator('.terminal').getByText('connections: 10'));
	release();
	await page.waitForURL('**/maps/**');

	await page.goto('/setup');
	await install.shot(page.getByRole('heading', { name: 'Danger zone' }), { fullPage: true });
	install.end();
});
