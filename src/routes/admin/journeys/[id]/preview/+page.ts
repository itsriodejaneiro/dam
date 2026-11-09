import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({
	titleKey: 'journeys_admin.preview',
	subtitleKey: 'nav.journeys',
	id: params.id
});
