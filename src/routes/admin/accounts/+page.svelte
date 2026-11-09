<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Plus } from '@lucide/svelte';
	import type { ClientResponseError } from 'pocketbase';
	import { AppMeta, Button, ConfirmDialog, Dialog } from '$lib/components';
	import { accounts, auth, type Account } from '$lib/services';
	import { m } from '$lib/i18n';

	$effect(() => {
		if (browser && !auth.isLoggedIn) goto(auth.loginPath());
	});

	let list = $state<Account[]>([]);
	let loading = $state(true);
	let pageError = $state('');

	// One dialog: with no target it creates an account, with one it sets that account's password.
	let dialogOpen = $state(false);
	let target = $state<Account | null>(null);
	let email = $state('');
	let password = $state('');
	let saving = $state(false);
	let error = $state('');

	let confirmOpen = $state(false);
	let pendingRemove = $state<Account | null>(null);
	let removing = $state(false);

	async function refresh() {
		list = await accounts.getAccounts();
	}

	onMount(async () => {
		try {
			await refresh();
		} catch {
			pageError = m('accounts.error.load');
		} finally {
			loading = false;
		}
	});

	function openDialog(account: Account | null) {
		target = account;
		email = '';
		password = '';
		error = '';
		dialogOpen = true;
	}

	function roleLabel(account: Account): string {
		return account.role ? m(`accounts.role.${account.role}` as const) : m('accounts.role.none');
	}

	function saveError(err: unknown): string {
		const fields = (err as ClientResponseError).response?.data ?? {};
		if (fields.email?.code === 'validation_not_unique') return m('accounts.error.email_taken');
		if (fields.password) return m('accounts.error.password');
		return m('accounts.error.save');
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		saving = true;
		try {
			if (target) {
				await accounts.setAccountPassword(target.id, password);
				// A new password voids the account's tokens, this session's included.
				if (target.id === auth.userId) await auth.login(target.email, password);
			} else {
				await accounts.createAccount(email, password);
			}
			dialogOpen = false;
			await refresh();
		} catch (err) {
			error = saveError(err);
		} finally {
			saving = false;
		}
	}

	function askRemove(account: Account) {
		pendingRemove = account;
		pageError = '';
		confirmOpen = true;
	}

	async function confirmRemove() {
		if (!pendingRemove) return;
		removing = true;
		try {
			await accounts.deleteAccount(pendingRemove.id);
			await refresh();
		} catch {
			pageError = m('accounts.error.remove');
		} finally {
			confirmOpen = false;
			pendingRemove = null;
			removing = false;
		}
	}
</script>

{#if auth.isLoggedIn}
	<main class="admin-page">
		<section class="admin-hero">
			<AppMeta section={m('meta.admin')} />
			<div class="admin-head">
				<div>
					<h1>{m('accounts.title')}</h1>
					<p class="admin-lede">{m('accounts.lede')}</p>
				</div>
				<Button onclick={() => openDialog(null)}><Plus size={14} /> {m('accounts.new')}</Button>
			</div>
		</section>

		<section class="admin-block">
			{#if pageError}
				<p class="admin-error">{pageError}</p>
			{/if}
			{#if loading}
				<p class="admin-loading">
					<span class="spinner" aria-hidden="true"></span>
					{m('common.loading')}
				</p>
			{:else if list.length > 0}
				<table class="admin-table">
					<thead>
						<tr>
							<th>{m('accounts.field.email')}</th>
							<th class="fit">{m('accounts.col_role')}</th>
							<th class="num"></th>
						</tr>
					</thead>
					<tbody>
						{#each list as account (account.id)}
							<tr>
								<td>
									<strong>{account.email}</strong>
									{#if account.id === auth.userId}
										<span class="admin-note">{m('accounts.you')}</span>
									{/if}
								</td>
								<td class="fit">{roleLabel(account)}</td>
								<td class="num">
									<!-- PocketBase refuses to save a row without its required role. -->
									{#if account.role}
										<button class="admin-action" onclick={() => openDialog(account)}>
											{m('accounts.set_password')}
										</button>
									{/if}
									{#if account.id !== auth.userId}
										<button class="admin-action danger" onclick={() => askRemove(account)}>
											{m('common.remove_lower')}
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else if !pageError}
				<p class="admin-empty">{m('accounts.empty')}</p>
			{/if}
		</section>
	</main>
{/if}

<Dialog
	bind:open={dialogOpen}
	title={target ? m('accounts.dialog.password', target.email) : m('accounts.new')}
	dismissable={false}
>
	<form class="admin-form" onsubmit={submit}>
		{#if !target}
			<div class="admin-field">
				<label class="field-label" for="account-email">{m('accounts.field.email')}</label>
				<input
					id="account-email"
					class="input"
					type="email"
					autocomplete="off"
					bind:value={email}
					required
				/>
			</div>
		{/if}
		<div class="admin-field">
			<label class="field-label" for="account-password">{m('accounts.field.password')}</label>
			<input
				id="account-password"
				class="input"
				type="password"
				autocomplete="new-password"
				minlength="8"
				placeholder={m('accounts.field.password_hint')}
				bind:value={password}
				required
			/>
		</div>
		{#if error}
			<p class="admin-error">{error}</p>
		{/if}
		<div class="admin-form-actions">
			<Button type="button" variant="secondary" onclick={() => (dialogOpen = false)}>
				{m('common.cancel')}
			</Button>
			<Button type="submit" loading={saving}>
				{target ? m('common.save') : m('common.create')}
			</Button>
		</div>
	</form>
</Dialog>

<ConfirmDialog
	bind:open={confirmOpen}
	title={m('accounts.confirm_remove_title')}
	description={pendingRemove ? m('accounts.confirm_remove_desc', pendingRemove.email) : ''}
	confirmLabel={m('common.remove')}
	cancelLabel={m('common.cancel')}
	loading={removing}
	onConfirm={confirmRemove}
	onCancel={() => (pendingRemove = null)}
/>
