/* The settings record on the server: read by the hook (data-theme and lang before the
   first paint) and the root layout, written by /setup and /admin/settings.

   Cached for a minute in this process. A save through the app clears the cache at once;
   a save elsewhere (the PocketBase admin, another process) shows up within the minute.
   With no PocketBase, no collection or no record yet, the defaults serve the page. */

import PocketBase, { type RecordModel } from 'pocketbase';
import { env } from '$env/dynamic/public';
import { serverPbUrl } from '$lib/services/pb.server';
import { LOCALE_CODES, type MessageKey } from '$lib/i18n/messages';
import {
	DEFAULT_SETTINGS,
	LOGO_MAX_BYTES,
	LOGO_TYPES,
	storedName,
	type DeploySettings
} from '$lib/settings';
import { isPack } from '$lib/theme';
import { hasFlag } from './flags';

const TTL_MS = 60_000;
/** Shorter after a failure: PocketBase coming back shows fast, with no fetch per request. */
const RETRY_MS = 5_000;
const READ_TIMEOUT_MS = 2_000;
const NAME_MAX_CHARS = 120;

let cached: { value: DeploySettings; expires: number } | null = null;
let inFlight: Promise<DeploySettings> | null = null;
/** Bumped on invalidation, so a read begun before a save never caches the old record. */
let generation = 0;

/** The stored codes the app knows. An admin account writes this record over the REST API,
    where parseSettingsForm never runs, and these codes reach <html lang>. */
function knownLocales(stored: unknown): string[] {
	if (!Array.isArray(stored)) return [];
	return stored.filter((code) => (LOCALE_CODES as readonly unknown[]).includes(code));
}

function fromRecord(record: RecordModel): DeploySettings {
	const known = knownLocales(record.locales);
	const locales = known.length > 0 ? known : DEFAULT_SETTINGS.locales;
	return {
		name: storedName(record.name),
		locales,
		defaultLocale: locales.includes(record.default_locale) ? record.default_locale : locales[0],
		theme: isPack(record.theme) ? record.theme : DEFAULT_SETTINGS.theme,
		// the browser loads it, so the public URL
		logo: record.logo ? new PocketBase(env.PUBLIC_POCKETBASE_URL).files.getURL(record, record.logo) : null,
		flag: hasFlag(record.flag) ? record.flag : null,
		journeys: record.journeys !== false
	};
}

async function read(): Promise<DeploySettings> {
	const startedAt = generation;
	let value = DEFAULT_SETTINGS;
	let ttl = RETRY_MS;
	try {
		const pb = new PocketBase(serverPbUrl());
		const record = await pb.collection('settings').getFirstListItem('', {
			requestKey: null,
			signal: AbortSignal.timeout(READ_TIMEOUT_MS)
		});
		value = fromRecord(record);
		ttl = TTL_MS;
	} catch {
		/* no PocketBase or no record yet: the defaults */
	}
	if (startedAt === generation) cached = { value, expires: Date.now() + ttl };
	return value;
}

/** The deploy's settings. Never throws: a failed read returns the defaults. */
export function getSettings(): Promise<DeploySettings> {
	if (cached && Date.now() < cached.expires) return Promise.resolve(cached.value);
	if (inFlight) return inFlight;
	const reading: Promise<DeploySettings> = read().finally(() => {
		if (inFlight === reading) inFlight = null;
	});
	inFlight = reading;
	return reading;
}

export function invalidateSettings(): void {
	generation++;
	cached = null;
	inFlight = null;
}

export type ParsedSettings = { data: FormData; seedLocales: string[] } | { error: MessageKey };

function parseName(raw: FormDataEntryValue | null, locales: string[]): Record<string, string> | null {
	let input: unknown;
	try {
		input = JSON.parse(String(raw ?? '{}'));
	} catch {
		return null;
	}
	if (typeof input !== 'object' || input === null) return null;
	const name: Record<string, string> = {};
	for (const code of locales) {
		const value = String((input as Record<string, unknown>)[code] ?? '').trim();
		if (value.length > NAME_MAX_CHARS) return null;
		if (value) name[code] = value;
	}
	return name;
}

/** Validates the settings form (SettingsFields) into the body of a record update. */
export function parseSettingsForm(form: FormData): ParsedSettings {
	const chosen = form.getAll('locales').map(String);
	const locales: string[] = LOCALE_CODES.filter((code) => chosen.includes(code));
	const defaultLocale = String(form.get('default_locale') ?? '');
	if (!locales.includes(defaultLocale)) return { error: 'settings.error.locales' };

	const theme = form.get('theme');
	if (!isPack(theme)) return { error: 'settings.error.theme' };

	const flag = String(form.get('flag') ?? '').trim().toLowerCase();
	if (flag && !hasFlag(flag)) return { error: 'settings.error.flag' };

	const name = parseName(form.get('name'), locales);
	if (!name) return { error: 'settings.error.name' };

	const data = new FormData();
	data.set('name', JSON.stringify(name));
	data.set('locales', JSON.stringify(locales));
	data.set('default_locale', defaultLocale);
	data.set('theme', theme);
	data.set('flag', flag);
	data.set('journeys', String(form.has('journeys')));

	const logo = form.get('logo');
	if (logo instanceof File && logo.size > 0) {
		if (logo.size > LOGO_MAX_BYTES || !LOGO_TYPES.includes(logo.type)) {
			return { error: 'settings.error.logo' };
		}
		data.set('logo', logo);
	} else if (form.has('logo_remove')) {
		data.set('logo', '');
	}

	// seedBaseData takes the default locale first.
	return { data, seedLocales: [defaultLocale, ...locales.filter((c) => c !== defaultLocale)] };
}

/** Writes the one settings record with the client's own auth, and clears the cache. */
export async function writeSettings(pb: PocketBase, data: FormData): Promise<void> {
	const { id } = await pb.collection('settings').getFirstListItem('', { requestKey: null });
	await pb.collection('settings').update(id, data, { requestKey: null });
	invalidateSettings();
}
