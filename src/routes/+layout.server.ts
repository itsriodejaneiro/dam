import { redirect } from '@sveltejs/kit';
import { projectConfigured } from '$lib/server/config';
import { getSettings } from '$lib/server/settings';
import type { LayoutServerLoad } from './$types';

/**
 * Hands the deploy's settings to every page, and holds the first-boot gate: while
 * PocketBase has no schema, everything goes to /setup. /setup and /login must stay
 * reachable in that state.
 */
export const load: LayoutServerLoad = async ({ url }) => {
	const settings = await getSettings();
	const p = url.pathname;
	if (p.startsWith('/setup') || p.startsWith('/login')) return { settings };

	if (!(await projectConfigured())) redirect(307, '/setup');
	return { settings };
};
