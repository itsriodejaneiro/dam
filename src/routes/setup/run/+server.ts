/* Project setup with streamed progress (for the /setup terminal).
   Runs server-side with the env's superuser and validates the
   requester's token first. Takes the settings form, so the deploy's identity
   and locales are in place before the seed. Streams one log line per step and
   ends with `__DONE__` (success) or `__ERROR__ <msg>` (failure). */

import { getSuperuserClient } from '$lib/services/pb.server';
import { setupCollections, seedBaseData } from '$lib/server/setup';
import { resetConfigCache } from '$lib/server/config';
import { isSuperuserToken } from '$lib/server/auth';
import { parseSettingsForm, writeSettings } from '$lib/server/settings';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	// an invalid body has no token: 401 below
	const form = await request.formData().catch(() => new FormData());
	if (!(await isSuperuserToken(String(form.get('token') ?? '')))) {
		return new Response('unauthorized', { status: 401 });
	}
	const parsed = parseSettingsForm(form);
	if ('error' in parsed) return new Response(parsed.error, { status: 400 });

	const stream = new ReadableStream({
		async start(controller) {
			const enc = new TextEncoder();
			const log = (msg: string) => controller.enqueue(enc.encode(msg + '\n'));
			try {
				const pb = await getSuperuserClient();
				log('▸ collections');
				await setupCollections(pb, log);
				log('▸ settings');
				await writeSettings(pb, parsed.data);
				log('▸ base data');
				await seedBaseData(pb, parsed.seedLocales, log);
				resetConfigCache();
				log('✓ done');
				log('__DONE__');
			} catch (err) {
				console.error('[setup] failed:', err);
				log('__ERROR__ ' + (err instanceof Error ? err.message : 'setup failed'));
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'no-cache',
			'X-Accel-Buffering': 'no'
		}
	});
};
