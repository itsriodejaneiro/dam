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
		/** Locales to show. Default: the deploy's. */
		locales?: Locale[];
	}

	let {
		value = $bindable({} as Localized),
		type = 'text',
		placeholder = '',
		id,
		required = true,
		locales
	}: Props = $props();

	let shown = $derived(locales ?? localesState.all);

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
			<input
				id={id ? `${id}-${loc.code}` : undefined}
				class="input"
				{type}
				placeholder={placeholder || loc.label}
				required={required && loc.is_default}
				bind:value={value[loc.code]}
				dir={loc.direction}
			/>
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
	.loc-tag {
		font-family: 'Fira Mono', monospace;
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		color: var(--text-soft);
		text-align: right;
	}
</style>
