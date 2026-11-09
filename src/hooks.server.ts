import type { Handle } from '@sveltejs/kit';
import { escapeAttribute } from '$lib/sanitize';
import { getSettings } from '$lib/server/settings';

// The theme pack and default locale come from the settings record, injected into
// app.html's %theme%/%lang% placeholders before paint (no FOUC). Escaped here whatever
// validated them before: this string is the page's markup, and Svelte never sees it.
export const handle: Handle = async ({ event, resolve }) => {
	const settings = await getSettings();
	const theme = escapeAttribute(settings.theme);
	const lang = escapeAttribute(settings.defaultLocale);
	return resolve(event, {
		// A function, since a replacement string gives `$&` and the like a meaning.
		transformPageChunk: ({ html }) =>
			html.replaceAll('%theme%', () => theme).replaceAll('%lang%', () => lang)
	});
};
