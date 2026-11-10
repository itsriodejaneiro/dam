/* Cleaning for what reaches markup by hand: stored rich text on its way to {@html},
   stored links on their way to href, and the values the server writes into app.html.

   sanitizeHtml rebuilds the markup rather than filtering it. Its output holds only the
   tags written below and escaped text, so a parser that disagrees with the browser's has
   nothing to smuggle. There is no DOM here, so the server and the browser run this same
   code. The tag list is what RichTextEditor.svelte produces; a new mark or node in the
   editor is one more entry here. */

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

const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

/** The URL in its normal form when its scheme is one a stored link may use, or null.
    Parsed as the browser parses it, so tabs, case and leading blanks change nothing. */
export function safeUrl(url: unknown): string | null {
	if (typeof url !== 'string') return null;
	try {
		const parsed = new URL(url);
		return SAFE_SCHEMES.has(parsed.protocol) ? parsed.href : null;
	} catch {
		return null;
	}
}

const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'h2', 'h3']);
/** Their content is code, not text: it goes with the tag. */
const CODE_TAGS = new Set(['script', 'style']);

const NAMED_REFERENCES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' '
};

/** An attribute's real value. A reference left undecoded stays literal in the URL that
    safeUrl checks and the browser receives, so the short list opens no way around it. */
function decodeReferences(value: string): string {
	return value.replace(
		/&(?:#(\d+)|#x([\da-f]+)|(amp|lt|gt|quot|apos|nbsp));?/gi,
		(whole, decimal, hex, name) => {
			if (name) return NAMED_REFERENCES[name.toLowerCase()];
			const point = decimal ? Number(decimal) : parseInt(hex, 16);
			return point <= 0x10ffff ? String.fromCodePoint(point) : whole;
		}
	);
}

/** Text as HTML. A well-formed character reference stays one: it can only ever be text. */
function escapeText(text: string): string {
	return text.replace(
		/&(?!(?:[a-z][a-z\d]*|#\d+|#x[\da-f]+);)|[<>]/gi,
		(char) => ATTRIBUTE_ENTITIES[char]
	);
}

const isBlank = (char: string) => /\s/.test(char);

interface Tag {
	name: string;
	closing: boolean;
	attributes: Map<string, string>;
	/** Where the input continues after the tag. */
	end: number;
}

/** Reads the attributes that begin at `from`, up to the `>`. Null when the input ends first,
    where a browser drops the unfinished tag too. Every step moves forward: this is linear. */
function readAttributes(
	html: string,
	from: number
): { attributes: Map<string, string>; end: number } | null {
	const attributes = new Map<string, string>();
	let i = from;
	for (;;) {
		while (i < html.length && (isBlank(html[i]) || html[i] === '/')) i++;
		if (i >= html.length) return null;
		if (html[i] === '>') return { attributes, end: i + 1 };

		const nameStart = i;
		// `=` at the start belongs to the name, as in the HTML tokenizer
		i++;
		while (i < html.length && !isBlank(html[i]) && !'/>='.includes(html[i])) i++;
		const name = html.slice(nameStart, i).toLowerCase();

		while (i < html.length && isBlank(html[i])) i++;
		let value = '';
		if (html[i] === '=') {
			i++;
			while (i < html.length && isBlank(html[i])) i++;
			if (html[i] === '"' || html[i] === "'") {
				const close = html.indexOf(html[i], i + 1);
				if (close === -1) return null;
				value = html.slice(i + 1, close);
				i = close + 1;
			} else {
				const valueStart = i;
				while (i < html.length && !isBlank(html[i]) && html[i] !== '>') i++;
				value = html.slice(valueStart, i);
			}
		}
		// the first of a repeated attribute wins, as in a browser
		if (!attributes.has(name)) attributes.set(name, value);
	}
}

/** The tag at `start` (a `<`), or null when that `<` opens nothing and is plain text. */
function readTag(html: string, start: number): Tag | null {
	let i = start + 1;
	const closing = html[i] === '/';
	if (closing) i++;
	if (!/[a-z]/i.test(html[i] ?? '')) return null;
	const nameStart = i;
	while (i < html.length && !isBlank(html[i]) && html[i] !== '/' && html[i] !== '>') i++;
	const read = readAttributes(html, i);
	const end = read?.end ?? html.length;
	return {
		name: html.slice(nameStart, i).toLowerCase(),
		closing,
		attributes: read?.attributes ?? new Map(),
		end
	};
}

/** Where a comment or declaration at `start` ends, or null when there is none at `start`. */
function skipDeclaration(html: string, start: number): number | null {
	if (html.startsWith('<!--', start)) {
		const close = html.indexOf('-->', start + 4);
		return close === -1 ? html.length : close + 3;
	}
	if (html[start + 1] === '!' || html[start + 1] === '?') {
		const close = html.indexOf('>', start + 2);
		return close === -1 ? html.length : close + 1;
	}
	return null;
}

function openingTag(tag: Tag): string | null {
	if (tag.name === 'a') {
		const href = safeUrl(decodeReferences(tag.attributes.get('href') ?? ''));
		if (!href) return null;
		return `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer nofollow">`;
	}
	if (tag.name === 'ol') {
		const start = tag.attributes.get('start') ?? '';
		return /^\d+$/.test(start) ? `<ol start="${start}">` : '<ol>';
	}
	return `<${tag.name}>`;
}

/** Stored rich text, reduced to what the editor can write. Always balanced, so an unclosed
    tag cannot run into the page around it. */
export function sanitizeHtml(input: unknown): string {
	if (typeof input !== 'string') return '';
	let output = '';
	const open: string[] = [];
	// How many of each tag are in `open`, so that a closing tag never searches it.
	const depth = new Map<string, number>();
	const closeLast = (): string => {
		const name = open.pop() as string;
		depth.set(name, (depth.get(name) as number) - 1);
		output += `</${name}>`;
		return name;
	};
	let i = 0;
	while (i < input.length) {
		const lt = input.indexOf('<', i);
		if (lt === -1) {
			output += escapeText(input.slice(i));
			break;
		}
		output += escapeText(input.slice(i, lt));

		const afterDeclaration = skipDeclaration(input, lt);
		if (afterDeclaration !== null) {
			i = afterDeclaration;
			continue;
		}
		const tag = readTag(input, lt);
		if (!tag) {
			output += '&lt;';
			i = lt + 1;
			continue;
		}
		i = tag.end;

		if (CODE_TAGS.has(tag.name) && !tag.closing) {
			const close = new RegExp(`</${tag.name}[\\s/>]`, 'gi');
			close.lastIndex = i;
			const found = close.exec(input);
			i = found ? (readTag(input, found.index)?.end ?? input.length) : input.length;
			continue;
		}
		if (!ALLOWED_TAGS.has(tag.name)) continue;

		if (tag.closing) {
			if (depth.get(tag.name)) while (closeLast() !== tag.name);
			continue;
		}
		const opening = openingTag(tag);
		if (!opening) continue;
		output += opening;
		if (tag.name !== 'br') {
			open.push(tag.name);
			depth.set(tag.name, (depth.get(tag.name) ?? 0) + 1);
		}
	}
	while (open.length > 0) closeLast();
	return output;
}
