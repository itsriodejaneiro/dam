import { redirect } from '@sveltejs/kit';
import { publishedJourneys } from '$lib/server/journeys';
import { getSuperuserClient } from '$lib/services/pb.server';
import type { PageServerLoad } from './$types';

// Only an admin reads journeys in PocketBase: the server reads the copies for the visitor.
export const load: PageServerLoad = async ({ parent }) => {
	const { settings } = await parent();
	if (!settings.journeys) redirect(307, '/');
	return {
		titleKey: 'journeys.title',
		subtitleKey: 'nav.journeys',
		// PocketBase down or without its schema: the page serves, as the map pages do.
		journeys: await getSuperuserClient()
			.then(publishedJourneys)
			.catch((err) => {
				console.error('[journeys] cannot read the list, showing it empty:', err);
				return [];
			})
	};
};
