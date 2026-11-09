<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		colorSlot: number;
		children: Snippet;
	}

	let { colorSlot, children }: Props = $props();
</script>

<span class="tag">
	<span class="dot" style="background: var(--node-slot-{colorSlot});"></span>
	{@render children()}
</span>

<style>
	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		padding: 0.25rem 0.55rem;
		border-radius: 2px;
		background: var(--bg-sunken);
		color: var(--text-muted);
		border: 1px solid var(--border);
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
	}
</style>
