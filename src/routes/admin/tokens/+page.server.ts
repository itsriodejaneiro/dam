import { fail } from '@sveltejs/kit';
import { actorOf, createToken, deleteToken, type TokenError } from '$lib/server/api/admin';
import type { MessageKey } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ titleKey: 'tokens.title' as const, subtitleKey: 'nav.tokens' as const });

const STATUS: Partial<Record<TokenError, number>> = { not_admin: 403, not_found: 404, failed: 502 };
const MESSAGE: Record<TokenError, MessageKey> = {
	not_admin: 'tokens.error.save',
	name: 'tokens.error.name',
	not_found: 'tokens.error.remove',
	failed: 'tokens.error.save'
};
const failWith = (error: TokenError) => fail(STATUS[error] ?? 400, { error: MESSAGE[error] });

// Only the server writes api_tokens: the action gets the editor's own token and checks the role.
export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const actor = await actorOf(String(form.get('token') ?? ''));
		if (!actor) return failWith('not_admin');
		const r = await createToken(actor, String(form.get('name') ?? ''));
		return r.ok ? { created: { token: r.token } } : failWith(r.error);
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const actor = await actorOf(String(form.get('token') ?? ''));
		if (!actor) return failWith('not_admin');
		const r = await deleteToken(actor, String(form.get('id') ?? ''));
		return r.ok ? { deleted: true } : failWith(r.error);
	}
};
