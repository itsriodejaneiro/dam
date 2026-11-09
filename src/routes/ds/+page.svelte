<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { AppMeta, Button, Tag, Pill, Dialog, ConfirmDialog, RichTextEditor, DocInventory, PhaseTransitionCard, PackSwitch, SettingsFields, ThemeToggle, JourneyGraph } from '$lib/components';
	import type { DocumentState, GraphHighlight, PhaseTransition, JourneyDocument, VisEdge, VisNode } from '$lib/types/journey';
	import { fullCamera, laneCenter } from '$lib/journey';
	import { auth, type NodeType } from '$lib/services';
	import { m, type Localized } from '$lib/i18n';

	$effect(() => {
		if (browser && !auth.isLoggedIn) goto('/login');
	});

	// Swatches read the --node-slot-* resolved on <html>, reflecting the active pack.
	// A MutationObserver re-reads when data-theme/data-mode changes (PackSwitch/ThemeToggle).
	let slots = $state<string[]>([]);
	function readSlots() {
		if (!browser) return;
		const cs = getComputedStyle(document.documentElement);
		slots = Array.from({ length: 8 }, (_, i) => cs.getPropertyValue(`--node-slot-${i + 1}`).trim());
	}
	onMount(() => {
		readSlots();
		const obs = new MutationObserver(readSlots);
		obs.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme', 'data-mode']
		});
		return () => obs.disconnect();
	});

	let dialogOpen = $state(false);
	let confirmOpen = $state(false);
	let confirmLoading = $state(false);

	async function fakeConfirm() {
		confirmLoading = true;
		await new Promise((r) => setTimeout(r, 800));
		confirmLoading = false;
		confirmOpen = false;
	}
	// DocInventory mock: Localized in the 4 languages (the demo follows the language).
	const mockDocs: DocumentState[] = [
		{ id: 'id-card', label: { pt: 'BI', en: 'ID', fr: 'CNI', es: 'DNI' }, abbrev: { pt: 'BI', en: 'ID', fr: 'CNI', es: 'DNI' }, unlockedAt: null, phase: 0, unlocked: true, justUnlocked: false },
		{ id: 'tax-id', label: { pt: 'NIF', en: 'Tax ID', fr: 'NIF', es: 'NIF' }, abbrev: { pt: 'NIF', en: 'Tax ID', fr: 'NIF', es: 'NIF' }, unlockedAt: null, phase: 0, unlocked: true, justUnlocked: false },
		{ id: 'title-prov', label: { pt: 'Título provisório', en: 'Prov. title', fr: 'Titre prov.', es: 'Título prov.' }, abbrev: { pt: 'Título prov.', en: 'Prov. title', fr: 'Titre prov.', es: 'Título prov.' }, unlockedAt: 'step-04', phase: 1, unlocked: true, justUnlocked: false },
		{ id: 'permit-c', label: { pt: 'Alvará C.', en: 'Const. P.', fr: 'Permis C.', es: 'Permiso C.' }, abbrev: { pt: 'Alvará C.', en: 'Const. P.', fr: 'Permis C.', es: 'Permiso C.' }, unlockedAt: 'step-05', phase: 2, unlocked: false, justUnlocked: false },
		{ id: 'permit-u', label: { pt: 'Alvará U.', en: 'Use P.', fr: 'Permis U.', es: 'Permiso U.' }, abbrev: { pt: 'Alvará U.', en: 'Use P.', fr: 'Permis U.', es: 'Permiso U.' }, unlockedAt: 'step-07', phase: 2, unlocked: false, justUnlocked: false },
	];
	const mockPhaseColor = (p: number) => ['3', '3', '6', '1'][p] ?? '3';

	// PhaseTransitionCard mock
	const mockTransition: PhaseTransition = {
		fromPhase: 1, toPhase: 2,
		summary: {
			pt: 'O direito de uso da terra está garantido.',
			en: 'The land use right is secured.',
			fr: "Le droit d'usage du sol est garanti.",
			es: 'El derecho de uso del suelo está garantizado.'
		},
		obtained: ['title-prov'], needed: ['title-prov', 'permit-c']
	};
	const mockTransDocs: JourneyDocument[] = [
		{ id: 'title-prov', label: { pt: 'Título provisório', en: 'Provisional title', fr: 'Titre foncier prov.', es: 'Título provisional' }, abbrev: { pt: 'Título prov.', en: 'Prov. title', fr: 'Titre prov.', es: 'Título prov.' }, unlockedAt: 'step-04' },
		{ id: 'permit-c', label: { pt: 'Alvará de Construção', en: 'Construction Permit', fr: 'Permis de construire', es: 'Permiso de construcción' }, abbrev: { pt: 'Alvará C.', en: 'Const. P.', fr: 'Permis C.', es: 'Permiso C.' }, unlockedAt: 'step-05' },
	];

	// JourneyGraph mock: records in the shape the graph reads, at fixed positions, in the 4 languages.
	const mockRecord = (id: string) => ({ id, collectionId: 'ds', collectionName: 'ds' });
	const mockType = (id: string, layer_order: number, color_slot: number, label: Localized): NodeType => ({
		...mockRecord(id),
		slug: id,
		layer_order,
		color_slot,
		base_size: 10,
		expand: {
			node_type_translations_via_node_type: Object.entries(label).map(([locale, text]) => ({
				...mockRecord(`${id}-${locale}`),
				node_type: id,
				locale,
				label: text,
				label_plural: text
			}))
		}
	});
	const mockAgencies = mockType('agency', 1, 8, { pt: 'Órgãos', en: 'Agencies', fr: 'Organismes', es: 'Organismos' });
	const mockHosting = mockType('hosting', 2, 6, { pt: 'Hospedagem', en: 'Hosting', fr: 'Hébergement', es: 'Alojamiento' });
	const mockServices = mockType('service', 3, 1, { pt: 'Serviços', en: 'Services', fr: 'Services', es: 'Servicios' });
	const mockTypes = [mockAgencies, mockHosting, mockServices];
	const mockLinks = [
		['regulator', 'registry'],
		['regulator', 'dns'],
		['regulator', 'data-center'],
		['registry', 'data-center'],
		['registry', 'cloud'],
		['dns', 'data-center'],
		['dns', 'portal'],
		['data-center', 'portal'],
		['data-center', 'payments'],
		['cloud', 'payments']
	];
	const mockNode = (id: string, type: NodeType, x: number, label: Localized): VisNode => ({
		id,
		type,
		x,
		y: laneCenter(type.layer_order),
		degree: mockLinks.filter((link) => link.includes(id)).length,
		raw: {
			...mockRecord(id),
			type: type.id,
			links: [],
			order: 0,
			weight_override: null,
			expand: {
				node_translations_via_node: Object.entries(label).map(([locale, text]) => ({
					...mockRecord(`${id}-${locale}`),
					node: id,
					locale,
					label: text,
					label_full: '',
					description: ''
				}))
			}
		}
	});
	const mockNodes = [
		mockNode('regulator', mockAgencies, 420, { pt: 'Regulador', en: 'Regulator', fr: 'Régulateur', es: 'Regulador' }),
		mockNode('registry', mockAgencies, 860, { pt: 'Registro', en: 'Registry', fr: 'Registre', es: 'Registro' }),
		mockNode('dns', mockHosting, 280, { pt: 'DNS', en: 'DNS', fr: 'DNS', es: 'DNS' }),
		mockNode('data-center', mockHosting, 640, { pt: 'Data center', en: 'Data center', fr: 'Centre de données', es: 'Centro de datos' }),
		mockNode('cloud', mockHosting, 1000, { pt: 'Nuvem', en: 'Cloud', fr: 'Cloud', es: 'Nube' }),
		mockNode('portal', mockServices, 460, { pt: 'Portal', en: 'Portal', fr: 'Portail', es: 'Portal' }),
		mockNode('payments', mockServices, 820, { pt: 'Pagamentos', en: 'Payments', fr: 'Paiements', es: 'Pagos' })
	];
	const mockEdges: VisEdge[] = mockLinks.map(([source, target]) => ({
		id: `${source}-${target}`,
		source: mockNodes.find((n) => n.id === source)!,
		target: mockNodes.find((n) => n.id === target)!
	}));
	const mockHighlight: GraphHighlight = {
		nodes: new Set(['regulator', 'data-center', 'portal']),
		edges: new Set(['regulator-data-center', 'data-center-portal'])
	};

	let rteContent = $state(m('ds.editor_content'));
</script>

{#if auth.isLoggedIn}
<main>
	<!-- HERO -->
	<section class="hero">
		<AppMeta section={m('meta.showcase')} />
		<div>
			<h1>Design <em>{m('ds.hero_em')}</em>.</h1>
			<p class="lede">
				{m('ds.lede')}
			</p>
			<div class="controls">
				<PackSwitch />
				<ThemeToggle />
				<span class="controls-hint">{m('ds.controls_hint')}</span>
			</div>
		</div>
	</section>

	<!-- PALETTE -->
	<section class="block">
		<div class="section-head">
			<div class="section-num">§ 01</div>
			<div>
				<h2>{m('ds.palette_title')}</h2>
				<p>
					{m('ds.palette_desc_a')} <code>color_slot</code> {m('ds.palette_desc_b')}
					<code>node_type</code>{m('ds.palette_desc_c')}
				</p>
			</div>
		</div>

		<div class="palette-arc">
			{#each Array.from({ length: 8 }, (_, i) => i + 1) as slot}
				<div class="swatch">
					<div class="chip" style="background: var(--node-slot-{slot})"></div>
					<div class="info">
						<div class="name">{m('ds.slot', slot)}</div>
						<div class="hex">--node-slot-{slot}</div>
						<div class="hex">{slots[slot - 1] ?? ''}</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- COMPONENTS -->
	<section class="block">
		<div class="section-head">
			<div class="section-num">§ 02</div>
			<div>
				<h2>{m('ds.components_title')}</h2>
				<p>{m('ds.components_desc')}</p>
			</div>
		</div>

		<div class="comp-grid">
			<div class="comp-card">
				<h3>{m('ds.card_buttons')}</h3>
				<div class="stack">
					<Button>{m('ds.btn_save_node')}</Button>
					<Button variant="secondary">{m('common.cancel')}</Button>
					<Button variant="ghost">{m('ds.btn_discard')}</Button>
				</div>
				<div class="stack" style="margin-top: 1rem;">
					<Button variant="secondary">{m('ds.btn_new_node')}</Button>
					<Button variant="secondary">{m('ds.btn_new_edge')}</Button>
					<Button variant="secondary">{m('ds.btn_export')}</Button>
				</div>
				<div class="stack" style="margin-top: 1rem;">
					<Button loading>{m('ds.btn_saving')}</Button>
					<Button variant="secondary" loading>{m('common.loading')}</Button>
					<Button disabled>{m('ds.btn_disabled')}</Button>
				</div>
				<div class="stack" style="margin-top: 1rem;">
					<Button variant="danger">{m('common.remove')}</Button>
					<Button variant="danger" loading>{m('ds.btn_removing')}</Button>
				</div>
			</div>

			<div class="comp-card">
				<h3>{m('ds.card_type_markers')}</h3>
				<div class="stack">
					<Tag colorSlot={8}>{m('ds.tag_agency')}</Tag>
					<Tag colorSlot={6}>{m('ds.tag_hosting')}</Tag>
					<Tag colorSlot={5}>{m('ds.tag_dev')}</Tag>
					<Tag colorSlot={2}>{m('ds.tag_credential')}</Tag>
					<Tag colorSlot={1}>{m('ds.tag_service')}</Tag>
				</div>
				<div class="stack" style="margin-top: 1.2rem;">
					<Pill status="draft" />
					<Pill status="review" />
					<Pill status="confirmed" />
					<Pill status="empty" />
				</div>
			</div>

			<div class="comp-card">
				<h3>{m('ds.card_form')}</h3>
				<div class="stack-v">
					<div>
						<label class="field-label" for="ds-short">{m('node.field.label')}</label>
						<input id="ds-short" class="input" type="text" value="DNS" />
					</div>
					<div>
						<label class="field-label" for="ds-type">{m('node.field.type')}</label>
						<select id="ds-type" class="input">
							<option>{m('ds.tag_credential')}</option>
							<option>{m('ds.tag_agency')}</option>
							<option>{m('ds.tag_hosting')}</option>
							<option>{m('ds.tag_dev')}</option>
							<option>{m('ds.tag_service')}</option>
						</select>
					</div>
				</div>
			</div>

			<div class="comp-card">
				<h3>SettingsFields</h3>
				<SettingsFields settings={page.data.settings} />
			</div>

			<div class="comp-card">
				<h3>{m('ds.card_editor')}</h3>
				<RichTextEditor bind:content={rteContent} />
			</div>

			<div class="comp-card">
				<h3>{m('ds.card_dialog')}</h3>
				<div class="stack-v">
					<p class="dialog-hint">{m('ds.dialog_hint')}</p>
					<div class="stack">
						<Button variant="secondary" onclick={() => (dialogOpen = true)}>
							{m('ds.dialog_open')}
						</Button>
						<Button variant="secondary" onclick={() => (confirmOpen = true)}>
							{m('ds.dialog_confirm_destructive')}
						</Button>
					</div>
				</div>
			</div>

	
			<div class="comp-card">
				<h3>DocInventory</h3>
				<DocInventory documents={mockDocs} phaseColorFn={mockPhaseColor} />
			</div>

			<div class="comp-card">
				<h3>PhaseTransitionCard</h3>
				<PhaseTransitionCard
					transition={mockTransition}
					documents={mockTransDocs}
					fromPhaseTitle={m('ds.demo_phase_from')}
					toPhaseTitle={m('ds.demo_phase_to')}
					fromPhaseColor="3"
					toPhaseColor="6"
				/>
			</div>

			<div class="comp-card">
				<h3>{m('ds.card_search')}</h3>
				<div class="stack-v">
					<div>
						<label class="field-label" for="ds-search">{m('common.search')}</label>
						<input id="ds-search" class="input" type="search" placeholder={m('ds.search_placeholder')} />
					</div>
					<div class="stack">
						<Tag colorSlot={8}>{m('ds.tag_agency')} (4)</Tag>
						<Tag colorSlot={6}>{m('ds.tag_hosting')} (2)</Tag>
						<Tag colorSlot={5}>{m('ds.tag_dev')} (3)</Tag>
						<Tag colorSlot={2}>{m('ds.tag_credential')} (7)</Tag>
						<Tag colorSlot={1}>{m('ds.tag_service')} (12)</Tag>
					</div>
				</div>
			</div>

			<div class="comp-card span-2">
				<h3>JourneyGraph</h3>
				<!-- The graph takes its parent's full height; the card's would count the heading too. -->
				<div>
					<JourneyGraph
						nodes={mockNodes}
						edges={mockEdges}
						types={mockTypes}
						camera={fullCamera(mockTypes)}
						highlight={mockHighlight}
					/>
				</div>
			</div>
		</div>
	</section>
</main>
{/if}

<Dialog bind:open={dialogOpen} title={m('ds.dialog_example_title')}>
	<div class="dialog-demo">
		<div>
			<label class="field-label" for="dlg-label">{m('entities.col_label')}</label>
			<input id="dlg-label" class="input" type="text" placeholder={m('node.field.label_placeholder')} />
		</div>
		<div>
			<label class="field-label" for="dlg-type">{m('node.field.type')}</label>
			<select id="dlg-type" class="input">
				<option>{m('ds.tag_credential')}</option>
				<option>{m('ds.tag_agency')}</option>
			</select>
		</div>
		<div class="dialog-actions">
			<Button onclick={() => (dialogOpen = false)}>{m('common.save')}</Button>
			<Button variant="ghost" onclick={() => (dialogOpen = false)}>{m('common.cancel')}</Button>
		</div>
	</div>
</Dialog>

<ConfirmDialog
	bind:open={confirmOpen}
	title={m('entities.confirm_remove_title')}
	description={m('entities.confirm_remove_desc', 'DNS')}
	confirmLabel={m('common.remove')}
	cancelLabel={m('common.cancel')}
	loading={confirmLoading}
	onConfirm={fakeConfirm}
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
	.hero h1 {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 300;
		letter-spacing: -0.03em;
		line-height: 1.05;
	}
	.hero h1 em {
		font-style: italic;
		color: var(--accent);
		font-weight: 400;
	}
	.lede {
		margin-top: 1rem;
		max-width: 58ch;
		font-size: 1rem;
		color: var(--text-muted);
	}
	.controls {
		margin-top: 1.5rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
		align-items: center;
	}
	.controls-hint {
		font-family: 'Fira Mono', monospace;
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		color: var(--text-soft);
	}

	.block {
		padding: 3rem 0;
		border-top: 1px solid var(--border);
	}
	.section-head {
		display: grid;
		grid-template-columns: 5rem 1fr;
		gap: 1.5rem;
		margin-bottom: 2.5rem;
		align-items: baseline;
	}
	.section-num {
		font-family: 'Fira Mono', monospace;
		font-size: 0.75rem;
		letter-spacing: 0.18em;
		color: var(--text-soft);
		padding-top: 0.4rem;
	}
	.section-head h2 {
		font-size: 2.2rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}
	.section-head p {
		grid-column: 2;
		margin-top: 0.7rem;
		max-width: 56ch;
		color: var(--text-muted);
	}

	.palette-arc {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 0.6rem;
	}
	.swatch {
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		border-radius: 3px;
		overflow: hidden;
	}
	.swatch .chip { height: 90px; }
	.swatch .info { padding: 0.6rem 0.7rem 0.8rem; }
	.swatch .name { font-size: 0.9rem; font-weight: 500; }
	.swatch .hex {
		font-family: 'Fira Mono', monospace;
		font-size: 0.66rem;
		color: var(--text-soft);
		margin-top: 0.3rem;
	}

	.comp-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}
	.comp-card {
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		padding: 1.8rem;
		border-radius: 3px;
	}
	.comp-card.span-2 {
		grid-column: span 2;
	}
	.comp-card h3 {
		font-family: 'Fira Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-soft);
		margin-bottom: 1.5rem;
		padding-bottom: 0.8rem;
		border-bottom: 1px dashed var(--border);
	}
	.stack {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
		align-items: center;
	}
	.stack-v {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	.dialog-hint {
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.dialog-demo {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.dialog-actions {
		display: flex;
		gap: 0.7rem;
		margin-top: 0.4rem;
	}

	@media (max-width: 1100px) {
		.palette-arc { grid-template-columns: repeat(4, 1fr); }
	}
	@media (max-width: 900px) {
		main { padding: 2rem 1.2rem 4rem; }
		.section-head, .hero { grid-template-columns: 1fr; gap: 0.5rem; }
		.palette-arc { grid-template-columns: repeat(2, 1fr); }
		.comp-grid { grid-template-columns: 1fr; }
		.comp-card.span-2 { grid-column: auto; }
	}
</style>
