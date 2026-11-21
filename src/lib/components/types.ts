/* Types shared by the design system's components. */

export type Status = 'draft' | 'review' | 'confirmed' | 'empty';

/** One link of a `DropdownMenu`; `active` marks the page that is open. */
export interface MenuItem {
	href: string;
	label: string;
	active?: boolean;
}
