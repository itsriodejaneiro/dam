<script lang="ts">
	import { browser } from '$app/environment';
	import { beforeNavigate, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { ChevronDown, ChevronUp, Plus, Trash2, Video } from '@lucide/svelte';
	import {
		AppMeta,
		Button,
		ConfirmDialog,
		JourneyGraph,
		LocalizedInput,
		LocalizedRichTextEditor,
		Pill
	} from '$lib/components';
	import { auth, requireAdmin, journeys, maps, type MapRecord } from '$lib/services';
	import { localesState, localizedMap, m, t, type Localized } from '$lib/i18n';
	import {
		fitCamera,
		fullCamera,
		liveHighlight,
		phaseColor,
		stepHighlight,
		stepNumbers
	} from '$lib/journey';
	import type { JourneyInput, StepInput } from '$lib/services/journeys';
	import type {
		CameraState,
		JourneyGraphData,
		JourneyPhase,
		JourneyStep,
		VisEdge,
		VisNode
	} from '$lib/types/journey';

	let { data } = $props();

	requireAdmin();

	type StepDraft = Omit<StepInput, 'order' | 'duration'> & { duration: Localized };

	const code = $derived(localesState.current);

	let loading = $state(true);
	let loadFailed = $state(false);
	let mapList = $state<MapRecord[]>([]);
	let graph = $state.raw<JourneyGraphData>({ types: [], nodes: [], edges: [] });

	// The draft: everything below stays in the page until Save.
	let published = $state(false);
	let form = $state<JourneyInput>({
		slug: '',
		map: '',
		title: {},
		description: {},
		phases: [],
		documents: []
	});
	let steps = $state<StepDraft[]>([]);
	let knownStepIds = new Set<string>();
	let removedStepIds: string[] = [];

	let selectedId = $state<string | null>(null);
	const selected = $derived(steps.find((s) => s.id === selectedId) ?? null);
	const numbers = $derived(stepNumbers(steps));

	// The camera on screen; it becomes the step's only through "Record camera".
	let view = $state.raw<CameraState>(fullCamera([]));
	let viewMoved = $state(false);

	let saving = $state(false);
	let publishing = $state(false);
	let error = $state('');
	let justSaved = $state(false);
	let savedKey = $state('');

	/** Blank locales leave the record, so t() falls back past them. */
	function cleaned(value: Localized): Localized {
		return Object.fromEntries(Object.entries(value).filter(([, text]) => text.trim() !== ''));
	}

	/** TipTap writes `<p></p>` for an empty editor: blank too. */
	function cleanedRich(value: Localized): Localized {
		return Object.fromEntries(
			Object.entries(value).filter(([, html]) => html.replace(/<[^>]*>/g, '').trim() !== '')
		);
	}

	function journeyPayload(): JourneyInput {
		return {
			slug: form.slug,
			map: form.map,
			title: cleaned(form.title),
			description: cleaned(form.description),
			phases: form.phases.map((p) => ({
				number: p.number,
				title: cleaned(p.title),
				summary: cleaned(p.summary),
				needed: [...p.needed]
			})),
			documents: form.documents.map((d) => ({
				id: d.id,
				label: cleaned(d.label),
				abbrev: cleaned(d.abbrev),
				unlockedAt: d.unlockedAt
			}))
		};
	}

	function stepsPayload(): StepInput[] {
		return steps.map((s, i) => {
			const duration = cleaned(s.duration);
			return {
				id: s.id,
				order: i + 1,
				phase: s.phase,
				title: cleaned(s.title),
				body: cleanedRich(s.body),
				duration: Object.keys(duration).length > 0 ? duration : null,
				camera: s.camera ? { ...s.camera } : null,
				highlight_nodes: [...s.highlight_nodes],
				highlight_edges: [...s.highlight_edges]
			};
		});
	}

	const draftKey = $derived(JSON.stringify([journeyPayload(), stepsPayload()]));
	const dirty = $derived(!loading && !loadFailed && draftKey !== savedKey);

	$effect(() => {
		if (dirty) justSaved = false;
	});

	function draftOf(step: JourneyStep): StepDraft {
		return {
			id: step.id,
			phase: step.phase,
			title: step.title ?? {},
			body: step.body ?? {},
			duration: step.duration ?? {},
			camera: step.camera,
			highlight_nodes: step.highlight_nodes ?? [],
			highlight_edges: step.highlight_edges ?? []
		};
	}

	onMount(async () => {
		try {
			const [journey, stepRecords, allMaps] = await Promise.all([
				journeys.getJourney(data.id),
				journeys.getSteps(data.id),
				maps.getMaps()
			]);
			mapList = allMaps;
			published = journey.published;
			form = {
				slug: journey.slug,
				map: journey.map,
				title: journey.title ?? {},
				description: journey.description ?? {},
				phases: journey.phases ?? [],
				documents: journey.documents ?? []
			};
			steps = stepRecords.map(draftOf);
			knownStepIds = new Set(stepRecords.map((s) => s.id));
			graph = await journeys.getJourneyGraph(journey.map);
			// Before the saved key: what left the map goes with the next Save, and is no edit.
			for (const s of steps) Object.assign(s, liveHighlight(s, graph));
			savedKey = JSON.stringify([journeyPayload(), stepsPayload()]);
			selectStep(steps[0]?.id ?? null);
		} catch {
			loadFailed = true;
		} finally {
			loading = false;
		}
	});

	// ── Graph: camera and highlight of the selected step ──

	function frameSelected() {
		view = selected?.camera
			? { ...selected.camera }
			: fitCamera(selected?.highlight_nodes ?? [], graph.nodes, graph.types);
		viewMoved = false;
	}

	function selectStep(id: string | null) {
		selectedId = id;
		frameSelected();
	}

	function moveView(next: CameraState) {
		view = next;
		viewMoved = true;
	}

	function recordCamera() {
		if (!selected) return;
		selected.camera = {
			centerX: Math.round(view.centerX * 10) / 10,
			centerY: Math.round(view.centerY * 10) / 10,
			zoom: Math.round(view.zoom * 1000) / 1000
		};
		viewMoved = false;
	}

	function useAutomaticCamera() {
		if (!selected) return;
		selected.camera = null;
		frameSelected();
	}

	const endId = (end: VisEdge['source']): string =>
		typeof end === 'object' ? end.id : (end as string);

	// A node brings the connections to the nodes already lit: the usual case, one click.
	// The author still takes any connection out, or lights one up, by clicking it.
	function toggleNode(node: VisNode) {
		if (!selected) return;
		if (selected.highlight_nodes.includes(node.id)) {
			selected.highlight_nodes = selected.highlight_nodes.filter((id) => id !== node.id);
			const touching = new Set(
				graph.edges
					.filter((e) => endId(e.source) === node.id || endId(e.target) === node.id)
					.map((e) => e.id)
			);
			selected.highlight_edges = selected.highlight_edges.filter((id) => !touching.has(id));
			return;
		}
		const lit = new Set(selected.highlight_nodes);
		const between = graph.edges
			.filter(
				(e) =>
					(endId(e.source) === node.id && lit.has(endId(e.target))) ||
					(endId(e.target) === node.id && lit.has(endId(e.source)))
			)
			.map((e) => e.id);
		selected.highlight_nodes = [...selected.highlight_nodes, node.id];
		selected.highlight_edges = [...new Set([...selected.highlight_edges, ...between])];
	}

	function toggleEdge(edge: VisEdge) {
		if (!selected) return;
		selected.highlight_edges = selected.highlight_edges.includes(edge.id)
			? selected.highlight_edges.filter((id) => id !== edge.id)
			: [...selected.highlight_edges, edge.id];
	}

	// ── Map ──

	let mapConfirmOpen = $state(false);
	let pendingMap = $state('');

	async function applyMap(mapId: string) {
		form.map = mapId;
		for (const s of steps) {
			s.camera = null;
			s.highlight_nodes = [];
			s.highlight_edges = [];
		}
		graph = await journeys.getJourneyGraph(mapId);
		frameSelected();
	}

	function chooseMap(ev: Event) {
		const select = ev.currentTarget as HTMLSelectElement;
		const next = select.value;
		const anyFraming = steps.some(
			(s) => s.camera || s.highlight_nodes.length > 0 || s.highlight_edges.length > 0
		);
		if (!anyFraming) {
			void applyMap(next);
			return;
		}
		select.value = form.map; // stays on the current one until confirmed
		pendingMap = next;
		mapConfirmOpen = true;
	}

	async function confirmMap() {
		mapConfirmOpen = false;
		await applyMap(pendingMap);
	}

	// ── Phases ──

	function addPhase() {
		form.phases.push({ number: form.phases.length + 1, title: {}, summary: {}, needed: [] });
	}

	const phaseInUse = (number: number) => steps.some((s) => s.phase === number);

	function removePhase(number: number) {
		form.phases = form.phases
			.filter((p) => p.number !== number)
			.map((p, i) => ({ ...p, number: i + 1 }));
		for (const s of steps) if (s.phase > number) s.phase -= 1;
	}

	function toggleNeeded(phase: JourneyPhase, docId: string) {
		phase.needed = phase.needed.includes(docId)
			? phase.needed.filter((id) => id !== docId)
			: [...phase.needed, docId];
	}

	// ── Steps ──

	function addStep() {
		const step: StepDraft = {
			id: journeys.newRecordId(),
			phase: steps.at(-1)?.phase ?? form.phases[0]?.number ?? 0,
			title: {},
			body: {},
			duration: {},
			camera: null,
			highlight_nodes: [],
			highlight_edges: []
		};
		steps.push(step);
		selectStep(step.id);
	}

	function moveStep(index: number, delta: number) {
		const [step] = steps.splice(index, 1);
		steps.splice(index + delta, 0, step);
	}

	function removeStep(index: number) {
		const { id } = steps[index];
		steps.splice(index, 1);
		if (knownStepIds.delete(id)) removedStepIds.push(id);
		for (const doc of form.documents) if (doc.unlockedAt === id) doc.unlockedAt = null;
		if (selectedId === id) selectStep(steps[Math.min(index, steps.length - 1)]?.id ?? null);
	}

	function stepLabel(step: StepDraft): string {
		const title = t(step.title, code) || m('journeys_admin.untitled');
		const number = numbers.get(step.id);
		return number ? `${number} ${title}` : title;
	}

	// ── Documents ──

	function addDocument() {
		form.documents.push({ id: journeys.newRecordId(), label: {}, abbrev: {}, unlockedAt: null });
	}

	function removeDocument(id: string) {
		form.documents = form.documents.filter((d) => d.id !== id);
		for (const phase of form.phases) phase.needed = phase.needed.filter((x) => x !== id);
	}

	// ── Save, publish, preview ──

	function validationError(): string | null {
		const def = localesState.default;
		if (!/^[a-z0-9-]+$/.test(form.slug)) return m('journeys_admin.field.slug_hint');
		if (!form.title[def]?.trim()) {
			return m('journeys_admin.error.title_required', def.toUpperCase());
		}
		const untitled = steps.find((s) => !s.title[def]?.trim());
		if (untitled) {
			selectStep(untitled.id);
			return m('journeys_admin.error.step_title_required', def.toUpperCase());
		}
		return null;
	}

	async function save(): Promise<boolean> {
		error = '';
		const invalid = validationError();
		if (invalid) {
			error = invalid;
			return false;
		}
		saving = true;
		const key = draftKey;
		try {
			await journeys.updateJourney(data.id, journeyPayload());
			await journeys.saveSteps(data.id, stepsPayload(), knownStepIds, removedStepIds);
			savedKey = key;
			justSaved = true;
			return true;
		} catch (err) {
			error = journeys.isSlugTaken(err)
				? m('journeys_admin.error.slug_taken')
				: (err as Error).message || m('journeys_admin.error.save');
			return false;
		} finally {
			saving = false;
		}
	}

	async function setPublished(next: boolean) {
		error = '';
		publishing = true;
		try {
			await journeys.updateJourney(data.id, { published: next });
			published = next;
		} catch (err) {
			error = (err as Error).message || m('journeys_admin.error.save');
		} finally {
			publishing = false;
		}
	}

	async function publish() {
		if (steps.length === 0) {
			error = m('journeys_admin.error.no_steps');
			return;
		}
		if (await save()) await setPublished(true);
	}

	let unpublishOpen = $state(false);

	// Writes only the flag: an edit in progress stays in the page, away from the live journey.
	function unpublish() {
		if (dirty) unpublishOpen = true;
		else void setPublished(false);
	}

	async function confirmUnpublish() {
		unpublishOpen = false;
		await setPublished(false);
	}

	async function preview() {
		if (await save()) await goto(`/admin/journeys/${data.id}/preview`);
	}

	// ── Leaving with unsaved changes ──

	let leaveOpen = $state(false);
	let leaveTo = '';
	let leaving = false;

	beforeNavigate((nav) => {
		if (!dirty || leaving) return;
		nav.cancel();
		// Closing the tab: the browser asks by itself.
		if (nav.type === 'leave' || !nav.to) return;
		leaveTo = nav.to.url.pathname + nav.to.url.search;
		leaveOpen = true;
	});

	async function confirmLeave() {
		leaving = true;
		leaveOpen = false;
		await goto(leaveTo);
	}
</script>

{#if auth.isAdmin}
	<main class="admin-page editor">
		{#if loading}
			<p class="admin-loading">
				<span class="spinner" aria-hidden="true"></span>
				{m('common.loading')}
			</p>
		{:else if loadFailed}
			<p class="admin-error">{m('journeys_admin.error.load')}</p>
		{:else}
			<section class="admin-hero">
				<AppMeta section={m('meta.admin')} />
				<div>
					<a class="admin-action back" href="/admin/journeys">{m('journeys_admin.back')}</a>
					<h1>{t(form.title, code) || m('journeys_admin.untitled')}</h1>
				</div>
			</section>

			<div class="toolbar">
				<Pill status={published ? 'confirmed' : 'draft'}>
					{published ? m('journeys_admin.status.published') : m('journeys_admin.status.draft')}
				</Pill>
				{#if error}
					<span class="admin-error">{error}</span>
				{:else if dirty}
					<span class="save-state">{m('journeys_admin.unsaved')}</span>
				{:else if justSaved}
					<span class="save-state saved">{m('journeys_admin.saved')}</span>
				{/if}
				<span class="spacer"></span>
				<Button variant="ghost" disabled={saving || publishing} onclick={preview}>
					{m('journeys_admin.preview')}
				</Button>
				<Button
					variant="secondary"
					loading={publishing}
					disabled={saving}
					onclick={published ? unpublish : publish}
				>
					{published ? m('journeys_admin.unpublish') : m('journeys_admin.publish')}
				</Button>
				<Button loading={saving} disabled={!dirty || publishing} onclick={save}>
					{m('common.save')}
				</Button>
			</div>

			<section class="admin-block">
				<h2>{m('journeys_admin.section.details')}</h2>
				<div class="columns">
					<div class="admin-field">
						<span class="field-label">{m('journeys_admin.field.title')}</span>
						<LocalizedInput id="journey-title" bind:value={form.title} />
					</div>
					<div class="admin-field">
						<span class="field-label">{m('journeys_admin.field.description')}</span>
						<LocalizedInput id="journey-desc" bind:value={form.description} required={false} />
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
						<select id="journey-map" class="input" value={form.map} onchange={chooseMap}>
							{#each mapList as map (map.id)}
								<option value={map.id}>{localizedMap(map, code).label}</option>
							{/each}
						</select>
					</div>
				</div>
			</section>

			<section class="admin-block">
				<h2>{m('journeys_admin.section.phases')}</h2>
				<p class="section-lede">{m('journeys_admin.phases_lede')}</p>
				{#if form.phases.length === 0}
					<p class="admin-empty">{m('journeys_admin.phases_empty')}</p>
				{/if}
				{#each form.phases as phase, i (i)}
					<div class="card" style="--phase-color: var(--node-slot-{phaseColor(phase.number)});">
						<div class="card-head">
							<span class="phase-chip">{m('journeys_admin.phase_n', phase.number)}</span>
							<button
								class="admin-action danger"
								disabled={phaseInUse(phase.number)}
								title={phaseInUse(phase.number) ? m('journeys_admin.phase_in_use') : undefined}
								onclick={() => removePhase(phase.number)}
							>
								{m('common.remove_lower')}
							</button>
						</div>
						<div class="columns">
							<div class="admin-field">
								<span class="field-label">{m('journeys_admin.field.title')}</span>
								<LocalizedInput id="phase-{i}-title" bind:value={phase.title} />
							</div>
							<div class="admin-field">
								<span class="field-label">{m('journeys_admin.field.phase_summary')}</span>
								<LocalizedInput id="phase-{i}-summary" bind:value={phase.summary} required={false} />
							</div>
						</div>
						{#if form.documents.length > 0 && i < form.phases.length - 1}
							<div class="admin-field needed">
								<span class="field-label">{m('journeys_admin.field.phase_needed')}</span>
								<div class="checks">
									{#each form.documents as doc (doc.id)}
										<label class="check">
											<input
												type="checkbox"
												checked={phase.needed.includes(doc.id)}
												onchange={() => toggleNeeded(phase, doc.id)}
											/>
											{t(doc.label, code) || m('journeys_admin.untitled')}
										</label>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/each}
				<Button variant="secondary" onclick={addPhase}>
					<Plus size={14} />
					{m('journeys_admin.add_phase')}
				</Button>
			</section>

			<section class="admin-block">
				<h2>{m('journeys_admin.section.steps')}</h2>
				<div class="steps-layout">
					<div class="graph-col">
						<div class="graph-frame">
							<JourneyGraph
								nodes={graph.nodes}
								edges={graph.edges}
								types={graph.types}
								camera={view}
								highlight={selected ? stepHighlight(selected) : null}
								pickable={selected !== null}
								onNodeClick={toggleNode}
								onEdgeClick={selected ? toggleEdge : undefined}
								onCameraChange={moveView}
							/>
						</div>
						{#if selected}
							<div class="camera-bar">
								<span class="camera-state" class:moved={viewMoved}>
									{viewMoved
										? m('journeys_admin.camera_moved')
										: selected.camera
											? m('journeys_admin.camera_recorded')
											: m('journeys_admin.camera_auto')}
								</span>
								<span class="highlight-count">
									{m(
										'journeys_admin.highlight_count',
										selected.highlight_nodes.length,
										selected.highlight_edges.length
									)}
								</span>
								<span class="spacer"></span>
								<Button
									variant="ghost"
									disabled={!selected.camera && !viewMoved}
									onclick={useAutomaticCamera}
								>
									{m('journeys_admin.auto_camera')}
								</Button>
								<Button
									variant="secondary"
									disabled={selected.camera !== null && !viewMoved}
									onclick={recordCamera}
								>
									<Video size={14} />
									{m('journeys_admin.record_camera')}
								</Button>
							</div>
							<p class="hint">{m('journeys_admin.graph_hint')}</p>
						{:else}
							<p class="hint">{m('journeys_admin.select_step')}</p>
						{/if}
					</div>

					<div class="steps-col">
						{#if steps.length === 0}
							<p class="admin-empty">{m('journeys_admin.steps_empty')}</p>
						{:else}
							<ol class="step-list">
								{#each steps as step, i (step.id)}
									<li
										class="step-row"
										class:selected={step.id === selectedId}
										style="--phase-color: var(--node-slot-{phaseColor(step.phase)});"
									>
										<button class="step-pick" onclick={() => selectStep(step.id)}>
											<span class="step-number">{numbers.get(step.id) ?? '·'}</span>
											<span class="step-title">
												{t(step.title, code) || m('journeys_admin.untitled')}
											</span>
											{#if step.camera}
												<Video size={12} aria-hidden="true" />
											{/if}
										</button>
										<button
											class="admin-icon-btn"
											disabled={i === 0}
											aria-label={m('common.move_up')}
											onclick={() => moveStep(i, -1)}
										>
											<ChevronUp size={16} />
										</button>
										<button
											class="admin-icon-btn"
											disabled={i === steps.length - 1}
											aria-label={m('common.move_down')}
											onclick={() => moveStep(i, 1)}
										>
											<ChevronDown size={16} />
										</button>
										<button
											class="admin-icon-btn"
											aria-label={m('common.remove')}
											onclick={() => removeStep(i)}
										>
											<Trash2 size={14} />
										</button>
									</li>
								{/each}
							</ol>
						{/if}
						<Button variant="secondary" onclick={addStep}>
							<Plus size={14} />
							{m('journeys_admin.add_step')}
						</Button>

						{#if selected}
							{#key selected.id}
								<div class="step-form">
									<div class="admin-field">
										<label class="field-label" for="step-phase">
											{m('journeys_admin.field.phase')}
										</label>
										<select id="step-phase" class="input" bind:value={selected.phase}>
											<option value={0}>{m('journeys.introduction')}</option>
											{#each form.phases as phase (phase.number)}
												<option value={phase.number}>
													{phase.number} · {t(phase.title, code) || m('journeys_admin.untitled')}
												</option>
											{/each}
										</select>
									</div>
									<div class="admin-field">
										<span class="field-label">{m('journeys_admin.field.title')}</span>
										<LocalizedInput id="step-title" bind:value={selected.title} />
									</div>
									<div class="admin-field">
										<span class="field-label">{m('journeys_admin.field.duration')}</span>
										<LocalizedInput id="step-duration" bind:value={selected.duration} required={false} />
									</div>
									<div class="admin-field">
										<span class="field-label">{m('journeys_admin.field.body')}</span>
										<LocalizedRichTextEditor bind:value={selected.body} />
									</div>
								</div>
							{/key}
						{/if}
					</div>
				</div>
			</section>

			<section class="admin-block">
				<h2>{m('journeys.documents')}</h2>
				<p class="section-lede">{m('journeys_admin.documents_lede')}</p>
				{#if form.documents.length === 0}
					<p class="admin-empty">{m('journeys_admin.documents_empty')}</p>
				{/if}
				{#each form.documents as doc (doc.id)}
					<div class="card">
						<div class="columns three">
							<div class="admin-field">
								<span class="field-label">{m('journeys_admin.field.doc_label')}</span>
								<LocalizedInput id="doc-{doc.id}-label" bind:value={doc.label} />
							</div>
							<div class="admin-field">
								<span class="field-label">{m('journeys_admin.field.doc_abbrev')}</span>
								<LocalizedInput id="doc-{doc.id}-abbrev" bind:value={doc.abbrev} />
							</div>
							<div class="admin-field">
								<label class="field-label" for="doc-{doc.id}-step">
									{m('journeys_admin.field.doc_unlocked_at')}
								</label>
								<select id="doc-{doc.id}-step" class="input" bind:value={doc.unlockedAt}>
									<option value={null}>{m('journeys_admin.doc_held')}</option>
									{#each steps as step (step.id)}
										<option value={step.id}>{stepLabel(step)}</option>
									{/each}
								</select>
								<button class="admin-action danger doc-remove" onclick={() => removeDocument(doc.id)}>
									{m('common.remove_lower')}
								</button>
							</div>
						</div>
					</div>
				{/each}
				<Button variant="secondary" onclick={addDocument}>
					<Plus size={14} />
					{m('journeys_admin.add_document')}
				</Button>
			</section>
		{/if}
	</main>
{/if}

<ConfirmDialog
	bind:open={mapConfirmOpen}
	title={m('journeys_admin.confirm_map_title')}
	description={m('journeys_admin.confirm_map_desc')}
	confirmLabel={m('journeys_admin.confirm_map_action')}
	cancelLabel={m('common.cancel')}
	onConfirm={confirmMap}
/>

<ConfirmDialog
	bind:open={unpublishOpen}
	title={m('journeys_admin.confirm_unpublish_title')}
	description={m('journeys_admin.confirm_unpublish_desc')}
	confirmLabel={m('journeys_admin.unpublish')}
	cancelLabel={m('common.cancel')}
	onConfirm={confirmUnpublish}
/>

<ConfirmDialog
	bind:open={leaveOpen}
	title={m('journeys_admin.leave_title')}
	description={m('journeys_admin.leave_desc')}
	confirmLabel={m('journeys_admin.leave_action')}
	cancelLabel={m('common.cancel')}
	onConfirm={confirmLeave}
/>

<style>
	.editor {
		max-width: 1500px;
	}
	.back {
		margin-left: 0;
	}
	h2 {
		font-size: 1.15rem;
		font-weight: 500;
		letter-spacing: -0.01em;
		margin-bottom: 1.2rem;
	}
	.section-lede {
		margin: -0.6rem 0 1.2rem;
		color: var(--text-muted);
		font-size: 0.88rem;
	}

	.toolbar {
		position: sticky;
		top: 4.5rem;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.7rem 0;
		background: var(--bg);
		border-top: 1px solid var(--border);
	}
	.spacer {
		flex: 1;
	}
	.save-state {
		font-family: 'Fira Mono', monospace;
		font-size: 0.78rem;
		color: var(--text-soft);
	}
	.save-state.saved {
		color: var(--accent);
	}

	.columns {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.2rem 2rem;
	}
	.columns.three {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.card {
		padding: 1.1rem 1.2rem;
		margin-bottom: 0.9rem;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 3px;
	}
	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.9rem;
	}
	.phase-chip {
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
	.needed {
		margin-top: 1rem;
	}
	.checks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 1.2rem;
	}
	.check {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.88rem;
		color: var(--text-muted);
	}
	.doc-remove {
		align-self: flex-end;
		margin-top: 0.7rem;
	}

	.steps-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 460px;
		gap: 2rem;
		align-items: start;
	}
	.graph-col {
		position: sticky;
		top: 9rem;
	}
	.graph-frame {
		height: min(62vh, 620px);
	}
	.camera-bar {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		margin-top: 0.7rem;
	}
	.camera-state,
	.highlight-count {
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		color: var(--text-soft);
	}
	.camera-state.moved {
		color: var(--accent);
	}
	.hint {
		margin-top: 0.5rem;
		font-size: 0.8rem;
		color: var(--text-soft);
	}

	.steps-col {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.8rem;
	}
	.steps-col > :global(*) {
		max-width: 100%;
	}
	.step-list {
		list-style: none;
		padding: 0;
		margin: 0;
		width: 100%;
	}
	.step-row {
		display: flex;
		align-items: center;
		gap: 0.1rem;
		border-bottom: 1px solid var(--border);
		border-left: 3px solid transparent;
		padding-right: 0.3rem;
	}
	.step-row.selected {
		border-left-color: var(--phase-color);
		background: var(--bg-elevated);
	}
	.step-pick {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.55rem 0.6rem;
		background: transparent;
		border: 0;
		color: var(--text);
		font: inherit;
		font-size: 0.9rem;
		text-align: left;
		cursor: pointer;
	}
	.step-number {
		font-family: 'Fira Mono', monospace;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--phase-color);
		min-width: 2rem;
	}
	.step-title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.step-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		margin-top: 0.6rem;
		padding-top: 1.1rem;
		border-top: 1px dashed var(--border);
	}

	@media (max-width: 1100px) {
		.steps-layout {
			grid-template-columns: 1fr;
		}
		.graph-col {
			position: static;
		}
		.columns,
		.columns.three {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 900px) {
		.toolbar {
			position: static;
			flex-wrap: wrap;
		}
	}
</style>
