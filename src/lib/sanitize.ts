/* Escaping for what the server writes into markup by hand. */

const ATTRIBUTE_ENTITIES: Record<string, string> = {
	'&': '&amp;',
	'"': '&quot;',
	"'": '&#39;',
	'<': '&lt;',
	'>': '&gt;'
};

/** A value made safe for a quoted HTML attribute. */
export function escapeAttribute(value: string): string {
	return value.replace(/[&"'<>]/g, (char) => ATTRIBUTE_ENTITIES[char]);
}
