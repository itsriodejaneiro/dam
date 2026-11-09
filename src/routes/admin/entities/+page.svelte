<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { Plus, Search, X } from '@lucide/svelte';
	import { AppMeta, Button, ConfirmDialog, NodeDialog, Tag } from '$lib/components';
	import {
		auth,
		maps,
		nodeTypes,
		nodes,
		type MapRecord,
		type Node,
		type NodeType
	} from '$lib/services';
	import { localesState, localizedNode, localizedNodeType, m } from '$lib/i18n';

	$effect(() => {
		if (browser && !auth.isLoggedIn) goto('/login');
	});

	let types = $state<NodeType[]>([]);
	let nodeList = $state<Node[]>([]);
	let allMaps = $state<MapRecord[]>([]);
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
	let editingNode = $state<Node | null>(null);
	let confirmOpen = $state(false);
	let pendingRemove = $state<Node | null>(null);
	let removing = $state(false);

	// The URL is the source of truth for the filters: opening a link like
	// `/admin/entities?type=hosting&q=dns` restores the exact table state.
	const activeType = $derived(page.url.searchParams.get('type') ?? '');
	const query = $derived(page.url.searchParams.get('q') ?? '');

	function setParam(key: string, value: string, replace = false) {
		const params = new URLSearchParams(page.url.searchParams);
		if (value) params.set(key, value);
		else params.delete(key);
		const qs = params.toString();
		const url = qs ? `${page.url.pathname}?${qs}` : page.url.pathname;
		goto(url, { replaceState: replace, keepFocus: true, noScroll: true });
	}

	async function refresh() {
		const [t, n, m] = await Promise.all([nodeTypes.getNodeTypes(), nodes.getNodes(), maps.getMaps()]);
		types = t;
		nodeList = n;
		allMaps = m;
	}

	onMount(async () => {
		try {
			await refresh();
		} finally {
			loading = false;
		}
	});

	function typeFor(id: string): NodeType | undefined {
		return types.find((t) => t.id === id);
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const matched = nodeList.filter((n) => {
			if (activeType) {
				const slug = typeFor(n.type)?.slug;
				if (slug !== activeType) return false;
			}
			if (q) {
				const v = nodeViewById.get(n.id);
				const hay = `${v?.label ?? ''} ${v?.label_full ?? ''}`.toLowerCase();
				if (!hay.includes(q)) return false;
			}
			return true;
		});
		return matched.sort((a, b) => {
			const la = typeFor(a.type)?.layer_order ?? Number.MAX_SAFE_INTEGER;
			const lb = typeFor(b.type)?.layer_order ?? Number.MAX_SAFE_INTEGER;
			if (la !== lb) return la - lb;
			const la2 = nodeViewById.get(a.id)?.label ?? '';
			const lb2 = nodeViewById.get(b.id)?.label ?? '';
			return la2.localeCompare(lb2, 'pt', { sensitivity: 'base' });
		});
	});

	const countsByType = $derived.by(() => {
		const map = new Map<string, number>();
		for (const n of nodeList) {
			const slug = typeFor(n.type)?.slug;
			if (slug) map.set(slug, (map.get(slug) ?? 0) + 1);
		}
		return map;
	});

	function openNew() {
		editingNode = null;
		dialogOpen = true;
	}

	function openEdit(n: Node) {
		editingNode = n;
		dialogOpen = true;
	}

	function askRemoveNode(n: Node) {
		pendingRemove = n;
		confirmOpen = true;
	}

	async function confirmRemoveNode() {
		if (!pendingRemove) return;
		removing = true;
		try {
			await nodes.deleteNode(pendingRemove.id);
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
					<h1>{m('entities.title')}</h1>
					<p class="lede">{m('entities.lede')}</p>
				</div>
				<Button
					onclick={openNew}
					disabled={types.length === 0}
					title={types.length === 0 ? m('entities.requires_category') : undefined}
				>
					<Plus size={14} /> {m('entities.new')}
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
							placeholder={m('entities.search_placeholder')}
							value={query}
							oninput={(e) => setParam('q', e.currentTarget.value, true)}
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

					<div class="chips">
						<button
							type="button"
							class="chip"
							class:active={!activeType}
							onclick={() => setParam('type', '')}
						>
							{m('common.all')} <span class="count">{nodeList.length}</span>
						</button>
						{#each types as t (t.id)}
							{@const count = countsByType.get(t.slug) ?? 0}
							{@const tv = typeViewById.get(t.id)}
							<button
								type="button"
								class="chip"
								class:active={activeType === t.slug}
								onclick={() => setParam('type', activeType === t.slug ? '' : t.slug)}
								disabled={count === 0}
							>
								<span class="dot" style="background: var(--node-slot-{t.color_slot});"></span>
								{tv?.label ?? t.slug} <span class="count">{count}</span>
							</button>
						{/each}
					</div>
				</div>

				<div class="list">
					{#if nodeList.length === 0}
						<p class="empty">
							{types.length === 0
								? m('entities.empty_no_types')
								: m('entities.empty')}
						</p>
					{:else if filtered.length === 0}
						<p class="empty">{m('entities.no_results')}</p>
					{:else}
						<table>
							<thead>
								<tr>
									<th>{m('entities.col_type')}</th>
									<th>{m('entities.col_label')}</th>
									<th class="num"></th>
								</tr>
							</thead>
							<tbody>
								{#each filtered as n (n.id)}
									{@const t = typeFor(n.type)}
									{@const tv = t ? typeViewById.get(t.id) : undefined}
									{@const nv = nodeViewById.get(n.id)}
									<tr>
										<td>
											{#if t && tv}
												<Tag colorSlot={t.color_slot}>{tv.label}</Tag>
												{#if tv.is_fallback}
													<span class="fallback-mark" title={m('i18n.fallback_mark')}>~</span>
												{/if}
											{:else}
												<span class="muted">?</span>
											{/if}
										</td>
										<td>
											<strong>{nv?.label ?? ''}</strong>
											{#if nv?.is_fallback}
												<span class="fallback-mark" title={m('i18n.fallback_mark')}>~</span>
											{/if}
											{#if nv?.label_full}
												<div class="sub">{nv.label_full}</div>
											{/if}
										</td>
										<td class="num">
											<button class="link" onclick={() => openEdit(n)}>{m('common.edit_lower')}</button>
											<button class="link danger" onclick={() => askRemoveNode(n)}>
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

<NodeDialog bind:open={dialogOpen} {types} editing={editingNode} onSaved={refresh} availableMaps={allMaps} />
<ConfirmDialog
	bind:open={confirmOpen}
	title={m('entities.confirm_remove_title')}
	description={pendingRemove
		? m('entities.confirm_remove_desc', nodeViewById.get(pendingRemove.id)?.label ?? '')
		: ''}
	confirmLabel={m('common.remove')}
	loading={removing}
	onConfirm={confirmRemoveNode}
	onCancel={() => (pendingRemove = null)}
/>

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
		display: flex;
		flex-direction: column;
		gap: 1rem;
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

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		padding: 0.4rem 0.7rem;
		background: var(--bg-elevated);
		color: var(--text-muted);
		border: 1px solid var(--border);
		border-radius: 2px;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s, background 0.15s;
	}
	.chip:hover:not(:disabled) {
		color: var(--text);
		border-color: var(--border-strong);
	}
	.chip.active {
		color: var(--text);
		border-color: var(--accent);
		background: var(--accent-soft);
	}
	.chip:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.chip .dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
	}
	.chip .count {
		color: var(--text-soft);
		font-size: 0.68rem;
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
	.list .sub {
		font-size: 0.78rem;
		color: var(--text-soft);
		margin-top: 0.2rem;
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

	@media (max-width: 900px) {
		main { padding: 2rem 1.2rem 4rem; }
		.hero { grid-template-columns: 1fr; gap: 0.5rem; }
		.head-row { flex-direction: column; }
	}
</style>
