<script lang="ts">
	import type { NodeType } from '$lib/services/types';
	import type { CameraState, GraphHighlight, VisNode, VisEdge } from '$lib/types/journey';
	import { localesState, localizedNode, localizedNodeType, m } from '$lib/i18n';
	import { canvasHeight, TOP_PAD, LAYER_H, VIS_W } from '$lib/journey';

	interface Props {
		nodes: VisNode[];
		edges: VisEdge[];
		types: NodeType[];
		camera: CameraState;
		highlight: GraphHighlight | null;
		onNodeClick?: (node: VisNode) => void;
		/** Editor: every node answers to clicks and hovers, not only the highlighted. */
		pickable?: boolean;
		/** Editor: clicking a connection reports it. */
		onEdgeClick?: (edge: VisEdge) => void;
		/** Editor: dragging pans, the wheel zooms, and each move reports the new camera. */
		onCameraChange?: (camera: CameraState) => void;
	}

	let {
		nodes,
		edges,
		types,
		camera,
		highlight,
		onNodeClick,
		pickable = false,
		onEdgeClick,
		onCameraChange
	}: Props = $props();

	const code = $derived(localesState.current);
	const viewByNodeId = $derived.by(() => {
		const map = new Map<string, ReturnType<typeof localizedNode>>();
		for (const n of nodes) map.set(n.id, localizedNode(n.raw, code));
		return map;
	});
	const typeViewById = $derived.by(() => {
		const map = new Map<string, ReturnType<typeof localizedNodeType>>();
		for (const t of types) map.set(t.id, localizedNodeType(t, code));
		return map;
	});

	const LABEL_X = 32;

	const visH = $derived(canvasHeight(types));

	function bandTop(typ: NodeType): number {
		const idx = Math.max(0, typ.layer_order - 1);
		return TOP_PAD + idx * LAYER_H;
	}

	function sizeOf(n: VisNode): number {
		const base = n.type?.base_size ?? 8;
		return base + Math.min(n.degree, 8);
	}

	const cameraTransform = $derived.by(() => {
		const s = camera.zoom;
		const tx = (VIS_W / 2 - camera.centerX) * s;
		const ty = (visH / 2 - camera.centerY) * s;
		return `translate(${tx}px, ${ty}px) scale(${s})`;
	});

	// Framing by hand: the pointer in screen pixels, the camera in graph units.
	const DRAG_THRESHOLD = 4;
	const MIN_ZOOM = 0.5;
	const MAX_ZOOM = 5;
	const WHEEL_SPEED = 0.0015;

	let svgEl = $state<SVGSVGElement | null>(null);
	let drag: { x: number; y: number; from: CameraState; moved: boolean } | null = null;
	let skipClick = false;
	// The eased transition would lag behind the pointer.
	let framing = $state(false);
	let wheelTimer: ReturnType<typeof setTimeout> | undefined;

	/** Screen pixels per graph unit at zoom 1: the viewBox fits inside the SVG. */
	function baseScale(rect: DOMRect): number {
		return Math.min(rect.width / VIS_W, rect.height / visH);
	}

	function startDrag(ev: PointerEvent) {
		if (!onCameraChange || ev.button !== 0) return;
		drag = { x: ev.clientX, y: ev.clientY, from: camera, moved: false };
	}

	function moveDrag(ev: PointerEvent) {
		if (!drag || !svgEl) return;
		const dx = ev.clientX - drag.x;
		const dy = ev.clientY - drag.y;
		if (!drag.moved) {
			if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
			drag.moved = true;
			framing = true;
			svgEl.setPointerCapture(ev.pointerId);
		}
		const k = baseScale(svgEl.getBoundingClientRect()) * drag.from.zoom;
		onCameraChange?.({
			centerX: drag.from.centerX - dx / k,
			centerY: drag.from.centerY - dy / k,
			zoom: drag.from.zoom
		});
	}

	function endDrag() {
		skipClick = drag?.moved ?? false;
		drag = null;
		framing = false;
	}

	/** A drag that ends over a node or a connection is not a click on it. */
	function swallowClickAfterDrag(ev: MouseEvent) {
		if (!skipClick) return;
		skipClick = false;
		ev.stopPropagation();
	}

	function zoomAtCursor(ev: WheelEvent) {
		if (!onCameraChange || !svgEl) return;
		ev.preventDefault();
		const rect = svgEl.getBoundingClientRect();
		const k = baseScale(rect);
		const ox = (ev.clientX - (rect.left + rect.width / 2)) / k;
		const oy = (ev.clientY - (rect.top + rect.height / 2)) / k;
		const zoom = Math.min(
			MAX_ZOOM,
			Math.max(MIN_ZOOM, camera.zoom * Math.exp(-ev.deltaY * WHEEL_SPEED))
		);
		framing = true;
		clearTimeout(wheelTimer);
		wheelTimer = setTimeout(() => (framing = false), 150);
		// The graph point under the cursor stays under the cursor.
		onCameraChange({
			centerX: camera.centerX + ox / camera.zoom - ox / zoom,
			centerY: camera.centerY + oy / camera.zoom - oy / zoom,
			zoom
		});
	}

	// Registered by hand: only a non-passive listener can stop the page from scrolling.
	$effect(() => {
		if (!svgEl || !onCameraChange) return;
		const el = svgEl;
		el.addEventListener('wheel', zoomAtCursor, { passive: false });
		return () => el.removeEventListener('wheel', zoomAtCursor);
	});

	function isEdgeHighlighted(e: VisEdge): boolean {
		return highlight === null || highlight.edges.has(e.id);
	}

	function isHighlighted(n: VisNode): boolean {
		return highlight !== null && highlight.nodes.has(n.id);
	}

	function edgeName(e: VisEdge): string {
		const label = (end: VisEdge['source']) =>
			typeof end === 'object' ? (viewByNodeId.get(end.id)?.label ?? '') : '';
		return `${label(e.source)} → ${label(e.target)}`;
	}

	// Tooltip
	let containerEl = $state<HTMLDivElement | null>(null);
	let tooltip = $state({ x: 0, y: 0, visible: false, label: '' });

	function showTooltip(ev: PointerEvent, n: VisNode) {
		if (!containerEl) return;
		const rect = containerEl.getBoundingClientRect();
		const v = viewByNodeId.get(n.id);
		tooltip = {
			x: ev.clientX - rect.left,
			y: ev.clientY - rect.top,
			visible: true,
			label: v?.label_full || v?.label || ''
		};
	}

	function moveTooltip(ev: PointerEvent) {
		if (!containerEl || !tooltip.visible) return;
		const rect = containerEl.getBoundingClientRect();
		tooltip.x = ev.clientX - rect.left;
		tooltip.y = ev.clientY - rect.top;
	}

	function hideTooltip() {
		tooltip.visible = false;
	}
</script>

<div class="graph-container" bind:this={containerEl}>
	<svg
		bind:this={svgEl}
		class:frameable={onCameraChange !== undefined}
		class:framing
		viewBox="0 0 {VIS_W} {visH}"
		style="aspect-ratio: {VIS_W} / {visH};"
		preserveAspectRatio="xMidYMid meet"
		role={onCameraChange ? 'application' : 'img'}
		aria-label={m('journeys.graph_aria')}
		onpointerdown={startDrag}
		onpointermove={moveDrag}
		onpointerup={endDrag}
		onpointercancel={endDrag}
		onclickcapture={swallowClickAfterDrag}
	>
		<g class="camera" style="transform: {cameraTransform}; transform-origin: {VIS_W / 2}px {visH / 2}px;">
			<!-- Layer bands -->
			<g class="layers">
				{#each types as t (t.id)}
					{@const top = bandTop(t)}
					{@const tv = typeViewById.get(t.id)}
					<line class="lane-line" x1={LABEL_X} x2={VIS_W - 20} y1={top} y2={top} />
					<text class="lane-label" x={LABEL_X} y={top + 18}>
						{tv?.label_plural || tv?.label || ''}
					</text>
				{/each}
			</g>

			<!-- Edges -->
			<g class="edges">
				{#each edges as e (e.id)}
					{@const s = typeof e.source === 'object' ? e.source : null}
					{@const tg = typeof e.target === 'object' ? e.target : null}
					{#if s && tg}
						{@const sx = s.x ?? 0}
						{@const sy = s.y ?? 0}
						{@const tx = tg.x ?? 0}
						{@const ty = tg.y ?? 0}
						{@const dx = tx - sx}
						{@const dy = ty - sy}
						{@const dist = Math.sqrt(dx * dx + dy * dy) || 1}
						{@const bow = Math.min(dist * 0.2, 40)}
						{@const sign = (sx + tx) / 2 < VIS_W / 2 ? 1 : -1}
						{@const mx = (sx + tx) / 2 - (dy / dist) * bow * sign}
						{@const my = (sy + ty) / 2 + (dx / dist) * bow * sign}
						<path
							class="edge"
							class:same-layer={s.type.id === tg.type.id}
							class:dim={!isEdgeHighlighted(e)}
							d="M{sx},{sy} Q{mx},{my} {tx},{ty}"
						/>
						{#if onEdgeClick}
							<!-- The drawn line is 1px wide: this one is the target of the click. -->
							<path
								class="edge-hit"
								d="M{sx},{sy} Q{mx},{my} {tx},{ty}"
								role="button"
								tabindex="0"
								aria-label={edgeName(e)}
								aria-pressed={highlight?.edges.has(e.id) ?? false}
								onclick={() => onEdgeClick(e)}
								onkeydown={(ev: KeyboardEvent) => {
									if (ev.key === 'Enter' || ev.key === ' ') {
										ev.preventDefault();
										onEdgeClick(e);
									}
								}}
							/>
						{/if}
					{/if}
				{/each}
			</g>

			<!-- Nodes -->
			<g class="nodes">
				{#each nodes as n (n.id)}
					{@const hl = isHighlighted(n)}
					{@const reacts = hl || pickable}
					{@const v = viewByNodeId.get(n.id)}
					{@const tv = typeViewById.get(n.type.id)}
					<g
						class="vis-node"
						class:highlighted={hl}
						class:dim={highlight !== null && !hl}
						class:interactive={reacts}
						onclick={reacts ? () => onNodeClick?.(n) : undefined}
						onpointerenter={reacts ? (ev: PointerEvent) => showTooltip(ev, n) : undefined}
						onpointermove={reacts ? moveTooltip : undefined}
						onpointerleave={reacts ? hideTooltip : undefined}
						role={reacts ? 'button' : undefined}
						tabindex={reacts ? 0 : undefined}
						aria-label={reacts
							? `${tv?.label ?? ''} · ${v?.label_full || v?.label || ''}`
							: undefined}
						aria-pressed={pickable ? hl : undefined}
						onkeydown={reacts
							? (ev: KeyboardEvent) => {
									if (ev.key === 'Enter' || ev.key === ' ') {
										ev.preventDefault();
										onNodeClick?.(n);
									}
								}
							: undefined}
					>
						<circle
							class="node-circle"
							cx={n.x ?? 0}
							cy={n.y ?? 0}
							r={sizeOf(n)}
							style="fill: var(--node-slot-{n.type.color_slot});"
						></circle>
						<text
							class="node-label"
							x={n.x ?? 0}
							y={(n.y ?? 0) + sizeOf(n) + 14}
							text-anchor="middle"
						>
							{v?.label ?? ''}
						</text>
					</g>
				{/each}
			</g>
		</g>
	</svg>

	<!-- Tooltip -->
	<div
		class="tooltip"
		class:visible={tooltip.visible}
		style="left: {tooltip.x}px; top: {tooltip.y}px;"
		aria-hidden="true"
	>
		{tooltip.label}
	</div>
</div>

<style>
	.graph-container {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 3px;
		background: var(--bg-canvas, var(--bg-sunken));
		border: 1px solid var(--border);
	}

	svg {
		width: 100%;
		height: 100%;
		display: block;
	}

	.camera {
		transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
	}
	svg.frameable {
		cursor: grab;
		touch-action: none;
	}
	svg.framing {
		cursor: grabbing;
	}
	svg.framing .camera {
		transition: none;
	}

	/* Layer bands */
	.lane-line {
		stroke: var(--border);
		stroke-width: 1;
		stroke-opacity: 0.5;
	}
	.lane-label {
		font-family: 'Fira Mono', monospace;
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		fill: var(--text-soft);
	}

	/* Edges */
	.edge {
		fill: none;
		stroke: var(--border-strong);
		stroke-width: 1;
		opacity: 0.5;
		transition: opacity 0.4s ease;
	}
	.edge.dim {
		opacity: 0.06;
	}
	.edge.same-layer {
		stroke-dasharray: 6 4;
	}
	.edge-hit {
		fill: none;
		stroke: transparent;
		stroke-width: 14;
		vector-effect: non-scaling-stroke;
		pointer-events: stroke;
		cursor: pointer;
		outline: none;
	}
	.edge-hit:hover,
	.edge-hit:focus-visible {
		stroke: color-mix(in srgb, var(--accent) 22%, transparent);
	}

	/* Nodes */
	.vis-node {
		transition: opacity 0.4s ease;
	}
	.vis-node.interactive {
		cursor: pointer;
		outline: none;
	}
	.vis-node.dim:not(.interactive) {
		pointer-events: none;
	}
	.node-circle {
		stroke: var(--bg);
		stroke-width: 2;
		transition: stroke 0.3s, stroke-width 0.3s, opacity 0.4s;
		transform-box: fill-box;
		transform-origin: center;
	}
	.vis-node.highlighted .node-circle {
		stroke: var(--accent);
		stroke-width: 3;
		filter: drop-shadow(0 0 6px var(--accent));
	}
	.vis-node.dim .node-circle {
		opacity: 0.2;
	}
	.vis-node.dim .node-label {
		opacity: 0.15;
	}
	.node-label {
		font-family: 'Fira Sans', sans-serif;
		font-size: 11px;
		font-weight: 500;
		fill: var(--text);
		pointer-events: none;
		user-select: none;
		paint-order: stroke;
		stroke: var(--bg-canvas, var(--bg-sunken));
		stroke-width: 3;
		stroke-linejoin: round;
		transition: opacity 0.4s ease;
	}

	/* Tooltip */
	.tooltip {
		position: absolute;
		pointer-events: none;
		background: var(--tooltip-bg);
		border: 1px solid var(--tooltip-border);
		color: var(--text);
		font-family: 'Fira Mono', monospace;
		font-size: 0.78rem;
		letter-spacing: 0.04em;
		line-height: 1.35;
		padding: 0.45rem 0.75rem;
		border-radius: 2px;
		transform: translate(14px, -50%);
		opacity: 0;
		transition: opacity 0.12s;
		max-width: 200px;
		z-index: 10;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}
	.tooltip.visible {
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.camera {
			transition: none;
		}
		.edge, .vis-node, .node-circle, .node-label {
			transition: none;
		}
	}
</style>
