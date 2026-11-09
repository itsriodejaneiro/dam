import type { Handle } from '@sveltejs/kit';
import { getSettings } from '$lib/server/settings';

// The theme pack and default locale come from the settings record, injected into
// app.html's %theme%/%lang% placeholders before paint (no FOUC).
export const handle: Handle = async ({ event, resolve }) => {
	const { theme, defaultLocale } = await getSettings();
	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replaceAll('%theme%', theme).replaceAll('%lang%', defaultLocale)
	});
};
