import { pb } from './pb';
import type { NodeTranslation } from '$lib/i18n';

export async function getNodeTranslations(nodeId: string): Promise<NodeTranslation[]> {
	return await pb.collection('node_translations').getFullList<NodeTranslation>({
		filter: `node = "${nodeId}"`
	});
}

export interface NodeTranslationFields {
	label: string;
	label_full?: string;
	description?: string;
}

/**
 * Upsert by (node, locale). Looks up the existing row, then creates or updates it.
 * PocketBase has no atomic upsert; this runs a minimal risk of double-create
 * under concurrent writes to the same pair (unlikely in this app).
 */
export async function upsertNodeTranslation(
	nodeId: string,
	localeId: string,
	fields: NodeTranslationFields
): Promise<NodeTranslation> {
	const existing = await pb
		.collection('node_translations')
		.getFirstListItem<NodeTranslation>(`node = "${nodeId}" && locale = "${localeId}"`)
		.catch(() => null);

	const payload = {
		node: nodeId,
		locale: localeId,
		label: fields.label,
		label_full: fields.label_full ?? '',
		description: fields.description ?? ''
	};

	if (existing) {
		return await pb.collection('node_translations').update<NodeTranslation>(existing.id, payload);
	}
	return await pb.collection('node_translations').create<NodeTranslation>(payload);
}

export async function deleteNodeTranslation(id: string): Promise<void> {
	await pb.collection('node_translations').delete(id);
}
