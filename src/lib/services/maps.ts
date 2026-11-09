import { pb } from './pb';
import { localesState, type MapTranslation } from '$lib/i18n';
import type { MapRecord } from './types';

export interface MapInput {
	slug?: string;
	order?: number;
}

export interface MapTranslationInput {
	label: string;
}

const EXPAND = 'map_translations_via_map';

export async function getMaps(): Promise<MapRecord[]> {
	return await pb.collection('maps').getFullList<MapRecord>({
		sort: 'order',
		expand: EXPAND
	});
}

export async function getMapBySlug(slug: string): Promise<MapRecord> {
	return await pb.collection('maps').getFirstListItem<MapRecord>(`slug = "${slug}"`, {
		expand: EXPAND
	});
}

export async function getMap(id: string): Promise<MapRecord> {
	return await pb.collection('maps').getOne<MapRecord>(id, { expand: EXPAND });
}

export async function createMap(
	data: { slug: string; order: number },
	translations: Record<string, MapTranslationInput>
): Promise<MapRecord> {
	const created = await pb.collection('maps').create<MapRecord>(data);
	for (const [code, t] of Object.entries(translations)) {
		const locale = localesState.byCode(code);
		if (!locale) continue;
		await pb.collection('map_translations').create<MapTranslation>({
			map: created.id,
			locale: locale.id,
			label: t.label
		});
	}
	return await getMap(created.id);
}

export async function updateMap(
	id: string,
	data: Partial<MapInput>,
	translations?: Record<string, MapTranslationInput>
): Promise<MapRecord> {
	await pb.collection('maps').update<MapRecord>(id, data);
	if (translations) {
		for (const [code, t] of Object.entries(translations)) {
			const locale = localesState.byCode(code);
			if (!locale) continue;
			const existing = await pb
				.collection('map_translations')
				.getFirstListItem<MapTranslation>(`map = "${id}" && locale = "${locale.id}"`)
				.catch(() => null);
			const payload = { map: id, locale: locale.id, label: t.label };
			if (existing) {
				await pb.collection('map_translations').update<MapTranslation>(existing.id, payload);
			} else {
				await pb.collection('map_translations').create<MapTranslation>(payload);
			}
		}
	}
	return await getMap(id);
}

export async function deleteMap(id: string): Promise<void> {
	await pb.collection('maps').delete(id);
}
