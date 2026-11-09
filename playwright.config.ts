// The manual's screens (docs/public/screens): specs that walk a screen, assert what the
// manual says about it and save the picture. They run against the stack `bun run dev`
// keeps up, one at a time because they share its database, and the pictures are committed.
import { defineConfig, devices } from '@playwright/test';

// Playwright runs under Node, which does not read the .env on its own as Bun does.
process.loadEnvFile(new URL('.env', import.meta.url));

export default defineConfig({
	testDir: 'e2e/shots',
	outputDir: 'e2e/shots/results',
	workers: 1,
	fullyParallel: false,
	timeout: 90_000,
	expect: { timeout: 15_000 },
	reporter: [['list']],
	use: {
		...devices['Desktop Chrome'],
		baseURL: process.env.APP_URL,
		locale: 'en-US',
		// wide enough for the signed-in header to fit on one line (SiteHeader breaks at 1340px)
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1.5,
		trace: 'retain-on-failure'
	},
	projects: [
		// the wizard comes first: it empties the database and seeds the example the others show
		{ name: 'setup', testMatch: 'setup.spec.ts' },
		{ name: 'screens', testIgnore: 'setup.spec.ts', dependencies: ['setup'] }
	]
});
