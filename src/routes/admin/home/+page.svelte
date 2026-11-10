<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		ChevronDown,
		ChevronRight,
		ChevronUp,
		Image as ImageIcon,
		LayoutGrid,
		Plus,
		SquareStack,
		Trash2,
		Type
	} from '@lucide/svelte';
	import {
		AppMeta,
		Button,
		ConfirmDialog,
		LeaveGuard,
		LocalizedInput,
		LocalizedRichTextEditor,
		LogoGrid,
		PublishBar
	} from '$lib/components';
	import { auth, requireAdmin, journeys, maps, pages, type MapRecord } from '$lib/services';
	import { localesState, localizedMap, m, t, type Localized, type MessageKey } from '$lib/i18n';
	import {
		BLOCK_TYPES,
		blockProblem,
		CARDS_MAX,
		cleanBlock,
		IMAGES_MAX,
		LOGOS_MAX,
		missingByLocale,
		parseBlocks
	} from '$lib/page';
	import { samePublished } from '$lib/publish';
	import { PublishActionError, type PublishAction } from '$lib/services/publishing';
	import { LOGO_MAX_BYTES, LOGO_TYPES } from '$lib/settings';
	import { getActivePack, type ThemePack } from '$lib/theme';
	import type { Block, BlockType, CardTarget, CardsBlock, LinkCard, Logo, Page } from '$lib/types/page';

	requireAdmin();

	const code = $derived(localesState.current);

	let loading = $state(true);
	let loadFailed = $state(false);
	// The record's address and files, for the pictures' URLs; the blocks live below.
	let record = $state.raw<Page | null>(null);
	let mapList = $state<MapRecord[]>([]);
	let journeyList = $state<{ id: string; title: Localized }[]>([]);
	let pack = $state<ThemePack>('legacy');

	// What the visitor reads, null while unpublished, and the saved edit: the two differ when
	// there are unpublished changes.
	let published = $state.raw<Block[] | null>(null);
	let savedEdit = $state.raw<Block[]>([]);

	// The draft: everything below stays in the page until Save.
	let blocks = $state<Block[]>([]);
	let collapsed = $state<Record<string, boolean>>({});
	// One locale's lines alone, or every locale's (null).
	let filter = $state<string | null>(null);
	const shownLocales = $derived(
		filter ? localesState.all.filter((l) => l.code === filter) : localesState.all
	);

	let saving = $state(false);
	let acting = $state<PublishAction | null>(null);
	let uploading = $state<string | null>(null);
	let error = $state('');
	let justSaved = $state(false);
	let savedKey = $state('');
	// A text editor takes its content once: each load draws the blocks anew, so that Discard
	// shows the copy in the editors whose block ids it keeps.
	let loads = $state(0);

	const draftKey = $derived(JSON.stringify(blocks.map(cleanBlock)));
	const dirty = $derived(!loading && !loadFailed && draftKey !== savedKey);
	const changed = $derived(published !== null && !samePublished(savedEdit, published));

	$effect(() => {
		if (dirty) justSaved = false;
	});

	async function load() {
		try {
			const [home, allMaps, allJourneys] = await Promise.all([
				pages.getHome(),
				maps.getMaps(),
				journeys.getJourneys()
			]);
			record = home;
			mapList = allMaps;
			journeyList = allJourneys.flatMap((j) =>
				j.published ? [{ id: j.id, title: j.published.title }] : []
			);
			published = home.published && parseBlocks(home.published);
			savedEdit = parseBlocks(home.blocks);
			blocks = structuredClone(savedEdit);
			savedKey = JSON.stringify(blocks.map(cleanBlock));
			loads++;
		} catch {
			loadFailed = true;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		pack = getActivePack();
		void load();
	});

	// ── Blocks ──

	const TYPE_ICONS = { text: Type, image: ImageIcon, cards: SquareStack, logos: LayoutGrid };

	const newId = () => crypto.randomUUID().slice(0, 8);
	const newCard = (): LinkCard => ({
		title: {},
		text: {},
		target: { kind: 'map', id: mapList[0]?.id ?? '' }
	});
	const newLogo = (): Logo => ({ image: '', name: '', url: '' });

	function newBlock(type: BlockType): Block {
		const id = newId();
		switch (type) {
			case 'text':
				return { id, type, body: {} };
			case 'image':
				return { id, type, image: '', alt: {}, caption: {} };
			case 'cards':
				return { id, type, cards: [newCard()] };
			case 'logos':
				return { id, type, logos: [newLogo()] };
		}
	}

	// Where the type menu is open: before the block at that index, or at the end.
	let addingAt = $state<number | null>(null);

	function addBlock(type: BlockType, index: number) {
		blocks.splice(index, 0, newBlock(type));
		addingAt = null;
	}

	function moveBlock(index: number, delta: number) {
		const [block] = blocks.splice(index, 1);
		blocks.splice(index + delta, 0, block);
	}

	let removeAt = $state<number | null>(null);
	let removeOpen = $state(false);

	function askRemove(index: number) {
		removeAt = index;
		removeOpen = true;
	}

	function confirmRemove() {
		if (removeAt !== null) blocks.splice(removeAt, 1);
		removeAt = null;
		removeOpen = false;
	}

	const plain = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

	/** A line that tells blocks apart when they are collapsed. */
	function summary(block: Block): string {
		switch (block.type) {
			case 'text':
				return plain(t(block.body, code));
			case 'image':
				return t(block.alt, code) || block.image;
			case 'cards':
				return block.cards.map((c) => t(c.title, code)).filter(Boolean).join(' · ');
			case 'logos':
				return block.logos.map((l) => l.name).filter(Boolean).join(' · ');
		}
	}

	function missing(block: Block): [string, number][] {
		const counts = missingByLocale(block, localesState.all.map((l) => l.code));
		return Object.entries(counts).filter(([, n]) => n > 0);
	}

	// ── Cards ──

	function setKind(card: LinkCard, kind: CardTarget['kind']) {
		card.target =
			kind === 'url'
				? { kind, url: '' }
				: { kind, id: (kind === 'map' ? mapList[0]?.id : journeyList[0]?.id) ?? '' };
	}

	/** The map or journey a card points at left the lists: removed, or unpublished. */
	function targetGone(target: CardTarget): boolean {
		if (target.kind === 'url' || !target.id) return false;
		const list = target.kind === 'map' ? mapList : journeyList;
		return !list.some((x) => x.id === target.id);
	}

	function removeCard(block: CardsBlock, index: number) {
		block.cards.splice(index, 1);
	}

	// ── Pictures ──

	const imageUrl = (name: string) => (record && name ? pages.imageUrl(record, name) : '');

	/** Stores the chosen file in the page's files at once and hands its name to the block. */
	async function upload(ev: Event, key: string, use: (name: string) => void) {
		const input = ev.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || !record) return;
		error = '';
		if (file.size > LOGO_MAX_BYTES || !LOGO_TYPES.includes(file.type)) {
			error = m('home_admin.error.image');
			return;
		}
		if ((record.images ?? []).length >= IMAGES_MAX) {
			error = m('home_admin.error.too_many_images', IMAGES_MAX);
			return;
		}
		uploading = key;
		try {
			const { name, page } = await pages.addImage(record.id, file);
			record = page;
			use(name);
		} catch (err) {
			error = (err as Error).message || m('home_admin.error.image');
		} finally {
			uploading = null;
		}
	}

	// ── Save, publish, preview ──

	function validationError(): string | null {
		const def = localesState.default;
		for (const block of blocks) {
			const problem = blockProblem(block, def);
			if (problem) {
				collapsed[block.id] = false;
				return m(problem, def.toUpperCase());
			}
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
		if (!record) return false;
		saving = true;
		const key = draftKey;
		const edit = blocks.map(cleanBlock);
		try {
			await pages.saveBlocks(record.id, edit);
			savedKey = key;
			savedEdit = edit;
			justSaved = true;
			return true;
		} catch (err) {
			error = (err as Error).message || m('home_admin.error.save');
			return false;
		} finally {
			saving = false;
		}
	}

	/** Runs a publishing action on the server and keeps the copy it answers with. */
	async function act(action: PublishAction): Promise<boolean> {
		error = '';
		acting = action;
		try {
			published = await pages.runHomeAction(action);
			// Publish removed the files no block uses.
			if (action === 'publish') record = await pages.getHome();
			return true;
		} catch (err) {
			error =
				err instanceof PublishActionError
					? m(err.key)
					: (err as Error).message || m('home_admin.error.save');
			return false;
		} finally {
			acting = null;
		}
	}

	async function publish() {
		if (blocks.length === 0) {
			error = m('home_admin.error.no_blocks');
			return;
		}
		if (await save()) await act('publish');
	}

	// The server writes the copy back over the edit; the page then reads the edit again.
	async function discard() {
		if (await act('discard')) await load();
	}

	async function preview() {
		if (await save()) await goto('/admin/home/preview');
	}
</script>

{#snippet adder(index: number, end: boolean)}
	<div class="adder" class:end>
		{#if addingAt === index}
			<div class="type-menu" role="group" aria-label={m('home_admin.add_block')}>
				{#each BLOCK_TYPES as type (type)}
					{@const Icon = TYPE_ICONS[type]}
					<Button variant="secondary" onclick={() => addBlock(type, index)}>
						<Icon size={14} />
						{m(`home_admin.type.${type}`)}
					</Button>
				{/each}
				<Button variant="ghost" onclick={() => (addingAt = null)}>{m('common.cancel')}</Button>
			</div>
		{:else if end}
			<Button variant="secondary" onclick={() => (addingAt = index)}>
				<Plus size={14} />
				{m('home_admin.add_block')}
			</Button>
		{:else}
			<button class="insert" aria-label={m('home_admin.add_here')} onclick={() => (addingAt = index)}>
				<Plus size={14} />
			</button>
		{/if}
	</div>
{/snippet}

{#snippet picture(name: string, key: string, use: (name: string) => void, label: string)}
	<div class="picture">
		{#if name}
			<img class="thumb" src={imageUrl(name)} alt="" />
		{:else}
			<span class="thumb empty"><ImageIcon size={20} /></span>
		{/if}
		<div class="admin-field">
			<label class="field-label" for="file-{key}">{label}</label>
			<input
				id="file-{key}"
				class="input"
				type="file"
				accept={LOGO_TYPES.join(',')}
				disabled={uploading !== null}
				onchange={(ev) => upload(ev, key, use)}
			/>
			<p class="hint">
				{#if uploading === key}
					<span class="spinner" aria-hidden="true"></span> {m('home_admin.uploading')}
				{:else}
					{m('home_admin.image_hint')}
				{/if}
			</p>
		</div>
	</div>
{/snippet}

{#if auth.isAdmin}
	<main class="admin-page editor">
		{#if loading}
			<p class="admin-loading">
				<span class="spinner" aria-hidden="true"></span>
				{m('common.loading')}
			</p>
		{:else if loadFailed}
			<p class="admin-error">{m('home_admin.error.load')}</p>
		{:else}
			<section class="admin-hero">
				<AppMeta section={m('meta.admin')} />
				<div>
					<h1>{m('home_admin.title')}</h1>
					<p class="admin-lede">{m('home_admin.lede')}</p>
				</div>
			</section>

			<PublishBar
				published={published !== null}
				viewHref="/"
				{dirty}
				{changed}
				{justSaved}
				{error}
				{saving}
				{acting}
				discardDescription={m('home_admin.confirm_discard_desc')}
				unpublishDescription={m('home_admin.confirm_unpublish_desc')}
				onPreview={preview}
				onSave={save}
				onPublish={publish}
				onDiscard={discard}
				onUnpublish={() => act('unpublish')}
			/>

			{#if localesState.all.length > 1}
				<div class="filter" role="group" aria-label={m('home_admin.filter')}>
					<button class:active={filter === null} onclick={() => (filter = null)}>
						{m('common.all')}
					</button>
					{#each localesState.all as loc (loc.id)}
						<button class:active={filter === loc.code} onclick={() => (filter = loc.code)}>
							{loc.code.toUpperCase()}
						</button>
					{/each}
				</div>
			{/if}

			<section class="blocks">
				{#if blocks.length === 0}
					<p class="admin-empty">{m('home_admin.empty')}</p>
				{/if}
				{#each blocks as block, i (`${loads}:${block.id}`)}
					{@const Icon = TYPE_ICONS[block.type]}
					{#if i > 0}{@render adder(i, false)}{/if}
					<article class="block-card" data-type={block.type}>
						<header class="block-head">
							<button
								class="admin-icon-btn"
								aria-label={collapsed[block.id] ? m('home_admin.expand') : m('home_admin.collapse')}
								aria-expanded={!collapsed[block.id]}
								onclick={() => (collapsed[block.id] = !collapsed[block.id])}
							>
								{#if collapsed[block.id]}<ChevronRight size={16} />{:else}<ChevronDown size={16} />{/if}
							</button>
							<span class="block-type"><Icon size={14} />{m(`home_admin.type.${block.type}`)}</span>
							<span class="block-summary">{summary(block)}</span>
							{#each missing(block) as [loc, n] (loc)}
								<span class="missing">{m('home_admin.missing', loc.toUpperCase(), n)}</span>
							{/each}
							<button
								class="admin-icon-btn"
								disabled={i === 0}
								aria-label={m('common.move_up')}
								onclick={() => moveBlock(i, -1)}
							>
								<ChevronUp size={16} />
							</button>
							<button
								class="admin-icon-btn"
								disabled={i === blocks.length - 1}
								aria-label={m('common.move_down')}
								onclick={() => moveBlock(i, 1)}
							>
								<ChevronDown size={16} />
							</button>
							<button class="admin-icon-btn" aria-label={m('common.remove')} onclick={() => askRemove(i)}>
								<Trash2 size={14} />
							</button>
						</header>

						{#if !collapsed[block.id]}
							<div class="block-body">
								{#if block.type === 'text'}
									<div class="admin-field">
										<span class="field-label">{m('home_admin.field.text')}</span>
										<LocalizedRichTextEditor bind:value={block.body} headings locales={shownLocales} />
									</div>
								{:else if block.type === 'image'}
									<div class="columns">
										{@render picture(block.image, block.id, (name) => (block.image = name), m('home_admin.field.image'))}
										<div class="stack">
											<div class="admin-field">
												<span class="field-label">{m('home_admin.field.alt')}</span>
												<LocalizedInput
													id="{block.id}-alt"
													bind:value={block.alt}
													required={false}
													locales={shownLocales}
												/>
											</div>
											<div class="admin-field">
												<span class="field-label">{m('home_admin.field.caption')}</span>
												<LocalizedInput
													id="{block.id}-caption"
													bind:value={block.caption}
													required={false}
													locales={shownLocales}
												/>
											</div>
										</div>
									</div>
								{:else if block.type === 'cards'}
									<div class="items">
										{#each block.cards as card, c (c)}
											<div class="item">
												<div class="item-head">
													<span class="item-label">{m('home_admin.card_n', c + 1)}</span>
													{#if block.cards.length > 1}
														<button class="admin-action danger" onclick={() => removeCard(block, c)}>
															{m('common.remove_lower')}
														</button>
													{/if}
												</div>
												<div class="admin-field">
													<span class="field-label">{m('home_admin.field.card_title')}</span>
													<LocalizedInput
														id="{block.id}-card-{c}-title"
														bind:value={card.title}
														locales={shownLocales}
													/>
												</div>
												<div class="admin-field">
													<span class="field-label">{m('home_admin.field.card_text')}</span>
													<LocalizedInput
														id="{block.id}-card-{c}-text"
														bind:value={card.text}
														required={false}
														locales={shownLocales}
													/>
												</div>
												<div class="admin-field">
													<label class="field-label" for="{block.id}-card-{c}-kind">
														{m('home_admin.field.target')}
													</label>
													<div class="target">
														<select
															id="{block.id}-card-{c}-kind"
															class="input"
															value={card.target.kind}
															onchange={(ev) =>
																setKind(card, ev.currentTarget.value as CardTarget['kind'])}
														>
															<option value="map">{m('home_admin.target.map')}</option>
															<option value="journey">{m('home_admin.target.journey')}</option>
															<option value="url">{m('home_admin.target.url')}</option>
														</select>
														{#if card.target.kind === 'url'}
															<input
																class="input"
																type="text"
																placeholder="https://"
																aria-label={m('home_admin.target.url')}
																bind:value={card.target.url}
															/>
														{:else if card.target.kind === 'map'}
															<select class="input" aria-label={m('home_admin.target.map')} bind:value={card.target.id}>
																{#each mapList as map (map.id)}
																	<option value={map.id}>{localizedMap(map, code).label}</option>
																{/each}
																{#if targetGone(card.target)}
																	<option value={card.target.id}>{m('home_admin.target_gone')}</option>
																{/if}
															</select>
														{:else}
															<select
																class="input"
																aria-label={m('home_admin.target.journey')}
																bind:value={card.target.id}
															>
																{#if journeyList.length === 0}
																	<option value="">{m('home_admin.no_journeys')}</option>
																{/if}
																{#each journeyList as journey (journey.id)}
																	<option value={journey.id}>{t(journey.title, code)}</option>
																{/each}
																{#if targetGone(card.target)}
																	<option value={card.target.id}>{m('home_admin.target_gone')}</option>
																{/if}
															</select>
														{/if}
													</div>
												</div>
											</div>
										{/each}
									</div>
									{#if block.cards.length < CARDS_MAX}
										<Button variant="secondary" onclick={() => block.cards.push(newCard())}>
											<Plus size={14} />
											{m('home_admin.add_card')}
										</Button>
									{/if}
								{:else if block.type === 'logos'}
									<div class="items">
										{#each block.logos as logo, l (l)}
											<div class="item logo-item">
												{@render picture(
													logo.image,
													`${block.id}-${l}`,
													(name) => (logo.image = name),
													m('home_admin.field.logo_file')
												)}
												<div class="admin-field">
													<label class="field-label" for="{block.id}-logo-{l}-name">
														{m('home_admin.field.logo_name')}
													</label>
													<input id="{block.id}-logo-{l}-name" class="input" type="text" bind:value={logo.name} />
												</div>
												<div class="admin-field">
													<label class="field-label" for="{block.id}-logo-{l}-url">
														{m('home_admin.field.logo_url')}
													</label>
													<input
														id="{block.id}-logo-{l}-url"
														class="input"
														type="url"
														placeholder="https://"
														bind:value={logo.url}
													/>
												</div>
												<div class="logo-actions">
													<button
														class="admin-icon-btn"
														disabled={l === 0}
														aria-label={m('common.move_up')}
														onclick={() => block.logos.splice(l - 1, 0, ...block.logos.splice(l, 1))}
													>
														<ChevronUp size={16} />
													</button>
													<button
														class="admin-icon-btn"
														disabled={l === block.logos.length - 1}
														aria-label={m('common.move_down')}
														onclick={() => block.logos.splice(l + 1, 0, ...block.logos.splice(l, 1))}
													>
														<ChevronDown size={16} />
													</button>
													<button
														class="admin-icon-btn"
														disabled={block.logos.length === 1}
														aria-label={m('common.remove')}
														onclick={() => block.logos.splice(l, 1)}
													>
														<Trash2 size={14} />
													</button>
												</div>
											</div>
										{/each}
									</div>
									{#if block.logos.length < LOGOS_MAX}
										<Button variant="secondary" onclick={() => block.logos.push(newLogo())}>
											<Plus size={14} />
											{m('home_admin.add_logo')}
										</Button>
									{/if}
									{@const shown = block.logos
										.filter((x) => x.image)
										.map((x) => ({ src: imageUrl(x.image), name: x.name, url: '' }))}
									{#if shown.length > 0}
										<div class="modes">
											{#each ['light', 'dark'] as mode (mode)}
												<figure class="mode" data-theme={pack} data-mode={mode}>
													<LogoGrid logos={shown} />
													<figcaption>{m(`theme.mode_${mode}` as MessageKey)}</figcaption>
												</figure>
											{/each}
										</div>
									{/if}
								{/if}
							</div>
						{/if}
					</article>
				{/each}
				{@render adder(blocks.length, true)}
			</section>
		{/if}
	</main>
{/if}

<ConfirmDialog
	bind:open={removeOpen}
	title={m('home_admin.confirm_remove_title')}
	description={m('home_admin.confirm_remove_desc')}
	confirmLabel={m('common.remove')}
	cancelLabel={m('common.cancel')}
	onConfirm={confirmRemove}
	onCancel={() => (removeAt = null)}
/>

<LeaveGuard {dirty} />

<style>
	.editor {
		max-width: 1100px;
	}

	.filter {
		display: inline-flex;
		margin: 1.4rem 0 0;
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		overflow: hidden;
	}
	.filter button {
		padding: 0.35rem 0.8rem;
		background: transparent;
		border: 0;
		border-left: 1px solid var(--border);
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		cursor: pointer;
	}
	.filter button:first-child {
		border-left: 0;
	}
	.filter button.active {
		background: var(--accent-soft);
		color: var(--accent);
	}

	.blocks {
		display: flex;
		flex-direction: column;
		margin-top: 1.4rem;
	}

	.block-card {
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 3px;
	}
	.block-head {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 0.7rem;
	}
	.block-type {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent);
		margin-right: 0.5rem;
	}
	.block-summary {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.88rem;
		color: var(--text-muted);
	}
	.missing {
		font-family: 'Fira Mono', monospace;
		font-size: 0.66rem;
		letter-spacing: 0.06em;
		color: var(--status-draft);
		background: color-mix(in srgb, var(--status-draft) 14%, transparent);
		padding: 0.15rem 0.45rem;
		border-radius: 2px;
		white-space: nowrap;
	}
	.block-body {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1.1rem;
		padding: 1rem 1.2rem 1.3rem;
		border-top: 1px dashed var(--border);
	}
	.block-body > * {
		width: 100%;
	}
	.block-body > :global(button) {
		width: auto;
	}

	.columns {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
		gap: 1.2rem 2rem;
	}
	.stack {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.picture {
		display: grid;
		grid-template-columns: 6rem minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
	}
	.thumb {
		width: 6rem;
		height: 6rem;
		object-fit: contain;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: 2px;
	}
	/* a logo shows on its white square, as on the site */
	.logo-item .thumb {
		background: var(--logo-tile);
		border-color: var(--logo-tile-border);
	}
	.thumb.empty {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-soft);
	}
	.hint {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.35rem;
		font-size: 0.78rem;
		color: var(--text-soft);
	}

	.items {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.item {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		padding: 0.9rem 1rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 3px;
	}
	.item-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.item-label {
		font-family: 'Fira Mono', monospace;
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-soft);
	}
	.target {
		display: grid;
		grid-template-columns: 12rem minmax(0, 1fr);
		gap: 0.6rem;
	}
	.logo-item {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr) auto;
		align-items: start;
		gap: 1rem;
	}
	.logo-actions {
		display: flex;
		align-self: center;
	}

	/* each mode as wide as the site's row, so the preview wraps where the home does */
	.modes {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.mode {
		padding: 1.2rem 1rem 0.8rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 3px;
		color: var(--text);
	}
	.mode figcaption {
		margin-top: 0.8rem;
		text-align: center;
		font-family: 'Fira Mono', monospace;
		font-size: 0.66rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-soft);
	}

	.adder {
		display: flex;
		justify-content: center;
		padding: 0.35rem 0;
	}
	.adder.end {
		justify-content: flex-start;
		padding-top: 1rem;
	}
	.type-menu {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.insert {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 50%;
		border: 1px dashed var(--border-strong);
		background: var(--bg);
		color: var(--text-soft);
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.15s, color 0.15s, border-color 0.15s;
	}
	.insert:hover,
	.insert:focus-visible {
		opacity: 1;
		color: var(--accent);
		border-color: var(--accent);
	}

	@media (max-width: 900px) {
		.columns,
		.logo-item {
			grid-template-columns: 1fr;
		}
		.target {
			grid-template-columns: 1fr;
		}
	}
</style>
