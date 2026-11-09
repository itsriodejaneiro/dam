/* Theme = two orthogonal axes:
   - PACK (brand): legacy | green | orange  → data-theme attribute on <html>
     Source: the settings record (through the hook), with an optional
     localStorage override.
   - MODE (appearance): light | dark        → data-mode attribute on <html>
     Source: the user's toggle (localStorage), dark by default.
   PACKS is the single source of truth for the pack list (hook and UI). */

export const PACKS = ['legacy', 'green', 'orange'] as const;
export type ThemePack = (typeof PACKS)[number];
export type Mode = 'light' | 'dark';

export const DEFAULT_PACK: ThemePack = 'legacy';
export const DEFAULT_MODE: Mode = 'dark';

const MODE_KEY = 'mode';
const PACK_KEY = 'pack';
/** Older key (light/dark only), still read so saved preferences keep working. */
const LEGACY_MODE_KEY = 'theme';

export function isPack(value: unknown): value is ThemePack {
	return typeof value === 'string' && (PACKS as readonly string[]).includes(value);
}

function isMode(value: unknown): value is Mode {
	return value === 'light' || value === 'dark';
}

/* ---------- MODE (light/dark) ---------- */

export function getStoredMode(): Mode {
	if (typeof window === 'undefined') return DEFAULT_MODE;
	try {
		const saved = localStorage.getItem(MODE_KEY) ?? localStorage.getItem(LEGACY_MODE_KEY);
		if (isMode(saved)) return saved;
	} catch {}
	// Mirrors what the pre-paint script already set on <html>, else the default.
	const attr = document.documentElement.dataset.mode;
	return isMode(attr) ? attr : DEFAULT_MODE;
}

export function applyMode(mode: Mode): void {
	document.documentElement.dataset.mode = mode;
	try {
		localStorage.setItem(MODE_KEY, mode);
	} catch {}
}

/* ---------- PACK (brand) ---------- */

/** The pack in effect (reads <html>, which already reflects the default or an override). */
export function getActivePack(): ThemePack {
	if (typeof window === 'undefined') return DEFAULT_PACK;
	const attr = document.documentElement.dataset.theme;
	return isPack(attr) ? attr : DEFAULT_PACK;
}

/** The pack override the user saved (null = using the deploy's default). */
export function getStoredPack(): ThemePack | null {
	if (typeof window === 'undefined') return null;
	try {
		const saved = localStorage.getItem(PACK_KEY);
		if (isPack(saved)) return saved;
	} catch {}
	return null;
}

/** Shows the deploy's pack after its settings change, unless the visitor saved an override. */
export function applyDeployPack(pack: ThemePack): void {
	if (!getStoredPack()) document.documentElement.dataset.theme = pack;
}

export function applyPack(pack: ThemePack): void {
	document.documentElement.dataset.theme = pack;
	try {
		localStorage.setItem(PACK_KEY, pack);
	} catch {}
}
