<script lang="ts">
	import { onMount } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import {
		Bold,
		Heading2,
		Heading3,
		Italic,
		Link as LinkIcon,
		List,
		ListOrdered
	} from '@lucide/svelte';
	import { m } from '$lib/i18n';

	interface Props {
		content: string;
		placeholder?: string;
		/** Section titles, h2 and h3: a page's text has them, a step's or an entity's does not. */
		headings?: boolean;
	}

	let { content = $bindable(''), placeholder = '', headings = false }: Props = $props();

	let editorEl = $state<HTMLDivElement | null>(null);
	let editor: Editor | null = null;
	let tick = $state(0);

	// TipTap loads with the first editor on screen: this component sits in the components
	// chunk that every page loads, the visitor's included.
	onMount(() => {
		let destroyed = false;
		Promise.all([import('@tiptap/core'), import('@tiptap/starter-kit')]).then(
			([{ Editor }, { default: StarterKit }]) => {
				if (destroyed || !editorEl) return;
				editor = new Editor({
					element: editorEl,
					extensions: [
						StarterKit.configure({
							// sanitize.ts lets h2 and h3 through, and nothing else of the kind
							heading: headings ? { levels: [2, 3] } : false,
							strike: false,
							code: false,
							codeBlock: false,
							blockquote: false,
							horizontalRule: false,
							link: { openOnClick: false, autolink: true, linkOnPaste: true }
						})
					],
					content,
					// The page's CSP refuses the style element TipTap would inject; its rules are below.
					injectCSS: false,
					editorProps: {
						attributes: {
							class: 'rte-editor-area',
							'data-placeholder': placeholder
						}
					},
					onUpdate: ({ editor }) => {
						content = editor.getHTML();
					},
					onTransaction: () => {
						tick++;
					}
				});
				tick++;
			}
		);
		return () => {
			destroyed = true;
			editor?.destroy();
		};
	});

	function isActive(name: string, attrs?: Record<string, unknown>): boolean {
		void tick;
		return editor?.isActive(name, attrs ?? {}) ?? false;
	}

	function setLink() {
		if (!editor) return;
		const previous = (editor.getAttributes('link').href as string | undefined) ?? '';
		const url = window.prompt('URL', previous);
		if (url === null) return;
		if (url === '') {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	}
</script>

<div class="rte">
	<div class="toolbar">
		{#if headings}
			<button
				type="button"
				class:active={isActive('heading', { level: 2 })}
				onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
				aria-label={m('editor.heading_2')}
				title={m('editor.heading_2')}
			>
				<Heading2 size={14} />
			</button>
			<button
				type="button"
				class:active={isActive('heading', { level: 3 })}
				onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
				aria-label={m('editor.heading_3')}
				title={m('editor.heading_3')}
			>
				<Heading3 size={14} />
			</button>
			<span class="sep" aria-hidden="true"></span>
		{/if}
		<button
			type="button"
			class:active={isActive('bold')}
			onclick={() => editor?.chain().focus().toggleBold().run()}
			aria-label={m('editor.bold')}
			title={`${m('editor.bold')} (⌘B)`}
		>
			<Bold size={14} />
		</button>
		<button
			type="button"
			class:active={isActive('italic')}
			onclick={() => editor?.chain().focus().toggleItalic().run()}
			aria-label={m('editor.italic')}
			title={`${m('editor.italic')} (⌘I)`}
		>
			<Italic size={14} />
		</button>
		<button
			type="button"
			class:active={isActive('link')}
			onclick={setLink}
			aria-label={m('editor.link')}
			title={m('editor.link')}
		>
			<LinkIcon size={14} />
		</button>
		<span class="sep" aria-hidden="true"></span>
		<button
			type="button"
			class:active={isActive('bulletList')}
			onclick={() => editor?.chain().focus().toggleBulletList().run()}
			aria-label={m('editor.bullet_list')}
			title={m('editor.bullet_list')}
		>
			<List size={14} />
		</button>
		<button
			type="button"
			class:active={isActive('orderedList')}
			onclick={() => editor?.chain().focus().toggleOrderedList().run()}
			aria-label={m('editor.ordered_list')}
			title={m('editor.ordered_list')}
		>
			<ListOrdered size={14} />
		</button>
	</div>
	<div bind:this={editorEl} class="surface"></div>
</div>

<style>
	.rte {
		border: 1px solid var(--border-strong);
		border-radius: 2px;
		background: var(--bg);
		overflow: hidden;
		transition: border-color 0.15s;
	}
	.rte:focus-within {
		border-color: var(--accent);
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		padding: 0.35rem 0.45rem;
		border-bottom: 1px solid var(--border);
		background: var(--bg-sunken);
	}
	.toolbar button {
		background: transparent;
		border: 0;
		border-radius: 2px;
		padding: 0.35rem;
		cursor: pointer;
		color: var(--text-soft);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: color 0.12s, background 0.12s;
	}
	.toolbar button:hover {
		color: var(--text);
		background: var(--bg);
	}
	.toolbar button.active {
		color: var(--accent);
		background: var(--accent-soft);
	}
	.sep {
		width: 1px;
		height: 1.1rem;
		background: var(--border);
		margin: 0 0.3rem;
	}

	.surface {
		padding: 0.7rem 0.85rem;
		min-height: 9rem;
		font-size: 0.92rem;
		line-height: 1.55;
	}

	/* ProseMirror's own rules, which TipTap injects by default (@tiptap/core's style.ts). */
	.surface :global(.ProseMirror) {
		position: relative;
		word-wrap: break-word;
		white-space: pre-wrap;
		white-space: break-spaces;
		font-variant-ligatures: none;
		font-feature-settings: 'liga' 0;
	}
	.surface :global(.ProseMirror [contenteditable='false']) {
		white-space: normal;
	}
	.surface :global(.ProseMirror [contenteditable='false'] [contenteditable='true']) {
		white-space: pre-wrap;
	}
	.surface :global(img.ProseMirror-separator) {
		display: inline !important;
		border: none !important;
		margin: 0 !important;
		width: 0 !important;
		height: 0 !important;
	}
	.surface :global(.ProseMirror-gapcursor) {
		display: none;
		pointer-events: none;
		position: absolute;
		margin: 0;
	}
	.surface :global(.ProseMirror-gapcursor::after) {
		content: '';
		display: block;
		position: absolute;
		top: -2px;
		width: 20px;
		border-top: 1px solid var(--text);
		animation: gapcursor-blink 1.1s steps(2, start) infinite;
	}
	@keyframes gapcursor-blink {
		to {
			visibility: hidden;
		}
	}
	.surface :global(.ProseMirror-focused .ProseMirror-gapcursor) {
		display: block;
	}
	.surface :global(.ProseMirror-hideselection *::selection) {
		background: transparent;
	}
	.surface :global(.ProseMirror-hideselection *) {
		caret-color: transparent;
	}

	.surface :global(.rte-editor-area) {
		outline: none;
		min-height: 7rem;
	}
	.surface :global(.rte-editor-area p) {
		margin: 0 0 0.6em;
	}
	.surface :global(.rte-editor-area p:last-child) {
		margin-bottom: 0;
	}
	.surface :global(.rte-editor-area ul),
	.surface :global(.rte-editor-area ol) {
		margin: 0 0 0.6em;
		padding-left: 1.4em;
	}
	.surface :global(.rte-editor-area li) {
		margin-bottom: 0.15em;
	}
	.surface :global(.rte-editor-area a) {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.surface :global(.rte-editor-area h2) {
		font-size: 1.25rem;
		font-weight: 500;
		margin: 0.4em 0 0.5em;
	}
	.surface :global(.rte-editor-area h3) {
		font-size: 1.05rem;
		font-weight: 600;
		margin: 0.4em 0 0.4em;
	}
	.surface :global(.rte-editor-area strong) {
		font-weight: 600;
	}
	.surface :global(.rte-editor-area p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		color: var(--text-soft);
		float: left;
		height: 0;
		pointer-events: none;
	}
</style>
