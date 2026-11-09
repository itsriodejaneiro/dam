import { redirect } from '@sveltejs/kit';
import { journeys } from '$lib/services';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { settings } = await parent();
	if (!settings.journeys) redirect(307, '/');
	return {
		titleKey: 'journeys.title',
		subtitleKey: 'nav.journeys',
		journeys: await journeys.getPublishedJourneys()
	};
};
