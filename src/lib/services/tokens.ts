import type { RecordModel } from 'pocketbase';
import type { WriteAction } from '$lib/api';
import { pb } from './pb';

/** A token as the admin reads it: the hash is hidden, the token itself was shown once. */
export interface ApiTokenRow extends RecordModel {
	name: string;
	prefix: string;
	created_by: string;
	last_used_at: string;
}

/** A line of api_writes: a write by a tool, or a token created or deleted by an admin. */
export interface ApiWriteRow extends RecordModel {
	token_prefix: string;
	token_name: string;
	tool: string;
	collection: string;
	record: string;
	action: WriteAction;
	actor: string;
	previous: unknown;
}

export async function getTokens(): Promise<ApiTokenRow[]> {
	return await pb.collection('api_tokens').getFullList<ApiTokenRow>({ sort: '-created' });
}

/** What a token wrote, the latest first, by its prefix: the lines outlive the token. */
export async function getWrites(prefix: string): Promise<ApiWriteRow[]> {
	return await pb.collection('api_writes').getFullList<ApiWriteRow>({
		filter: pb.filter('token_prefix = {:prefix}', { prefix }),
		sort: '-created'
	});
}
