<script lang="ts">
	import type { PublishedStep } from '$lib/types/journey';
	import { localesState, t } from '$lib/i18n';
	import { sanitizeHtml } from '$lib/sanitize';

	interface Props {
		step: PublishedStep;
		active: boolean;
		phaseTitle: string;
		phaseColor: string;
		/** "1.1", "1.2", "2.1": hierarchical label computed by the parent. */
		displayNumber?: string;
		onclick?: () => void;
	}

	let { step, active, phaseTitle, phaseColor, displayNumber = '', onclick }: Props = $props();

	const code = $derived(localesState.current);
	const duration = $derived(t(step.duration, code));
</script>

<article
	class="step-card"
	class:active
	data-step-id={step.id}
	style="--phase-color: var(--node-slot-{phaseColor});"
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
	{#if step.phase > 0}
		<div class="step-meta">
			<span class="phase-badge">{phaseTitle}</span>
			{#if duration}
				<span class="duration">{duration}</span>
			{/if}
		</div>
	{/if}

	<h3 class="step-title">
		{#if displayNumber}
			<span class="step-number">{displayNumber}</span>
		{/if}
		{t(step.title, code)}
	</h3>

	<div class="step-body">{@html sanitizeHtml(t(step.body, code))}</div>
</article>

<style>
	.step-card {
		padding: 1.8rem 1.6rem;
		min-height: 10rem;
		border-left: 3px solid var(--border);
		border-radius: 0 4px 4px 0;
		background: var(--bg-elevated);
		transition: border-color 0.3s, background 0.3s, box-shadow 0.3s;
		cursor: pointer;
		outline: none;
	}
	.step-card.active {
		border-left-color: var(--phase-color);
		background: color-mix(in srgb, var(--bg-elevated) 92%, var(--phase-color));
		box-shadow: 0 2px 16px color-mix(in srgb, var(--phase-color) 10%, transparent);
	}

	.step-meta {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		margin-bottom: 0.6rem;
	}
	.phase-badge {
		font-family: 'Fira Mono', monospace;
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--phase-color);
		background: color-mix(in srgb, var(--phase-color) 12%, transparent);
		padding: 0.2rem 0.55rem;
		border-radius: 2px;
	}
	.duration {
		font-family: 'Fira Mono', monospace;
		font-size: 0.65rem;
		color: var(--text-soft);
		letter-spacing: 0.06em;
	}

	.step-title {
		font-size: 1.1rem;
		font-weight: 600;
		line-height: 1.3;
		margin-bottom: 0.6rem;
	}
	.step-number {
		color: var(--phase-color);
		font-weight: 700;
	}

	.step-body {
		font-size: 0.88rem;
		line-height: 1.6;
		color: var(--text-soft);
		transition: color 0.3s;
	}
	.step-card.active .step-body {
		color: var(--text);
	}
	.step-body :global(strong) {
		font-weight: 600;
	}
	.step-body :global(p + p),
	.step-body :global(ul),
	.step-body :global(ol) {
		margin-top: 0.6rem;
	}
	.step-body :global(ul),
	.step-body :global(ol) {
		padding-left: 1.2rem;
	}
	.step-body :global(a) {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
