<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';
	import { m } from '$lib/i18n';

	interface Props {
		open: boolean;
		title?: string;
		width?: string;
		dismissable?: boolean;
		onclose?: () => void;
		children: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		width = '560px',
		dismissable = true,
		onclose,
		children
	}: Props = $props();

	let dialogEl: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		else if (!open && dialogEl.open) dialogEl.close();
	});

	// `<dialog>` has no native backdrop-click close: check whether the target is the element itself
	// (the dialog's backdrop reports as the element, not as ::backdrop).
	function onBackdropClick(e: MouseEvent) {
		if (!dismissable) return;
		if (e.target === dialogEl) close();
	}

	// Blocks the native ESC when the dialog is not dismissable, so text typed
	// into create/edit forms is not lost by accident.
	function onCancel(e: Event) {
		if (!dismissable) e.preventDefault();
	}

	function close() {
		open = false;
		onclose?.();
	}

	// `close` arrives a task after `dialog.close()`: a dialog reopened in between is not closing.
	function onNativeClose() {
		if (!dialogEl?.open) close();
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={onNativeClose}
	oncancel={onCancel}
	onclick={onBackdropClick}
	style="--dialog-width: {width}"
>
	<div class="frame">
		{#if title}
			<header>
				<h2>{title}</h2>
				<button class="close" type="button" onclick={close} aria-label={m('common.close')}>
					<X size={16} />
				</button>
			</header>
		{/if}
		<div class="body">
			<div class="body-inner">
				{@render children()}
			</div>
		</div>
	</div>
</dialog>

<style>
	dialog {
		/* `position: fixed` + `inset: 0` + `margin: auto` centres on both axes,
		   overriding the global `margin: 0` reset in base.css. */
		position: fixed;
		inset: 0;
		margin: auto;
		padding: 0;
		border: 1px solid var(--border-strong);
		background: var(--bg-elevated);
		color: var(--text);
		border-radius: 3px;
		width: min(var(--dialog-width), calc(100vw - 2rem));
		max-height: calc(100vh - 4rem);
		overflow: hidden;
		box-shadow: var(--shadow);
	}
	dialog::backdrop {
		background: color-mix(in srgb, var(--bg-sunken) 70%, transparent);
		backdrop-filter: blur(2px);
	}
	.frame {
		display: flex;
		flex-direction: column;
		max-height: calc(100vh - 4rem);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.1rem 1.3rem;
		border-bottom: 1px dashed var(--border);
	}
	header h2 {
		font-family: 'Fira Mono', monospace;
		font-size: 0.78rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-soft);
		font-weight: 500;
	}
	.close {
		background: transparent;
		border: 0;
		padding: 0.3rem;
		cursor: pointer;
		color: var(--text-soft);
		display: inline-flex;
		border-radius: 2px;
		transition: color 0.15s, background 0.15s;
	}
	.close:hover {
		color: var(--text);
		background: var(--bg-sunken);
	}
	.body {
		overflow-y: auto;
		flex: 1;
		min-height: 0;
		scrollbar-width: thin;
		scrollbar-color: var(--border-strong) transparent;
	}
	.body::-webkit-scrollbar {
		width: 6px;
	}
	.body::-webkit-scrollbar-track {
		background: transparent;
	}
	.body::-webkit-scrollbar-thumb {
		background: var(--border-strong);
		border-radius: 3px;
	}
	.body::-webkit-scrollbar-thumb:hover {
		background: var(--text-soft);
	}
	.body-inner {
		padding: 1.4rem 1.3rem 1.5rem;
	}
</style>
