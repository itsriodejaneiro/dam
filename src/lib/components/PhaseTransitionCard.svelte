<script lang="ts">
	import type { PhaseTransition, JourneyDocument } from '$lib/types/journey';
	import { localesState, t, m } from '$lib/i18n';

	interface Props {
		transition: PhaseTransition;
		documents: JourneyDocument[];
		fromPhaseTitle: string;
		toPhaseTitle: string;
		fromPhaseColor: string;
		toPhaseColor: string;
		stepId?: string;
		active?: boolean;
		onclick?: () => void;
	}

	let {
		transition,
		documents,
		fromPhaseTitle,
		toPhaseTitle,
		fromPhaseColor,
		toPhaseColor,
		stepId,
		active = false,
		onclick
	}: Props = $props();

	const code = $derived(localesState.current);

	function docLabel(id: string): string {
		const doc = documents.find((d) => d.id === id);
		return doc ? t(doc.label, code) : id;
	}
</script>

<div
	class="transition-card"
	class:active
	style="--from-color: var(--node-slot-{fromPhaseColor}); --to-color: var(--node-slot-{toPhaseColor});"
	data-step-id={stepId}
	{onclick}
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
	onkeydown={onclick
		? (ev) => {
				if (ev.key === 'Enter' || ev.key === ' ') {
					ev.preventDefault();
					onclick();
				}
			}
		: undefined}
>
	<div class="transition-completed">
		<span class="transition-check">&#10003;</span>
		<span class="transition-phase-badge">
			{transition.toPhase === 0
				? m('journeys.journey_complete')
				: m('journeys.phase_complete', transition.fromPhase)}
		</span>
	</div>

	<p class="transition-summary">{t(transition.summary, code)}</p>

	{#if transition.obtained.length > 0 || transition.needed.length > 0}
		<div class="transition-cols" class:single={transition.needed.length === 0}>
			<div class="transition-col">
				<span class="transition-col-header">{m('journeys.obtained_docs')}</span>
				{#each transition.obtained as docId (docId)}
					<div class="transition-doc obtained">
						<span class="transition-doc-icon">&#10003;</span>
						{docLabel(docId)}
					</div>
				{/each}
			</div>
			{#if transition.needed.length > 0}
				<div class="transition-col">
					<span class="transition-col-header">{m('journeys.needed_docs')}</span>
					{#each transition.needed as docId (docId)}
						<div class="transition-doc needed">
							<span class="transition-doc-icon">&#9654;</span>
							{docLabel(docId)}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

</div>

<style>
	.transition-card {
		padding: 1.4rem 1.5rem;
		background: var(--bg-sunken);
		border: 1px dashed var(--border);
		border-radius: 4px;
		transition: border-color 0.3s, box-shadow 0.3s;
		cursor: pointer;
		outline: none;
	}
	.transition-card.active {
		border-color: var(--from-color);
		box-shadow: 0 2px 16px color-mix(in srgb, var(--from-color) 10%, transparent);
	}
	.transition-completed {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin-bottom: 0.7rem;
	}
	.transition-check {
		color: var(--from-color);
		font-size: 0.9rem;
		font-weight: 700;
	}
	.transition-phase-badge {
		font-family: 'Fira Mono', monospace;
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--from-color);
	}
	.transition-summary {
		font-size: 0.88rem;
		color: var(--text-muted);
		line-height: 1.55;
		margin-bottom: 1rem;
	}
	.transition-cols {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.transition-cols.single {
		grid-template-columns: 1fr;
	}
	.transition-col-header {
		font-family: 'Fira Mono', monospace;
		font-size: 0.58rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-soft);
		display: block;
		margin-bottom: 0.45rem;
	}
	.transition-doc {
		font-size: 0.8rem;
		color: var(--text);
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.15rem 0;
	}
	.transition-doc-icon {
		font-size: 0.65rem;
		flex-shrink: 0;
	}
	.transition-doc.obtained .transition-doc-icon {
		color: var(--from-color);
	}
	.transition-doc.needed .transition-doc-icon {
		color: var(--to-color);
		font-size: 0.5rem;
	}
	@media (max-width: 900px) {
		.transition-cols {
			grid-template-columns: 1fr;
			gap: 0.7rem;
		}
	}
</style>
