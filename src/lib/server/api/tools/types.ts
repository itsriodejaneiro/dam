/* What a tool is (docs/api-agentes.md § O que a API faz): a name, a text for the agent, a
   zod schema for its input and what it does with the store. The MCP server (../mcp.ts)
   lists them and calls them; the context comes from the route, or from a test. */
import type { z } from 'zod';
import type { DeploySettings } from '$lib/settings';
import type { WriteEntry } from '../service';
import type { Store } from '../store';
import type { ApiToken } from '../tokens';

export interface ToolContext {
	store: Store;
	settings: DeploySettings;
	token: ApiToken;
	/** The site's origin, for the addresses a tool points the person at. */
	origin: string;
	/** The line of `api_writes`, written before the write it describes. */
	record: (entry: WriteEntry) => Promise<void>;
	/** After `save_settings`: the server's cached settings are stale. */
	settingsChanged?: () => void;
}

export interface Tool<S extends z.ZodType = z.ZodType> {
	name: string;
	title: string;
	description: string;
	input: S;
	annotations: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
	run: (ctx: ToolContext, args: z.output<S>) => Promise<unknown>;
}

/** Keeps the schema's type inside `run` and erases it for the registry. */
export const tool = <S extends z.ZodType>(t: Tool<S>): Tool => t as unknown as Tool;

export type ToolErrorCode = 'bad_request' | 'not_found' | 'conflict' | 'internal';

/** A refusal the agent can act on: it comes back as an `isError` result, never as a crash. */
export class ToolError extends Error {
	constructor(
		readonly code: ToolErrorCode,
		message: string,
		readonly details: Record<string, unknown> = {}
	) {
		super(message);
	}
}
