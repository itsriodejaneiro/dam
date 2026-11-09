export type { Locale, Localized, Translation, NodeTranslation, NodeTypeTranslation, MapTranslation } from './types';
export { localesState, deployLocales, fallbackChain } from './config.svelte';
export {
	t,
	pickTranslation,
	hasLocalized,
	localizedNode,
	localizedNodeType,
	localizedMap
} from './t';
export { m } from './m';
export { LOCALE_CODES } from './messages';
export type { MessageKey } from './messages';
