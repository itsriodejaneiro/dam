<script lang="ts">
	import { GripVertical, X } from '@lucide/svelte';
	import Dialog from './Dialog.svelte';
	import Button from './Button.svelte';
	import LocalizedInput from './LocalizedInput.svelte';
	import LocalizedRichTextEditor from './LocalizedRichTextEditor.svelte';
	import { nodes as nodesApi, mapNodes as mapNodesApi } from '$lib/services';
	import { localesState, localizedNodeType, m, type Localized } from '$lib/i18n';
	import type { MapRecord, Node, NodeLink, NodeType } from '$lib/services';

	interface Props {
		open: boolean;
		types: NodeType[];
		editing?: Node | null;
		onSaved?: (saved: Node) => void;
		availableMaps?: MapRecord[];
		defaultMapId?: string;
	}

	let {
		open = $bindable(false),
		types,
		editing = null,
		onSaved,
		availableMaps = [],
		defaultMapId = ''
	}: Props = $props();

	interface FormLink {
		label: Localized;
		url: string;
	}

	let form = $state({
		type: '',
		label: {} as Localized,
		label_full: {} as Localized,
		description: {} as Localized,
		links: [] as FormLink[]
	});
	let error = $state('');
	let saving = $state(false);
	let prevOpen = false;

	let dragIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	const code = $derived(localesState.current);

	// Map membership: selectedMapIds drives checkboxes; recordIdByMap is the
	// PB record id for each membership (only populated when editing existing).
	let selectedMapIds = $state<string[]>([]);
	let recordIdByMap = $state<Record<string, string>>({});

	$effect.pre(() => {
		if (open && !prevOpen && editing && availableMaps.length > 0) {
			mapNodesApi.getMapsForNode(editing.id).then((records) => {
				selectedMapIds = records.map((r) => r.map);
				recordIdByMap = Object.fromEntries(records.map((r) => [r.map, r.id]));
			});
		} else if (open && !prevOpen && !editing) {
			selectedMapIds = defaultMapId ? [defaultMapId] : [];
			recordIdByMap = {};
		}
	});

	async function toggleMap(mapId: string, checked: boolean) {
		if (!editing) {
			selectedMapIds = checked
				? [...selectedMapIds, mapId]
				: selectedMapIds.filter((id) => id !== mapId);
			return;
		}
		if (checked) {
			const record = await mapNodesApi.addNodeToMap(mapId, editing.id);
			selectedMapIds = [...selectedMapIds, mapId];
			recordIdByMap = { ...recordIdByMap, [mapId]: record.id };
		} else {
			const recordId = recordIdByMap[mapId];
			if (recordId) {
				await mapNodesApi.removeNodeFromMap(recordId);
				selectedMapIds = selectedMapIds.filter((id) => id !== mapId);
				const { [mapId]: _, ...rest } = recordIdByMap;
				recordIdByMap = rest;
			}
		}
	}

	function normalizeLocalized(value: unknown): Localized {
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			return { ...(value as Localized) };
		}
		if (typeof value === 'string') return { [localesState.default]: value };
		return {};
	}

	$effect.pre(() => {
		if (open && !prevOpen) {
			if (editing) {
				const translations = editing.expand?.node_translations_via_node ?? [];
				const label: Localized = {};
				const label_full: Localized = {};
				const description: Localized = {};
				for (const tr of translations) {
					const loc = localesState.byId(tr.locale);
					if (!loc) continue;
					label[loc.code] = tr.label ?? '';
					label_full[loc.code] = tr.label_full ?? '';
					description[loc.code] = tr.description ?? '';
				}
				form = {
					type: editing.type,
					label,
					label_full,
					description,
					links: (editing.links ?? []).map((l) => ({
						label: normalizeLocalized(l.label),
						url: l.url
					}))
				};
			} else {
				form = {
					type: types[0]?.id ?? '',
					label: {},
					label_full: {},
					description: {},
					links: []
				};
			}
			error = '';
		}
		prevOpen = open;
	});

	function addLink() {
		form.links = [...form.links, { label: {}, url: '' }];
	}
	function removeLink(i: number) {
		form.links = form.links.filter((_, idx) => idx !== i);
	}
	function moveLink(from: number, to: number) {
		if (from === to || from < 0 || to < 0) return;
		const next = [...form.links];
		const [item] = next.splice(from, 1);
		next.splice(to, 0, item);
		form.links = next;
	}

	function onDragStart(ev: DragEvent, i: number) {
		if (!ev.dataTransfer) return;
		ev.dataTransfer.effectAllowed = 'move';
		ev.dataTransfer.setData('text/plain', String(i));
		dragIndex = i;
	}
	function onDragOver(ev: DragEvent, i: number) {
		ev.preventDefault();
		if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
		dragOverIndex = i;
	}
	function onDrop(ev: DragEvent, i: number) {
		ev.preventDefault();
		if (dragIndex !== null) moveLink(dragIndex, i);
		dragIndex = null;
		dragOverIndex = null;
	}
	function onDragEnd() {
		dragIndex = null;
		dragOverIndex = null;
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		if (availableMaps.length > 0 && selectedMapIds.length === 0) {
			error = m('node.field.maps_required');
			return;
		}
		// Default locale label is required (basic validation).
		const defLocale = localesState.default;
		if (!form.label[defLocale]?.trim()) {
			error = m('node.field.required_label', defLocale.toUpperCase());
			return;
		}
		saving = true;
		try {
			// Drops empty links (no label in the default locale and no url).
			const cleanedLinks: NodeLink[] = form.links
				.filter((l) => (l.label[defLocale] ?? '').trim() || l.url.trim())
				.map((l) => ({ label: l.label, url: l.url }));

			// Builds the translation payload: skips non-default locales with no label.
			const translations: Record<
				string,
				{ label: string; label_full: string; description: string }
			> = {};
			for (const loc of localesState.all) {
				const lbl = (form.label[loc.code] ?? '').trim();
				if (!lbl && !loc.is_default) continue;
				translations[loc.code] = {
					label: lbl,
					label_full: form.label_full[loc.code] ?? '',
					description: form.description[loc.code] ?? ''
				};
			}

			const nodePayload = { type: form.type, links: cleanedLinks };
			const saved = editing
				? await nodesApi.updateNode(editing.id, nodePayload, translations)
				: await nodesApi.createNode(nodePayload, translations);

			if (!editing) {
				for (const mapId of selectedMapIds) {
					await mapNodesApi.addNodeToMap(mapId, saved.id);
				}
			}
			open = false;
			onSaved?.(saved);
		} catch (err) {
			error = (err as Error).message || m('node.error.save');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog
	bind:open
	title={editing ? m('node.dialog.title.edit') : m('node.dialog.title.new')}
	dismissable={false}
>
	<form onsubmit={submit} class="form-grid">
		<div>
			<label class="field-label" for="node-type">{m('node.field.type')}</label>
			<select id="node-type" class="input" bind:value={form.type} required>
				{#each types as t (t.id)}
					<option value={t.id}>{localizedNodeType(t, code).label}</option>
				{/each}
			</select>
		</div>

		<div>
			<span class="field-label">{m('node.field.label')}</span>
			<LocalizedInput id="node-label" bind:value={form.label} placeholder={m('node.field.label_placeholder')} />
		</div>

		<div>
			<span class="field-label">{m('node.field.label_full')}</span>
			<LocalizedInput
				id="node-label-full"
				bind:value={form.label_full}
				placeholder={m('node.field.label_full_placeholder')}
			/>
		</div>

		<div>
			<span class="field-label">{m('node.field.description')}</span>
			{#key `${editing?.id ?? 'new'}-${open}`}
				<LocalizedRichTextEditor
					bind:value={form.description}
					placeholder={m('node.field.description_placeholder')}
					resetKey={`${editing?.id ?? 'new'}-${open}`}
				/>
			{/key}
		</div>

		<div class="links">
			<span class="field-label">{m('node.field.links')}</span>
			{#each form.links as link, i (link)}
				<div
					class="link-row"
					class:dragging={dragIndex === i}
					class:over={dragOverIndex === i && dragIndex !== i}
				>
					<div
						class="link-handle-col"
						draggable="true"
						ondragstart={(ev) => onDragStart(ev, i)}
						ondragover={(ev) => onDragOver(ev, i)}
						ondrop={(ev) => onDrop(ev, i)}
						ondragend={onDragEnd}
						role="listitem"
						aria-label={m('common.move_up')}
					>
						<GripVertical size={14} />
					</div>
					<div class="link-fields">
						<div>
							<span class="field-sublabel">{m('node.field.link_label')}</span>
							<LocalizedInput
								bind:value={link.label}
								placeholder={m('node.field.link_label_placeholder')}
								required={false}
							/>
						</div>
						<div>
							<span class="field-sublabel">{m('node.field.link_url')}</span>
							<input
								class="input"
								type="url"
								placeholder="https://…"
								bind:value={link.url}
							/>
						</div>
					</div>
					<button
						type="button"
						class="link-remove"
						onclick={() => removeLink(i)}
						aria-label={m('node.field.link_remove')}
					>
						<X size={14} />
					</button>
				</div>
			{/each}
			<button type="button" class="link-add" onclick={addLink}>{m('node.field.link_add')}</button>
		</div>

		{#if availableMaps.length > 0}
			<div class="maps-section">
				<span class="field-label">{m('node.field.maps')}</span>
				<div class="map-checks">
					{#each availableMaps as m (m.id)}
						<label class="map-check">
							<input
								type="checkbox"
								checked={selectedMapIds.includes(m.id)}
								onchange={(e) => toggleMap(m.id, e.currentTarget.checked)}
							/>
							{m.slug}
						</label>
					{/each}
				</div>
			</div>
		{/if}

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<div class="actions">
			<Button type="submit" loading={saving}>
				{editing ? m('common.save') : m('common.create')}
			</Button>
			<Button type="button" variant="ghost" onclick={() => (open = false)}>{m('common.cancel')}</Button>
		</div>
	</form>
</Dialog>

<style>
	.form-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.actions {
		display: flex;
		gap: 0.7rem;
		margin-top: 0.4rem;
	}

	.field-sublabel {
		display: block;
		font-family: 'Fira Mono', monospace;
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-soft);
		margin-bottom: 0.2rem;
	}

	.links {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.link-row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.5rem;
		align-items: start;
		padding: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 2px;
		background: var(--bg-elevated);
		transition: opacity 0.12s, border-color 0.12s, background 0.12s;
	}
	.link-row.dragging {
		opacity: 0.4;
	}
	.link-row.over {
		border-color: var(--accent);
		background: var(--accent-soft);
	}
	.link-handle-col {
		cursor: grab;
		color: var(--text-soft);
		display: inline-flex;
		align-items: center;
		padding: 0.6rem 0.2rem;
	}
	.link-row.dragging .link-handle-col {
		cursor: grabbing;
	}
	.link-handle-col:hover {
		color: var(--text);
	}
	.link-fields {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
	}
	.link-remove {
		background: transparent;
		border: 0;
		padding: 0.45rem;
		cursor: pointer;
		color: var(--text-soft);
		display: inline-flex;
		border-radius: 2px;
		align-self: start;
	}
	.link-remove:hover {
		color: var(--danger);
	}
	.link-add {
		align-self: flex-start;
		background: transparent;
		border: 1px dashed var(--border-strong);
		border-radius: 2px;
		padding: 0.45rem 0.7rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
		cursor: pointer;
		transition: color 0.12s, border-color 0.12s;
		margin-top: 0.2rem;
	}
	.link-add:hover {
		color: var(--accent);
		border-color: var(--accent);
		border-style: solid;
	}
	.maps-section {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.map-checks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem 1.2rem;
	}
	.map-check {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.88rem;
		cursor: pointer;
	}
	.map-check input[type='checkbox'] {
		accent-color: var(--accent);
	}
	.error {
		color: var(--danger);
		font-family: 'Fira Mono', monospace;
		font-size: 0.78rem;
	}
</style>
