<script lang="ts">
	import { onMount } from 'svelte';
	import { Palette } from '@lucide/svelte';
	import { m } from '$lib/i18n';
	import { applyPack, getActivePack, PACKS, type ThemePack } from '$lib/theme';

	// Theme pack selector. In production the pack comes from the deploy's config;
	// this switch lets the /ds showcase try every pack × light/dark.
	let pack = $state<ThemePack>(PACKS[0]);

	onMount(() => {
		pack = getActivePack();
	});

	function cycle() {
		const next = PACKS[(PACKS.indexOf(pack) + 1) % PACKS.length];
		pack = next;
		applyPack(next);
	}
</script>

<button
	class="pack-switch"
	onclick={cycle}
	type="button"
	aria-label={m('theme.switch_pack', pack)}
>
	<span class="icon">
		<Palette size={14} strokeWidth={1.75} />
	</span>
	<span>{pack}</span>
</button>

<style>
	.pack-switch {
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
	.pack-switch:hover {
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
