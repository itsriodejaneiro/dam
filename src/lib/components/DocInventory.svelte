<script lang="ts">
	import type { DocumentState } from '$lib/types/journey';
	import { localesState, t, m } from '$lib/i18n';

	interface Props {
		documents: DocumentState[];
		phaseColorFn: (phase: number) => string;
	}

	let { documents, phaseColorFn }: Props = $props();

	const code = $derived(localesState.current);
	const unlocked = $derived(documents.filter((d) => d.unlocked).length);
</script>

<div class="doc-inventory">
	<div class="doc-header">
		<span class="doc-label">{m('journeys.documents')}</span>
		<span class="doc-counter">{unlocked}/{documents.length}</span>
	</div>
	<div class="doc-chips">
		{#each documents as doc (doc.id)}
			{@const color = phaseColorFn(doc.phase)}
			<span
				class="doc-chip"
				class:unlocked={doc.unlocked}
				class:just-unlocked={doc.justUnlocked}
				style="--doc-color: var(--node-slot-{color});"
				title={t(doc.label, code)}
			>
				{t(doc.abbrev, code)}
			</span>
		{/each}
	</div>
</div>

<style>
	.doc-inventory {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		/* clean header: no background or box, only a hairline on top */
		padding: 0.85rem 0 0;
		border-top: 1px solid var(--border);
		flex: 0 0 auto;
	}
	.doc-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.doc-label {
		font-family: 'Fira Mono', monospace;
		font-size: 0.58rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-soft);
	}
	.doc-counter {
		font-family: 'Fira Mono', monospace;
		font-size: 0.58rem;
		color: var(--text-soft);
	}
	.doc-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}
	.doc-chip {
		font-family: 'Fira Mono', monospace;
		font-size: 0.6rem;
		letter-spacing: 0.06em;
		padding: 0.2rem 0.45rem;
		border-radius: 2px;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--text-soft);
		opacity: 0.3;
		transition: opacity 0.4s, background 0.4s, color 0.4s, border-color 0.4s;
		white-space: nowrap;
	}
	.doc-chip.unlocked {
		opacity: 1;
		background: color-mix(in srgb, var(--doc-color) 12%, var(--bg));
		color: var(--doc-color);
		border-color: color-mix(in srgb, var(--doc-color) 40%, transparent);
	}
	.doc-chip.just-unlocked {
		animation: doc-pop 0.6s cubic-bezier(0.4, 0, 0.2, 1);
	}
	@keyframes doc-pop {
		0% {
			transform: scale(1);
		}
		40% {
			transform: scale(1.15);
		}
		100% {
			transform: scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.doc-chip.just-unlocked {
			animation: none;
		}
	}
	@media (max-width: 900px) {
		.doc-inventory {
			padding: 0.4rem 0 0;
		}
		.doc-header {
			display: none;
		}
		.doc-chips {
			gap: 0.25rem;
		}
		.doc-chip {
			font-size: 0.55rem;
			padding: 0.15rem 0.35rem;
		}
	}
</style>
