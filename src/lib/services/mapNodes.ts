import { pb } from './pb';
import type { MapNode } from './types';

export async function getMapNodes(mapId: string): Promise<MapNode[]> {
	return await pb.collection('map_nodes').getFullList<MapNode>({
		filter: `map = "${mapId}"`
	});
}

export async function getMapsForNode(nodeId: string): Promise<MapNode[]> {
	return await pb.collection('map_nodes').getFullList<MapNode>({
		filter: `node = "${nodeId}"`
	});
}

export async function addNodeToMap(mapId: string, nodeId: string): Promise<MapNode> {
	return await pb.collection('map_nodes').create<MapNode>({
		map: mapId,
		node: nodeId,
		x: null,
		y: null
	});
}

export async function removeNodeFromMap(id: string): Promise<void> {
	await pb.collection('map_nodes').delete(id);
}

export async function savePosition(id: string, x: number, y: number): Promise<MapNode> {
	return await pb.collection('map_nodes').update<MapNode>(id, { x, y });
}

export async function clearPosition(id: string): Promise<MapNode> {
	return await pb.collection('map_nodes').update<MapNode>(id, { x: null, y: null });
}
