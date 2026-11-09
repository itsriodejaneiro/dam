<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { journeys as journeysApi, type NodeType } from '$lib/services';
	import { localesState, localizedNode, localizedNodeType, t as tlocale, m } from '$lib/i18n';
	import { safeUrl, sanitizeHtml } from '$lib/sanitize';
	import type {
		CameraState,
		DocumentState,
		Journey,
		JourneyStep,
		TimelineEntry,
		VisNode,
		VisEdge
	} from '$lib/types/journey';
	import { scrollTrigger } from '$lib/actions/scrollTrigger';
	import {
		countedSteps,
		fitCamera,
		fullCamera,
		phaseColor,
		phaseTransitions,
		liveHighlight,
		stepHighlight,
		stepNumbers
	} from '$lib/journey';
	import JourneyGraph from './JourneyGraph.svelte';
	import JourneyNav from './JourneyNav.svelte';
	import StepCard from './StepCard.svelte';
	import DocInventory from './DocInventory.svelte';
	import PhaseTransitionCard from './PhaseTransitionCard.svelte';
	import Dialog from './Dialog.svelte';
	import Tag from './Tag.svelte';
	import AppMeta from './AppMeta.svelte';

	interface Props {
		journey: Journey;
		steps: JourneyStep[];
	}

	let { journey, steps }: Props = $props();

	const COMPLETION_ID = 'completion';
	// Arrival is gold: finishing the journey does not inherit the last phase's
	// colour. Slot 2 is gold in every pack, so it stays consistent across themes.
	const completionColor = '2';

	function getPhaseTitle(phaseNum: number): string {
		const phase = journey.phases.find((p) => p.number === phaseNum);
		return phase ? tlocale(phase.title, code) : m('journeys.introduction');
	}

	/** Scroll/active anchor id for a "Phase N complete" transition card. */
	function transitionAnchorId(toPhase: number): string {
		return `transition-${toPhase}`;
	}

	const stepDisplay = $derived(stepNumbers(steps));
	const transitions = $derived(phaseTransitions(journey, steps));
	const completion = $derived(transitions.find((tr) => tr.toPhase === 0));

	// Graph data
	let types = $state<NodeType[]>([]);
	let visNodes = $state<VisNode[]>([]);
	let visEdges = $state<VisEdge[]>([]);
	let loading = $state(true);

	const code = $derived(localesState.current);

	// Node detail dialog
	let selectedNode = $state<VisNode | null>(null);
	let dialogOpen = $state(false);
	const selectedView = $derived(selectedNode ? localizedNode(selectedNode.raw, code) : null);

	function handleNodeClick(node: VisNode) {
		selectedNode = node;
		dialogOpen = true;
	}

	// Scroll state
	let activeStepId = $state(untrack(() => steps[0]?.id ?? ''));
	let visitedStepIds = $state<Set<string>>(new Set(untrack(() => steps[0]?.id ?? '')));
	let storyContainer = $state<HTMLElement | null>(null);
	let scrollLock: string | null = null;

	// Timeline for the left nav: the steps, a milestone entry per "Phase N complete"
	// transition (so the indicator shows a dot for each, and the progress fill / counter
	// resolve instead of dropping to zero when one is active) and the completion.
	const navSteps = $derived.by<TimelineEntry[]>(() => {
		const out: TimelineEntry[] = [];
		let prevPhase = -1;
		for (const step of steps) {
			if (step.phase > 0 && step.phase !== prevPhase) {
				const trans = transitions.find((tr) => tr.toPhase === step.phase);
				if (trans) {
					out.push({
						id: transitionAnchorId(trans.toPhase),
						phase: trans.fromPhase,
						title: trans.summary
					});
				}
			}
			out.push(step);
			prevPhase = step.phase;
		}
		if (completion) out.push({ id: COMPLETION_ID, phase: 0, title: completion.summary });
		return out;
	});

	// Document inventory — derived from active step position
	const stepOrder = $derived(new Map(steps.map((s, i) => [s.id, i])));
	const phaseOfStep = $derived(new Map(steps.map((s) => [s.id, s.phase])));

	const isCompletion = $derived(activeStepId === COMPLETION_ID);

	// When a "Phase N complete" card is the active anchor, frame the graph/docs at
	// the END of the phase that just completed (its last step) — without selecting
	// a step card. Mirrors how the completion card anchors to itself.
	const activeTransition = $derived(
		transitions.find(
			(tr) => tr.toPhase !== 0 && transitionAnchorId(tr.toPhase) === activeStepId
		) ?? null
	);
	const transitionAnchorStep = $derived.by(() => {
		if (!activeTransition) return null;
		const phaseSteps = steps.filter((s) => s.phase === activeTransition.fromPhase);
		return phaseSteps[phaseSteps.length - 1] ?? null;
	});

	const activeStepIndex = $derived(
		isCompletion ? steps.length : (stepOrder.get(transitionAnchorStep?.id ?? activeStepId) ?? 0)
	);

	const documentStates = $derived(
		journey.documents.map((doc): DocumentState => {
			const unlockIndex = doc.unlockedAt ? (stepOrder.get(doc.unlockedAt) ?? Infinity) : -1;
			return {
				...doc,
				phase: doc.unlockedAt ? (phaseOfStep.get(doc.unlockedAt) ?? 0) : 0,
				unlocked: isCompletion || unlockIndex <= activeStepIndex,
				justUnlocked: doc.unlockedAt === activeStepId
			};
		})
	);

	const activeStep = $derived(
		isCompletion
			? null
			: (transitionAnchorStep ?? steps.find((s) => s.id === activeStepId) ?? steps[0] ?? null)
	);

	// Completion zooms out to the full map; a step with no recorded camera frames its highlight.
	const camera = $derived.by<CameraState>(() => {
		if (!activeStep) return fullCamera(types);
		return activeStep.camera ?? fitCamera(activeStep.highlight_nodes, visNodes, types);
	});

	const highlight = $derived(
		activeStep ? stepHighlight(liveHighlight(activeStep, { nodes: visNodes, edges: visEdges })) : null
	);

	function onStepChange(stepId: string) {
		// During programmatic scroll, ignore observer firing for other steps
		if (scrollLock && stepId !== scrollLock) return;

		activeStepId = stepId;
		visitedStepIds = new Set([...visitedStepIds, stepId]);
	}

	function handleNavClick(stepId: string) {
		// Lock the observer so intermediate steps don't steal focus
		scrollLock = stepId;
		activeStepId = stepId;
		visitedStepIds = new Set([...visitedStepIds, stepId]);

		const el = storyContainer?.querySelector<HTMLElement>(`[data-step-id="${stepId}"]`);
		if (el) {
			const isMobile = window.matchMedia('(max-width: 900px)').matches;
			// Mobile: target at ~72% of the viewport (centre of the lower half, below the graph).
			// Desktop: ~35% (above the centre, the natural reading point).
			const targetFraction = isMobile ? 0.72 : 0.35;
			const rect = el.getBoundingClientRect();
			const targetY = window.scrollY + rect.top - window.innerHeight * targetFraction;
			window.scrollTo({ top: targetY, behavior: 'smooth' });
		}

		// Release lock after scroll animation settles
		setTimeout(() => { scrollLock = null; }, 900);
	}

	onMount(async () => {
		const graph = await journeysApi.getJourneyGraph(journey.map);
		types = graph.types;
		visNodes = graph.nodes;
		visEdges = graph.edges;
		loading = false;
	});
</script>

<main>
	<!-- Hero intro -->
	<section class="hero">
		<AppMeta section={m('meta.context')} />
		<div>
			<h1>{tlocale(journey.title, code)}</h1>
			<p class="lede">{tlocale(journey.description, code)}</p>
			<div class="hero-meta">
				<span class="phase-count">{m('journeys.phases_n', journey.phases.length)}</span>
				<span class="step-count">{m('journeys.steps_n', countedSteps(steps))}</span>
			</div>
		</div>
	</section>

	{#if loading}
		<div class="loading">
			<span class="loading-dot"></span>
			{m('journeys.loading')}
		</div>
	{:else}
		<!-- Scrollytelling layout -->
		<section class="scrolly-layout">
			<!-- Timeline nav -->
			<aside class="timeline-pane">
				<JourneyNav
					steps={navSteps}
					phases={journey.phases}
					{activeStepId}
					{visitedStepIds}
					onNavigate={handleNavClick}
				/>
			</aside>

			<!-- Document inventory + Graph -->
			<div class="graph-pane">
				{#if documentStates.length > 0}
					<DocInventory documents={documentStates} phaseColorFn={phaseColor} />
				{/if}
				<div class="graph-area">
					<JourneyGraph
						nodes={visNodes}
						edges={visEdges}
						{types}
						{camera}
						{highlight}
						onNodeClick={handleNodeClick}
					/>
				</div>
			</div>

			<!-- Story steps -->
			<div class="story-pane" bind:this={storyContainer} use:scrollTrigger={onStepChange}>
				{#each steps as step, i (step.id)}
					{@const prevPhase = i > 0 ? steps[i - 1].phase : -1}
					{#if step.phase > 0 && step.phase !== prevPhase}
						{@const trans = transitions.find((tr) => tr.toPhase === step.phase)}
						{#if trans}
							{@const anchorId = transitionAnchorId(trans.toPhase)}
							<PhaseTransitionCard
								transition={trans}
								documents={journey.documents}
								fromPhaseTitle={getPhaseTitle(trans.fromPhase)}
								toPhaseTitle={getPhaseTitle(trans.toPhase)}
								fromPhaseColor={phaseColor(trans.fromPhase)}
								toPhaseColor={phaseColor(trans.toPhase)}
								stepId={anchorId}
								active={activeStepId === anchorId}
								onclick={() => handleNavClick(anchorId)}
							/>
						{/if}
						<div
							class="phase-divider"
							style="--phase-color: var(--node-slot-{phaseColor(step.phase)});"
						>
							<span class="phase-number">{step.phase}</span>
							<h2 class="phase-title">{getPhaseTitle(step.phase)}</h2>
						</div>
					{/if}
					<StepCard
						{step}
						active={step.id === activeStepId}
						phaseTitle={getPhaseTitle(step.phase)}
						phaseColor={phaseColor(step.phase)}
						displayNumber={stepDisplay.get(step.id) ?? ''}
						onclick={() => handleNavClick(step.id)}
					/>
				{/each}
				{#if completion}
					<PhaseTransitionCard
						transition={completion}
						documents={journey.documents}
						fromPhaseTitle={getPhaseTitle(completion.fromPhase)}
						toPhaseTitle=""
						fromPhaseColor={completionColor}
						toPhaseColor={completionColor}
						stepId={COMPLETION_ID}
						active={isCompletion}
						onclick={() => handleNavClick(COMPLETION_ID)}
					/>
				{/if}
			</div>
		</section>
	{/if}
</main>

<!-- Node detail dialog -->
<Dialog
	bind:open={dialogOpen}
	title={selectedView?.label}
	width="480px"
	onclose={() => {
		selectedNode = null;
	}}
>
	{#if selectedNode && selectedView}
		{@const d = selectedNode}
		<div class="node-detail">
			{#if selectedView.label_full}
				<p class="nd-full">{selectedView.label_full}</p>
			{/if}

			<div class="nd-type">
				<Tag colorSlot={d.type.color_slot}>{localizedNodeType(d.type, code).label}</Tag>
			</div>

			{#if selectedView.description}
				<hr class="nd-sep" />
				<div class="nd-desc">{@html sanitizeHtml(selectedView.description)}</div>
			{/if}

			{#if selectedView.links.length > 0}
				<hr class="nd-sep" />
				<div class="nd-section-h">{m('map_view.related_links')}</div>
				<ul class="nd-links">
					{#each selectedView.links as l, i (i)}
						<li>
							<a href={safeUrl(l.url)} target="_blank" rel="noopener noreferrer">
								{tlocale(l.label, code) || l.url}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</Dialog>

<style>
	/* Node detail dialog */
	.node-detail {
		font-size: 0.92rem;
	}
	.nd-full {
		color: var(--text-muted);
		font-size: 0.88rem;
		margin-bottom: 0.7rem;
	}
	.nd-type {
		margin-bottom: 0;
	}
	.nd-sep {
		border: 0;
		border-top: 1px dashed var(--border);
		margin: 1.1rem 0;
	}
	.nd-desc {
		color: var(--text-muted);
		font-size: 0.88rem;
		line-height: 1.55;
	}
	.nd-desc :global(a) {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.nd-section-h {
		font-family: 'Fira Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-soft);
		margin-bottom: 0.6rem;
	}
	.nd-links {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.nd-links a {
		font-size: 0.85rem;
		color: var(--accent);
		text-decoration: none;
	}
	.nd-links a:hover {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	main {
		max-width: 1500px;
		margin: 0 auto;
		padding: 2rem 2rem 6rem;
	}

	.hero {
		max-width: 700px;
		margin-bottom: 3rem;
		padding: 2rem 0;
		display: grid;
		grid-template-columns: 5rem 1fr;
		gap: 1.5rem;
	}
	.hero-meta {
		display: flex;
		gap: 1rem;
		margin-top: 1.2rem;
	}
	.hero-meta span {
		font-family: 'Fira Mono', monospace;
		font-size: 0.65rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-soft);
		background: var(--bg-elevated);
		padding: 0.25rem 0.6rem;
		border-radius: 2px;
		border: 1px solid var(--border);
	}
	.hero h1 {
		font-size: clamp(1.8rem, 3.5vw, 2.6rem);
		font-weight: 300;
		letter-spacing: -0.03em;
		line-height: 1.1;
		margin-bottom: 1rem;
	}
	.lede {
		max-width: 58ch;
		color: var(--text-muted);
		line-height: 1.6;
		font-size: 0.95rem;
	}

	.loading {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.85rem;
		color: var(--text-soft);
		padding: 3rem 0;
	}
	.loading-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
		animation: blink 1s infinite;
	}
	@keyframes blink {
		50% { opacity: 0.3; }
	}

	/* 3-column scrollytelling layout */
	.scrolly-layout {
		display: grid;
		grid-template-columns: 48px 1fr 380px;
		gap: 1.5rem;
		align-items: start;
	}

	.timeline-pane {
		position: sticky;
		top: 6rem;
		height: calc(100vh - 7rem);
		display: flex;
		align-items: stretch;
		z-index: 10;
	}

	.graph-pane {
		position: sticky;
		top: 6rem;
		height: calc(100vh - 7rem);
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.graph-area {
		flex: 1 1 0;
		min-height: 0;
		overflow: hidden;
	}

	.story-pane {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
		padding-top: 35vh;
		padding-bottom: 60vh;
	}

	.phase-divider {
		display: flex;
		align-items: baseline;
		gap: 0.85rem;
		padding: 1.5rem 0 0.4rem;
		border-top: 1px solid var(--border);
		margin-top: 1.2rem;
	}
	.phase-divider:first-child {
		border-top: 0;
		margin-top: 0;
		padding-top: 0;
	}
	.phase-number {
		font-family: 'Fira Mono', monospace;
		font-weight: 700;
		font-size: 0.78rem;
		color: var(--phase-color);
		background: color-mix(in srgb, var(--phase-color) 12%, var(--bg));
		border: 1px solid color-mix(in srgb, var(--phase-color) 40%, transparent);
		padding: 0.2rem 0.5rem;
		border-radius: 2px;
		line-height: 1;
		min-width: 1.4rem;
		text-align: center;
	}
	.phase-title {
		font-size: 1.15rem;
		font-weight: 500;
		letter-spacing: -0.01em;
		color: var(--text);
		line-height: 1.2;
		margin: 0;
	}

	/* Responsive */
	@media (max-width: 1100px) {
		.scrolly-layout {
			grid-template-columns: 40px 1fr 320px;
			gap: 1rem;
		}
	}
	@media (max-width: 900px) {
		.hero {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
		.scrolly-layout {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.timeline-pane {
			display: none;
		}
		.graph-pane {
			position: sticky;
			top: 5.5rem;
			height: 40dvh;
			z-index: 5;
			background: var(--bg);
			display: flex;
			flex-direction: column;
		}
		.story-pane {
			padding-top: 1rem;
			padding-bottom: 30vh;
			gap: 2rem;
		}
	}
</style>
