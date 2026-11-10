import { env } from '$env/dynamic/public';
import PocketBase from 'pocketbase';
import { HOME, resolveBlocks } from '$lib/page';
import { cardAddresses, publishedPage } from '$lib/server/pages';
import { getSuperuserClient } from '$lib/services/pb.server';
import type { ResolvedBlock } from '$lib/types/page';
import type { PageServerLoad } from './$types';

// Only an admin reads pages in PocketBase: the server reads the home's copy for the visitor,
// and sends the blocks with their addresses, never the edit.
async function homeBlocks(journeys: boolean): Promise<ResolvedBlock[]> {
	const pb = await getSuperuserClient();
	const home = await publishedPage(pb, HOME);
	if (!home) return [];
	const addresses = await cardAddresses(pb, journeys);
	// The browser reaches the files at PocketBase's public address.
	const files = new PocketBase(env.PUBLIC_POCKETBASE_URL).files;
	const images = new Set(home.images);
	return resolveBlocks(home.published, {
		image: (name) => (images.has(name) ? files.getURL(home, name) : null),
		target: (kind, id) => addresses[kind].get(id) ?? null
	});
}

export const load: PageServerLoad = async ({ parent }) => {
	const { settings } = await parent();
	return {
		// PocketBase down or without the collection: the home serves its top, as the map pages do.
		blocks: await homeBlocks(settings.journeys).catch((err) => {
			console.error('[home] cannot read the published home, showing its top:', err);
			return [];
		})
	};
};
