<script lang="ts">
	import { Check, Copy } from '@lucide/svelte';
	import { m } from '$lib/i18n';

	// A value to take away: a label, the text in a box that selects whole, and Copy. Used
	// for a token shown once and for an address an agent is pointed at.
	interface Props {
		label: string;
		text: string;
		/** The text is a secret: the box keeps it on one line and breaks it anywhere. */
		secret?: boolean;
	}

	let { label, text, secret = false }: Props = $props();

	let copied = $state(false);
	let failed = $state(false);
	let id = $props.id();

	async function copy() {
		failed = false;
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// no permission: the text stays selectable in the box
			failed = true;
		}
	}
</script>

<div class="copy-block">
	<span class="field-label" id={id}>{label}</span>
	<div class="row">
		<code class="box" class:secret aria-labelledby={id}>{text}</code>
		<button type="button" class="copy" onclick={copy} aria-label={m('tokens.copy')}>
			{#if copied}<Check size={14} />{:else}<Copy size={14} />{/if}
			{copied ? m('tokens.copied') : m('tokens.copy')}
		</button>
	</div>
	{#if failed}
		<p class="hint">{m('tokens.copy_failed')}</p>
	{/if}
</div>

<style>
	.copy-block {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.row {
		display: flex;
		align-items: stretch;
		gap: 0.5rem;
		min-width: 0;
	}
	.box {
		flex: 1 1 auto;
		min-width: 0;
		padding: 0.55rem 0.8rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		font-family: 'Fira Mono', monospace;
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--text);
		overflow-wrap: anywhere;
		user-select: all;
	}
	.box.secret {
		word-break: break-all;
	}
	.copy {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0 0.9rem;
		background: transparent;
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		color: var(--text);
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}
	.copy:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.hint {
		margin-top: 0.4rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		color: var(--text-muted);
	}
</style>
