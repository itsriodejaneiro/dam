import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({
	titleKey: 'publish.preview',
	subtitleKey: 'nav.journeys',
	id: params.id
});
