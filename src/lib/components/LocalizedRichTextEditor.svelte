<script lang="ts">
	import RichTextEditor from './RichTextEditor.svelte';
	import type { Locale, Localized } from '$lib/i18n';
	import { localesState } from '$lib/i18n';

	interface Props {
		value: Localized;
		placeholder?: string;
		resetKey?: string | number;
		/** Section titles, h2 and h3, in the toolbar. */
		headings?: boolean;
		/** Locales to show. Default: the deploy's. */
		locales?: Locale[];
	}

	let {
		value = $bindable({} as Localized),
		placeholder = '',
		resetKey,
		headings = false,
		locales
	}: Props = $props();

	let shown = $derived(locales ?? localesState.all);

	$effect.pre(() => {
		for (const loc of shown) {
			if (value[loc.code] == null) value[loc.code] = '';
		}
	});
</script>

<div class="loc-rte">
	{#each shown as loc (loc.id)}
		<div class="locale-block">
			<span class="loc-tag">{loc.code.toUpperCase()}</span>
			<div class="editor-wrap">
				{#key `${resetKey ?? ''}-${loc.code}`}
					<RichTextEditor
						bind:content={value[loc.code]}
						placeholder={placeholder || loc.label}
						{headings}
					/>
				{/key}
			</div>
		</div>
	{/each}
</div>

<style>
	.loc-rte {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.locale-block {
		display: grid;
		grid-template-columns: 2rem 1fr;
		gap: 0.5rem;
		align-items: start;
	}
	.loc-tag {
		font-family: 'Fira Mono', monospace;
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		color: var(--text-soft);
		text-align: right;
		padding-top: 0.6rem;
	}
	.editor-wrap {
		min-width: 0;
	}
</style>
