import { pb } from './pb';
import type { Edge } from './types';

export interface EdgeInput {
	source: string;
	target: string;
}

export async function getEdges(): Promise<Edge[]> {
	return await pb.collection('edges').getFullList<Edge>({ sort: 'created' });
}

export async function getEdgesForNode(nodeId: string): Promise<Edge[]> {
	return await pb.collection('edges').getFullList<Edge>({
		filter: `source = "${nodeId}" || target = "${nodeId}"`
	});
}

export async function edgeExists(
	source: string,
	target: string,
	excludeId?: string
): Promise<boolean> {
	const filter = excludeId
		? `source = "${source}" && target = "${target}" && id != "${excludeId}"`
		: `source = "${source}" && target = "${target}"`;
	const results = await pb.collection('edges').getList<Edge>(1, 1, { filter });
	return results.totalItems > 0;
}

export async function createEdge(data: EdgeInput): Promise<Edge> {
	return await pb.collection('edges').create<Edge>(data);
}

export async function updateEdge(id: string, data: Partial<EdgeInput>): Promise<Edge> {
	return await pb.collection('edges').update<Edge>(id, data);
}

export async function deleteEdge(id: string): Promise<void> {
	await pb.collection('edges').delete(id);
}
