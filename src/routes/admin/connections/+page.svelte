<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { AlertTriangle, Plus, Search, X } from '@lucide/svelte';
	import { AppMeta, Button, ConfirmDialog, Dialog, EdgeDialog, Tag } from '$lib/components';
	import {
		auth,
		edges,
		nodeTypes,
		nodes,
		type Edge,
		type Node,
		type NodeType
	} from '$lib/services';
	import { localesState, localizedNode, localizedNodeType, m } from '$lib/i18n';

	$effect(() => {
		if (browser && !auth.isLoggedIn) goto('/login');
	});

	let types = $state<NodeType[]>([]);
	let nodeList = $state<Node[]>([]);
	let edgeList = $state<Edge[]>([]);
	let loading = $state(true);

	const code = $derived(localesState.current);
	const nodeViewById = $derived.by(() => {
		const map = new Map<string, ReturnType<typeof localizedNode>>();
		for (const n of nodeList) map.set(n.id, localizedNode(n, code));
		return map;
	});
	const typeViewById = $derived.by(() => {
		const map = new Map<string, ReturnType<typeof localizedNodeType>>();
		for (const t of types) map.set(t.id, localizedNodeType(t, code));
		return map;
	});

	let dialogOpen = $state(false);
	let editingEdge = $state<Edge | null>(null);
	let confirmOpen = $state(false);
	let pendingRemove = $state<Edge | null>(null);
	let removing = $state(false);

	let dupsDialogOpen = $state(false);
	let removingDups = $state(false);

	interface DupGroup {
		source: string;
		target: string;
		keep: Edge;
		extras: Edge[];
	}

	const dupGroups = $derived.by((): DupGroup[] => {
		const map = new Map<string, Edge[]>();
		for (const e of edgeList) {
			const key = `${e.source}::${e.target}`;
			const arr = map.get(key);
			if (arr) arr.push(e);
			else map.set(key, [e]);
		}
		const groups: DupGroup[] = [];
		for (const arr of map.values()) {
			if (arr.length > 1) {
				const [keep, ...extras] = arr;
				groups.push({ source: keep.source, target: keep.target, keep, extras });
			}
		}
		return groups;
	});

	const totalExtras = $derived(dupGroups.reduce((s, g) => s + g.extras.length, 0));

	async function removeAllDups() {
		removingDups = true;
		try {
			for (const g of dupGroups) {
				for (const e of g.extras) {
					await edges.deleteEdge(e.id);
				}
			}
			await refresh();
			dupsDialogOpen = false;
		} finally {
			removingDups = false;
		}
	}

	const pendingRemoveDesc = $derived.by(() => {
		if (!pendingRemove) return '';
		const s = nodeViewById.get(pendingRemove.source)?.label ?? '?';
		const t = nodeViewById.get(pendingRemove.target)?.label ?? '?';
		return `${s} → ${t}`;
	});

	const query = $derived(page.url.searchParams.get('q') ?? '');

	function setParam(key: string, value: string) {
		const params = new URLSearchParams(page.url.searchParams);
		if (value) params.set(key, value);
		else params.delete(key);
		const qs = params.toString();
		const url = qs ? `${page.url.pathname}?${qs}` : page.url.pathname;
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
	}

	async function refresh() {
		const [t, n, e] = await Promise.all([
			nodeTypes.getNodeTypes(),
			nodes.getNodes(),
			edges.getEdges()
		]);
		types = t;
		nodeList = n;
		edgeList = e;
	}

	onMount(async () => {
		try {
			await refresh();
		} finally {
			loading = false;
		}
	});

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return edgeList;
		return edgeList.filter((e) => {
			const s = nodeViewById.get(e.source);
			const t = nodeViewById.get(e.target);
			const hay = `${s?.label ?? ''} ${s?.label_full ?? ''} ${t?.label ?? ''} ${t?.label_full ?? ''}`.toLowerCase();
			return hay.includes(q);
		});
	});

	function openNew() {
		editingEdge = null;
		dialogOpen = true;
	}

	function openEdit(e: Edge) {
		editingEdge = e;
		dialogOpen = true;
	}

	function askRemoveEdge(e: Edge) {
		pendingRemove = e;
		confirmOpen = true;
	}

	async function confirmRemoveEdge() {
		if (!pendingRemove) return;
		removing = true;
		try {
			await edges.deleteEdge(pendingRemove.id);
			await refresh();
			confirmOpen = false;
			pendingRemove = null;
		} finally {
			removing = false;
		}
	}
</script>

{#if auth.isLoggedIn}
	<main>
		<section class="hero">
			<AppMeta section="admin" />
			<div class="head-row">
				<div>
					<h1>{m('connections.title')}</h1>
					<p class="lede">{m('connections.lede')}</p>
				</div>
				<Button onclick={openNew} disabled={nodeList.length < 2}>
					<Plus size={14} /> {m('connections.new')}
				</Button>
			</div>
		</section>

		<section class="block">
			{#if loading}
				<p class="loading">
					<span class="spinner" aria-hidden="true"></span>
					{m('common.loading')}
				</p>
			{:else}
				<div class="filters">
					<div class="search">
						<Search size={14} class="search-icon" />
						<input
							class="input"
							type="search"
							placeholder={m('connections.search_placeholder')}
							value={query}
							oninput={(e) => setParam('q', e.currentTarget.value)}
						/>
						{#if query}
							<button
								type="button"
								class="search-clear"
								onclick={() => setParam('q', '')}
								aria-label={m('common.clear_search')}
							>
								<X size={14} />
							</button>
						{/if}
					</div>
				</div>

				{#if dupGroups.length > 0}
					<button class="dup-banner" type="button" onclick={() => (dupsDialogOpen = true)}>
						<AlertTriangle size={14} />
						{m('connections.dup_banner', totalExtras)}
					</button>
				{/if}

				<div class="list">
					{#if edgeList.length === 0}
						<p class="empty">
							{nodeList.length < 2
								? m('connections.empty_no_nodes')
								: m('connections.empty')}
						</p>
					{:else if filtered.length === 0}
						<p class="empty">{m('connections.no_results', query)}</p>
					{:else}
						<table>
							<thead>
								<tr>
									<th>{m('connections.col_source')}</th>
									<th>{m('connections.col_target')}</th>
									<th class="num"></th>
								</tr>
							</thead>
							<tbody>
								{#each filtered as e (e.id)}
									{@const s = nodeViewById.get(e.source)}
									{@const t = nodeViewById.get(e.target)}
									{@const st = s ? typeViewById.get(s.type) : undefined}
									{@const tt = t ? typeViewById.get(t.type) : undefined}
									<tr>
										<td>
											{#if s}
												<div class="cell-stack">
													<div>
														<strong>{s.label}</strong>
														{#if s.is_fallback}
															<span class="fallback-mark" title={m('i18n.fallback_mark')}>~</span>
														{/if}
													</div>
													{#if st}
														<Tag colorSlot={st.color_slot}>{st.label}</Tag>
													{/if}
												</div>
											{:else}
												<span class="muted">?</span>
											{/if}
										</td>
										<td>
											{#if t}
												<div class="cell-stack">
													<div>
														<strong>{t.label}</strong>
														{#if t.is_fallback}
															<span class="fallback-mark" title={m('i18n.fallback_mark')}>~</span>
														{/if}
													</div>
													{#if tt}
														<Tag colorSlot={tt.color_slot}>{tt.label}</Tag>
													{/if}
												</div>
											{:else}
												<span class="muted">?</span>
											{/if}
										</td>
										<td class="num">
											<button class="link" onclick={() => openEdit(e)}>{m('common.edit_lower')}</button>
											<button class="link danger" onclick={() => askRemoveEdge(e)}>
												{m('common.remove_lower')}
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			{/if}
		</section>
	</main>
{/if}

<EdgeDialog
	bind:open={dialogOpen}
	nodes={nodeList}
	{types}
	editing={editingEdge}
	onSaved={refresh}
/>
<ConfirmDialog
	bind:open={confirmOpen}
	title={m('connections.confirm_remove_title')}
	description={pendingRemoveDesc}
	confirmLabel={m('common.remove')}
	loading={removing}
	onConfirm={confirmRemoveEdge}
	onCancel={() => (pendingRemove = null)}
/>

<Dialog bind:open={dupsDialogOpen} title={m('connections.dup_title')} width="680px">
	<div class="dup-content">
		<p class="dup-intro">
			{m('connections.dup_intro', dupGroups.length, totalExtras)}
		</p>
		<table class="dup-table">
			<thead>
				<tr>
					<th>{m('connections.col_source')}</th>
					<th>{m('connections.col_target')}</th>
					<th class="num">{m('connections.dup_extras_col')}</th>
				</tr>
			</thead>
			<tbody>
				{#each dupGroups as g (`${g.source}::${g.target}`)}
					{@const s = nodeViewById.get(g.source)}
					{@const t = nodeViewById.get(g.target)}
					{@const st = s ? typeViewById.get(s.type) : undefined}
					{@const tt = t ? typeViewById.get(t.type) : undefined}
					<tr>
						<td>
							<div class="cell-stack">
								<div>
									<strong>{s?.label ?? '?'}</strong>
									{#if s?.is_fallback}
										<span class="fallback-mark" title={m('i18n.fallback_mark')}>~</span>
									{/if}
								</div>
								{#if st}<Tag colorSlot={st.color_slot}>{st.label}</Tag>{/if}
							</div>
						</td>
						<td>
							<div class="cell-stack">
								<div>
									<strong>{t?.label ?? '?'}</strong>
									{#if t?.is_fallback}
										<span class="fallback-mark" title={m('i18n.fallback_mark')}>~</span>
									{/if}
								</div>
								{#if tt}<Tag colorSlot={tt.color_slot}>{tt.label}</Tag>{/if}
							</div>
						</td>
						<td class="num">+{g.extras.length}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<div class="dup-actions">
			<Button loading={removingDups} onclick={removeAllDups}>
				{m('connections.dup_remove_all', totalExtras)}
			</Button>
			<Button variant="ghost" onclick={() => (dupsDialogOpen = false)}>{m('common.close')}</Button>
		</div>
	</div>
</Dialog>

<style>
	main {
		max-width: 1240px;
		margin: 0 auto;
		padding: 4rem 2.5rem 6rem;
	}
	.hero {
		padding: 2rem 0;
		display: grid;
		grid-template-columns: 5rem 1fr;
		gap: 1.5rem;
	}
	.head-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
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
	.loading {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.85rem;
		color: var(--text-soft);
	}

	.block {
		padding: 3rem 0;
		border-top: 1px solid var(--border);
	}

	.filters {
		margin-bottom: 1.5rem;
	}
	.search {
		position: relative;
	}
	.search :global(.search-icon) {
		position: absolute;
		left: 0.85rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-soft);
		pointer-events: none;
	}
	.search .input {
		padding-left: 2.4rem;
		padding-right: 2.4rem;
	}
	.search-clear {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: 0;
		padding: 0.4rem;
		cursor: pointer;
		color: var(--text-soft);
		display: inline-flex;
		border-radius: 2px;
	}
	.search-clear:hover {
		color: var(--text);
	}

	.list table {
		width: 100%;
		border-collapse: collapse;
	}
	.list th,
	.list td {
		text-align: left;
		padding: 0.7rem 0.8rem;
		border-bottom: 1px solid var(--border);
		vertical-align: middle;
	}
	.list th {
		font-family: 'Fira Mono', monospace;
		font-size: 0.68rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-soft);
		font-weight: 500;
	}
	.list td.num,
	.list th.num {
		text-align: right;
		white-space: nowrap;
	}
	.list .cell-stack {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.35rem;
	}
	.list .muted {
		color: var(--text-soft);
	}
	.list .empty {
		padding: 1.5rem;
		text-align: center;
		color: var(--text-soft);
		font-family: 'Fira Mono', monospace;
		font-size: 0.85rem;
		border: 1px dashed var(--border);
		border-radius: 3px;
	}

	.link {
		background: transparent;
		border: 0;
		padding: 0;
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
		cursor: pointer;
		margin-left: 0.8rem;
	}
	.link:hover {
		color: var(--accent);
	}
	.link.danger:hover {
		color: var(--danger);
	}

	.dup-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.7rem 1rem;
		margin-bottom: 1rem;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
		border-radius: 3px;
		color: var(--accent);
		font-family: 'Fira Mono', monospace;
		font-size: 0.78rem;
		cursor: pointer;
		transition: background 0.15s;
	}
	.dup-banner:hover {
		background: color-mix(in srgb, var(--accent) 20%, transparent);
	}

	.dup-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.dup-intro {
		font-family: 'Fira Mono', monospace;
		font-size: 0.8rem;
		color: var(--text-soft);
	}
	.dup-table {
		width: 100%;
		border-collapse: collapse;
	}
	.dup-table th,
	.dup-table td {
		text-align: left;
		padding: 0.55rem 0.6rem;
		border-bottom: 1px solid var(--border);
		vertical-align: middle;
	}
	.dup-table th {
		font-family: 'Fira Mono', monospace;
		font-size: 0.68rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-soft);
		font-weight: 500;
	}
	.dup-table td.num,
	.dup-table th.num {
		text-align: right;
	}
	.dup-actions {
		display: flex;
		gap: 0.7rem;
		margin-top: 0.4rem;
	}

	@media (max-width: 900px) {
		main { padding: 2rem 1.2rem 4rem; }
		.hero { grid-template-columns: 1fr; gap: 0.5rem; }
		.head-row { flex-direction: column; }
	}
</style>
