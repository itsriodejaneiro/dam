import { untrack } from 'svelte';
import type { Locale } from './types';
import { DEFAULT_LOCALE } from '$lib/settings';

/**
 * Global reactive state of the deploy's locales, from the settings record.
 *
 * +layout.svelte calls seed() while rendering, so SSR and hydration agree on the
 * default locale, then init() in an effect to bring in the preference in localStorage.
 *
 * SSR has no `localStorage`; init() is idempotent and the getters reflect
 * `_locales`/`_current` for the rest of the app.
 */
const LOCALE_LABELS: Record<string, string> = {
	pt: 'Português',
	en: 'English',
	fr: 'Français',
	es: 'Español'
};
const RTL = new Set(['ar', 'he', 'fa', 'ur']);

/** Builds the Locale list from locale codes. id === code. */
export function deployLocales(codes: readonly string[], defaultCode: string): Locale[] {
	return codes.map((code, i) => ({
		id: code,
		code,
		label: LOCALE_LABELS[code] ?? code.toUpperCase(),
		is_default: code === defaultCode,
		sort_order: i,
		direction: RTL.has(code) ? 'rtl' : 'ltr'
	}));
}

function bySortOrder(locales: Locale[]): Locale[] {
	return [...locales].sort((a, b) => a.sort_order - b.sort_order);
}

function defaultOf(sorted: Locale[]): string {
	return sorted.find((l) => l.is_default)?.code ?? sorted[0]?.code ?? DEFAULT_LOCALE;
}

let _locales = $state<Locale[]>([]);
let _current = $state<string>(DEFAULT_LOCALE);

const STORAGE_KEY = 'locale';

/** Mirrors the current locale in <html lang> (in the browser). */
function applyLang(code: string) {
	if (typeof document === 'undefined') return;
	document.documentElement.lang = code;
}

function readStoredLocale(): string | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

function writeStoredLocale(code: string) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, code);
	} catch {
		// ignore
	}
}

export const localesState = {
	get all(): Locale[] {
		return _locales;
	},
	get codes(): string[] {
		return _locales.map((l) => l.code);
	},
	get default(): string {
		return defaultOf(_locales);
	},
	get current(): string {
		return _current;
	},
	byCode(code: string): Locale | undefined {
		return _locales.find((l) => l.code === code);
	},
	byId(id: string): Locale | undefined {
		return _locales.find((l) => l.id === id);
	},
	/** First render: the deploy's list and its default locale, with no saved preference. */
	seed(locales: Locale[]) {
		_locales = bySortOrder(locales);
		_current = defaultOf(_locales);
	},
	/**
	 * Fills the locale list and decides the current locale. Idempotent.
	 *
	 * Wraps the reads of `_current` in `untrack` so this method can be called
	 * inside an `$effect` without making the effect depend on `_current`:
	 * otherwise changing the locale would trigger the effect again,
	 * reassigning `_locales` in a loop and resetting the page's deriveds.
	 */
	init(locales: Locale[]) {
		const sorted = bySortOrder(locales);
		const defaultCode = defaultOf(sorted);

		untrack(() => {
			const storedPref = readStoredLocale();
			const isValid = (c: string) => sorted.some((l) => l.code === c);
			// Sitting on the old default with no saved choice means following the new one.
			const keepsCurrent = isValid(_current) && _current !== defaultOf(_locales);
			const target = storedPref && isValid(storedPref) ? storedPref : keepsCurrent ? _current : defaultCode;
			if (_current !== target) _current = target;
			applyLang(_current);
		});

		// Reassigns `_locales` only if it actually changed, to avoid invalidating readers.
		const same =
			_locales.length === sorted.length &&
			_locales.every((l, i) => l.id === sorted[i].id && l.is_default === sorted[i].is_default);
		if (!same) _locales = sorted;
	},
	setCurrent(code: string) {
		if (!_locales.some((l) => l.code === code)) return;
		if (_current === code) return;
		_current = code;
		writeStoredLocale(code);
		applyLang(code);
	}
};

/**
 * Deterministic fallback chain: requested locale → default → first available.
 * Contains no duplicates.
 */
export function fallbackChain(code: string): string[] {
	const chain: string[] = [];
	if (code) chain.push(code);
	const def = localesState.default;
	if (def && def !== code) chain.push(def);
	for (const l of localesState.all) {
		if (!chain.includes(l.code)) chain.push(l.code);
	}
	return chain;
}
