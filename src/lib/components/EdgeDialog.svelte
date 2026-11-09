<script lang="ts">
	import Dialog from './Dialog.svelte';
	import Button from './Button.svelte';
	import { edges as edgesApi } from '$lib/services';
	import { localesState, localizedNode, localizedNodeType, m } from '$lib/i18n';
	import type { Edge, Node, NodeType } from '$lib/services';

	interface Props {
		open: boolean;
		nodes: Node[];
		types: NodeType[];
		editing?: Edge | null;
		defaultSource?: string;
		defaultTarget?: string;
		onSaved?: (saved: Edge) => void;
	}

	let {
		open = $bindable(false),
		nodes,
		types,
		editing = null,
		defaultSource = '',
		defaultTarget = '',
		onSaved
	}: Props = $props();

	let form = $state({ source: '', target: '' });
	let error = $state('');
	let saving = $state(false);
	let prevOpen = false;

	$effect(() => {
		if (open && !prevOpen) {
			if (editing) {
				form = { source: editing.source, target: editing.target };
			} else {
				form = { source: defaultSource, target: defaultTarget };
			}
			error = '';
		}
		prevOpen = open;
	});

	const code = $derived(localesState.current);

	const sortedNodes = $derived.by(() =>
		[...nodes]
			.map((n) => ({ raw: n, view: localizedNode(n, code) }))
			.sort((a, b) => {
				const la = types.find((t) => t.id === a.raw.type)?.layer_order ?? Number.MAX_SAFE_INTEGER;
				const lb = types.find((t) => t.id === b.raw.type)?.layer_order ?? Number.MAX_SAFE_INTEGER;
				if (la !== lb) return la - lb;
				return a.view.label.localeCompare(b.view.label, 'pt', { sensitivity: 'base' });
			})
	);

	function typeLabel(typeId: string): string {
		const t = types.find((x) => x.id === typeId);
		return t ? localizedNodeType(t, code).label : m('common.unknown');
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		saving = true;
		try {
			const payload = { source: form.source, target: form.target };
			const duplicate = await edgesApi.edgeExists(payload.source, payload.target, editing?.id);
			if (duplicate) {
				error = m('edge.error.duplicate');
				return;
			}
			const saved = editing
				? await edgesApi.updateEdge(editing.id, payload)
				: await edgesApi.createEdge(payload);
			open = false;
			onSaved?.(saved);
		} catch (err) {
			error = (err as Error).message || m('edge.error.save');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog
	bind:open
	title={editing ? m('edge.dialog.title.edit') : m('edge.dialog.title.new')}
	width="600px"
	dismissable={false}
>
	<form onsubmit={submit} class="form-grid">
		<div class="row-2">
			<div>
				<label class="field-label" for="edge-source">{m('edge.field.source')}</label>
				<select id="edge-source" class="input" bind:value={form.source} required>
					<option value="" disabled>{m('common.select')}</option>
					{#each sortedNodes as { raw, view } (raw.id)}
						<option value={raw.id}>
							{typeLabel(raw.type)} · {view.label}
						</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="field-label" for="edge-target">{m('edge.field.target')}</label>
				<select id="edge-target" class="input" bind:value={form.target} required>
					<option value="" disabled>{m('common.select')}</option>
					{#each sortedNodes as { raw, view } (raw.id)}
						<option value={raw.id}>
							{typeLabel(raw.type)} · {view.label}
						</option>
					{/each}
				</select>
			</div>
		</div>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<div class="actions">
			<Button type="submit" loading={saving}>
				{editing ? m('common.save') : m('edge.submit_create')}
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
	.row-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.actions {
		display: flex;
		gap: 0.7rem;
		margin-top: 0.4rem;
	}
	.error {
		color: var(--danger);
		font-family: 'Fira Mono', monospace;
		font-size: 0.78rem;
	}
	@media (max-width: 600px) {
		.row-2 {
			grid-template-columns: 1fr;
		}
	}
</style>
