<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { Pencil, Plus, X } from '@lucide/svelte';
	import {
		forceSimulation,
		forceLink,
		forceManyBody,
		forceCollide,
		forceX,
		forceY,
		type Simulation,
		type SimulationNodeDatum,
		type SimulationLinkDatum,
		type ForceLink
	} from 'd3-force';
	import { drag } from 'd3-drag';
	import { select } from 'd3-selection';
	import { AppMeta, Button, EdgeDialog, NodeDialog, Tag } from '$lib/components';
	import {
		auth,
		nodeTypes,
		nodes as nodesApi,
		edges as edgesApi,
		maps as mapsApi,
		mapNodes as mapNodesApi,
		type Edge,
		type MapNode,
		type MapRecord,
		type Node,
		type NodeType
	} from '$lib/services';
	import { localesState, localizedNode, localizedNodeType, localizedMap, t, m } from '$lib/i18n';
	import { sanitizeHtml } from '$lib/sanitize';
	import { placeName } from '$lib/settings';

	const slug = $derived(page.data.slug as string);
	let allMaps = $state<MapRecord[]>([]);
	let currentMapId = $state('');
	let mapNodeByNodeId = $state(new Map<string, MapNode>());

	interface VisNode extends SimulationNodeDatum {
		id: string;
		/** Raw node: labels and description come from it via localizedNode(raw, code). */
		raw: Node;
		type: NodeType;
		degree: number;
	}
	interface VisEdge extends SimulationLinkDatum<VisNode> {
		id: string;
	}

	// Scramble effect: each character starts as the previous one, picks random
	// glyphs from `chars` for a few frames, then settles into the new character.
	// Total time ≈ (MAX_START + MAX_DUR) frames ≈ ((MAX_START + MAX_DUR) / 60)s.
	class TextScrambler {
		private el: HTMLElement;
		private chars = '!<>-_\\/[]{}—=+*^?#';
		// Random delay (in frames) before each character's scramble starts.
		private readonly MAX_START = 30;
		// Minimum duration and random variation of the scramble per character (in frames).
		private readonly MIN_DUR = 28;
		private readonly MAX_DUR = 36;
		// Probability of swapping the glyph on each frame (higher = more frantic).
		private readonly SWAP_RATE = 0.18;
		private queue: Array<{ from: string; to: string; start: number; end: number; char?: string }> = [];
		private frame = 0;
		private rafId = 0;

		constructor(el: HTMLElement) {
			this.el = el;
		}

		setText(newText: string) {
			const len = newText.length;
			const mid = Math.ceil(len / 2);
			this.queue = [];
			for (let i = 0; i < len; i++) {
				if (i < mid) {
					// First half: instantly revealed
					this.queue.push({ from: newText[i], to: newText[i], start: 0, end: 0 });
				} else {
					// Second half: scramble progressively from midpoint
					const progress = (i - mid) / Math.max(1, len - mid - 1);
					const start = Math.floor(progress * this.MAX_START);
					const end = start + this.MIN_DUR + Math.floor(Math.random() * this.MAX_DUR);
					this.queue.push({ from: '', to: newText[i], start, end });
				}
			}
			cancelAnimationFrame(this.rafId);
			this.frame = 0;
			this.update();
		}

		private update = () => {
			let output = '';
			let done = 0;
			for (const q of this.queue) {
				if (this.frame >= q.end) {
					done++;
					output += q.to;
				} else if (this.frame >= q.start) {
					if (!q.char || Math.random() < this.SWAP_RATE) {
						q.char = this.chars[Math.floor(Math.random() * this.chars.length)];
					}
					output += `<span class="scramble-mid">${q.char}</span>`;
				} else {
					output += q.from;
				}
			}
			this.el.innerHTML = output;
			if (done < this.queue.length) {
				this.frame++;
				this.rafId = requestAnimationFrame(this.update);
			}
		};

		destroy() {
			cancelAnimationFrame(this.rafId);
		}
	}

	const SCRAMBLE_TOOLTIP = true;
	const VIS_W = 1280;
	const LAYER_H = 160; // height of each layer; raise it for more breathing room
	const TOP_PAD = 40;
	const BOTTOM_PAD = 30;
	const LABEL_X = 32;

	let types = $state<NodeType[]>([]);
	let rawNodes = $state<Node[]>([]);
	let visNodes = $state<VisNode[]>([]);
	let visEdges = $state<VisEdge[]>([]);
	let loading = $state(true);
	let selected = $state<VisNode | null>(null);

	const code = $derived(localesState.current);
	const place = $derived(placeName(page.data.settings, code));

	// Localized, indexed views: recomputed only when the locale or the raw nodes/types change.
	const viewByNodeId = $derived.by(() => {
		const map = new Map<string, ReturnType<typeof localizedNode>>();
		for (const n of visNodes) map.set(n.id, localizedNode(n.raw, code));
		return map;
	});
	const typeViewById = $derived.by(() => {
		const map = new Map<string, ReturnType<typeof localizedNodeType>>();
		for (const t of types) map.set(t.id, localizedNodeType(t, code));
		return map;
	});

	function selectNode(n: VisNode | null) {
		if ((n?.id ?? null) === (selected?.id ?? null)) return;
		selected = n;
		const search = n ? `?node=${encodeURIComponent(n.id)}` : '';
		history.pushState({}, '', `${location.pathname}${search}${location.hash}`);
	}

	function syncSelectedFromUrl() {
		const id = new URLSearchParams(location.search).get('node');
		const found = id ? (visNodes.find((n) => n.id === id) ?? null) : null;
		if ((found?.id ?? null) !== (selected?.id ?? null)) selected = found;
	}

	// Sweep mode when clicking a node:
	//   - 'directional': only the node's ancestors (incoming) and descendants (outgoing).
	//     Does not leak to "cousins" through a shared parent.
	//   - 'component':   the whole connected component, ignoring edge direction.
	type ChainMode = 'directional' | 'component';
	const CHAIN_MODE = 'directional' as ChainMode;

	const chainIds = $derived.by<Set<string> | null>(() => {
		if (!selected) return null;
		const reached = new Set<string>([selected.id]);
		const edgeEndpoints = (e: VisEdge) => ({
			sid: typeof e.source === 'object' ? e.source.id : (e.source as string),
			tid: typeof e.target === 'object' ? e.target.id : (e.target as string)
		});

		if (CHAIN_MODE === 'component') {
			const queue: string[] = [selected.id];
			while (queue.length) {
				const cur = queue.shift()!;
				for (const e of visEdges) {
					const { sid, tid } = edgeEndpoints(e);
					const other = sid === cur ? tid : tid === cur ? sid : null;
					if (other && !reached.has(other)) {
						reached.add(other);
						queue.push(other);
					}
				}
			}
			return reached;
		}

		// directional: two separate BFS runs, up through target→source, down through source→target.
		const up: string[] = [selected.id];
		while (up.length) {
			const cur = up.shift()!;
			for (const e of visEdges) {
				const { sid, tid } = edgeEndpoints(e);
				if (tid === cur && !reached.has(sid)) {
					reached.add(sid);
					up.push(sid);
				}
			}
		}
		const down: string[] = [selected.id];
		while (down.length) {
			const cur = down.shift()!;
			for (const e of visEdges) {
				const { sid, tid } = edgeEndpoints(e);
				if (sid === cur && !reached.has(tid)) {
					reached.add(tid);
					down.push(tid);
				}
			}
		}
		return reached;
	});

	let nodeDialogOpen = $state(false);
	let edgeDialogOpen = $state(false);
	let defaultEdgeSource = $state('');

	// `displayedNode` holds the panel's content during the closing animation
	// (~350ms) so the content does not vanish before the slot shrinks.
	let displayedNode = $state<VisNode | null>(null);
	$effect(() => {
		if (selected) {
			displayedNode = selected;
		} else if (displayedNode) {
			const t = window.setTimeout(() => {
				if (!selected) displayedNode = null;
			}, 360);
			return () => clearTimeout(t);
		}
	});

	const editingNode = $derived(
		displayedNode ? rawNodes.find((n) => n.id === displayedNode!.id) ?? null : null
	);
	const selectedLinks = $derived(editingNode?.links ?? []);

	let svgEl = $state<SVGSVGElement | null>(null);
	let wrapEl = $state<HTMLDivElement | null>(null);
	let tooltipEl = $state<HTMLDivElement | null>(null);
	let tooltip = $state({ x: 0, y: 0, visible: false });
	let scrambler: TextScrambler | null = null;
	let sim: Simulation<VisNode, VisEdge> | null = null;

	$effect(() => {
		if (tooltipEl) scrambler = new TextScrambler(tooltipEl);
	});

	function showTooltip(ev: PointerEvent, n: VisNode) {
		if (!wrapEl) return;
		const rect = wrapEl.getBoundingClientRect();
		tooltip = { x: ev.clientX - rect.left, y: ev.clientY - rect.top, visible: true };
		const v = viewByNodeId.get(n.id);
		const text = v?.label_full || v?.label || '';
		if (SCRAMBLE_TOOLTIP) {
			scrambler?.setText(text);
		} else if (tooltipEl) {
			tooltipEl.textContent = text;
		}
	}

	function hideTooltip() {
		tooltip = { ...tooltip, visible: false };
	}

	const visH = $derived(TOP_PAD + BOTTOM_PAD + Math.max(1, types.length) * LAYER_H);

	function bandTop(typ: NodeType): number {
		const idx = Math.max(0, typ.layer_order - 1);
		return TOP_PAD + idx * LAYER_H;
	}
	function laneY(typ: NodeType): number {
		return bandTop(typ) + LAYER_H / 2;
	}

	function sizeOf(n: VisNode): number {
		const base = n.type?.base_size ?? 8;
		return base + Math.min(n.degree, 8);
	}

	$effect(() => {
		// Read slug to establish reactive dependency
		const currentSlug = slug;
		let cancelled = false;

		// Reset state for new map
		loading = true;
		selected = null;
		displayedNode = null;
		sim?.stop();
		sim = null;

		(async () => {
			const [t, ns, es, mapsAll] = await Promise.all([
				nodeTypes.getNodeTypes(),
				nodesApi.getNodes(),
				edgesApi.getEdges(),
				mapsApi.getMaps()
			]);
			if (cancelled) return;

			allMaps = mapsAll;

			// Resolve current map and its memberships
			const currentMap = await mapsApi.getMapBySlug(currentSlug);
			currentMapId = currentMap.id;
			const mapNodeRecords = await mapNodesApi.getMapNodes(currentMap.id);
			if (cancelled) return;

			const nodeIdsInMap = new Set(mapNodeRecords.map((mn) => mn.node));
			mapNodeByNodeId = new Map(mapNodeRecords.map((mn) => [mn.node, mn]));

			const sorted = [...t].sort((a, b) => a.layer_order - b.layer_order);
			const typesById = new Map(sorted.map((x) => [x.id, x]));

			const tmpNodes: VisNode[] = ns
				.filter((n) => nodeIdsInMap.has(n.id) && typesById.has(n.type))
				.map((n) => {
					const typ = typesById.get(n.type)!;
					const mn = mapNodeByNodeId.get(n.id);
					const hasSavedPos = mn?.x != null && mn?.y != null && (mn!.x !== 0 || mn!.y !== 0);
					return {
						id: n.id,
						raw: n,
						type: typ,
						degree: 0,
						x: hasSavedPos ? mn!.x! : VIS_W / 2 + (Math.random() - 0.5) * 220,
						y: hasSavedPos ? mn!.y! : laneY(typ) + (Math.random() - 0.5) * 60,
						fx: hasSavedPos ? mn!.x! : undefined,
						fy: hasSavedPos ? mn!.y! : undefined
					};
				});

			const validIds = new Set(tmpNodes.map((n) => n.id));
			const tmpEdges: VisEdge[] = es
				.filter((e) => validIds.has(e.source) && validIds.has(e.target))
				.map((e) => ({ id: e.id, source: e.source, target: e.target }));

			const degree = new Map<string, number>();
			for (const e of tmpEdges) {
				degree.set(e.source as string, (degree.get(e.source as string) ?? 0) + 1);
				degree.set(e.target as string, (degree.get(e.target as string) ?? 0) + 1);
			}
			for (const n of tmpNodes) n.degree = degree.get(n.id) ?? 0;

			types = sorted;
			rawNodes = ns;
			visNodes = tmpNodes;
			visEdges = tmpEdges;
			loading = false;
			syncSelectedFromUrl();

			sim = forceSimulation<VisNode, VisEdge>(visNodes)
				.force(
					'link',
					forceLink<VisNode, VisEdge>(visEdges)
						.id((d) => d.id)
						.distance(70)
						.strength(0.35)
				)
				.force('charge', forceManyBody<VisNode>().strength(-220))
				.force('x', forceX<VisNode>(VIS_W / 2).strength(0.04))
				.force(
					'y',
					forceY<VisNode>((d) => laneY(d.type)).strength(0.55)
				)
				.force(
					'collide',
					forceCollide<VisNode>().radius((d) => sizeOf(d) + 6)
				)
				.alphaDecay(0.035)
				.on('tick', () => {
					// Clamp Y within its own layer: links with many neighbours
					// would pull nodes out of the band.
					for (const n of visNodes) {
						const top = bandTop(n.type);
						const r = sizeOf(n);
						const minY = top + r + 4;
						const maxY = top + LAYER_H - r - 4;
						if (n.y != null) n.y = Math.max(minY, Math.min(maxY, n.y));
						if (n.fy != null) n.fy = Math.max(minY, Math.min(maxY, n.fy));
					}
				});
		})();

		return () => {
			cancelled = true;
			sim?.stop();
		};
	});

	onMount(() => {
		const onPop = () => syncSelectedFromUrl();
		window.addEventListener('popstate', onPop);

		return () => {
			scrambler?.destroy();
			window.removeEventListener('popstate', onPop);
		};
	});

	function onNodeSaved(saved: Node) {
		const ri = rawNodes.findIndex((n) => n.id === saved.id);
		if (ri >= 0) rawNodes[ri] = saved;
		const v = visNodes.find((n) => n.id === saved.id);
		if (v) v.raw = saved;
	}

	function onEdgeSaved(saved: Edge) {
		if (visEdges.some((e) => e.id === saved.id)) return;
		visEdges.push({ id: saved.id, source: saved.source, target: saved.target });
		for (const id of [saved.source, saved.target]) {
			const v = visNodes.find((n) => n.id === id);
			if (v) v.degree += 1;
		}
		const linkForce = sim?.force('link') as ForceLink<VisNode, VisEdge> | undefined;
		linkForce?.links(visEdges);
		sim?.alpha(0.3).restart();
	}

	// Position persistence: debounced save on drag-end
	const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
	const SAVE_DELAY = 800;

	function scheduleSavePosition(node: VisNode) {
		if (!auth.isLoggedIn) return;
		const mn = mapNodeByNodeId.get(node.id);
		if (!mn || node.fx == null || node.fy == null) return;

		const existing = saveTimers.get(node.id);
		if (existing) clearTimeout(existing);

		saveTimers.set(
			node.id,
			setTimeout(async () => {
				saveTimers.delete(node.id);
				try {
					await mapNodesApi.savePosition(mn.id, node.fx!, node.fy!);
					mn.x = node.fx!;
					mn.y = node.fy!;
				} catch (err) {
					console.error('Failed to save position:', err);
				}
			}, SAVE_DELAY)
		);
	}

	function dragNode(el: SVGGElement, datum: VisNode) {
		const handler = drag<SVGGElement, VisNode>()
			.container(() => svgEl!)
			.on('start', (ev) => {
				if (!ev.active) sim?.alphaTarget(0.3).restart();
				selectNode(datum);
			})
			.on('drag', (ev) => {
				datum.fx = ev.x;
				datum.fy = ev.y;
			})
			.on('end', (ev) => {
				if (!ev.active) sim?.alphaTarget(0);
				scheduleSavePosition(datum);
			});

		select(el).datum(datum).call(handler);

		return {
			destroy() {
				select(el).on('.drag', null);
			}
		};
	}

	function unpin(n: VisNode) {
		n.fx = null;
		n.fy = null;
		sim?.alphaTarget(0.1).restart();
		setTimeout(() => sim?.alphaTarget(0), 400);

		// Clear persisted position
		const mn = mapNodeByNodeId.get(n.id);
		if (mn && auth.isLoggedIn) {
			mapNodesApi.clearPosition(mn.id);
			mn.x = null;
			mn.y = null;
		}
	}

	function nodeRefById(id: string | VisNode): VisNode | null {
		if (typeof id === 'object') return id as VisNode;
		return visNodes.find((n) => n.id === id) ?? null;
	}

	function uniqueById(nodes: (VisNode | null)[]): VisNode[] {
		const seen = new Set<string>();
		const out: VisNode[] = [];
		for (const n of nodes) {
			if (n && !seen.has(n.id)) { seen.add(n.id); out.push(n); }
		}
		return out;
	}

	const incomingFor = $derived((id: string) =>
		uniqueById(
			visEdges
				.filter((e) => (typeof e.target === 'object' ? e.target.id : e.target) === id)
				.map((e) => nodeRefById(e.source as string | VisNode))
		)
	);
	const outgoingFor = $derived((id: string) =>
		uniqueById(
			visEdges
				.filter((e) => (typeof e.source === 'object' ? e.source.id : e.source) === id)
				.map((e) => nodeRefById(e.target as string | VisNode))
		)
	);
</script>

<main>
	<section class="hero">
		<AppMeta section={m('meta.datavis')} />
		<div>
			<h1>{m('map_view.title')}</h1>
			<p class="lede">{place ? m('map_view.lede', place) : m('map_view.lede_generic')}</p>
		</div>
	</section>

	{#if allMaps.length > 1}
		<nav class="map-tabs">
			{#each allMaps as m (m.id)}
				<a
					href="/maps/{m.slug}"
					class="map-tab"
					class:active={m.slug === slug}
				>{localizedMap(m, code).label}</a>
			{/each}
		</nav>
	{/if}

	<section class="block">
		{#if loading}
			<p class="loading">
				<span class="spinner" aria-hidden="true"></span>
				{m('map_view.loading')}
			</p>
		{:else if visNodes.length === 0}
			<p class="empty">{m('map_view.empty')}</p>
		{:else}
			<div class="viz-wrap" bind:this={wrapEl}>
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<svg
					bind:this={svgEl}
					class="viz"
					viewBox="0 0 {VIS_W} {visH}"
					style="aspect-ratio: {VIS_W} / {visH};"
					preserveAspectRatio="xMidYMid meet"
					role="img"
					aria-label={m('map_view.aria_main')}
					ondblclick={(ev) => {
						if (!(ev.target as Element).closest('.vis-node')) selectNode(null);
					}}
				>
					<!-- Layer bands -->
					<g class="layers">
						{#each types as t (t.id)}
							{@const top = bandTop(t)}
							<line class="lane-line" x1={LABEL_X} x2={VIS_W - 20} y1={top} y2={top} />
							{@const tv = localizedNodeType(t, code)}
							<text class="lane-label" x={LABEL_X} y={top + 18}>
								{tv.label_plural || tv.label}
							</text>
						{/each}
					</g>

					<!-- Edges -->
					<g class="edges">
						{#each visEdges as e (e.id)}
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
									class:dim={chainIds !== null &&
										(!chainIds.has(s.id) || !chainIds.has(tg.id))}
									d="M{sx},{sy} Q{mx},{my} {tx},{ty}"
								/>
							{/if}
						{/each}
					</g>

					<!-- Nodes -->
					<g class="nodes">
						{#each visNodes as n (n.id)}
							{@const v = viewByNodeId.get(n.id)}
							{@const tv = typeViewById.get(n.type.id)}
							<g
								class="vis-node"
								class:selected={selected?.id === n.id}
								class:dim={chainIds !== null && !chainIds.has(n.id)}
								class:unpinned={n.fx == null}
								style="color: var(--node-slot-{n.type.color_slot})"
								use:dragNode={n}
								onclick={() => selectNode(n)}
								ondblclick={() => unpin(n)}
								onpointerenter={(ev) => showTooltip(ev, n)}
								onpointerleave={hideTooltip}
								role="button"
								tabindex="0"
								aria-label="{tv?.label ?? ''} · {v?.label_full || v?.label || ''}"
								onkeydown={(ev) => {
									if (ev.key === 'Enter' || ev.key === ' ') {
										ev.preventDefault();
										selectNode(n);
									}
								}}
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
				</svg>

				<div
					bind:this={tooltipEl}
					class="tooltip"
					class:visible={tooltip.visible}
					style="left: {tooltip.x}px; top: {tooltip.y}px;"
					aria-hidden="true"
				></div>

				<div class="info-slot" class:open={!!selected}>
					{#if displayedNode}
						{@const d = displayedNode}
						{@const dv = viewByNodeId.get(d.id)}
						{@const dtv = typeViewById.get(d.type.id)}
						<aside class="info">
							<button
								class="info-close"
								type="button"
								onclick={() => selectNode(null)}
								aria-label={m('common.close')}
							>
								<X size={16} />
							</button>
							<h3>{dv?.label ?? ''}</h3>
							{#if dv?.label_full}
								<p class="info-full">{dv.label_full}</p>
							{/if}
							<div class="info-type">
								<Tag colorSlot={d.type.color_slot}>{dtv?.label ?? ''}</Tag>
							</div>

							<hr class="info-sep" />

							{#if auth.isLoggedIn}
								<div class="info-actions">
									<Button
										variant="secondary"
										onclick={() => (nodeDialogOpen = true)}
									>
										<Pencil size={12} /> {m('common.edit_lower')}
									</Button>
									<Button
										variant="secondary"
										onclick={() => {
											defaultEdgeSource = d.id;
											edgeDialogOpen = true;
										}}
									>
										<Plus size={12} /> {m('map_view.connection_btn')}
									</Button>
								</div>
							{/if}

							{#if dv?.description}
								<div class="info-desc">{@html sanitizeHtml(dv.description)}</div>
							{/if}

							{#if selectedLinks.length > 0}
								<div class="info-section">
									<div class="info-section-h">{m('map_view.related_links')}</div>
									<ul class="ext-links">
										{#each selectedLinks as l, i (i)}
											<li>
												<a href={l.url} target="_blank" rel="noopener noreferrer">
													{t(l.label, code) || l.url}
												</a>
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if outgoingFor(d.id).length > 0}
								<div class="info-section">
									<div class="info-section-h">{m('map_view.connects_to')}</div>
									<ul>
										{#each outgoingFor(d.id) as n (n.id)}
											{@const nv = viewByNodeId.get(n.id)}
											<li>
												<button class="link-node" onclick={() => selectNode(n)}>
													<span
														class="dot"
														style="background: var(--node-slot-{n.type.color_slot});"
													></span>
													{nv?.label ?? ''}
												</button>
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if incomingFor(d.id).length > 0}
								<div class="info-section">
									<div class="info-section-h">{m('map_view.receives_from')}</div>
									<ul>
										{#each incomingFor(d.id) as n (n.id)}
											{@const nv = viewByNodeId.get(n.id)}
											<li>
												<button class="link-node" onclick={() => selectNode(n)}>
													<span
														class="dot"
														style="background: var(--node-slot-{n.type.color_slot});"
													></span>
													{nv?.label ?? ''}
												</button>
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if d.fx != null}
								<div class="pin-row">
									<button class="unpin" type="button" onclick={() => unpin(d)}>
										{m('map_view.unpin')}
									</button>
									{#if auth.isLoggedIn}
										<span class="pin-coords">{Math.round(d.fx)}, {Math.round(d.fy ?? 0)}</span>
									{/if}
								</div>
							{/if}
						</aside>
					{/if}
				</div>
			</div>
		{/if}
	</section>
</main>

<NodeDialog
	bind:open={nodeDialogOpen}
	{types}
	editing={editingNode}
	onSaved={onNodeSaved}
	availableMaps={allMaps}
	defaultMapId={currentMapId}
/>
<EdgeDialog
	bind:open={edgeDialogOpen}
	nodes={rawNodes}
	{types}
	defaultSource={defaultEdgeSource}
	onSaved={onEdgeSaved}
/>

<style>
	main {
		max-width: 1400px;
		margin: 0 auto;
		padding: 4rem 2.5rem 6rem;
	}
	.hero {
		padding: 2rem 0;
		display: grid;
		grid-template-columns: 5rem 1fr;
		gap: 1.5rem;
	}

	.hero h1 {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 300;
		letter-spacing: -0.03em;
		line-height: 1.05;
	}
	.lede {
		margin-top: 1rem;
		max-width: 58ch;
		color: var(--text-muted);
	}

	.map-tabs {
		display: flex;
		gap: 0;
		border-bottom: 1px solid var(--border);
		margin-top: 0.5rem;
	}
	.map-tab {
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 0.7rem 1.2rem;
		color: var(--text-soft);
		text-decoration: none;
		border-bottom: 2px solid transparent;
		transition: color 0.15s, border-color 0.15s;
	}
	.map-tab:hover {
		color: var(--text);
	}
	.map-tab.active {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}

	.block {
		padding: 3rem 0;
		border-top: 1px solid var(--border);
	}

	.loading {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.85rem;
		color: var(--text-soft);
	}
	.empty {
		padding: 3rem 1.5rem;
		text-align: center;
		color: var(--text-soft);
		font-family: 'Fira Mono', monospace;
		font-size: 0.85rem;
		border: 1px dashed var(--border);
		border-radius: 3px;
	}

	.viz-wrap {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: 0;
		transition: gap 0.36s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.viz-wrap:has(.info-slot.open) {
		gap: 1.5rem;
	}

	.viz {
		flex: 1;
		min-width: 0;
		background: var(--bg-canvas, var(--bg-sunken));
		border: 1px solid var(--border);
		border-radius: 3px;
		display: block;
		touch-action: none;
	}

	.info-slot {
		flex-shrink: 0;
		width: 0;
		overflow: hidden;
		transition: width 0.36s cubic-bezier(0.4, 0, 0.2, 1);
		position: sticky;
		top: 6rem;
		align-self: flex-start;
	}
	.info-slot.open {
		width: 320px;
		overflow: visible;
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
		transition: opacity 0.2s, stroke 0.2s;
	}
	.edge.dim {
		opacity: 0.1;
	}
	/* Interdependency: a node connects to another in the same layer. */
	.edge.same-layer {
		stroke-dasharray: 6 4;
		animation: edge-march 1.4s linear infinite;
	}
	.edge.same-layer.dim {
		animation: none;
	}
	@keyframes edge-march {
		to { stroke-dashoffset: -10; }
	}
	@media (prefers-reduced-motion: reduce) {
		.edge.same-layer { animation: none; }
	}

	/* Nodes */
	.vis-node {
		cursor: grab;
	}
	.vis-node:active {
		cursor: grabbing;
	}
	.vis-node:focus {
		outline: none;
	}
	.vis-node:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 6px;
		outline-style: dashed;
		opacity: 0.95;
		border-radius: 4px;
	}
	.node-circle {
		stroke: var(--bg);
		stroke-width: 2;
		transition: stroke 0.15s, transform 0.15s, opacity 0.2s;
		transform-box: fill-box;
		transform-origin: center;
	}
	.vis-node:hover .node-circle {
		stroke: var(--text);
	}
	.vis-node.selected .node-circle {
		stroke: var(--accent);
		stroke-width: 3;
	}
	.vis-node.unpinned .node-circle {
		stroke: currentColor;
		stroke-width: 2.5;
		stroke-opacity: 0.45;
		stroke-dasharray: 3 2;
	}
	.vis-node.unpinned:hover .node-circle,
	.vis-node.unpinned.selected .node-circle {
		stroke-dasharray: none;
		stroke-opacity: 1;
	}
	.vis-node.dim .node-circle {
		opacity: 0.3;
	}
	.vis-node.dim .node-label {
		opacity: 0.35;
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
	.tooltip :global(.scramble-mid) {
		color: var(--accent);
		opacity: 0.8;
	}

	/* Info panel */
	.info {
		position: relative;
		width: 320px;
		max-height: calc(100vh - 7rem);
		overflow-y: auto;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 3px;
		padding: 1.5rem 1.4rem;
		font-size: 0.92rem;
		scrollbar-width: thin;
		scrollbar-color: var(--border-strong) transparent;
	}
	.info::-webkit-scrollbar {
		width: 6px;
	}
	.info::-webkit-scrollbar-track {
		background: transparent;
	}
	.info::-webkit-scrollbar-thumb {
		background: var(--border-strong);
		border-radius: 3px;
	}
	.info::-webkit-scrollbar-thumb:hover {
		background: var(--text-soft);
	}
	.info-close {
		position: absolute;
		top: 0.7rem;
		right: 0.7rem;
		background: transparent;
		border: 0;
		padding: 0.3rem;
		cursor: pointer;
		color: var(--text-soft);
		display: inline-flex;
		border-radius: 2px;
	}
	.info-close:hover {
		color: var(--text);
	}
	.info h3 {
		font-size: 1.4rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		line-height: 1.15;
		margin-bottom: 0.3rem;
	}
	.info-full {
		color: var(--text-muted);
		font-size: 0.88rem;
		margin-bottom: 0.7rem;
	}
	.info-type {
		margin-bottom: 0;
	}
	.info-sep {
		border: 0;
		border-top: 1px dashed var(--border);
		margin: 1.1rem 0;
	}
	.info-desc {
		color: var(--text-muted);
		font-size: 0.88rem;
		line-height: 1.55;
		margin-top: 1rem;
	}
	.info-desc :global(p) {
		margin-bottom: 0.6em;
	}
	.info-desc :global(p:last-child) {
		margin-bottom: 0;
	}
	.info-desc :global(ul),
	.info-desc :global(ol) {
		margin: 0 0 0.6em;
		padding-left: 1.4em;
	}
	.info-desc :global(li) {
		margin-bottom: 0.15em;
	}
	.info-desc :global(strong) {
		font-weight: 600;
		color: var(--text);
	}
	.info-desc :global(a) {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.info-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.info-actions :global(.btn) {
		font-size: 0.78rem;
		padding: 0.4rem 0.7rem;
	}
	.info-section {
		margin-top: 1.1rem;
		padding-top: 0.9rem;
		border-top: 1px dashed var(--border);
	}
	.info-section-h {
		font-family: 'Fira Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-soft);
		margin-bottom: 0.6rem;
	}
	.info-section ul {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.link-node {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: transparent;
		border: 0;
		padding: 0;
		cursor: pointer;
		font-size: 0.85rem;
		color: var(--text);
		text-align: left;
	}
	.link-node:hover {
		color: var(--accent);
	}
	.link-node .dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex: none;
	}
	.ext-links {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.ext-links a {
		color: var(--text);
		font-size: 0.85rem;
		text-decoration: underline;
		text-underline-offset: 2px;
		text-decoration-color: var(--border-strong);
		word-break: break-word;
	}
	.ext-links a:hover {
		color: var(--accent);
		text-decoration-color: var(--accent);
	}
	.unpin {
		background: transparent;
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		padding: 0.4rem 0.7rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
		cursor: pointer;
	}
	.unpin:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.pin-row {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-top: 1.2rem;
	}
	.pin-coords {
		font-family: 'Fira Mono', monospace;
		font-size: 0.68rem;
		color: var(--text-soft);
		letter-spacing: 0.04em;
	}

	@media (max-width: 1100px) {
		.viz-wrap {
			flex-direction: column;
		}
		.viz-wrap:has(.info-slot.open) {
			gap: 1.5rem;
		}
		.info-slot {
			width: 100%;
			transition: none;
			position: static;
			max-height: none;
		}
		.info-slot.open {
			width: 100%;
		}
		.info {
			width: 100%;
		}
	}
	@media (max-width: 900px) {
		main {
			padding: 2rem 1.2rem 4rem;
		}
		.hero {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
	}
</style>
