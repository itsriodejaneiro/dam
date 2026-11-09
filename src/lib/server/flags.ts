/* Every flag of svg-country-flags, on the server only and one lazy chunk each. */

const FLAGS = import.meta.glob<string>('/node_modules/svg-country-flags/svg/*.svg', {
	query: '?raw',
	import: 'default'
});

const path = (code: string) => `/node_modules/svg-country-flags/svg/${code}.svg`;

/** True for an ISO alpha-2 code the package has a flag for. Regional flags (gb-eng) stay out. */
export function hasFlag(code: string): boolean {
	return /^[a-z]{2}$/.test(code) && path(code) in FLAGS;
}

/** The flag's SVG source. Call after hasFlag. */
export function flagSvg(code: string): Promise<string> {
	return FLAGS[path(code)]();
}
