<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { AppMeta, Button, SettingsFields } from '$lib/components';
	import { auth } from '$lib/services/auth.svelte';
	import { pb } from '$lib/services/pb';
	import { m, type MessageKey } from '$lib/i18n';

	let { data, form } = $props();

	let running = $state(false);
	let resetting = $state(false);
	let confirmText = $state('');
	let logs = $state<string[]>([]);
	let failed = $state(false);
	let termEl = $state<HTMLElement | null>(null);

	// Only a superuser configures or resets; without a login, go to login and come back.
	onMount(() => {
		if (browser && !auth.isLoggedIn) goto('/login?redirect=/setup');
	});

	let token = $derived(auth.isLoggedIn ? pb.authStore.token : '');
	let canReset = $derived(confirmText.trim() === data.confirmPhrase);

	// Auto-scrolls the terminal when a new line arrives.
	$effect(() => {
		logs.length;
		if (termEl) termEl.scrollTop = termEl.scrollHeight;
	});

	async function runSetup(e: SubmitEvent) {
		e.preventDefault();
		const body = new FormData(e.currentTarget as HTMLFormElement);
		body.set('token', token);
		running = true;
		failed = false;
		logs = [];
		try {
			const res = await fetch('/setup/run', { method: 'POST', body });
			if (res.status === 400) {
				failed = true;
				logs = ['✗ ' + m((await res.text()) as MessageKey)];
				return;
			}
			if (!res.ok || !res.body) {
				failed = true;
				logs = [...logs, `✗ ${res.status} ${res.statusText}`];
				return;
			}
			const reader = res.body.getReader();
			const dec = new TextDecoder();
			let buffer = '';
			let ok = false;
			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				buffer += dec.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';
				for (const line of lines) {
					if (line === '__DONE__') ok = true;
					else if (line.startsWith('__ERROR__')) {
						failed = true;
						logs = [...logs, '✗ ' + line.slice(9).trim()];
					} else if (line) logs = [...logs, line];
				}
			}
			if (ok && !failed) {
				await goto('/maps', { invalidateAll: true });
				return;
			}
			failed = failed || !ok;
		} catch (e) {
			failed = true;
			logs = [...logs, '✗ ' + (e instanceof Error ? e.message : 'network error')];
		} finally {
			running = false;
		}
	}

	function onResetSubmit() {
		resetting = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			resetting = false;
		};
	}
</script>

<main>
	<section class="setup">
		<AppMeta section="setup" />
		<div class="wrap">
			<h1>{m('setup.title')}</h1>

			{#if data.unreachable}
				<p class="error">{m('setup.error')}</p>
			{:else if !auth.isLoggedIn}
				<p class="lede">{m('setup.login_required')}</p>
			{:else if !data.configured}
				<!-- EMPTY PROJECT → configure (streaming + terminal) -->
				<p class="lede">{m('setup.lede')}</p>
				<p class="lede">{m('setup.identity')}</p>

				<!-- hidden, not removed: a failed run keeps what was typed -->
				<form onsubmit={runSetup} hidden={running || (logs.length > 0 && !failed)}>
					<SettingsFields settings={data.settings} />
					<div class="actions">
						<Button type="submit" loading={running}>{m('setup.button')}</Button>
					</div>
				</form>

				{#if running || logs.length > 0}
					<div class="terminal" class:failed bind:this={termEl}>
						{#each logs as line, i (i)}<div class="line">{line}</div>{/each}
						{#if running}<div class="line cursor">▍</div>{/if}
					</div>
				{/if}

				{#if failed}
					<p class="error">{m('setup.error')}</p>
				{/if}
			{:else}
				<!-- CONFIGURED PROJECT → app + danger zone -->
				<p class="lede">{m('setup.configured')}</p>
				<a class="go" href="/maps">{m('setup.go_to_app')} →</a>

				<div class="danger">
					<h2>{m('setup.danger_title')}</h2>
					<p class="danger-desc">{m('setup.danger_desc')}</p>
					<form method="POST" action="?/reset" use:enhance={onResetSubmit}>
						<input type="hidden" name="token" value={token} />
						<input type="hidden" name="confirm" value={confirmText} />
						<label class="field-label" for="confirm">
							{m('setup.reset_confirm', data.confirmPhrase)}
						</label>
						<input
							id="confirm"
							class="input"
							type="text"
							autocomplete="off"
							bind:value={confirmText}
							placeholder={data.confirmPhrase}
						/>
						<Button type="submit" variant="danger" loading={resetting} disabled={!canReset}>
							{m('setup.reset_button')}
						</Button>
					</form>
					{#if form?.error}
						<p class="error">{m('setup.reset_error')}</p>
					{/if}
				</div>
			{/if}
		</div>
	</section>
</main>

<style>
	main {
		max-width: 1240px;
		margin: 0 auto;
		padding: 4rem 2.5rem 6rem;
	}
	.setup {
		padding: 4rem 0 2rem;
		display: grid;
		grid-template-columns: 5rem 1fr;
		gap: 1.5rem;
	}
	.wrap {
		max-width: 560px;
	}
	h1 {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 300;
		letter-spacing: -0.03em;
		line-height: 1.05;
	}
	.lede {
		margin-top: 1rem;
		color: var(--text-muted);
	}
	form:not([hidden]) {
		display: block;
		margin-top: 2rem;
	}
	.actions {
		margin-top: 1.5rem;
	}
	.terminal {
		margin-top: 1.5rem;
		max-height: 320px;
		overflow-y: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		padding: 0.9rem 1rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.75rem;
		line-height: 1.7;
		color: var(--text-muted);
	}
	.terminal.failed {
		border-color: var(--danger);
	}
	.line {
		white-space: pre-wrap;
		word-break: break-word;
	}
	.cursor {
		color: var(--accent);
		animation: blink 1s step-end infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
	.go {
		display: inline-block;
		margin-top: 1rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		color: var(--accent);
		text-decoration: none;
	}
	.go:hover {
		text-decoration: underline;
	}
	.danger {
		margin-top: 3rem;
		padding: 1.4rem;
		border: 1px solid var(--danger);
		border-radius: 2px;
		background: var(--danger-soft);
	}
	.danger h2 {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--danger);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.danger-desc {
		margin-top: 0.6rem;
		color: var(--text-muted);
		font-size: 0.88rem;
		line-height: 1.5;
	}
	.danger form {
		margin-top: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: flex-start;
	}
	.field-label {
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}
	.error {
		margin-top: 1.5rem;
		color: var(--danger);
		font-family: 'Fira Mono', monospace;
		font-size: 0.78rem;
	}
	@media (max-width: 900px) {
		main {
			padding: 2rem 1.2rem 4rem;
		}
		.setup {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
	}
</style>
