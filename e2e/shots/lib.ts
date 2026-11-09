// What every screen script shares: the fictional deployment, the sign-in and the camera.
import { expect, test as base, type Locator, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import PocketBase from 'pocketbase';

const DIR = join(import.meta.dirname, '../../docs/public/screens');

/** The deployment the screens show. Its name also marks a database as the shots' own. */
export const DEPLOY_NAME = 'Exampleland';

function env(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is missing: run \`bun run shots\` in the folder that has .env`);
	return value;
}

export const SUPERUSER = { email: env('PB_SUPERUSER_EMAIL'), password: env('PB_SUPERUSER_PASSWORD') };

/** A superuser client of the stack's PocketBase, for what a script checks or cleans up off-screen. */
export async function superuserClient(): Promise<PocketBase> {
	const pb = new PocketBase(env('PUBLIC_POCKETBASE_URL'));
	await pb.collection('_superusers').authWithPassword(SUPERUSER.email, SUPERUSER.password);
	return pb;
}

/**
 * A click before hydration is lost, so every `page.goto` waits for the network to settle:
 * the sign that the page's modules arrived.
 */
export const test = base.extend({
	page: async ({ page }, use) => {
		const goto = page.goto.bind(page);
		page.goto = async (url, options) => {
			const response = await goto(url, options);
			await page.waitForLoadState('networkidle');
			return response;
		};
		await use(page);
	}
});
export { expect };

/** Fills the form of /login as the superuser. The header has a "Sign in" button of its own. */
export async function submitSignIn(page: Page) {
	await page.getByLabel('Email').fill(SUPERUSER.email);
	await page.getByLabel('Password').fill(SUPERUSER.password);
	await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
}

export async function signIn(page: Page) {
	await page.goto('/login');
	await submitSignIn(page);
	await expect(page.getByRole('link', { name: 'entities', exact: true })).toBeVisible();
}

interface ShotOptions {
	/** The whole page, not only the viewport. */
	fullPage?: boolean;
	/** Crops the picture to this element, so that the caption speaks of one thing. */
	of?: Locator;
	/** Keeps the mouse where it is, for a hover state. */
	hover?: boolean;
}

/** The camera of one manual page: its pictures are `<name>-1.png`, `<name>-2.png`… */
export function screens(page: Page, name: string) {
	let taken = 0;
	return {
		/** Saves the screen, once `proof` (what the manual says is there) is visible. */
		async shot(proof: Locator, { fullPage, of, hover }: ShotOptions = {}) {
			await expect(proof).toBeVisible();
			if (!hover) await page.mouse.move(0, 0);
			await page.evaluate(() => document.fonts.ready);
			taken += 1;
			mkdirSync(DIR, { recursive: true });
			const path = join(DIR, `${name}-${taken}.png`);
			if (of) await of.screenshot({ path, animations: 'disabled' });
			else await page.screenshot({ path, fullPage, animations: 'disabled' });
		},
		/** Deletes the pictures of this page left by a longer run. */
		end() {
			for (const file of readdirSync(DIR)) {
				const n = file.match(new RegExp(`^${name}-(\\d+)\\.png$`))?.[1];
				if (n && Number(n) > taken) rmSync(join(DIR, file));
			}
		}
	};
}
