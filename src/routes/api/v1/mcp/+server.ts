import { error } from '@sveltejs/kit';
import { methodNotAllowed } from '$lib/server/api/guard';
import { mcp } from '$lib/server/api/mcp';
import { recordWrite, serviceClient } from '$lib/server/api/service';
import { PocketBaseStore } from '$lib/server/api/store';
import { getSettings, invalidateSettings } from '$lib/server/settings';
import type { RequestHandler } from './$types';

// The MCP of the agents' API (docs/api-agentes.md). The token passed the guard of the hook.
// Only POST: with no stream from the server, GET answers 405, as the specification asks.
export const POST: RequestHandler = async ({ locals, request, url }) => {
	const token = locals.apiToken;
	if (!token) error(401);
	const [pb, settings] = await Promise.all([serviceClient(), getSettings()]);
	return mcp(request, {
		store: new PocketBaseStore(pb),
		settings,
		token,
		origin: url.origin,
		record: (entry) => recordWrite(token, entry),
		settingsChanged: invalidateSettings
	});
};

export const fallback: RequestHandler = () => methodNotAllowed();
