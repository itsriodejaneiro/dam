<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronDown } from '@lucide/svelte';
	import { page } from '$app/state';
	import type { MenuItem } from './types';

	interface Props {
		/** What the trigger is called by assistive tech; `trigger` draws it. */
		label: string;
		items: MenuItem[];
		/** The content of the trigger button, told whether the menu is open. */
		trigger: Snippet<[open: boolean]>;
		/** `outline` is the bordered button of the header's controls; `nav` reads like a nav link. */
		variant?: 'outline' | 'nav';
		/** Colors the trigger as the active nav link: one of the items is the open page. */
		active?: boolean;
		/** Draws a chevron after the trigger's content, turned up while the menu is open. */
		chevron?: boolean;
		/** Which edge of the trigger the menu lines up with. */
		align?: 'start' | 'end';
	}

	let { label, items, trigger, variant = 'outline', active = false, chevron = false, align = 'end' }: Props = $props();

	let open = $state(false);
	let el = $state<HTMLElement | null>(null);

	// Closes on route change: a click on an item is a navigation.
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

<div class="dropdown" bind:this={el}>
	<button
		class="trigger {variant}"
		class:active
		type="button"
		onclick={() => (open = !open)}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label={label}
	>
		{@render trigger(open)}
		{#if chevron}
			<span class="chevron" class:up={open}><ChevronDown size={12} strokeWidth={2} /></span>
		{/if}
	</button>
	{#if open}
		<div class="menu {align}" role="menu">
			{#each items as item (item.href)}
				<a class="item" class:active={item.active} role="menuitem" href={item.href}>{item.label}</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.dropdown {
		position: relative;
		display: inline-flex;
	}
	.trigger {
		background: transparent;
		border: 0;
		padding: 0;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		white-space: nowrap;
		line-height: 1;
		transition: all 0.15s;
	}
	.trigger.outline {
		border: 1px solid var(--border-strong);
		color: var(--text);
		padding: 0.45rem;
		border-radius: 2px;
		line-height: 0;
	}
	.trigger.outline:hover,
	.trigger.outline[aria-expanded='true'] {
		border-color: var(--accent);
		color: var(--accent);
	}
	.trigger.nav {
		color: var(--text-muted);
	}
	.trigger.nav:hover,
	.trigger.nav[aria-expanded='true'] {
		color: var(--text);
	}
	.trigger.nav.active {
		color: var(--accent);
	}
	.chevron {
		display: inline-flex;
		transition: transform 0.15s;
	}
	.chevron.up {
		transform: rotate(180deg);
	}
	.menu {
		position: absolute;
		top: calc(100% + 0.4rem);
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
	.menu.end {
		right: 0;
	}
	.menu.start {
		left: 0;
	}
	.item {
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
		text-decoration: none;
		white-space: nowrap;
		padding: 0.55rem 0.7rem;
		border-radius: 2px;
		transition: all 0.12s;
	}
	.item:hover {
		color: var(--text);
		background: var(--bg-sunken);
	}
	.item.active {
		color: var(--accent);
	}
</style>
