import type { RecordModel } from 'pocketbase';
import type { Localized } from '$lib/i18n';

/** Rich text: the editor's HTML per locale, with h2 and h3. */
export interface TextBlock {
	id: string;
	type: 'text';
	body: Localized;
}

/** One picture of the page's `images`, by file name. */
export interface ImageBlock {
	id: string;
	type: 'image';
	image: string;
	alt: Localized;
	caption: Localized;
}

/** Where a card leads: a map or a published journey by record id, or an address. */
export type CardTarget =
	| { kind: 'map'; id: string }
	| { kind: 'journey'; id: string }
	| { kind: 'url'; url: string };

export interface LinkCard {
	title: Localized;
	text: Localized;
	target: CardTarget;
}

export interface CardsBlock {
	id: string;
	type: 'cards';
	cards: LinkCard[];
}

/** A partner's mark, the same in every locale: a file of `images`, its name and its site. */
export interface Logo {
	image: string;
	name: string;
	url: string;
}

export interface LogosBlock {
	id: string;
	type: 'logos';
	logos: Logo[];
}

export type Block = TextBlock | ImageBlock | CardsBlock | LogosBlock;
export type BlockType = Block['type'];

/** The top of the page: the title, rich text with italic and line breaks, and the lede, plain. */
export interface PageTop {
	title: Localized;
	lede: Localized;
}

/** What Publish writes in one go: the top and the blocks, as the visitor reads them. */
export interface PageCopy extends PageTop {
	blocks: Block[];
}

/**
 * A `pages` record. `title`, `lede` and `blocks` are the edit; `published` is the copy the
 * visitor reads, null while the page is not published. `images` holds the files both point
 * at. A copy written before the top had fields holds the blocks alone (`parseCopy`).
 */
export interface Page extends RecordModel {
	slug: string;
	title: Localized | null;
	lede: Localized | null;
	blocks: Block[] | null;
	published: PageCopy | Block[] | null;
	images: string[];
}

/** A card as the visitor's page draws it: the address resolved on the server. */
export interface ResolvedCard extends Omit<LinkCard, 'target'> {
	href: string;
	external: boolean;
}

/** A block as the visitor's page draws it: images as URLs, cards with their address. */
export type ResolvedBlock =
	| TextBlock
	| (Omit<ImageBlock, 'image'> & { src: string })
	| { id: string; type: 'cards'; cards: ResolvedCard[] }
	| { id: string; type: 'logos'; logos: (Omit<Logo, 'image'> & { src: string })[] };
