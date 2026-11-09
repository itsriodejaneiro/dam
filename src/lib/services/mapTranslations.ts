import { pb } from './pb';
import type { MapTranslation } from '$lib/i18n';

export async function getMapTranslations(mapId: string): Promise<MapTranslation[]> {
	return await pb.collection('map_translations').getFullList<MapTranslation>({
		filter: `map = "${mapId}"`
	});
}

export async function getAllMapTranslations(): Promise<MapTranslation[]> {
	return await pb.collection('map_translations').getFullList<MapTranslation>();
}

export interface MapTranslationFields {
	label: string;
}

export async function upsertMapTranslation(
	mapId: string,
	localeId: string,
	fields: MapTranslationFields
): Promise<MapTranslation> {
	const existing = await pb
		.collection('map_translations')
		.getFirstListItem<MapTranslation>(`map = "${mapId}" && locale = "${localeId}"`)
		.catch(() => null);

	const payload = {
		map: mapId,
		locale: localeId,
		label: fields.label
	};

	if (existing) {
		return await pb.collection('map_translations').update<MapTranslation>(existing.id, payload);
	}
	return await pb.collection('map_translations').create<MapTranslation>(payload);
}

export async function deleteMapTranslation(id: string): Promise<void> {
	await pb.collection('map_translations').delete(id);
}
