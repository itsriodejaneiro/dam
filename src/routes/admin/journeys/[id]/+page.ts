import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({
	titleKey: 'journeys.title',
	subtitleKey: 'nav.journeys',
	id: params.id
});
