import { localesState } from './config.svelte';
import { messages, type MessageKey } from './messages';

function interpolate(template: string, args: (string | number)[]): string {
	if (args.length === 0) return template;
	return template.replace(/\{(\d+)\}/g, (_, i) => {
		const arg = args[Number(i)];
		return arg == null ? '' : String(arg);
	});
}

/**
 * Reads a message translated into the current locale, falling back to the default.
 * Reactive: it depends on `localesState.current`, so any template that calls
 * `m('...')` re-renders when the switcher changes.
 *
 * Positional interpolation: `m('greeting', 'Ana')` replaces `{0}` with 'Ana'.
 */
export function m(key: MessageKey, ...args: (string | number)[]): string {
	const entry = messages[key];
	if (!entry) return key;
	const code = localesState.current;
	const def = localesState.default;
	const value =
		(entry as Record<string, string>)[code] ??
		(entry as Record<string, string>)[def] ??
		key;
	return interpolate(value, args);
}
