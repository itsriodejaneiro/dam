<script module lang="ts">
	import { applyMode, getStoredMode, type Mode } from '$lib/theme';

	// Module scope: a page can show several toggles at once, and they all follow one mode.
	let mode = $state<Mode>('dark');
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Sun, Moon } from '@lucide/svelte';
	import { m } from '$lib/i18n';

	onMount(() => {
		mode = getStoredMode();
	});

	function toggle() {
		mode = mode === 'dark' ? 'light' : 'dark';
		applyMode(mode);
	}
</script>

<button
	class="theme-toggle"
	onclick={toggle}
	type="button"
	aria-label={mode === 'dark' ? m('theme.to_light') : m('theme.to_dark')}
>
	<span class="icon">
		{#if mode === 'dark'}
			<Moon size={14} strokeWidth={1.75} />
		{:else}
			<Sun size={14} strokeWidth={1.75} />
		{/if}
	</span>
	<span>{mode === 'dark' ? m('theme.mode_dark') : m('theme.mode_light')}</span>
</button>

<style>
	.theme-toggle {
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text);
		padding: 0.45rem 0.8rem;
		border-radius: 2px;
		cursor: pointer;
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		transition: all 0.15s;
	}
	.theme-toggle:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	/* Lucide inherits currentColor; this span owns the icon's colour. */
	.icon {
		display: inline-flex;
		align-items: center;
		color: var(--accent);
	}
</style>
