/* The deploy's identity: one record of the `settings` collection, edited in /setup and
   /admin/settings. This module holds the shape and the defaults, shared by the server,
   the client and the CLI (src/lib/server/setup.ts); src/lib/server/settings.ts reads
   the record. Relative imports only: the CLI runs outside Vite. */

import { flagUrl } from './flag';
import { DEFAULT_PACK, type ThemePack } from './theme';

export const DEFAULT_NAME = 'Digital Assets Map';
export const DEFAULT_LOCALE = 'en';

/** The SvelteKit adapters cap a request body near 512 KB, and the logo travels in one. */
export const LOGO_MAX_BYTES = 400 * 1024;
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export interface DeploySettings {
	/** The deploy's name per locale code. */
	name: Record<string, string>;
	/** Active locale codes, in display order. */
	locales: string[];
	defaultLocale: string;
	theme: ThemePack;
	/** URL of the uploaded logo, or null. */
	logo: string | null;
	/** ISO 3166-1 alpha-2 code in lowercase, or null. */
	flag: string | null;
	journeys: boolean;
}

export const DEFAULT_SETTINGS: DeploySettings = {
	name: { [DEFAULT_LOCALE]: DEFAULT_NAME },
	locales: [DEFAULT_LOCALE],
	defaultLocale: DEFAULT_LOCALE,
	theme: DEFAULT_PACK,
	logo: null,
	flag: null,
	journeys: true
};

/** The name that fills "of {0}" texts. Null when the deploy names no place of its own:
    blank, or still the product's name, and the texts take their generic form. */
export function placeName(settings: DeploySettings, locale: string): string | null {
	const name = (settings.name[locale] || settings.name[settings.defaultLocale] || '').trim();
	return name && name !== DEFAULT_NAME ? name : null;
}

/** The deploy's mark, for the favicon and the header: the logo wins over the flag. */
export function markUrl(settings: DeploySettings): string | null {
	return settings.logo ?? flagUrl(settings.flag);
}
