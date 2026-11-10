import { error, redirect } from '@sveltejs/kit';
import { journeys } from '$lib/services';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent }) => {
	const { settings } = await parent();
	if (!settings.journeys) redirect(307, '/');
	const journey = await journeys.getPublishedJourneyBySlug(params.slug);
	if (!journey) error(404, 'Not found');
	return {
		titleKey: 'title.journey',
		subtitleKey: 'nav.journeys',
		id: journey.id,
		journey: journey.published
	};
};
