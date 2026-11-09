// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { DeploySettings } from '$lib/settings';

declare global {
	const __APP_VERSION__: string;

	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			/** The deploy's identity, from the root layout. */
			settings: DeploySettings;
			/** Raw tab title (for dynamic titles). Prefer `titleKey`. */
			title?: string;
			/** Raw header subtitle. Prefer `subtitleKey`. */
			subtitle?: string;
			/** i18n key (MessageKey) of the tab title, resolved in the current locale. */
			titleKey?: string;
			/** i18n key (MessageKey) of the header subtitle. */
			subtitleKey?: string;
			slug?: string;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
