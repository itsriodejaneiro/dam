import { unknownPath } from '$lib/server/api/guard';
import type { RequestHandler } from './$types';

// What is not the MCP answers in the API's shape, never with the site's error page.
export const fallback: RequestHandler = () => unknownPath();
