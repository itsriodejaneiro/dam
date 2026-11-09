import { redirect } from '@sveltejs/kit';
import { journeys } from '$lib/services';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { settings } = await parent();
	if (!settings.journeys) redirect(307, '/');
	return {
		titleKey: 'journeys.title',
		subtitleKey: 'nav.journeys',
		// PocketBase down or without its schema: the page serves, as the map pages do.
		journeys: await journeys.getPublishedJourneys().catch((err) => {
			console.error('[journeys] cannot read the list, showing it empty:', err);
			return [];
		})
	};
};
