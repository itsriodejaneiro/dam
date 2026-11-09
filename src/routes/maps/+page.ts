import { redirect } from '@sveltejs/kit';
import { maps } from '$lib/services';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const all = await maps.getMaps();
	if (all.length === 0) redirect(307, '/admin/maps');
	redirect(307, `/maps/${all[0].slug}`);
};
