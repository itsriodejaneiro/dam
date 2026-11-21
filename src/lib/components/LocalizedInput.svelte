<script lang="ts">
	import type { Locale, Localized } from '$lib/i18n';
	import { localesState } from '$lib/i18n';

	interface Props {
		value: Localized;
		type?: 'text' | 'url';
		placeholder?: string;
		id?: string;
		/** When true, the default locale is `required`. Default: true. */
		required?: boolean;
		/** A text of a few lines (a lede): a field that grows with its text, with no scroll inside. */
		multiline?: boolean;
		/** Locales to show. Default: the deploy's. */
		locales?: Locale[];
	}

	let {
		value = $bindable({} as Localized),
		type = 'text',
		placeholder = '',
		id,
		required = true,
		multiline = false,
		locales
	}: Props = $props();

	let shown = $derived(locales ?? localesState.all);

	/** Fits the field to its text, now and on every change of it (typing, a load, Discard). */
	function grow(el: HTMLTextAreaElement, _text: string) {
		const fit = () => {
			el.style.height = 'auto';
			el.style.height = `${el.scrollHeight + 2}px`;
		};
		fit();
		el.addEventListener('input', fit);
		return {
			update(next: string) {
				void next;
				fit();
			},
			destroy() {
				el.removeEventListener('input', fit);
			}
		};
	}

	$effect(() => {
		for (const loc of shown) {
			if (value[loc.code] == null) value[loc.code] = '';
		}
	});
</script>

<div class="locinput">
	{#each shown as loc (loc.id)}
		<div class="row">
			<span class="loc-tag">{loc.code.toUpperCase()}</span>
			{#if multiline}
				<textarea
					id={id ? `${id}-${loc.code}` : undefined}
					class="input lines"
					rows="2"
					placeholder={placeholder || loc.label}
					required={required && loc.is_default}
					bind:value={value[loc.code]}
					dir={loc.direction}
					use:grow={value[loc.code]}
				></textarea>
			{:else}
				<input
					id={id ? `${id}-${loc.code}` : undefined}
					class="input"
					{type}
					placeholder={placeholder || loc.label}
					required={required && loc.is_default}
					bind:value={value[loc.code]}
					dir={loc.direction}
				/>
			{/if}
		</div>
	{/each}
</div>

<style>
	.locinput {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.row {
		display: grid;
		grid-template-columns: 2rem 1fr;
		gap: 0.5rem;
		align-items: center;
	}
	.row:has(.lines) {
		align-items: start;
	}
	.row:has(.lines) .loc-tag {
		padding-top: 0.75rem;
	}
	/* the action sets the height; the browser's own field sizing does it where it exists */
	.lines {
		display: block;
		resize: none;
		overflow: hidden;
		line-height: 1.45;
		field-sizing: content;
	}
	.loc-tag {
		font-family: 'Fira Mono', monospace;
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		color: var(--text-soft);
		text-align: right;
	}
</style>
