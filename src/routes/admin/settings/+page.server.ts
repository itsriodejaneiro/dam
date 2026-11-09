import { fail } from '@sveltejs/kit';
import PocketBase, { ClientResponseError } from 'pocketbase';
import { env } from '$env/dynamic/public';
import { parseSettingsForm, writeSettings } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ titleKey: 'settings.title' as const });

// The save goes through the server so it can clear the settings cache. It writes with
// the editor's own token: the collection's update rule is the guard.
export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const parsed = parseSettingsForm(form);
		if ('error' in parsed) return fail(400, { error: parsed.error });

		const pb = new PocketBase(env.PUBLIC_POCKETBASE_URL);
		pb.authStore.save(String(form.get('token') ?? ''), null);
		try {
			await writeSettings(pb, parsed.data);
		} catch (err) {
			console.error('[settings] save failed:', err);
			// PocketBase answers a 4xx to a token its update rule refuses.
			const refused = err instanceof ClientResponseError && err.status >= 400 && err.status < 500;
			return fail(refused ? 403 : 500, { error: 'settings.error.save' as const });
		}
		return { saved: true };
	}
};
