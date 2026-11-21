<script lang="ts">
	import { page } from '$app/state';
	import { ChevronDown, Menu, X } from '@lucide/svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import LocaleSwitch from './LocaleSwitch.svelte';
	import AuthButton from './AuthButton.svelte';
	import SettingsMenu from './SettingsMenu.svelte';
	import DropdownMenu from './DropdownMenu.svelte';
	import type { MenuItem } from './types';
	import { auth } from '$lib/services/auth.svelte';
	import { markUrl, placeName } from '$lib/settings';
	import { localesState, m, type MessageKey } from '$lib/i18n';

	interface Props {
		subtitle?: string;
	}

	let { subtitle }: Props = $props();

	let settings = $derived(page.data.settings);
	let mark = $derived(markUrl(settings));

	// The admin pages, in the order of the Admin menu. `exact` keeps a page's children
	// (`/admin/journeys/<id>`) under their list; the others have none.
	const ADMIN_PAGES: { href: string; key: MessageKey; exact?: boolean }[] = [
		{ href: '/admin/entities', key: 'nav.entities', exact: true },
		{ href: '/admin/connections', key: 'nav.connections', exact: true },
		{ href: '/admin/maps', key: 'nav.maps', exact: true },
		{ href: '/admin/journeys', key: 'nav.journeys' },
		{ href: '/admin/categories', key: 'nav.categories', exact: true },
		{ href: '/admin/home', key: 'nav.home' },
		{ href: '/admin/settings', key: 'nav.settings', exact: true },
		{ href: '/admin/accounts', key: 'nav.accounts', exact: true }
	];

	let currentPath = $derived(page.url.pathname);
	let adminItems = $derived<MenuItem[]>(
		ADMIN_PAGES.map((p) => ({
			href: p.href,
			label: m(p.key),
			active: p.exact ? currentPath === p.href : currentPath.startsWith(p.href)
		}))
	);
	let activeAdmin = $derived(adminItems.find((item) => item.active));
	// "Admin: journeys" on an admin page, so the person knows where they are without opening it.
	let adminLabel = $derived(activeAdmin ? m('nav.admin_page', activeAdmin.label) : m('nav.admin'));

	let menuOpen = $state(false);
	// The drawer's Admin group starts open on an admin page, closed elsewhere.
	let adminGroupOpen = $state(false);

	// Closes the menu whenever the route changes (click on an internal link).
	$effect(() => {
		currentPath;
		menuOpen = false;
		adminGroupOpen = !!activeAdmin;
	});

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && menuOpen) menuOpen = false;
	}
</script>

<svelte:window onkeydown={onKeydown} />

<header class="site" class:menu-open={menuOpen}>
	<a class="brand" href="/">
		{#if mark}
			<img class="mark" src={mark} alt={placeName(settings, localesState.current) ?? ''} />
		{/if}
		<h1>
			{m('nav.brand')}{#if subtitle}<span class="sub">/ {subtitle}</span>{/if}
		</h1>
	</a>

	<nav class="center">
		<a href="/" class:active={page.url.pathname === '/'}>{m('nav.start')}</a>
		<a href="/maps" class:active={page.url.pathname.startsWith('/maps')}>{m('nav.map')}</a>
		{#if settings.journeys}
			<a href="/journeys" class:active={page.url.pathname.startsWith('/journeys')}
				>{m('nav.journeys')}</a
			>
		{/if}
		{#if auth.isAdmin}
			<span class="nav-sep"></span>
			<DropdownMenu label={adminLabel} items={adminItems} variant="nav" active={!!activeAdmin} chevron align="start">
				{#snippet trigger()}{adminLabel}{/snippet}
			</DropdownMenu>
		{/if}
	</nav>

	<div class="right">
		<LocaleSwitch />
		<ThemeToggle />
		<AuthButton />
		<SettingsMenu />
	</div>

	<button
		type="button"
		class="hamburger"
		aria-label={menuOpen ? m('nav.menu_close') : m('nav.menu_open')}
		aria-expanded={menuOpen}
		aria-controls="mobile-menu"
		onclick={() => (menuOpen = !menuOpen)}
	>
		{#if menuOpen}
			<X size={18} strokeWidth={1.75} />
		{:else}
			<Menu size={18} strokeWidth={1.75} />
		{/if}
	</button>

	{#if menuOpen}
		<button
			type="button"
			class="backdrop"
			aria-label={m('nav.menu_close')}
			onclick={() => (menuOpen = false)}
		></button>

		<aside id="mobile-menu" class="drawer">
			<nav class="drawer-nav">
				<a href="/" class:active={page.url.pathname === '/'}>{m('nav.start')}</a>
				<a href="/maps" class:active={page.url.pathname.startsWith('/maps')}>{m('nav.map')}</a>
				{#if settings.journeys}
					<a href="/journeys" class:active={page.url.pathname.startsWith('/journeys')}
						>{m('nav.journeys')}</a
					>
				{/if}
				{#if auth.isAdmin}
					<div class="drawer-sep"></div>
					<button
						type="button"
						class="drawer-group"
						class:active={!!activeAdmin}
						aria-expanded={adminGroupOpen}
						aria-controls="mobile-admin"
						onclick={() => (adminGroupOpen = !adminGroupOpen)}
					>
						{adminLabel}
						<span class="chevron" class:up={adminGroupOpen}><ChevronDown size={14} strokeWidth={2} /></span>
					</button>
					{#if adminGroupOpen}
						<div id="mobile-admin" class="drawer-sub">
							{#each adminItems as item (item.href)}
								<a href={item.href} class:active={item.active}>{item.label}</a>
							{/each}
						</div>
					{/if}
				{/if}
			</nav>
			<div class="drawer-sep"></div>
			<div class="drawer-controls">
				<LocaleSwitch />
				<ThemeToggle />
				<AuthButton />
				<SettingsMenu />
			</div>
		</aside>
	{/if}
</header>

<style>
	.site {
		position: sticky;
		top: 0;
		z-index: 50;
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid var(--border);
		padding: 1.1rem 2.5rem;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 1.5rem;
	}
	.brand {
		white-space: nowrap;
		display: flex;
		align-items: baseline;
		gap: 0.85rem;
		text-decoration: none;
		color: inherit;
	}
	.mark {
		align-self: center;
		display: block;
		height: 1.35rem;
		width: auto;
		border-radius: 2px;
		box-shadow: 0 0 0 1px var(--border-strong);
	}
	.brand h1 {
		font-size: 0.95rem;
		font-weight: 500;
		letter-spacing: 0.01em;
	}
	.sub {
		color: var(--text-muted);
		font-weight: 400;
		margin-left: 0.4rem;
	}

	.center {
		display: flex;
		gap: 1.5rem;
		align-items: center;
		justify-self: center;
	}
	.center a {
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 0.15s;
	}
	.center a:hover,
	.center a.active {
		color: var(--text);
	}
	.center a.active {
		color: var(--accent);
	}
	.nav-sep {
		width: 1px;
		height: 14px;
		background: var(--border-strong);
	}

	.right {
		white-space: nowrap;
		justify-self: end;
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}

	.hamburger {
		display: none;
		justify-self: end;
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text);
		padding: 0.45rem;
		border-radius: 2px;
		cursor: pointer;
		line-height: 0;
		transition: all 0.15s;
	}
	.hamburger:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.backdrop {
		display: none;
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		height: 100vh;
		background: color-mix(in srgb, var(--bg-sunken) 60%, transparent);
		backdrop-filter: blur(2px);
		border: 0;
		padding: 0;
		cursor: default;
		z-index: 1;
	}

	.drawer {
		display: none;
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--bg-elevated);
		border-bottom: 1px solid var(--border);
		box-shadow: var(--shadow);
		padding: 0.6rem 1.2rem 1rem;
		z-index: 2;
	}
	.drawer-nav {
		display: flex;
		flex-direction: column;
	}
	.drawer-nav a {
		font-family: 'Fira Mono', monospace;
		font-size: 0.78rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
		text-decoration: none;
		padding: 0.75rem 0.25rem;
		border-bottom: 1px dashed var(--border);
		transition: color 0.15s;
	}
	.drawer-nav a:last-child {
		border-bottom: 0;
	}
	.drawer-nav a:hover {
		color: var(--text);
	}
	.drawer-nav a.active {
		color: var(--accent);
	}
	.drawer-group {
		background: transparent;
		border: 0;
		border-bottom: 1px dashed var(--border);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: 'Fira Mono', monospace;
		font-size: 0.78rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
		padding: 0.75rem 0.25rem;
		transition: color 0.15s;
	}
	.drawer-group:hover {
		color: var(--text);
	}
	.drawer-group.active {
		color: var(--accent);
	}
	.drawer-group .chevron {
		display: inline-flex;
		transition: transform 0.15s;
	}
	.drawer-group .chevron.up {
		transform: rotate(180deg);
	}
	.drawer-sub {
		display: flex;
		flex-direction: column;
		padding-left: 1rem;
	}
	.drawer-sub a:last-child {
		border-bottom: 1px dashed var(--border);
	}
	.drawer-sep {
		height: 1px;
		background: var(--border);
		margin: 0.5rem 0;
	}
	.drawer-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.7rem;
		padding-top: 0.5rem;
	}

	/* Tighter first, the drawer when even that does not fit. Measured signed in, in French, on
	   the admin page with the longest label: the loose layout fits down to 1002px and the tight
	   one to 922px; the breakpoints keep a margin for Portuguese, two letters longer. */
	@media (max-width: 1020px) {
		.site {
			padding-inline: 1.5rem;
			gap: 1rem;
		}
		.center {
			gap: 0.9rem;
		}
		.center a {
			letter-spacing: 0.06em;
		}
	}

	@media (max-width: 940px) {
		.site {
			grid-template-columns: 1fr auto;
			padding: 0.9rem 1.2rem;
		}
		.center,
		.right {
			display: none;
		}
		.hamburger {
			display: inline-flex;
		}
		.site.menu-open .backdrop,
		.site.menu-open .drawer {
			display: block;
		}
		.site.menu-open .drawer-nav {
			display: flex;
		}
		.site.menu-open .drawer-controls {
			display: flex;
		}
	}
</style>
