import { env } from '$env/dynamic/public';
import PocketBase from 'pocketbase';
import { HOME, resolveBlocks } from '$lib/page';
import { cardAddresses, publishedPage } from '$lib/server/pages';
import { getSuperuserClient } from '$lib/services/pb.server';
import type { PageTop, ResolvedBlock } from '$lib/types/page';
import type { PageServerLoad } from './$types';

type Home = PageTop & { blocks: ResolvedBlock[] };

/** A home with nothing of its own: the generic top, and no blocks. */
const EMPTY: Home = { title: {}, lede: {}, blocks: [] };

// Only an admin reads pages in PocketBase: the server reads the home's copy for the visitor,
// and sends the top and the blocks with their addresses, never the edit.
async function home(journeys: boolean): Promise<Home> {
	const pb = await getSuperuserClient();
	const page = await publishedPage(pb, HOME);
	if (!page) return EMPTY;
	const { title, lede, blocks } = page.published;
	const addresses = await cardAddresses(pb, journeys);
	// The browser reaches the files at PocketBase's public address.
	const files = new PocketBase(env.PUBLIC_POCKETBASE_URL).files;
	const images = new Set(page.images);
	return {
		title,
		lede,
		blocks: resolveBlocks(blocks, {
			image: (name) => (images.has(name) ? files.getURL(page, name) : null),
			target: (kind, id) => addresses[kind].get(id) ?? null
		})
	};
}

export const load: PageServerLoad = async ({ parent }) => {
	const { settings } = await parent();
	return {
		// Under one key: a `title` in the page's data would be the tab's title (+layout.svelte).
		// PocketBase down or without the collection: the home serves its generic top, as the
		// map pages do.
		home: await home(settings.journeys).catch((err) => {
			console.error('[home] cannot read the published home, showing the generic top:', err);
			return EMPTY;
		})
	};
};
