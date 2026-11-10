import { pb } from './pb';
import { runPublishAction, type PublishAction } from './publishing';
import { HOME } from '$lib/page';
import type { Block, Page } from '$lib/types/page';

/** The home: its edit, its copy and its files. */
export async function getHome(): Promise<Page> {
	return await pb.collection('pages').getFirstListItem<Page>(pb.filter('slug = {:slug}', { slug: HOME }));
}

/** Writes the edit; what the visitor reads changes only through `runHomeAction`. */
export async function saveBlocks(id: string, blocks: Block[]): Promise<Page> {
	return await pb.collection('pages').update<Page>(id, { blocks });
}

/**
 * Adds a picture to the page's files at once, so that a block can name it before any save.
 * Returns the stored file name, which PocketBase makes unique, and the record after it.
 */
export async function addImage(id: string, file: File): Promise<{ name: string; page: Page }> {
	const before = new Set((await pb.collection('pages').getOne<Page>(id, { fields: 'images' })).images);
	const page = await pb.collection('pages').update<Page>(id, { 'images+': file });
	const name = page.images.find((n) => !before.has(n));
	if (!name) throw new Error('the picture was not stored');
	return { name, page };
}

/** The address of one of the page's files. */
export function imageUrl(page: Pick<Page, 'id' | 'collectionId' | 'collectionName'>, name: string): string {
	return pb.files.getURL(page, name);
}

/** Runs one of the server's publishing actions on the home (`/admin/home`). */
export function runHomeAction(action: PublishAction): Promise<Block[] | null> {
	return runPublishAction('/admin/home', action, 'home_admin.error.save');
}
