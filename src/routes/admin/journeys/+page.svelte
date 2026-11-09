<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Plus } from '@lucide/svelte';
	import { AppMeta, Button, ConfirmDialog, Dialog, LocalizedInput, Pill } from '$lib/components';
	import { auth, journeys, maps, type MapRecord } from '$lib/services';
	import { localesState, localizedMap, m, t, type Localized } from '$lib/i18n';
	import { countedSteps } from '$lib/journey';
	import type { Journey } from '$lib/types/journey';

	$effect(() => {
		if (browser && !auth.isLoggedIn) goto(auth.loginPath());
	});

	let list = $state<Journey[]>([]);
	let mapList = $state<MapRecord[]>([]);
	let loading = $state(true);
	let listError = $state('');

	const code = $derived(localesState.current);

	function mapLabel(id: string): string {
		const map = mapList.find((x) => x.id === id);
		return map ? localizedMap(map, code).label : '';
	}

	const stepCount = (j: Journey) => j.expand?.journey_steps_via_journey?.length ?? 0;

	// Dialog
	let dialogOpen = $state(false);
	let form = $state({ slug: '', map: '', title: {} as Localized });
	let saving = $state(false);
	let error = $state('');

	// Confirm
	let confirmOpen = $state(false);
	let pendingRemove = $state<Journey | null>(null);
	let removing = $state(false);

	let toggling = $state<string | null>(null);

	async function refresh() {
		list = await journeys.getJourneys();
	}

	onMount(async () => {
		try {
			[mapList] = await Promise.all([maps.getMaps(), refresh()]);
		} finally {
			loading = false;
		}
	});

	function openNew() {
		form = { slug: '', map: mapList[0]?.id ?? '', title: {} as Localized };
		error = '';
		dialogOpen = true;
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		saving = true;
		try {
			const created = await journeys.createJourney({
				slug: form.slug,
				map: form.map,
				title: form.title,
				description: {},
				phases: [],
				documents: []
			});
			dialogOpen = false;
			await goto(`/admin/journeys/${created.id}`);
		} catch (err) {
			error = journeys.isSlugTaken(err)
				? m('journeys_admin.error.slug_taken')
				: (err as Error).message || m('journeys_admin.error.save');
		} finally {
			saving = false;
		}
	}

	async function togglePublished(j: Journey) {
		toggling = j.id;
		listError = '';
		try {
			await journeys.updateJourney(j.id, { published: !j.published });
			await refresh();
		} catch (err) {
			listError = (err as Error).message || m('journeys_admin.error.save');
		} finally {
			toggling = null;
		}
	}

	function askRemove(j: Journey) {
		pendingRemove = j;
		confirmOpen = true;
	}

	async function confirmRemove() {
		if (!pendingRemove) return;
		removing = true;
		listError = '';
		try {
			await journeys.deleteJourney(pendingRemove.id);
			await refresh();
		} catch (err) {
			listError = (err as Error).message || m('journeys_admin.error.save');
		} finally {
			confirmOpen = false;
			pendingRemove = null;
			removing = false;
		}
	}
</script>

{#if auth.isLoggedIn}
	<main class="admin-page">
		<section class="admin-hero">
			<AppMeta section={m('meta.admin')} />
			<div class="admin-head">
				<div>
					<h1>{m('journeys_admin.title')}</h1>
					<p class="admin-lede">{m('journeys_admin.lede')}</p>
				</div>
				<Button onclick={openNew} disabled={loading || mapList.length === 0}>
					<Plus size={14} />
					{m('journeys_admin.new')}
				</Button>
			</div>
		</section>

		<section class="admin-block">
			{#if listError}
				<p class="admin-error list-error">{listError}</p>
			{/if}
			{#if loading}
				<p class="admin-loading">
					<span class="spinner" aria-hidden="true"></span>
					{m('common.loading')}
				</p>
			{:else if list.length === 0}
				<p class="admin-empty">{m('journeys_admin.empty')}</p>
			{:else}
				<table class="admin-table">
					<thead>
						<tr>
							<th>{m('journeys_admin.field.title')}</th>
							<th class="fit wide">{m('journeys_admin.field.slug')}</th>
							<th class="fit wide">{m('journeys_admin.field.map')}</th>
							<th class="fit">{m('journeys_admin.col_status')}</th>
							<th class="num"></th>
						</tr>
					</thead>
					<tbody>
						{#each list as j (j.id)}
							<tr>
								<td>
									<a class="title" href="/admin/journeys/{j.id}"><strong>{t(j.title, code)}</strong></a>
									<span class="sub">
										{m('journeys.phases_n', j.phases?.length ?? 0)} ·
										{m('journeys.steps_n', countedSteps(j.expand?.journey_steps_via_journey ?? []))}
									</span>
								</td>
								<td class="fit wide mono">{j.slug}</td>
								<td class="fit wide">{mapLabel(j.map)}</td>
								<td class="fit">
									<Pill status={j.published ? 'confirmed' : 'draft'}>
										{j.published
											? m('journeys_admin.status.published')
											: m('journeys_admin.status.draft')}
									</Pill>
								</td>
								<td class="num">
									<button
										class="admin-action"
										disabled={toggling === j.id || (!j.published && stepCount(j) === 0)}
										title={!j.published && stepCount(j) === 0
											? m('journeys_admin.error.no_steps')
											: undefined}
										onclick={() => togglePublished(j)}
									>
										{j.published
											? m('journeys_admin.unpublish_lower')
											: m('journeys_admin.publish_lower')}
									</button>
									<a class="admin-action" href="/admin/journeys/{j.id}">{m('common.edit_lower')}</a>
									<button class="admin-action danger" onclick={() => askRemove(j)}>
										{m('common.remove_lower')}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</section>
	</main>
{/if}

<Dialog bind:open={dialogOpen} title={m('journeys_admin.new')} dismissable={false}>
	<form class="admin-form" onsubmit={submit}>
		<div class="admin-field">
			<span class="field-label">{m('journeys_admin.field.title')}</span>
			<LocalizedInput id="journey-title" bind:value={form.title} />
		</div>
		<div class="admin-field">
			<label class="field-label" for="journey-slug">{m('journeys_admin.field.slug')}</label>
			<input
				id="journey-slug"
				class="input"
				type="text"
				bind:value={form.slug}
				required
				pattern="[a-z0-9\-]+"
				title={m('journeys_admin.field.slug_hint')}
			/>
		</div>
		<div class="admin-field">
			<label class="field-label" for="journey-map">{m('journeys_admin.field.map')}</label>
			<select id="journey-map" class="input" bind:value={form.map} required>
				{#each mapList as map (map.id)}
					<option value={map.id}>{localizedMap(map, code).label}</option>
				{/each}
			</select>
		</div>
		{#if error}
			<p class="admin-error">{error}</p>
		{/if}
		<div class="admin-form-actions">
			<Button type="button" variant="secondary" onclick={() => (dialogOpen = false)}>
				{m('common.cancel')}
			</Button>
			<Button type="submit" loading={saving}>{m('common.create')}</Button>
		</div>
	</form>
</Dialog>

<ConfirmDialog
	bind:open={confirmOpen}
	title={m('journeys_admin.confirm_remove_title')}
	description={pendingRemove
		? m('journeys_admin.confirm_remove_desc', t(pendingRemove.title, code))
		: ''}
	confirmLabel={m('common.remove')}
	cancelLabel={m('common.cancel')}
	loading={removing}
	onConfirm={confirmRemove}
	onCancel={() => (pendingRemove = null)}
/>

<style>
	.list-error {
		margin-bottom: 1rem;
	}
	.title {
		color: inherit;
		text-decoration: none;
	}
	.title:hover {
		color: var(--accent);
	}
	.sub {
		display: block;
		font-size: 0.78rem;
		color: var(--text-soft);
		margin-top: 0.15rem;
	}
	.mono {
		font-family: 'Fira Mono', monospace;
		font-size: 0.82rem;
		color: var(--text-muted);
	}

	/* The editor shows both; on a phone the title needs the width. */
	@media (max-width: 900px) {
		.wide {
			display: none;
		}
	}
</style>
