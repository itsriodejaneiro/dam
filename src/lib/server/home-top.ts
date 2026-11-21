/* The top the home starts with: the product's phrase, with the deploy's name in italics,
   in each of the deploy's locales. Three readers: the seed writes it when it makes the home
   (setup.ts, seedHome), the boot writes it once into a home whose top is empty in every
   locale (seedHomeTop), and the visitor's page shows it while the home has no copy
   (routes/+page.server.ts). The admin edits it in /admin/home like any other text; what
   someone wrote is never touched. Relative imports only: the CLI setup runs outside Vite. */

import type PocketBase from 'pocketbase';
import type { LocaleCode } from '../i18n/messages';
import { parseCopy, parseTop } from '../page';
import { DEFAULT_NAME, deployName, knownLocales, storedName, type DeploySettings } from '../settings';
import type { Page, PageTop } from '../types/page';

type Texts = Record<LocaleCode, string>;

/* The title is the editor's HTML: a paragraph, a line break, the name in `em`. `{name}` is
   the deploy's name in the locale, and the second form stands when the deploy has none of
   its own (blank, or the product's). */
const TITLE: Texts = {
	pt: '<p>Digital Assets Map<br>da infraestrutura digital de <em>{name}</em>.</p>',
	en: '<p>Digital Assets Map<br>of the digital infrastructure of <em>{name}</em>.</p>',
	fr: "<p>Digital Assets Map<br>de l'infrastructure numérique de <em>{name}</em>.</p>",
	es: '<p>Digital Assets Map<br>de la infraestructura digital de <em>{name}</em>.</p>'
};
const TITLE_UNNAMED: Texts = {
	pt: '<p>Digital Assets Map<br>da infraestrutura digital.</p>',
	en: '<p>Digital Assets Map<br>of the digital infrastructure.</p>',
	fr: "<p>Digital Assets Map<br>de l'infrastructure numérique.</p>",
	es: '<p>Digital Assets Map<br>de la infraestructura digital.</p>'
};
const LEDE: Texts = {
	pt: 'Mapeamento do ecossistema de identidade, credenciais, sistemas de informação e serviços públicos do Estado de {name}.',
	en: 'Mapping the ecosystem of identity, credentials, information systems and public services of the State of {name}.',
	fr: "Cartographie de l'écosystème d'identité, d'identifiants, de systèmes d'information et de services publics de l'État de {name}.",
	es: 'Mapeo del ecosistema de identidad, credenciales, sistemas de información y servicios públicos del Estado de {name}.'
};
const LEDE_UNNAMED: Texts = {
	pt: 'Mapeamento do ecossistema de identidade, credenciais, sistemas de informação e serviços públicos.',
	en: 'Mapping the ecosystem of identity, credentials, information systems and public services.',
	fr: "Cartographie de l'écosystème d'identité, d'identifiants, de systèmes d'information et de services publics.",
	es: 'Mapeo del ecosistema de identidad, credenciales, sistemas de información y servicios públicos.'
};

/** What the top needs of the settings: the name per locale, the locales, the default. */
export type TopSettings = Pick<DeploySettings, 'name' | 'locales' | 'defaultLocale'>;

// The name goes inside the title's HTML, and a name is free text.
const escapeHtml = (text: string): string =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The default top in each of the deploy's locales. The name is the settings name in that
 * locale, the default locale's when blank; a deploy with no name of its own gets the
 * phrase without it.
 */
export function defaultTop(settings: TopSettings): PageTop {
	const top: PageTop = { title: {}, lede: {} };
	for (const code of settings.locales as LocaleCode[]) {
		if (!(code in TITLE)) continue;
		const name = deployName(settings, code);
		if (name === DEFAULT_NAME) {
			top.title[code] = TITLE_UNNAMED[code];
			top.lede[code] = LEDE_UNNAMED[code];
		} else {
			top.title[code] = TITLE[code].replace('{name}', escapeHtml(name));
			top.lede[code] = LEDE[code].replace('{name}', name);
		}
	}
	return top;
}

/** True when neither the title nor the lede has a word in any locale. */
export const isTopEmpty = (top: PageTop): boolean =>
	Object.keys(top.title).length === 0 && Object.keys(top.lede).length === 0;

/** The settings record as the top needs it; null before /setup wrote one. */
export async function topSettings(pb: PocketBase): Promise<TopSettings | null> {
	try {
		const record = await pb.collection('settings').getFirstListItem('');
		const locales = knownLocales(record.locales);
		if (locales.length === 0) return null;
		const stored = String(record.default_locale ?? '');
		return {
			name: storedName(record.name),
			locales,
			defaultLocale: locales.includes(stored) ? stored : locales[0]
		};
	} catch (err) {
		if ((err as { status?: number }).status === 404) return null;
		throw err;
	}
}

/**
 * Writes the default top into a home whose top is empty in every locale, once: the data
 * migration of the deploys from before the top had a text. The edit gets it, and so does
 * the copy when the home is published with an empty top, so the visitor reads it at once.
 * A top someone wrote, in the edit or in the copy, stays. Nothing happens before /setup
 * named the deploy: the seed writes the top then.
 */
export async function seedHomeTop(
	pb: PocketBase,
	home: Page,
	log: (msg: string) => void
): Promise<void> {
	if (!isTopEmpty(parseTop(home))) return;
	const settings = await topSettings(pb);
	if (!settings) return;
	const top = defaultTop(settings);
	const data: Record<string, unknown> = { ...top };
	if (home.published != null) {
		const copy = parseCopy(home.published);
		if (isTopEmpty(copy)) data.published = { ...copy, ...top };
	}
	await pb.collection('pages').update(home.id, data);
	log('  ~ pages: home top seeded');
}
