<script lang="ts">
	import Button from './Button.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import Pill from './Pill.svelte';
	import { m } from '$lib/i18n';
	import type { PublishAction } from '$lib/services/publishing';

	/*
	 * The bar of an editor whose edit goes to the site as a copy (a journey, the home): the
	 * state of the copy, and Preview, Discard edit, Unpublish, Publish and Save. It asks before
	 * a discard, and before an unpublish that leaves unsaved changes in the page.
	 */
	interface Props {
		/** There is a copy on the site. */
		published: boolean;
		/** Where the copy is. */
		viewHref: string;
		/** The page holds changes not yet saved. */
		dirty: boolean;
		/** The saved edit differs from the copy. */
		changed: boolean;
		justSaved: boolean;
		error: string;
		saving: boolean;
		acting: PublishAction | null;
		/** What a discard brings back, said in the confirmation. */
		discardDescription: string;
		/** What an unpublish with unsaved changes does, said in the confirmation. */
		unpublishDescription: string;
		onPreview: () => void;
		onSave: () => void;
		onPublish: () => void;
		onDiscard: () => void;
		onUnpublish: () => void;
	}

	let {
		published,
		viewHref,
		dirty,
		changed,
		justSaved,
		error,
		saving,
		acting,
		discardDescription,
		unpublishDescription,
		onPreview,
		onSave,
		onPublish,
		onDiscard,
		onUnpublish
	}: Props = $props();

	const busy = $derived(saving || acting !== null);
	// Saved or not, what Publish would send and Discard would drop.
	const unpublished = $derived(published && (dirty || changed));

	let discardOpen = $state(false);
	let unpublishOpen = $state(false);

	// Empties the copy alone: an edit in progress stays in the page, unsaved.
	function unpublish() {
		if (dirty) unpublishOpen = true;
		else onUnpublish();
	}
</script>

<div class="publish-bar">
	<Pill status={published ? 'confirmed' : 'draft'}>
		{published ? m('publish.status.published') : m('publish.status.draft')}
	</Pill>
	{#if published}
		<a class="admin-action" href={viewHref} target="_blank" rel="noopener">
			{m('publish.view_published')}
		</a>
	{/if}
	{#if error}
		<span class="admin-error">{error}</span>
	{:else}
		{#if changed}
			<span class="save-state">{m('publish.unpublished_changes')}</span>
		{/if}
		{#if dirty}
			<span class="save-state">{m('publish.unsaved')}</span>
		{:else if justSaved}
			<span class="save-state saved">{m('publish.saved')}</span>
		{/if}
	{/if}
	<span class="spacer"></span>
	<Button variant="ghost" disabled={busy} onclick={onPreview}>
		{m('publish.preview')}
	</Button>
	{#if unpublished}
		<Button
			variant="ghost"
			loading={acting === 'discard'}
			disabled={busy}
			onclick={() => (discardOpen = true)}
		>
			{m('publish.discard')}
		</Button>
	{/if}
	{#if published}
		<Button variant="secondary" loading={acting === 'unpublish'} disabled={busy} onclick={unpublish}>
			{m('publish.unpublish')}
		</Button>
	{/if}
	{#if !published || unpublished}
		<Button variant="secondary" loading={acting === 'publish'} disabled={busy} onclick={onPublish}>
			{m('publish.publish')}
		</Button>
	{/if}
	<Button loading={saving} disabled={!dirty || busy} onclick={onSave}>
		{m('common.save')}
	</Button>
</div>

<ConfirmDialog
	bind:open={unpublishOpen}
	title={m('publish.confirm_unpublish_title')}
	description={unpublishDescription}
	confirmLabel={m('publish.unpublish')}
	cancelLabel={m('common.cancel')}
	onConfirm={() => {
		unpublishOpen = false;
		onUnpublish();
	}}
/>

<ConfirmDialog
	bind:open={discardOpen}
	title={m('publish.confirm_discard_title')}
	description={discardDescription}
	confirmLabel={m('publish.discard')}
	cancelLabel={m('common.cancel')}
	onConfirm={() => {
		discardOpen = false;
		onDiscard();
	}}
/>

<style>
	.publish-bar {
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

	@media (max-width: 900px) {
		.publish-bar {
			position: static;
			flex-wrap: wrap;
		}
	}
</style>
