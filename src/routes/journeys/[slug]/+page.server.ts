import { error, redirect } from '@sveltejs/kit';
import { publishedJourney } from '$lib/server/journeys';
import { getSuperuserClient } from '$lib/services/pb.server';
import type { PageServerLoad } from './$types';

// Only an admin reads journeys in PocketBase: the server reads the copy for the visitor.
export const load: PageServerLoad = async ({ params, parent }) => {
	const { settings } = await parent();
	if (!settings.journeys) redirect(307, '/');
	const journey = await publishedJourney(await getSuperuserClient(), params.slug);
	if (!journey) error(404, 'Not found');
	return { titleKey: 'title.journey', subtitleKey: 'nav.journeys', journey };
};
