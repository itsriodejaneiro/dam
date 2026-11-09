<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

	interface Props extends HTMLButtonAttributes {
		variant?: Variant;
		loading?: boolean;
		children: Snippet;
	}

	let {
		variant = 'primary',
		loading = false,
		disabled,
		children,
		...rest
	}: Props = $props();
</script>

<button
	class="btn btn-{variant}"
	class:loading
	disabled={disabled || loading}
	{...rest}
>
	{#if loading}
		<span class="spinner" aria-hidden="true"></span>
	{/if}
	{@render children()}
</button>

<style>
	.btn {
		font-family: 'Fira Sans', sans-serif;
		font-size: 0.88rem;
		font-weight: 500;
		padding: 0.55rem 1.1rem;
		border-radius: 2px;
		cursor: pointer;
		transition: all 0.15s;
		border: 1px solid transparent;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.btn:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
	.btn-primary {
		background: var(--accent);
		color: var(--accent-fg);
		border-color: var(--accent);
	}
	.btn-primary:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: var(--shadow);
	}
	.btn-secondary {
		background: transparent;
		color: var(--text);
		border-color: var(--border-strong);
	}
	.btn-secondary:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent);
	}
	.btn-ghost {
		background: transparent;
		color: var(--text-muted);
		border-color: transparent;
	}
	.btn-ghost:hover:not(:disabled) {
		color: var(--text);
		background: var(--bg-sunken);
	}
	.btn-danger {
		background: var(--danger);
		color: var(--danger-fg);
		border-color: var(--danger);
	}
	.btn-danger:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: var(--shadow);
	}

</style>
