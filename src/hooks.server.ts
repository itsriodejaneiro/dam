import type { Handle, ServerInit } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { escapeAttribute } from '$lib/sanitize';
import { isApiPath } from '$lib/api';
import { guardApi } from '$lib/server/api/guard';
import { updateSchemaOnBoot } from '$lib/server/boot';
import { secureHeaders } from '$lib/server/headers';
import { getSettings } from '$lib/server/settings';

/** Once, before the first request: the schema at this version (server/boot.ts). */
export const init: ServerInit = async () => {
	await updateSchemaOnBoot();
};

// The theme pack and default locale come from the settings record, injected into
// app.html's %theme%/%lang% placeholders before paint (no FOUC). Escaped here whatever
// validated them before: this string is the page's markup, and Svelte never sees it.
export const handle: Handle = async ({ event, resolve }) => {
	// The agents' API has no session: the token is the guard, before any route, and its
	// answers are JSON under the closed policy.
	if (isApiPath(event.url.pathname)) {
		const response = await guardApi(event, resolve);
		secureHeaders(response.headers, env.PUBLIC_POCKETBASE_URL);
		return response;
	}
	const settings = await getSettings();
	const theme = escapeAttribute(settings.theme);
	const lang = escapeAttribute(settings.defaultLocale);
	const response = await resolve(event, {
		// A function, since a replacement string gives `$&` and the like a meaning.
		transformPageChunk: ({ html }) =>
			html.replaceAll('%theme%', () => theme).replaceAll('%lang%', () => lang)
	});
	secureHeaders(response.headers, env.PUBLIC_POCKETBASE_URL);
	return response;
};
