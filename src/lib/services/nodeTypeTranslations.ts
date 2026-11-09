import { pb } from './pb';
import type { NodeTypeTranslation } from '$lib/i18n';

export async function getNodeTypeTranslations(nodeTypeId: string): Promise<NodeTypeTranslation[]> {
	return await pb.collection('node_type_translations').getFullList<NodeTypeTranslation>({
		filter: `node_type = "${nodeTypeId}"`
	});
}

export async function getAllNodeTypeTranslations(): Promise<NodeTypeTranslation[]> {
	return await pb.collection('node_type_translations').getFullList<NodeTypeTranslation>();
}

export interface NodeTypeTranslationFields {
	label: string;
	label_plural?: string;
}

export async function upsertNodeTypeTranslation(
	nodeTypeId: string,
	localeId: string,
	fields: NodeTypeTranslationFields
): Promise<NodeTypeTranslation> {
	const existing = await pb
		.collection('node_type_translations')
		.getFirstListItem<NodeTypeTranslation>(
			`node_type = "${nodeTypeId}" && locale = "${localeId}"`
		)
		.catch(() => null);

	const payload = {
		node_type: nodeTypeId,
		locale: localeId,
		label: fields.label,
		label_plural: fields.label_plural ?? ''
	};

	if (existing) {
		return await pb
			.collection('node_type_translations')
			.update<NodeTypeTranslation>(existing.id, payload);
	}
	return await pb.collection('node_type_translations').create<NodeTypeTranslation>(payload);
}

export async function deleteNodeTypeTranslation(id: string): Promise<void> {
	await pb.collection('node_type_translations').delete(id);
}
