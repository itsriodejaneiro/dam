import { pb } from './pb';
import { localesState, type NodeTranslation } from '$lib/i18n';
import type { Node, NodeLink } from './types';

export interface NodeInput {
	type: string;
	links?: NodeLink[];
	order?: number;
	weight_override?: number | null;
}

export interface NodeTranslationInput {
	label: string;
	label_full?: string;
	description?: string;
}

const EXPAND = 'node_translations_via_node';

export async function getNodes(): Promise<Node[]> {
	return await pb.collection('nodes').getFullList<Node>({ sort: 'created', expand: EXPAND });
}

export async function getNodesByType(typeId: string): Promise<Node[]> {
	return await pb.collection('nodes').getFullList<Node>({
		filter: `type = "${typeId}"`,
		sort: 'order',
		expand: EXPAND
	});
}

export async function getNode(id: string): Promise<Node> {
	return await pb.collection('nodes').getOne<Node>(id, { expand: EXPAND });
}

/**
 * Creates a node + fills in every translation provided.
 * Fails if the default locale's translation is missing (PB constraint).
 */
export async function createNode(
	data: NodeInput,
	translations: Record<string, NodeTranslationInput>
): Promise<Node> {
	const created = await pb.collection('nodes').create<Node>(data);
	for (const [code, t] of Object.entries(translations)) {
		const locale = localesState.byCode(code);
		if (!locale) continue;
		await pb.collection('node_translations').create<NodeTranslation>({
			node: created.id,
			locale: locale.id,
			label: t.label,
			label_full: t.label_full ?? '',
			description: t.description ?? ''
		});
	}
	return await getNode(created.id);
}

export async function updateNode(
	id: string,
	data: Partial<NodeInput>,
	translations?: Record<string, NodeTranslationInput>
): Promise<Node> {
	await pb.collection('nodes').update<Node>(id, data);
	if (translations) {
		for (const [code, t] of Object.entries(translations)) {
			const locale = localesState.byCode(code);
			if (!locale) continue;
			const existing = await pb
				.collection('node_translations')
				.getFirstListItem<NodeTranslation>(`node = "${id}" && locale = "${locale.id}"`)
				.catch(() => null);
			const payload = {
				node: id,
				locale: locale.id,
				label: t.label,
				label_full: t.label_full ?? '',
				description: t.description ?? ''
			};
			if (existing) {
				await pb.collection('node_translations').update<NodeTranslation>(existing.id, payload);
			} else {
				await pb.collection('node_translations').create<NodeTranslation>(payload);
			}
		}
	}
	return await getNode(id);
}

export async function deleteNode(id: string): Promise<void> {
	await pb.collection('nodes').delete(id);
}
