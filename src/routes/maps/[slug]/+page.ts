import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({
	titleKey: 'title.map',
	subtitleKey: 'nav.map',
	slug: params.slug
});
