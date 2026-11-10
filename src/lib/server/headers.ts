/* The security headers of every response. A page's Content-Security-Policy comes from
   kit.csp in svelte.config.js, with SvelteKit's nonce; hooks.server.ts sets the rest. */

/** Sent with every response. frame-ancestors covers clickjacking, so no X-Frame-Options. */
export const SECURITY_HEADERS: Record<string, string> = {
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'permissions-policy': 'camera=(), microphone=(), geolocation=()'
};

/**
 * The policy of a response that is not a page (a flag's SVG, the setup's stream, JSON):
 * opened as a document, it loads and runs nothing. Inline styles stay, for the flags and
 * SvelteKit's fallback error page.
 */
export const NON_PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'";

/** Where the browser reaches PocketBase: the SDK's calls and realtime, and the files. */
const POCKETBASE_DIRECTIVES = ['img-src', 'connect-src'];

/** The origin of the public PocketBase URL, or null when it is missing or not absolute. */
export function originOf(url: string | undefined): string | null {
	if (!url) return null;
	try {
		return new URL(url).origin;
	} catch {
		return null;
	}
}

/** Adds `origin` to the directives of a page's `policy` that reach PocketBase. */
export function allowPocketBase(policy: string, origin: string): string {
	return policy
		.split(';')
		.map((directive) => {
			const name = directive.trim().split(/\s+/, 1)[0];
			return POCKETBASE_DIRECTIVES.includes(name) ? `${directive.trimEnd()} ${origin}` : directive;
		})
		.join(';');
}

/** Sets the security headers of a response: a page's policy gains PocketBase, any other gets the closed one. */
export function secureHeaders(headers: Headers, pocketbaseUrl: string | undefined): void {
	const policy = headers.get('content-security-policy');
	const origin = originOf(pocketbaseUrl);
	if (!policy) headers.set('content-security-policy', NON_PAGE_CSP);
	else if (origin) headers.set('content-security-policy', allowPocketBase(policy, origin));
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
}
