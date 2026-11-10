<script lang="ts">
	import { AlertTriangle } from '@lucide/svelte';
	import Dialog from './Dialog.svelte';
	import Button from './Button.svelte';
	import { m } from '$lib/i18n';

	type Variant = 'danger' | 'primary';

	interface Props {
		open: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: Variant;
		loading?: boolean;
		onConfirm: () => void | Promise<void>;
		onCancel?: () => void;
	}

	let {
		open = $bindable(false),
		title,
		description = '',
		confirmLabel,
		cancelLabel,
		variant = 'danger',
		loading = false,
		onConfirm,
		onCancel
	}: Props = $props();

	// Dialog calls onCancel as it closes.
	function cancel() {
		if (loading) return;
		open = false;
	}

	async function confirm() {
		await onConfirm();
	}
</script>

<Dialog bind:open onclose={onCancel} width="440px">
	<div class="wrap">
		{#if variant === 'danger'}
			<div class="icon" aria-hidden="true">
				<AlertTriangle size={20} />
			</div>
		{/if}
		<div class="content">
			<h3>{title}</h3>
			{#if description}
				<p class="desc">{description}</p>
			{/if}
		</div>
	</div>
	<!-- The fallbacks live here because a prop default is read once and would miss a locale switch. -->
	<div class="actions">
		<Button variant="ghost" onclick={cancel} disabled={loading}>
			{cancelLabel ?? m('common.cancel')}
		</Button>
		<Button variant={variant === 'danger' ? 'danger' : 'primary'} {loading} onclick={confirm}>
			{confirmLabel ?? m('common.confirm')}
		</Button>
	</div>
</Dialog>

<style>
	.wrap {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.9rem;
		align-items: start;
	}
	.wrap:not(:has(.icon)) {
		grid-template-columns: 1fr;
	}
	.icon {
		width: 36px;
		height: 36px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--danger);
		background: var(--danger-soft);
		border-radius: 2px;
		flex: none;
	}
	.content h3 {
		font-size: 1.1rem;
		font-weight: 500;
		letter-spacing: -0.01em;
		line-height: 1.2;
		margin: 0.15rem 0 0.4rem;
	}
	.desc {
		color: var(--text-muted);
		font-size: 0.88rem;
		line-height: 1.5;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1.4rem;
	}
</style>
