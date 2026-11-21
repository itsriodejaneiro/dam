<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Plus } from '@lucide/svelte';
	import { MCP_PATH, tokenHint } from '$lib/api';
	import { AppMeta, Button, ConfirmDialog, CopyBlock, Dialog } from '$lib/components';
	import { auth, pb, requireAdmin, tokens, type ApiTokenRow, type ApiWriteRow } from '$lib/services';
	import { localesState, m, type MessageKey } from '$lib/i18n';

	requireAdmin();

	const MANUAL = 'https://itsriodejaneiro.github.io/dam/connect-an-agent';

	let list = $state<ApiTokenRow[]>([]);
	let loading = $state(true);
	let pageError = $state('');

	// Creating: the name, then the token, which exists on this screen alone until Done.
	let createOpen = $state(false);
	let name = $state('');
	let creating = $state(false);
	let createError = $state('');
	let issued = $state<{ name: string; token: string } | null>(null);
	let issuedOpen = $state(false);

	let confirmOpen = $state(false);
	let pendingRemove = $state<ApiTokenRow | null>(null);
	let removing = $state(false);
	let removeForm = $state<HTMLFormElement>();

	// The writes of one token, by its prefix: the lines outlive the token.
	let writesOf = $state<ApiTokenRow | null>(null);
	let writes = $state<ApiWriteRow[]>([]);
	let writesOpen = $state(false);
	let writesLoading = $state(false);

	let mcpUrl = $derived(`${page.url.origin}${MCP_PATH}`);

	async function refresh() {
		list = await tokens.getTokens();
	}

	onMount(async () => {
		try {
			await refresh();
		} catch {
			pageError = m('tokens.error.load');
		} finally {
			loading = false;
		}
	});

	const when = (iso: string) => (iso ? new Date(iso).toLocaleString(localesState.current, { dateStyle: 'medium', timeStyle: 'short' }) : '');
	const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString(localesState.current, { dateStyle: 'medium' }) : '');

	function openCreate() {
		name = '';
		createError = '';
		createOpen = true;
	}

	const onCreate: SubmitFunction = ({ formData }) => {
		formData.set('token', pb.authStore.token);
		creating = true;
		const label = name.trim();
		return async ({ result }) => {
			creating = false;
			if (result.type === 'success') {
				issued = { name: label, token: (result.data as { created: { token: string } }).created.token };
				createOpen = false;
				issuedOpen = true;
				await refresh();
			} else if (result.type === 'failure') {
				createError = m((result.data as { error: MessageKey }).error);
			} else {
				createError = m('tokens.error.save');
			}
		};
	};

	// Done closes the dialog, and the token leaves the page with it.
	$effect(() => {
		if (!issuedOpen) issued = null;
	});

	function askRemove(token: ApiTokenRow) {
		pendingRemove = token;
		pageError = '';
		confirmOpen = true;
	}

	const onDelete: SubmitFunction = ({ formData }) => {
		formData.set('token', pb.authStore.token);
		removing = true;
		return async ({ result }) => {
			if (result.type !== 'success') pageError = m('tokens.error.remove');
			await refresh();
			confirmOpen = false;
			pendingRemove = null;
			removing = false;
		};
	};

	async function showWrites(token: ApiTokenRow) {
		writesOf = token;
		writes = [];
		writesOpen = true;
		writesLoading = true;
		try {
			writes = await tokens.getWrites(token.prefix);
		} catch {
			pageError = m('tokens.error.load');
			writesOpen = false;
		} finally {
			writesLoading = false;
		}
	}

	const actionLabel = (action: ApiWriteRow['action']) => m(`tokens.action.${action}` as const);
	const previousText = (value: unknown) => JSON.stringify(value, null, 2);
</script>

{#if auth.isAdmin}
	<main class="admin-page">
		<section class="admin-hero">
			<AppMeta section={m('meta.admin')} />
			<div class="admin-head">
				<div>
					<h1>{m('tokens.title')}</h1>
					<p class="admin-lede">{m('tokens.lede')}</p>
					<p class="admin-lede">{m('tokens.personal')}</p>
				</div>
				<Button onclick={openCreate}><Plus size={14} /> {m('tokens.new')}</Button>
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
							<th>{m('tokens.field.name')}</th>
							<th class="fit">{m('tokens.col_token')}</th>
							<th>{m('tokens.col_created_by')}</th>
							<th class="fit">{m('tokens.col_last_used')}</th>
							<th class="num"></th>
						</tr>
					</thead>
					<tbody>
						{#each list as token (token.id)}
							<tr>
								<td><strong>{token.name}</strong></td>
								<td class="fit"><span class="mono hint">{tokenHint(token.prefix)}</span></td>
								<td>
									{token.created_by}
									<span class="admin-note">{day(token.created)}</span>
								</td>
								<td class="fit">
									{#if token.last_used_at}{when(token.last_used_at)}{:else}<span class="admin-note">{m('tokens.never')}</span>{/if}
								</td>
								<td class="num">
									<button class="admin-action" onclick={() => showWrites(token)}>{m('tokens.writes')}</button>
									<button class="admin-action danger" onclick={() => askRemove(token)}>{m('common.remove_lower')}</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else if !pageError}
				<p class="admin-empty">{m('tokens.empty')}</p>
			{/if}
		</section>
	</main>
{/if}

<Dialog bind:open={createOpen} title={m('tokens.new')} dismissable={false}>
	<form class="admin-form" method="POST" action="?/create" use:enhance={onCreate}>
		<div class="admin-field">
			<label class="field-label" for="token-name">{m('tokens.field.name')}</label>
			<input id="token-name" class="input" name="name" type="text" maxlength="60" autocomplete="off" placeholder={m('tokens.field.name_hint')} bind:value={name} required />
		</div>
		{#if createError}
			<p class="admin-error">{createError}</p>
		{/if}
		<div class="admin-form-actions">
			<Button type="button" variant="secondary" onclick={() => (createOpen = false)}>{m('common.cancel')}</Button>
			<Button type="submit" loading={creating} disabled={!name.trim()}>{m('common.create')}</Button>
		</div>
	</form>
</Dialog>

{#if issued}
	<Dialog bind:open={issuedOpen} title={m('tokens.created_title')} width="640px">
		<div class="issued">
			<p class="issued-warning">{m('tokens.created_body')}</p>
			<CopyBlock label={m('tokens.created_label')} text={issued.token} secret />
			<CopyBlock label={m('tokens.mcp_label')} text={mcpUrl} />
			<p class="issued-next">
				{m('tokens.created_next')}
				<a href={MANUAL} target="_blank" rel="noopener noreferrer">{m('tokens.connect_link')}</a>
			</p>
			<div class="admin-form-actions">
				<Button onclick={() => (issuedOpen = false)}>{m('tokens.done')}</Button>
			</div>
		</div>
	</Dialog>
{/if}

<ConfirmDialog
	bind:open={confirmOpen}
	title={m('tokens.confirm_remove_title')}
	description={pendingRemove ? m('tokens.confirm_remove_desc', pendingRemove.name) : ''}
	confirmLabel={m('common.remove')}
	cancelLabel={m('common.cancel')}
	loading={removing}
	onConfirm={() => removeForm?.requestSubmit()}
	onCancel={() => (pendingRemove = null)}
/>
<form method="POST" action="?/delete" bind:this={removeForm} use:enhance={onDelete} hidden>
	<input type="hidden" name="id" value={pendingRemove?.id ?? ''} />
</form>

{#if writesOf}
	<Dialog bind:open={writesOpen} title={m('tokens.writes_title', writesOf.name)} width="760px">
		{#if writesLoading}
			<p class="admin-loading"><span class="spinner" aria-hidden="true"></span>{m('common.loading')}</p>
		{:else if writes.length === 0}
			<p class="admin-empty">{m('tokens.writes_empty')}</p>
		{:else}
			<table class="admin-table writes">
				<thead>
					<tr>
						<th class="fit">{m('tokens.writes_col_when')}</th>
						<th>{m('tokens.writes_col_what')}</th>
						<th>{m('tokens.writes_col_record')}</th>
					</tr>
				</thead>
				<tbody>
					{#each writes as w (w.id)}
						<tr>
							<td class="fit">{when(w.created)}</td>
							<td>
								{#if w.tool}
									<span class="mono">{w.tool}</span> {actionLabel(w.action)}
								{:else}
									{actionLabel(w.action)} <span class="admin-note">{m('tokens.by_admin', w.actor)}</span>
								{/if}
							</td>
							<td>
								<span class="mono">{w.collection}/{w.record}</span>
								{#if w.previous != null}
									<details class="previous">
										<summary>{m('tokens.writes_previous')}</summary>
										<pre>{previousText(w.previous)}</pre>
									</details>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</Dialog>
{/if}

<style>
	.hint {
		font-size: 0.8rem;
		color: var(--text-muted);
	}
	.issued {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
	}
	.issued-warning {
		color: var(--text);
		font-size: 0.92rem;
	}
	.issued-next {
		font-size: 0.88rem;
		color: var(--text-muted);
	}
	.issued-next a {
		color: var(--accent);
	}
	.writes td {
		vertical-align: top;
		font-size: 0.85rem;
	}
	.previous {
		margin-top: 0.4rem;
	}
	.previous summary {
		cursor: pointer;
		font-family: 'Fira Mono', monospace;
		font-size: 0.68rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-soft);
	}
	.previous pre {
		margin-top: 0.4rem;
		max-height: 16rem;
		overflow: auto;
		padding: 0.6rem 0.8rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: 2px;
		font-size: 0.72rem;
		line-height: 1.45;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
