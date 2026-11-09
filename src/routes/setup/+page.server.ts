import { redirect, fail } from '@sveltejs/kit';
import { getSuperuserClient } from '$lib/services/pb.server';
import { resetProject, isConfigured } from '$lib/server/setup';
import { resetConfigCache } from '$lib/server/config';
import { isSuperuserToken } from '$lib/server/auth';
import { invalidateSettings } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

/** Phrase the user types to confirm the reset. */
const CONFIRM_PHRASE = 'RESET';

export const load: PageServerLoad = async () => {
	let configured = false;
	try {
		const pb = await getSuperuserClient();
		configured = await isConfigured(pb);
	} catch {
		return {
			titleKey: 'setup.title' as const,
			unreachable: true,
			configured: false,
			confirmPhrase: CONFIRM_PHRASE
		};
	}
	return {
		titleKey: 'setup.title' as const,
		unreachable: false,
		configured,
		confirmPhrase: CONFIRM_PHRASE
	};
};

// The setup itself streams (POST /setup/run) to feed the terminal.
// Only the reset lives here.
export const actions: Actions = {
	reset: async ({ request }) => {
		const data = await request.formData();
		if (!(await isSuperuserToken(String(data.get('token') ?? '')))) {
			return fail(401, { error: 'unauthorized' });
		}
		if (String(data.get('confirm') ?? '') !== CONFIRM_PHRASE) {
			return fail(400, { error: 'bad_confirm' });
		}
		try {
			const pb = await getSuperuserClient();
			await resetProject(pb);
			resetConfigCache();
			invalidateSettings();
		} catch (err) {
			console.error('[reset] failed:', err);
			return fail(500, { error: 'reset_failed' });
		}
		redirect(303, '/setup');
	}
};
