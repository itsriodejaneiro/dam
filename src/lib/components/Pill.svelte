<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Status } from './types';

	interface Props {
		status: Status;
		children?: Snippet;
	}

	let { status, children }: Props = $props();
</script>

<span class="pill {status}">
	{#if children}{@render children()}{:else}{status}{/if}
</span>

<style>
	.pill {
		font-family: 'Fira Mono', monospace;
		font-size: 0.68rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 0.2rem 0.55rem;
		border-radius: 2px;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	.pill::before {
		content: '●';
		font-size: 0.6rem;
	}
	.draft {
		background: color-mix(in srgb, var(--status-draft) 18%, transparent);
		color: var(--status-draft);
	}
	.review {
		background: color-mix(in srgb, var(--status-review) 18%, transparent);
		color: var(--status-review);
	}
	.confirmed {
		background: color-mix(in srgb, var(--status-confirmed) 18%, transparent);
		color: var(--status-confirmed);
	}
	.empty {
		background: var(--bg-sunken);
		color: var(--text-soft);
	}
</style>
