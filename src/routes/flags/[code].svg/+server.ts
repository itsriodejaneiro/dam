import { error } from '@sveltejs/kit';
import { flagSvg, hasFlag } from '$lib/server/flags';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!hasFlag(params.code)) error(404);
	return new Response(await flagSvg(params.code), {
		headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' }
	});
};
