/* A deploy's flag: the ISO 3166-1 alpha-2 code from the settings, served by the route
   /flags/[code].svg, so every flag of svg-country-flags stays out of the client bundle. */

/** URL of the flag's SVG, or null with no code. */
export function flagUrl(code: string | null): string | null {
	return code ? `/flags/${code}.svg` : null;
}
