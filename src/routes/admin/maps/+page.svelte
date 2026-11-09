<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { ChevronUp, ChevronDown, Plus } from '@lucide/svelte';
	import { AppMeta, Button, ConfirmDialog, Dialog, LocalizedInput } from '$lib/components';
	import { auth, maps, type MapRecord } from '$lib/services';
	import { localesState, localizedMap, m, type Localized } from '$lib/i18n';

	$effect(() => {
		if (browser && !auth.isLoggedIn) goto('/login');
	});

	let mapList = $state<MapRecord[]>([]);
	let loading = $state(true);

	const code = $derived(localesState.current);
	const mapViewById = $derived.by(() => {
		const map = new Map<string, ReturnType<typeof localizedMap>>();
		for (const m of mapList) map.set(m.id, localizedMap(m, code));
		return map;
	});

	// Dialog
	let dialogOpen = $state(false);
	let editingMap = $state<MapRecord | null>(null);
	let form = $state({ slug: '', label: {} as Localized });
	let saving = $state(false);
	let error = $state('');

	// Confirm
	let confirmOpen = $state(false);
	let pendingRemove = $state<MapRecord | null>(null);
	let removing = $state(false);
	let removeError = $state('');

	let reordering = $state(false);

	async function refresh() {
		mapList = await maps.getMaps();
	}

	onMount(async () => {
		try {
			await refresh();
		} finally {
			loading = false;
		}
	});

	function openNew() {
		editingMap = null;
		form = { slug: '', label: {} as Localized };
		error = '';
		dialogOpen = true;
	}

	function openEdit(m: MapRecord) {
		editingMap = m;
		const translations = m.expand?.map_translations_via_map ?? [];
		const labelByLocale: Localized = {};
		for (const tr of translations) {
			const loc = localesState.byId(tr.locale);
			if (!loc) continue;
			labelByLocale[loc.code] = tr.label ?? '';
		}
		form = { slug: m.slug, label: labelByLocale };
		error = '';
		dialogOpen = true;
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		saving = true;
		try {
			const translations: Record<string, { label: string }> = {};
			for (const loc of localesState.all) {
				const lbl = form.label[loc.code] ?? '';
				if (!lbl && !loc.is_default) continue;
				translations[loc.code] = { label: lbl };
			}
			if (editingMap) {
				await maps.updateMap(editingMap.id, { slug: form.slug }, translations);
			} else {
				const nextOrder =
					mapList.length > 0 ? Math.max(...mapList.map((m) => m.order)) + 1 : 1;
				await maps.createMap({ slug: form.slug, order: nextOrder }, translations);
			}
			dialogOpen = false;
			await refresh();
		} catch (err) {
			error = (err as Error).message || m('maps_admin.error.save');
		} finally {
			saving = false;
		}
	}

	function askRemove(m: MapRecord) {
		pendingRemove = m;
		confirmOpen = true;
	}

	async function confirmRemove() {
		if (!pendingRemove) return;
		removing = true;
		removeError = '';
		try {
			await maps.deleteMap(pendingRemove.id);
			await refresh();
		} catch {
			// The only reference PocketBase refuses to clear is a journey's.
			removeError = m('maps_admin.error.has_journeys');
		} finally {
			confirmOpen = false;
			pendingRemove = null;
			removing = false;
		}
	}

	async function moveUp(index: number) {
		if (index <= 1 || reordering) return;
		reordering = true;
		try {
			const current = mapList[index];
			const above = mapList[index - 1];
			await Promise.all([
				maps.updateMap(current.id, { order: above.order }),
				maps.updateMap(above.id, { order: current.order })
			]);
			await refresh();
		} finally {
			reordering = false;
		}
	}

	async function moveDown(index: number) {
		if (index === 0 || index === mapList.length - 1 || reordering) return;
		reordering = true;
		try {
			const current = mapList[index];
			const below = mapList[index + 1];
			await Promise.all([
				maps.updateMap(current.id, { order: below.order }),
				maps.updateMap(below.id, { order: current.order })
			]);
			await refresh();
		} finally {
			reordering = false;
		}
	}

	function isMain(index: number): boolean {
		return index === 0;
	}
</script>

{#if auth.isLoggedIn}
	<main class="admin-page">
		<section class="admin-hero">
			<AppMeta section={m('meta.admin')} />
			<div class="admin-head">
				<div>
					<h1>{m('maps_admin.title')}</h1>
					<p class="admin-lede">{m('maps_admin.lede')}</p>
				</div>
				<Button onclick={openNew}><Plus size={14} /> {m('maps_admin.new')}</Button>
			</div>
		</section>

		<section class="admin-block">
			{#if removeError}
				<p class="admin-error remove-error">{removeError}</p>
			{/if}
			{#if loading}
				<p class="admin-loading">
					<span class="spinner" aria-hidden="true"></span>
					{m('common.loading')}
				</p>
			{:else if mapList.length === 0}
				<p class="admin-empty">{m('maps_admin.empty')}</p>
			{:else}
				<div class="admin-list">
					<div class="admin-row header">
						<span class="col-order">{m('categories.col_order')}</span>
						<span class="col-label">{m('maps_admin.field.label')}</span>
						<span class="col-slug">{m('maps_admin.field.slug')}</span>
						<span class="col-actions"></span>
					</div>
					{#each mapList as map, i (map.id)}
						{@const mv = mapViewById.get(map.id)}
						<div class="admin-row" class:protected={isMain(i)}>
							<span class="col-order">{map.order}</span>
							<span class="col-label">
								<strong>{mv?.label ?? ''}</strong>
								{#if mv?.is_fallback}
									<span class="fallback-mark" title={m('i18n.fallback_mark')}>~</span>
								{/if}
								{#if isMain(i)}
									<span class="badge">{m('maps_admin.badge_main')}</span>
								{/if}
							</span>
							<span class="col-slug">{map.slug}</span>
							<span class="col-actions">
								{#if !isMain(i)}
									<button
										class="admin-icon-btn"
										disabled={i <= 1 || reordering}
										onclick={() => moveUp(i)}
										aria-label={m('common.move_up')}
									>
										<ChevronUp size={16} />
									</button>
									<button
										class="admin-icon-btn"
										disabled={i === mapList.length - 1 || reordering}
										onclick={() => moveDown(i)}
										aria-label={m('common.move_down')}
									>
										<ChevronDown size={16} />
									</button>
									<button class="admin-action" onclick={() => openEdit(map)}>{m('common.edit_lower')}</button>
									<button class="admin-action danger" onclick={() => askRemove(map)}>
										{m('common.remove_lower')}
									</button>
								{/if}
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
	title={editingMap ? m('maps_admin.dialog.title.edit') : m('maps_admin.dialog.title.new')}
	dismissable={false}
>
	<form class="admin-form" onsubmit={submit}>
		<div class="admin-field">
			<span class="field-label">{m('maps_admin.field.label')}</span>
			<LocalizedInput
				id="map-label"
				bind:value={form.label}
				placeholder={m('maps_admin.field.label_placeholder')}
			/>
		</div>
		<div class="admin-field">
			<label class="field-label" for="map-slug">{m('maps_admin.field.slug')}</label>
			<input
				id="map-slug"
				class="input"
				type="text"
				bind:value={form.slug}
				required
				pattern="[a-z0-9\-]+"
				title={m('maps_admin.field.slug_hint')}
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
				{editingMap ? m('common.save') : m('common.create')}
			</Button>
		</div>
	</form>
</Dialog>

<ConfirmDialog
	bind:open={confirmOpen}
	title={m('maps_admin.confirm_remove_title')}
	description={pendingRemove
		? m('maps_admin.confirm_remove_desc', mapViewById.get(pendingRemove.id)?.label ?? '')
		: ''}
	confirmLabel={m('common.remove')}
	loading={removing}
	onConfirm={confirmRemove}
	onCancel={() => (pendingRemove = null)}
/>

<style>
	.admin-list {
		grid-template-columns: 3rem 1fr 1fr auto;
	}
	.admin-row.protected {
		opacity: 0.7;
	}

	.badge {
		display: inline-block;
		margin-left: 0.6rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.64rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent);
		border: 1px solid var(--accent);
		padding: 0.1rem 0.4rem;
		border-radius: 2px;
		vertical-align: middle;
	}

	.remove-error {
		margin-bottom: 1rem;
	}
</style>
