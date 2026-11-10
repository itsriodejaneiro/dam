// Screens of "The home page": the editor with the example's blocks, a block of partners' logos
// with their preview in both modes, the language filter on a text written in one language,
// then the published home in both modes. The home goes back to the example at the end, so
// that the other scripts show only the example.
import type { Page } from '@playwright/test';
import { expect, screens, signIn, superuserClient, test } from './lib';

/** A fictional partner's mark: a shape and a word, in its own colours. */
function mark(word: string, color: string, shape: string): Buffer {
	return Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120">${shape.replaceAll('C', color)}` +
			`<text x="150" y="72" font-family="sans-serif" font-size="30" font-weight="700" fill="${color}" text-anchor="middle">${word}</text></svg>`
	);
}

const LOGOS = [
	{ name: 'Northwind Lab', file: mark('north', '#1f4e79', '<polygon points="20,95 50,25 80,95" fill="C"/>') },
	{ name: 'Orbit Foundation', file: mark('orbit', '#b5462a', '<circle cx="50" cy="60" r="32" fill="none" stroke="C" stroke-width="10"/>') },
	{ name: 'Civic Commons', file: mark('civic', '#2e6b3a', '<rect x="22" y="32" width="56" height="56" rx="10" fill="C"/>') }
];

test('the home page', async ({ page }) => {
	const pb = await superuserClient();
	const before = await pb.collection('pages').getFirstListItem('slug = "home"');

	try {
		await walk(page);
	} finally {
		const added = (await pb.collection('pages').getOne(before.id)).images.filter(
			(name: string) => !before.images.includes(name)
		);
		await pb.collection('pages').update(before.id, {
			blocks: before.blocks,
			published: before.published,
			'images-': added
		});
	}
});

async function walk(page: Page) {
	const s = screens(page, 'home');
	await signIn(page);
	await page.goto('/admin/home');
	const blocks = page.locator('.block-card');
	await s.shot(blocks.filter({ hasText: 'Explore the map' }));

	// the logos: each file uploads as soon as it is chosen
	await page.getByRole('button', { name: 'Add block', exact: true }).click();
	await page.getByRole('group', { name: 'Add block' }).getByRole('button', { name: 'Logos' }).click();
	const logos = blocks.last();
	for (const [i, logo] of LOGOS.entries()) {
		if (i > 0) await logos.getByRole('button', { name: 'Add logo' }).click();
		const item = logos.locator('.logo-item').nth(i);
		await item.locator('input[type=file]').setInputFiles({
			name: `${logo.name.toLowerCase().replace(' ', '-')}.svg`,
			mimeType: 'image/svg+xml',
			buffer: logo.file
		});
		await expect(item.locator('img.thumb')).toBeVisible();
		await item.getByLabel('Name').fill(logo.name);
	}
	await logos.locator('.logo-item').first().getByLabel('Link (optional)').fill('https://northwind.example');
	await s.shot(logos.getByText('light', { exact: true }), { of: logos.locator('.modes') });

	// a text written in English alone: the badge counts what French lacks, the filter shows it
	await page.getByRole('button', { name: 'Add a block here' }).last().click();
	await page.getByRole('group', { name: 'Add block' }).getByRole('button', { name: 'Text' }).click();
	const text = blocks.nth(-2);
	await text.locator('.ProseMirror').first().fill('Our partners');
	await text.getByRole('button', { name: 'Heading', exact: true }).first().click();
	await expect(text.getByText('FR: 1 missing')).toBeVisible();
	await page.getByRole('group', { name: 'Languages shown' }).getByRole('button', { name: 'FR' }).click();
	await text.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
	await s.shot(text.getByText('FR: 1 missing'));
	await text.locator('.ProseMirror').first().fill('Nos partenaires');
	await text.getByRole('button', { name: 'Heading', exact: true }).first().click();
	await expect(text.getByText('FR: 1 missing')).toBeHidden();

	await page.getByRole('button', { name: 'Publish', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeHidden();

	// Discard edit brings the editors back to the copy
	const heading = text.locator('.ProseMirror').first();
	await heading.click();
	await page.keyboard.press('End');
	await page.keyboard.type(' and friends');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await page.getByRole('button', { name: 'Discard edit' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Discard edit' }).click();
	await expect(page.getByRole('button', { name: 'Discard edit' })).toBeHidden();
	await expect(heading).toHaveText('Nos partenaires');

	await page.goto('/');
	const partners = page.getByRole('img', { name: 'Orbit Foundation' });
	await partners.scrollIntoViewIfNeeded();
	await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
	await s.shot(partners);
	await page.getByRole('button', { name: 'Switch to light theme' }).click();
	await s.shot(page.getByRole('link', { name: 'Northwind Lab' }));
	await page.getByRole('button', { name: 'Switch to dark theme' }).click();
	s.end();
}
