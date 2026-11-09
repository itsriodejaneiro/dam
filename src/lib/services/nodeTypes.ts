import { pb } from './pb';
import { localesState, type NodeTypeTranslation } from '$lib/i18n';
import type { Node, NodeType } from './types';

export interface NodeTypeInput {
	slug?: string;
	color_slot?: number;
	layer_order?: number;
	base_size?: number;
}

export interface NodeTypeTranslationInput {
	label: string;
	label_plural?: string;
}

const EXPAND = 'node_type_translations_via_node_type';

export async function getNodeTypes(): Promise<NodeType[]> {
	return await pb.collection('node_types').getFullList<NodeType>({
		sort: 'layer_order',
		expand: EXPAND
	});
}

export async function getNodeTypeBySlug(slug: string): Promise<NodeType> {
	return await pb.collection('node_types').getFirstListItem<NodeType>(`slug = "${slug}"`, {
		expand: EXPAND
	});
}

export async function getNodeType(id: string): Promise<NodeType> {
	return await pb.collection('node_types').getOne<NodeType>(id, { expand: EXPAND });
}

export async function createNodeType(
	data: { slug: string; color_slot: number; layer_order: number; base_size: number },
	translations: Record<string, NodeTypeTranslationInput>
): Promise<NodeType> {
	const created = await pb.collection('node_types').create<NodeType>(data);
	for (const [code, t] of Object.entries(translations)) {
		const locale = localesState.byCode(code);
		if (!locale) continue;
		await pb.collection('node_type_translations').create<NodeTypeTranslation>({
			node_type: created.id,
			locale: locale.id,
			label: t.label,
			label_plural: t.label_plural ?? ''
		});
	}
	return await getNodeType(created.id);
}

export async function updateNodeType(
	id: string,
	data: NodeTypeInput,
	translations?: Record<string, NodeTypeTranslationInput>
): Promise<NodeType> {
	await pb.collection('node_types').update<NodeType>(id, data);
	if (translations) {
		for (const [code, t] of Object.entries(translations)) {
			const locale = localesState.byCode(code);
			if (!locale) continue;
			const existing = await pb
				.collection('node_type_translations')
				.getFirstListItem<NodeTypeTranslation>(
					`node_type = "${id}" && locale = "${locale.id}"`
				)
				.catch(() => null);
			const payload = {
				node_type: id,
				locale: locale.id,
				label: t.label,
				label_plural: t.label_plural ?? ''
			};
			if (existing) {
				await pb
					.collection('node_type_translations')
					.update<NodeTypeTranslation>(existing.id, payload);
			} else {
				await pb
					.collection('node_type_translations')
					.create<NodeTypeTranslation>(payload);
			}
		}
	}
	return await getNodeType(id);
}

export async function countNodesOfType(id: string): Promise<number> {
	const res = await pb.collection('nodes').getList(1, 1, { filter: `type = "${id}"` });
	return res.totalItems;
}

/**
 * Deletes the category. If nodes are attached, requires `reassignNodesTo` (the id of
 * another category) where the nodes move before the deletion, which avoids
 * a destructive cascade and orphans in the database.
 */
export async function deleteNodeType(
	id: string,
	options?: { reassignNodesTo?: string }
): Promise<void> {
	const affected = await pb
		.collection('nodes')
		.getFullList<Node>({ filter: `type = "${id}"`, fields: 'id' });
	if (affected.length > 0) {
		const target = options?.reassignNodesTo;
		if (!target) throw new Error('CATEGORY_IN_USE');
		if (target === id) throw new Error('CATEGORY_REASSIGN_SELF');
		for (const n of affected) {
			await pb.collection('nodes').update(n.id, { type: target });
		}
	}
	await pb.collection('node_types').delete(id);
}
