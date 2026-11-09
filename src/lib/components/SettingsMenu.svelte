<script lang="ts">
	import { EllipsisVertical } from '@lucide/svelte';
	import { page } from '$app/state';
	import { auth } from '$lib/services/auth.svelte';
	import { m } from '$lib/i18n';

	let open = $state(false);
	let el = $state<HTMLElement | null>(null);

	// Closes on route change.
	let path = $derived(page.url.pathname);
	$effect(() => {
		path;
		open = false;
	});

	function onWindowClick(e: MouseEvent) {
		if (open && el && !el.contains(e.target as Node)) open = false;
	}
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKeydown} />

{#if auth.isLoggedIn}
	<div class="settings" bind:this={el}>
		<button
			class="trigger"
			type="button"
			onclick={() => (open = !open)}
			aria-haspopup="menu"
			aria-expanded={open}
			aria-label={m('settings.menu')}
		>
			<EllipsisVertical size={16} strokeWidth={1.75} />
		</button>
		{#if open}
			<div class="menu" role="menu">
				<a class="item" role="menuitem" href="/ds">{m('settings.design_system')}</a>
				{#if auth.isSuperuser}
					<a class="item" role="menuitem" href="/setup">{m('settings.setup')}</a>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.settings {
		position: relative;
		display: inline-flex;
	}
	.trigger {
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text);
		padding: 0.45rem;
		border-radius: 2px;
		cursor: pointer;
		line-height: 0;
		display: inline-flex;
		align-items: center;
		transition: all 0.15s;
	}
	.trigger:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.menu {
		position: absolute;
		top: calc(100% + 0.4rem);
		right: 0;
		min-width: 190px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 2px;
		box-shadow: var(--shadow);
		padding: 0.35rem;
		z-index: 60;
		display: flex;
		flex-direction: column;
	}
	.item {
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
		text-decoration: none;
		padding: 0.55rem 0.7rem;
		border-radius: 2px;
		transition: all 0.12s;
	}
	.item:hover {
		color: var(--text);
		background: var(--bg-sunken);
	}
</style>
