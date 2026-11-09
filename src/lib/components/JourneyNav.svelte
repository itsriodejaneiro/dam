<script lang="ts">
	import type { JourneyPhase, TimelineEntry } from '$lib/types/journey';
	import { localesState, m, t } from '$lib/i18n';
	import { phaseColor as getPhaseColor } from '$lib/journey';

	interface Props {
		steps: TimelineEntry[];
		phases: JourneyPhase[];
		activeStepId: string;
		visitedStepIds: Set<string>;
		onNavigate: (stepId: string) => void;
	}

	let { steps, phases, activeStepId, visitedStepIds, onNavigate }: Props = $props();

	const code = $derived(localesState.current);

	function getPhaseTitle(phaseNum: number): string {
		const phase = phases.find((p) => p.number === phaseNum);
		return phase ? t(phase.title, code) : '';
	}

	interface StepGroup {
		phase: JourneyPhase | null;
		steps: TimelineEntry[];
	}

	const grouped = $derived.by<StepGroup[]>(() => {
		const groups: StepGroup[] = [];
		let currentPhase = -1;

		for (const step of steps) {
			if (step.phase !== currentPhase) {
				currentPhase = step.phase;
				const phase = phases.find((p) => p.number === step.phase) ?? null;
				groups.push({ phase, steps: [step] });
			} else {
				groups[groups.length - 1].steps.push(step);
			}
		}
		return groups;
	});

	const activeIndex = $derived(steps.findIndex((s) => s.id === activeStepId));

	function handleClick(stepId: string) {
		onNavigate(stepId);
	}

	let hoveredStep = $state<string | null>(null);
	let hoveredPhase = $state<number | null>(null);

	// Measure actual dot position for progress fill
	let trackEl = $state<HTMLElement | null>(null);
	let dotsEl = $state<HTMLElement | null>(null);
	let fillHeight = $state(0);

	$effect(() => {
		// Re-run when activeStepId changes
		const _trigger = activeStepId;
		if (!trackEl || !dotsEl) return;

		// Find the active dot button by aria-current
		const activeDot = dotsEl.querySelector<HTMLElement>('[aria-current="step"]');
		if (!activeDot) {
			fillHeight = 0;
			return;
		}

		const trackRect = trackEl.getBoundingClientRect();
		const dotRect = activeDot.getBoundingClientRect();
		// Center of the dot relative to the top of the track
		const dotCenter = dotRect.top + dotRect.height / 2 - trackRect.top;
		fillHeight = Math.max(0, Math.min(dotCenter, trackRect.height));
	});

	function firstStepOfPhase(phaseNum: number): string | undefined {
		return steps.find((s) => s.phase === phaseNum)?.id;
	}
</script>

<nav class="journey-nav" aria-label={m('journeys.nav_aria')}>
	<!-- Progress track -->
	<div class="track" bind:this={trackEl}>
		<div class="track-bg"></div>
		<div class="track-fill" style="height: {fillHeight}px;"></div>
	</div>

	<!-- Step dots grouped by phase -->
	<div class="dots" bind:this={dotsEl}>
		{#each grouped as group}
			{#if group.phase}
				{@const phaseTitle = t(group.phase.title, code)}
				<button
					class="phase-label"
					style="--phase-color: var(--node-slot-{getPhaseColor(group.phase.number)});"
					onclick={() => {
						const id = firstStepOfPhase(group.phase!.number);
						if (id) handleClick(id);
					}}
					onpointerenter={() => (hoveredPhase = group.phase!.number)}
					onpointerleave={() => (hoveredPhase = null)}
					aria-label="{group.phase.number}: {phaseTitle}"
				>
					<span class="phase-text">{group.phase.number}</span>
					{#if hoveredPhase === group.phase.number}
						<span class="phase-tooltip">{phaseTitle}</span>
					{/if}
				</button>
			{/if}

			{#each group.steps as step (step.id)}
				{@const isActive = step.id === activeStepId}
				{@const isVisited = visitedStepIds.has(step.id)}
				{@const phaseColor = getPhaseColor(step.phase)}
				{@const stepTitle = t(step.title, code)}
				<button
					class="dot-btn"
					class:active={isActive}
					class:visited={isVisited && !isActive}
					style="--dot-color: var(--node-slot-{phaseColor});"
					onclick={() => handleClick(step.id)}
					onpointerenter={() => (hoveredStep = step.id)}
					onpointerleave={() => (hoveredStep = null)}
					aria-label={stepTitle}
					aria-current={isActive ? 'step' : undefined}
				>
					<span class="dot"></span>
					{#if isActive}
						<span class="dot-ring"></span>
					{/if}
					{#if hoveredStep === step.id}
						<span class="dot-tooltip">{stepTitle}</span>
					{/if}
				</button>
			{/each}
		{/each}
	</div>

	<!-- Compact counter -->
	<div class="counter">
		<span class="counter-current">{activeIndex + 1}</span>
		<span class="counter-sep">/</span>
		<span class="counter-total">{steps.length}</span>
	</div>
</nav>

<style>
	.journey-nav {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
		padding: 1rem 0;
		width: 48px;
		height: 100%;
	}

	/* Vertical track */
	.track {
		position: absolute;
		top: 1rem;
		bottom: 3rem;
		left: 50%;
		transform: translateX(-50%);
		width: 2px;
		pointer-events: none;
	}
	.track-bg {
		position: absolute;
		inset: 0;
		background: var(--border);
		border-radius: 1px;
	}
	.track-fill {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		background: var(--accent);
		border-radius: 1px;
		transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Dots container */
	.dots {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		flex: 1;
		justify-content: center;
	}

	/* Phase label (clickable) */
	.phase-label {
		position: relative;
		margin-top: 8px;
		margin-bottom: 2px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.phase-label:first-child {
		margin-top: 0;
	}
	.phase-label:hover .phase-text {
		transform: scale(1.1);
	}
	.phase-text {
		font-family: 'Fira Mono', monospace;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--phase-color);
		background: color-mix(in srgb, var(--phase-color) 12%, var(--bg));
		padding: 0.15rem 0.35rem;
		border-radius: 2px;
		transition: transform 0.15s;
	}
	.phase-tooltip {
		position: absolute;
		left: 100%;
		margin-left: 8px;
		white-space: nowrap;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		color: var(--text);
		font-family: 'Fira Mono', monospace;
		font-size: 0.6rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		padding: 0.3rem 0.55rem;
		border-radius: 2px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		pointer-events: none;
		z-index: 100;
	}

	/* Individual dot button */
	.dot-btn {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
	}

	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		/* not seen yet: keeps the phase's original colour (faded = pending) */
		border: 1.5px solid var(--dot-color);
		background: var(--dot-color);
		opacity: 0.5;
		transition: all 0.3s ease;
	}
	.dot-btn.visited .dot {
		/* already passed: lights up in the line colour (accent), like the current dot */
		background: var(--accent);
		border-color: var(--accent);
		opacity: 1;
	}
	.dot-btn.active .dot {
		width: 10px;
		height: 10px;
		background: var(--accent);
		border-color: var(--accent);
		opacity: 1;
	}
	.dot-btn:hover .dot {
		transform: scale(1.4);
		border-color: var(--dot-color);
	}

	/* Active pulse ring */
	.dot-ring {
		position: absolute;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 1.5px solid var(--accent);
		opacity: 0;
		animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
	@keyframes pulse-ring {
		0% {
			opacity: 0.6;
			transform: scale(0.8);
		}
		70% {
			opacity: 0;
			transform: scale(1.6);
		}
		100% {
			opacity: 0;
			transform: scale(1.6);
		}
	}

	/* Tooltip on hover */
	.dot-tooltip {
		position: absolute;
		left: 100%;
		margin-left: 8px;
		white-space: nowrap;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		color: var(--text);
		font-family: 'Fira Mono', monospace;
		font-size: 0.65rem;
		letter-spacing: 0.04em;
		padding: 0.3rem 0.55rem;
		border-radius: 2px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		pointer-events: none;
		z-index: 100;
	}

	/* Counter at bottom */
	.counter {
		margin-top: auto;
		font-family: 'Fira Mono', monospace;
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		color: var(--text-soft);
		text-align: center;
	}
	.counter-current {
		color: var(--accent);
		font-weight: 700;
	}
	.counter-sep {
		opacity: 0.4;
	}

	@media (prefers-reduced-motion: reduce) {
		.dot-ring {
			animation: none;
			opacity: 0.4;
			transform: scale(1.2);
		}
		.track-fill, .dot {
			transition: none;
		}
	}
</style>
