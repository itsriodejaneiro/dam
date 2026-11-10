/* A page in blocks (the home): what the stored JSON may hold, what the editor asks before it
   saves, what each locale still lacks, which images the blocks use, and the blocks as the
   visitor's page draws them. Shared by the editor, the server and the CLI seed. Relative
   imports only: the CLI setup runs outside Vite. */

import { LOCALE_CODES } from './i18n/messages';
import type { Localized } from './i18n/types';
import { safeUrl } from './sanitize';
import type {
	Block,
	BlockType,
	CardTarget,
	LinkCard,
	Logo,
	ResolvedBlock,
	ResolvedCard
} from './types/page';

/** The slug of the one page the app has today. */
export const HOME = 'home';

export const BLOCK_TYPES = ['text', 'image', 'cards', 'logos'] as const satisfies BlockType[];
export const CARDS_MAX = 3;
export const LOGOS_MAX = 8;
/** Files a page holds at once, used or waiting for the next Publish to remove them. */
export const IMAGES_MAX = 30;

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** TipTap writes `<p></p>` for an empty editor: blank too. */
const isBlank = (value: string, rich: boolean): boolean =>
	(rich ? value.replace(/<[^>]*>/g, '') : value).trim() === '';

/**
 * Text under known locale codes only, blank locales out, so that a reader falls back past
 * them. An admin account writes the record over the REST API, where the editor never runs.
 */
function localized(value: unknown, rich = false): Localized {
	const out: Localized = {};
	if (!isObject(value)) return out;
	for (const code of LOCALE_CODES) {
		const entry = value[code];
		if (typeof entry === 'string' && !isBlank(entry, rich)) out[code] = rich ? entry : entry.trim();
	}
	return out;
}

function target(value: unknown): CardTarget | null {
	if (!isObject(value)) return null;
	if (value.kind === 'map' || value.kind === 'journey') {
		const id = text(value.id);
		return id ? { kind: value.kind, id } : null;
	}
	if (value.kind === 'url') {
		const url = text(value.url);
		return url ? { kind: 'url', url } : null;
	}
	return null;
}

function card(value: unknown): LinkCard | null {
	if (!isObject(value)) return null;
	const to = target(value.target);
	return to && { title: localized(value.title), text: localized(value.text), target: to };
}

function logo(value: unknown): Logo | null {
	if (!isObject(value)) return null;
	const image = text(value.image);
	return image ? { image, name: text(value.name), url: text(value.url) } : null;
}

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

/** One stored block in its shape, without its id; null when it holds nothing to show. */
function block(value: Record<string, unknown>): WithoutId<Block> | null {
	switch (value.type) {
		case 'text': {
			const body = localized(value.body, true);
			return Object.keys(body).length > 0 ? { type: 'text', body } : null;
		}
		case 'image': {
			const image = text(value.image);
			return image
				? { type: 'image', image, alt: localized(value.alt), caption: localized(value.caption) }
				: null;
		}
		case 'cards': {
			const list = Array.isArray(value.cards) ? value.cards : [];
			const cards = list.map(card).filter((c) => c !== null).slice(0, CARDS_MAX);
			return cards.length > 0 ? { type: 'cards', cards } : null;
		}
		case 'logos': {
			const list = Array.isArray(value.logos) ? value.logos : [];
			const logos = list.map(logo).filter((l) => l !== null).slice(0, LOGOS_MAX);
			return logos.length > 0 ? { type: 'logos', logos } : null;
		}
		default:
			return null;
	}
}

/**
 * The stored blocks as the app reads them: the four types, in their limits, each with an id
 * of its own, and what is malformed or empty left out. The editor loads the edit through it,
 * and Publish writes the copy from it.
 */
export function parseBlocks(value: unknown): Block[] {
	if (!Array.isArray(value)) return [];
	const ids = new Set<string>();
	const blocks: Block[] = [];
	for (const [i, entry] of value.entries()) {
		if (!isObject(entry)) continue;
		const parsed = block(entry);
		if (!parsed) continue;
		// The editor keys its list by id: a missing or repeated one gets another.
		let id = text(entry.id);
		for (let n = i; !id || ids.has(id); n++) id = `${parsed.type}-${n}`;
		ids.add(id);
		blocks.push({ id, ...parsed } as Block);
	}
	return blocks;
}

/**
 * The editor's draft as it is saved: blank locales out, the structure as it stands, so that
 * an empty block still counts as a change.
 */
export function cleanBlock(draft: Block): Block {
	switch (draft.type) {
		case 'text':
			return { id: draft.id, type: 'text', body: localized(draft.body, true) };
		case 'image':
			return {
				id: draft.id,
				type: 'image',
				image: draft.image,
				alt: localized(draft.alt),
				caption: localized(draft.caption)
			};
		case 'cards':
			return {
				id: draft.id,
				type: 'cards',
				cards: draft.cards.map((c) => ({
					title: localized(c.title),
					text: localized(c.text),
					target:
						c.target.kind === 'url'
							? { kind: 'url', url: c.target.url.trim() }
							: { kind: c.target.kind, id: c.target.id }
				}))
			};
		case 'logos':
			return {
				id: draft.id,
				type: 'logos',
				logos: draft.logos.map((l) => ({ image: l.image, name: l.name.trim(), url: l.url.trim() }))
			};
	}
}

/** A card's own address: a path on this site, or a link with a scheme a stored link may use. */
export function cardUrl(url: string): string | null {
	return /^\/(?!\/)/.test(url) ? url : safeUrl(url);
}

/** A logo's site: a link with a scheme a stored link may use, or nothing. */
export const logoUrl = (url: string): string | null => (url ? safeUrl(url) : null);

/** Why the editor cannot save this block, as a message key; null when it can. */
export type BlockProblem =
	| 'home_admin.problem.text'
	| 'home_admin.problem.image'
	| 'home_admin.problem.card_title'
	| 'home_admin.problem.card_target'
	| 'home_admin.problem.logo_image'
	| 'home_admin.problem.logo_name'
	| 'home_admin.problem.logo_url';

/** What keeps a draft block from being saved; the default locale holds the required text. */
export function blockProblem(draft: Block, defaultLocale: string): BlockProblem | null {
	const has = (value: Localized, rich = false) => !isBlank(value[defaultLocale] ?? '', rich);
	switch (draft.type) {
		case 'text':
			return has(draft.body, true) ? null : 'home_admin.problem.text';
		case 'image':
			return draft.image ? null : 'home_admin.problem.image';
		case 'cards':
			for (const c of draft.cards) {
				if (!has(c.title)) return 'home_admin.problem.card_title';
				const ok = c.target.kind === 'url' ? cardUrl(c.target.url.trim()) : c.target.id;
				if (!ok) return 'home_admin.problem.card_target';
			}
			return null;
		case 'logos':
			for (const l of draft.logos) {
				if (!l.image) return 'home_admin.problem.logo_image';
				if (!l.name.trim()) return 'home_admin.problem.logo_name';
				if (l.url.trim() && !logoUrl(l.url.trim())) return 'home_admin.problem.logo_url';
			}
			return null;
	}
}

/** The block's texts per locale; a logo is the same in every locale. */
function localizedFields(draft: Block): { value: Localized; rich: boolean }[] {
	switch (draft.type) {
		case 'text':
			return [{ value: draft.body, rich: true }];
		case 'image':
			return [
				{ value: draft.alt, rich: false },
				{ value: draft.caption, rich: false }
			];
		case 'cards':
			return draft.cards.flatMap((c) => [
				{ value: c.title, rich: false },
				{ value: c.text, rich: false }
			]);
		case 'logos':
			return [];
	}
}

/**
 * How many of the block's texts each locale lacks: a text written in some locale and blank
 * in this one. A text blank in every locale is optional, and nobody's to translate.
 */
export function missingByLocale(draft: Block, locales: string[]): Record<string, number> {
	const missing = Object.fromEntries(locales.map((code) => [code, 0]));
	for (const { value, rich } of localizedFields(draft)) {
		const written = locales.filter((code) => !isBlank(value[code] ?? '', rich));
		if (written.length === 0) continue;
		for (const code of locales) if (!written.includes(code)) missing[code] += 1;
	}
	return missing;
}

/** The files of `images` the blocks point at. */
export function usedImages(blocks: Block[]): Set<string> {
	const used = new Set<string>();
	for (const b of blocks) {
		if (b.type === 'image') used.add(b.image);
		if (b.type === 'logos') for (const l of b.logos) used.add(l.image);
	}
	return used;
}

/** The files no block points at: Publish removes them with the copy it writes. */
export function unusedImages(images: string[], blocks: Block[]): string[] {
	const used = usedImages(blocks);
	return images.filter((name) => !used.has(name));
}

/** What the visitor's page needs from outside the blocks; null where nothing is there. */
export interface Lookups {
	/** The URL of a file of the record's `images`. */
	image(name: string): string | null;
	/** The address of a map, or of a published journey, by record id. */
	target(kind: 'map' | 'journey', id: string): string | null;
}

function resolveCard(c: LinkCard, lookups: Lookups): ResolvedCard | null {
	const { title, text: phrase } = c;
	if (c.target.kind === 'url') {
		const href = cardUrl(c.target.url);
		return href ? { title, text: phrase, href, external: !href.startsWith('/') } : null;
	}
	const href = lookups.target(c.target.kind, c.target.id);
	return href ? { title, text: phrase, href, external: false } : null;
}

/**
 * The blocks as the visitor's page draws them. What points at something gone (a removed
 * file, map or journey, or one unpublished since) leaves the page, and a block left with
 * nothing goes with it.
 */
export function resolveBlocks(blocks: Block[], lookups: Lookups): ResolvedBlock[] {
	const resolved: ResolvedBlock[] = [];
	for (const b of blocks) {
		if (b.type === 'text') resolved.push(b);
		if (b.type === 'image') {
			const src = lookups.image(b.image);
			if (src) resolved.push({ id: b.id, type: 'image', src, alt: b.alt, caption: b.caption });
		}
		if (b.type === 'cards') {
			const cards = b.cards.map((c) => resolveCard(c, lookups)).filter((c) => c !== null);
			if (cards.length > 0) resolved.push({ id: b.id, type: 'cards', cards });
		}
		if (b.type === 'logos') {
			const logos = b.logos.flatMap((l) => {
				const src = lookups.image(l.image);
				return src ? [{ name: l.name, url: logoUrl(l.url) ?? '', src }] : [];
			});
			if (logos.length > 0) resolved.push({ id: b.id, type: 'logos', logos });
		}
	}
	return resolved;
}
