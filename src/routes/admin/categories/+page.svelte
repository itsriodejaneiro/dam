<script lang="ts">
	import { onMount } from 'svelte';
	import { ChevronUp, ChevronDown, Plus } from '@lucide/svelte';
	import { AppMeta, Button, ConfirmDialog, Dialog, LocalizedInput } from '$lib/components';
	import { auth, requireAdmin, nodeTypes, type NodeType } from '$lib/services';
	import {
		localesState,
		localizedNodeType,
		m,
		type Localized
	} from '$lib/i18n';

	requireAdmin();

	let types = $state<NodeType[]>([]);
	let loading = $state(true);

	const code = $derived(localesState.current);
	const typeViewById = $derived.by(() => {
		const map = new Map<string, ReturnType<typeof localizedNodeType>>();
		for (const t of types) map.set(t.id, localizedNodeType(t, code));
		return map;
	});

	// Dialog
	let dialogOpen = $state(false);
	let editingType = $state<NodeType | null>(null);
	let form = $state({
		slug: '',
		label: {} as Localized,
		label_plural: {} as Localized,
		color_slot: 1,
		base_size: 8
	});
	let saving = $state(false);
	let error = $state('');

	// Remove flow
	let confirmOpen = $state(false);
	let reassignOpen = $state(false);
	let pendingRemove = $state<NodeType | null>(null);
	let pendingNodeCount = $state(0);
	let reassignTarget = $state('');
	let removing = $state(false);
	let removeError = $state('');

	let reordering = $state(false);

	async function refresh() {
		types = await nodeTypes.getNodeTypes();
	}

	onMount(async () => {
		try {
			await refresh();
		} finally {
			loading = false;
		}
	});

	function openNew() {
		editingType = null;
		form = {
			slug: '',
			label: {} as Localized,
			label_plural: {} as Localized,
			color_slot: 1,
			base_size: 8
		};
		error = '';
		dialogOpen = true;
	}

	function openEdit(t: NodeType) {
		editingType = t;
		const translations = t.expand?.node_type_translations_via_node_type ?? [];
		const labelByLocale: Localized = {};
		const labelPluralByLocale: Localized = {};
		for (const tr of translations) {
			const loc = localesState.byId(tr.locale);
			if (!loc) continue;
			labelByLocale[loc.code] = tr.label ?? '';
			labelPluralByLocale[loc.code] = tr.label_plural ?? '';
		}
		form = {
			slug: t.slug,
			label: labelByLocale,
			label_plural: labelPluralByLocale,
			color_slot: t.color_slot,
			base_size: t.base_size
		};
		error = '';
		dialogOpen = true;
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		saving = true;
		try {
			const translations: Record<string, { label: string; label_plural: string }> = {};
			for (const loc of localesState.all) {
				const lbl = form.label[loc.code] ?? '';
				if (!lbl && !loc.is_default) continue;
				translations[loc.code] = {
					label: lbl,
					label_plural: form.label_plural[loc.code] ?? ''
				};
			}
			if (editingType) {
				await nodeTypes.updateNodeType(
					editingType.id,
					{
						slug: form.slug,
						color_slot: form.color_slot,
						base_size: form.base_size
					},
					translations
				);
			} else {
				const nextOrder =
					types.length > 0 ? Math.max(...types.map((t) => t.layer_order)) + 1 : 1;
				await nodeTypes.createNodeType(
					{
						slug: form.slug,
						color_slot: form.color_slot,
						base_size: form.base_size,
						layer_order: nextOrder
					},
					translations
				);
			}
			dialogOpen = false;
			await refresh();
		} catch (err) {
			error = (err as Error).message || m('categories.error.save');
		} finally {
			saving = false;
		}
	}

	async function askRemove(t: NodeType) {
		pendingRemove = t;
		removeError = '';
		reassignTarget = '';
		const count = await nodeTypes.countNodesOfType(t.id);
		pendingNodeCount = count;
		if (count > 0) reassignOpen = true;
		else confirmOpen = true;
	}

	async function confirmRemove() {
		if (!pendingRemove) return;
		removing = true;
		removeError = '';
		try {
			await nodeTypes.deleteNodeType(pendingRemove.id);
			confirmOpen = false;
			pendingRemove = null;
			await refresh();
		} catch (err) {
			removeError = (err as Error).message || m('categories.error.remove');
		} finally {
			removing = false;
		}
	}

	async function confirmReassign(e: SubmitEvent) {
		e.preventDefault();
		if (!pendingRemove || !reassignTarget) return;
		removing = true;
		removeError = '';
		try {
			await nodeTypes.deleteNodeType(pendingRemove.id, {
				reassignNodesTo: reassignTarget
			});
			reassignOpen = false;
			pendingRemove = null;
			await refresh();
		} catch (err) {
			removeError = (err as Error).message || m('categories.error.remove');
		} finally {
			removing = false;
		}
	}

	async function moveUp(index: number) {
		if (index === 0 || reordering) return;
		reordering = true;
		try {
			const current = types[index];
			const above = types[index - 1];
			await Promise.all([
				nodeTypes.updateNodeType(current.id, { layer_order: above.layer_order }),
				nodeTypes.updateNodeType(above.id, { layer_order: current.layer_order })
			]);
			await refresh();
		} finally {
			reordering = false;
		}
	}

	async function moveDown(index: number) {
		if (index === types.length - 1 || reordering) return;
		reordering = true;
		try {
			const current = types[index];
			const below = types[index + 1];
			await Promise.all([
				nodeTypes.updateNodeType(current.id, { layer_order: below.layer_order }),
				nodeTypes.updateNodeType(below.id, { layer_order: current.layer_order })
			]);
			await refresh();
		} finally {
			reordering = false;
		}
	}
</script>

{#if auth.isAdmin}
	<main class="admin-page">
		<section class="admin-hero">
			<AppMeta section={m('meta.admin')} />
			<div class="admin-head">
				<div>
					<h1>{m('categories.title')}</h1>
					<p class="admin-lede">{m('categories.lede')}</p>
				</div>
				<Button onclick={openNew}><Plus size={14} /> {m('categories.new')}</Button>
			</div>
		</section>

		<section class="admin-block">
			{#if loading}
				<p class="admin-loading">
					<span class="spinner" aria-hidden="true"></span>
					{m('common.loading')}
				</p>
			{:else if types.length === 0}
				<p class="admin-empty">{m('categories.empty')}</p>
			{:else}
				<div class="admin-list">
					<div class="admin-row header">
						<span class="col-order">{m('categories.col_order')}</span>
						<span class="col-label">{m('categories.field.label')}</span>
						<span class="col-slug">{m('categories.field.slug')}</span>
						<span class="col-color">{m('categories.field.color')}</span>
						<span class="col-actions"></span>
					</div>
					{#each types as t, i (t.id)}
						{@const tv = typeViewById.get(t.id)}
						<div class="admin-row">
							<span class="col-order">{t.layer_order}</span>
							<span class="col-label">
								<strong>{tv?.label ?? ''}</strong>
								{#if tv?.is_fallback}
									<span class="fallback-mark" title={m('i18n.fallback_mark')}>~</span>
								{/if}
								{#if tv?.label_plural}
									<span class="sub">{tv.label_plural}</span>
								{/if}
							</span>
							<span class="col-slug">{t.slug}</span>
							<span class="col-color">
								<span
									class="color-dot"
									style="background: var(--node-slot-{t.color_slot})"
								></span>
							</span>
							<span class="col-actions">
								<button
									class="admin-icon-btn"
									disabled={i === 0 || reordering}
									onclick={() => moveUp(i)}
									aria-label={m('common.move_up')}
								>
									<ChevronUp size={16} />
								</button>
								<button
									class="admin-icon-btn"
									disabled={i === types.length - 1 || reordering}
									onclick={() => moveDown(i)}
									aria-label={m('common.move_down')}
								>
									<ChevronDown size={16} />
								</button>
								<button class="admin-action" onclick={() => openEdit(t)}>{m('common.edit_lower')}</button>
								<button class="admin-action danger" onclick={() => askRemove(t)}>
									{m('common.remove_lower')}
								</button>
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</main>
{/if}

<Dialog
	bind:open={dialogOpen}
	title={editingType ? m('categories.dialog.title.edit') : m('categories.dialog.title.new')}
	dismissable={false}
>
	<form class="admin-form" onsubmit={submit}>
		<div class="admin-field">
			<span class="field-label">{m('categories.field.label')}</span>
			<LocalizedInput
				id="cat-label"
				bind:value={form.label}
				placeholder={m('categories.field.label_placeholder')}
			/>
		</div>
		<div class="admin-field">
			<span class="field-label">{m('categories.field.label_plural')}</span>
			<LocalizedInput
				id="cat-plural"
				bind:value={form.label_plural}
				placeholder={m('categories.field.label_plural_placeholder')}
			/>
		</div>
		<div class="admin-field">
			<label class="field-label" for="cat-slug">{m('categories.field.slug')}</label>
			<input
				id="cat-slug"
				class="input"
				type="text"
				bind:value={form.slug}
				required
				pattern="[a-z0-9\-]+"
				title={m('categories.field.slug_hint')}
			/>
		</div>
		<div class="admin-field">
			<span class="field-label">{m('categories.field.color')}</span>
			<div class="swatches">
				{#each Array(8) as _, i}
					{@const slot = i + 1}
					<button
						type="button"
						class="swatch"
						class:selected={form.color_slot === slot}
						style="--swatch-color: var(--node-slot-{slot})"
						onclick={() => (form.color_slot = slot)}
						aria-label={m('categories.field.color_swatch', slot)}
					>
						<span class="swatch-dot"></span>
					</button>
				{/each}
			</div>
		</div>
		<div class="admin-field">
			<label class="field-label" for="cat-size">{m('categories.field.base_size')}</label>
			<input
				id="cat-size"
				class="input"
				type="number"
				min="1"
				step="1"
				bind:value={form.base_size}
				required
			/>
		</div>
		{#if error}
			<p class="admin-error">{error}</p>
		{/if}
		<div class="admin-form-actions">
			<Button type="button" variant="secondary" onclick={() => (dialogOpen = false)}>
				{m('common.cancel')}
			</Button>
			<Button type="submit" loading={saving}>
				{editingType ? m('common.save') : m('common.create')}
			</Button>
		</div>
	</form>
</Dialog>

<ConfirmDialog
	bind:open={confirmOpen}
	title={m('categories.confirm_remove_title')}
	description={pendingRemove
		? m('categories.confirm_remove_desc', typeViewById.get(pendingRemove.id)?.label ?? '')
		: ''}
	confirmLabel={m('common.remove')}
	loading={removing}
	onConfirm={confirmRemove}
	onCancel={() => (pendingRemove = null)}
/>

<Dialog
	bind:open={reassignOpen}
	title={m('categories.reassign.title')}
	dismissable={false}
	onclose={() => (pendingRemove = null)}
>
	<form class="admin-form" onsubmit={confirmReassign}>
		<p class="reassign-desc">
			{pendingRemove
				? m(
						'categories.reassign.desc',
						typeViewById.get(pendingRemove.id)?.label ?? '',
						pendingNodeCount
					)
				: ''}
		</p>
		<div class="admin-field">
			<label class="field-label" for="reassign-target">
				{m('categories.reassign.field_target')}
			</label>
			<select id="reassign-target" class="input" bind:value={reassignTarget} required>
				<option value="" disabled>{m('common.select')}</option>
				{#each types as t (t.id)}
					{#if !pendingRemove || t.id !== pendingRemove.id}
						<option value={t.id}>{typeViewById.get(t.id)?.label ?? t.slug}</option>
					{/if}
				{/each}
			</select>
		</div>
		{#if removeError}
			<p class="admin-error">{removeError}</p>
		{/if}
		<div class="admin-form-actions">
			<Button type="button" variant="secondary" onclick={() => (reassignOpen = false)}>
				{m('common.cancel')}
			</Button>
			<Button type="submit" variant="danger" loading={removing} disabled={!reassignTarget}>
				{m('categories.reassign.action')}
			</Button>
		</div>
	</form>
</Dialog>

<style>
	.admin-list {
		grid-template-columns: 3rem 1fr 1fr 3rem auto;
	}

	.col-label .sub {
		display: block;
		font-size: 0.78rem;
		color: var(--text-soft);
		margin-top: 0.15rem;
	}
	.col-color {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.color-dot {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}

	.reassign-desc {
		color: var(--text-muted);
		font-size: 0.88rem;
		line-height: 1.5;
	}

	/* Color slot picker */
	.swatches {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 0.4rem;
	}
	.swatch {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 2px solid transparent;
		background: transparent;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: border-color 0.15s, transform 0.15s;
	}
	.swatch:hover {
		transform: scale(1.15);
	}
	.swatch.selected {
		border-color: var(--swatch-color);
		box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--swatch-color);
	}
	.swatch-dot {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--swatch-color);
	}
</style>
