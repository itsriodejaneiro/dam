<script lang="ts">
	import { LogIn, LogOut } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { auth } from '$lib/services/auth.svelte';
	import { m } from '$lib/i18n';
	import ConfirmDialog from './ConfirmDialog.svelte';

	const PROTECTED_PREFIXES = ['/admin', '/ds'];

	let confirmOpen = $state(false);

	function handleClick() {
		if (auth.isLoggedIn) {
			confirmOpen = true;
		} else {
			goto('/login');
		}
	}

	function doLogout() {
		auth.logout();
		confirmOpen = false;
		if (PROTECTED_PREFIXES.some((p) => page.url.pathname.startsWith(p))) goto('/');
	}
</script>

<button
	class="auth-btn"
	onclick={handleClick}
	type="button"
	aria-label={auth.isLoggedIn ? m('auth.logout_aria') : m('auth.login_aria')}
>
	<span class="icon">
		{#if auth.isLoggedIn}
			<LogOut size={14} strokeWidth={1.75} />
		{:else}
			<LogIn size={14} strokeWidth={1.75} />
		{/if}
	</span>
	<span>{auth.isLoggedIn ? m('auth.logout') : m('auth.login')}</span>
</button>

<ConfirmDialog
	bind:open={confirmOpen}
	title={m('auth.logout_title')}
	description={m('auth.logout_desc')}
	confirmLabel={m('auth.logout_aria')}
	cancelLabel={m('common.cancel')}
	variant="primary"
	onConfirm={doLogout}
/>

<style>
	.auth-btn {
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
	.auth-btn:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.icon {
		display: inline-flex;
		align-items: center;
		color: var(--accent);
	}
</style>
