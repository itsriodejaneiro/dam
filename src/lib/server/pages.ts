/* A page on the server only: the copy the visitor reads, and the writes that publish it.
   `blocks` is the edit and `published` the copy, as in a journey (server/journeys.ts). The
   writes stay apart from the edit's (services/pages.ts), so that an API can offer those and
   refuse these. Each function takes a client signed in as whoever acts, and the
   collection's rules decide. Relative imports: the CLI setup runs this module outside
   SvelteKit. */

import type PocketBase from 'pocketbase';
import { parseBlocks, unusedImages } from '../page';
import type { Block, Page } from '../types/page';

/** The page at that slug, edit and copy; null when there is none. */
export async function pageBySlug(pb: PocketBase, slug: string): Promise<Page | null> {
	try {
		return await pb
			.collection('pages')
			.getFirstListItem<Page>(pb.filter('slug = {:slug}', { slug }));
	} catch (err) {
		if ((err as { status?: number }).status === 404) return null;
		throw err;
	}
}

// What leaves for the visitor: the copy and what its files need, never the edit.
const PUBLISHED_FIELDS = 'id,collectionId,collectionName,images,published';

export type PublishedPage = Pick<Page, 'id' | 'collectionId' | 'collectionName' | 'images'> & {
	published: Block[];
};

/** The copy of the page at that slug; null when there is none, or it is unpublished. */
export async function publishedPage(pb: PocketBase, slug: string): Promise<PublishedPage | null> {
	try {
		const page = await pb
			.collection('pages')
			.getFirstListItem<Page>(pb.filter('slug = {:slug}', { slug }), { fields: PUBLISHED_FIELDS });
		const published = parseBlocks(page.published);
		return published.length > 0 ? { ...page, published } : null;
	} catch (err) {
		if ((err as { status?: number }).status === 404) return null;
		throw err;
	}
}

/**
 * Where a card can lead, by record id: every map, and the published journeys while the
 * deploy shows them.
 */
export async function cardAddresses(
	pb: PocketBase,
	journeys: boolean
): Promise<{ map: Map<string, string>; journey: Map<string, string> }> {
	const [maps, published] = await Promise.all([
		pb.collection('maps').getFullList({ fields: 'id,slug' }),
		journeys
			? pb.collection('journeys').getFullList({ filter: 'published != null', fields: 'id,slug' })
			: []
	]);
	return {
		map: new Map(maps.map((r) => [r.id, `/maps/${r.slug}`])),
		journey: new Map(published.map((r) => [r.id, `/journeys/${r.slug}`]))
	};
}

/** Publish refuses a page with no blocks: the copy would show nothing. */
export class NoBlocksError extends Error {}

async function requirePage(pb: PocketBase, slug: string): Promise<Page> {
	const page = await pageBySlug(pb, slug);
	if (!page) throw Object.assign(new Error(`no page "${slug}"`), { status: 404 });
	return page;
}

/**
 * Copies the edit to `published` and removes the files no block uses, in one write.
 * Returns the copy.
 */
export async function publishPage(pb: PocketBase, slug: string): Promise<Block[]> {
	const page = await requirePage(pb, slug);
	const copy = parseBlocks(page.blocks);
	if (copy.length === 0) throw new NoBlocksError();
	await pb.collection('pages').update(page.id, {
		published: copy,
		'images-': unusedImages(page.images ?? [], copy)
	});
	return copy;
}

/** Takes the page's blocks off the site and leaves the edit as it is. */
export async function unpublishPage(pb: PocketBase, slug: string): Promise<null> {
	const page = await requirePage(pb, slug);
	await pb.collection('pages').update(page.id, { published: null });
	return null;
}

/**
 * Writes the copy back over the edit. The files the copy uses stay, since Publish removes
 * only the others. Returns the copy.
 */
export async function discardPageEdit(pb: PocketBase, slug: string): Promise<Block[] | null> {
	const page = await requirePage(pb, slug);
	if (!page.published) return null;
	const copy = parseBlocks(page.published);
	await pb.collection('pages').update(page.id, { blocks: copy });
	return copy;
}
