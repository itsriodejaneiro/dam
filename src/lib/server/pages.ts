/* A page on the server only: the copy the visitor reads, and the writes that publish it.
   `title`, `lede` and `blocks` are the edit and `published` the copy, as in a journey
   (server/journeys.ts). The writes stay apart from the edit's (services/pages.ts), so that
   an API can offer those and refuse these. Each function takes a client signed in as
   whoever acts, and the collection's rules decide. Relative imports: the CLI setup runs
   this module outside SvelteKit. */

import type PocketBase from 'pocketbase';
import { hasContent, parseBlocks, parseCopy, parseTop, unusedImages } from '../page';
import type { Page, PageCopy } from '../types/page';

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
	published: PageCopy;
};

/** The copy of the page at that slug; null when there is none, or it is unpublished. */
export async function publishedPage(pb: PocketBase, slug: string): Promise<PublishedPage | null> {
	try {
		const page = await pb
			.collection('pages')
			.getFirstListItem<Page>(pb.filter('slug = {:slug}', { slug }), { fields: PUBLISHED_FIELDS });
		const published = parseCopy(page.published);
		return hasContent(published) ? { ...page, published } : null;
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

/** Publish refuses a page with no title, lede or block: the copy would show nothing. */
export class EmptyPageError extends Error {}

async function requirePage(pb: PocketBase, slug: string): Promise<Page> {
	const page = await pageBySlug(pb, slug);
	if (!page) throw Object.assign(new Error(`no page "${slug}"`), { status: 404 });
	return page;
}

/**
 * Copies the edit, top and blocks, to `published` and removes the files no block uses, in
 * one write. Returns the copy.
 */
export async function publishPage(pb: PocketBase, slug: string): Promise<PageCopy> {
	const page = await requirePage(pb, slug);
	const copy: PageCopy = { ...parseTop(page), blocks: parseBlocks(page.blocks) };
	if (!hasContent(copy)) throw new EmptyPageError();
	await pb.collection('pages').update(page.id, {
		published: copy,
		'images-': unusedImages(page.images ?? [], copy.blocks)
	});
	return copy;
}

/** Takes the page's top and blocks off the site and leaves the edit as it is. */
export async function unpublishPage(pb: PocketBase, slug: string): Promise<null> {
	const page = await requirePage(pb, slug);
	await pb.collection('pages').update(page.id, { published: null });
	return null;
}

/**
 * Writes the copy back over the edit. The files the copy uses stay, since Publish removes
 * only the others. Returns the copy.
 */
export async function discardPageEdit(pb: PocketBase, slug: string): Promise<PageCopy | null> {
	const page = await requirePage(pb, slug);
	if (!page.published) return null;
	const copy = parseCopy(page.published);
	await pb.collection('pages').update(page.id, copy);
	return copy;
}
