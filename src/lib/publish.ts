/* What every edit with a published copy shares (a journey, a page): the test for
   unpublished changes. Relative imports only: the CLI setup loads the modules that use it. */

/** JSON with each object's keys sorted, the order PocketBase stores a JSON field in. */
function canonical(value: unknown): string {
	return JSON.stringify(value, (_key, v: unknown) =>
		v && typeof v === 'object' && !Array.isArray(v)
			? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
			: v
	);
}

/** True when two copies say the same thing, whatever order their keys come in. */
export function samePublished<T>(a: T, b: T): boolean {
	return canonical(a) === canonical(b);
}
