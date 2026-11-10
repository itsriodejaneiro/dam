// Two suites against the stack `bun run dev` keeps up, one test at a time because they share
// its database. `shots`: the manual's screens (docs/public/screens), specs that walk a screen,
// assert what the manual says about it and save the picture, committed. `security`: the
// security headers and the CSP, read on the pages without writing to the database; APP_URL
// points it at a production build too.
import { defineConfig, devices } from '@playwright/test';

// Playwright runs under Node, which does not read the .env on its own as Bun does. A variable
// already set wins over the file.
process.loadEnvFile(new URL('.env', import.meta.url));

export default defineConfig({
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
		{ name: 'setup', testDir: 'e2e/shots', testMatch: 'setup.spec.ts' },
		{ name: 'screens', testDir: 'e2e/shots', testIgnore: 'setup.spec.ts', dependencies: ['setup'] },
		{ name: 'security', testDir: 'e2e/security' }
	]
});
