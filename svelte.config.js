import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter(),
		// The Content-Security-Policy of every page: SvelteKit puts a fresh nonce on its own
		// scripts and on %sveltekit.nonce% in app.html. The PocketBase origin is known only at
		// run time (PUBLIC_POCKETBASE_URL), so src/hooks.server.ts adds it to img-src and
		// connect-src, with the other security headers.
		csp: {
			mode: 'nonce',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'style-src': ['self', 'https://fonts.googleapis.com'],
				// Components render `style="…"` with values known only at run time (the graph's
				// camera, tooltip positions, colour slots) into the server's HTML, and a nonce
				// covers elements, never attributes. An attribute runs no script; <style> elements
				// stay under style-src. In dev SvelteKit adds 'unsafe-inline' to style-src too, for
				// the styles Vite injects.
				'style-src-attr': ['unsafe-inline'],
				'font-src': ['self', 'https://fonts.gstatic.com'],
				'img-src': ['self', 'data:', 'blob:'],
				'connect-src': ['self'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['self'],
				'frame-ancestors': ['none']
			}
		}
	}
};

export default config;
