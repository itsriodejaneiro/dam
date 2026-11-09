<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Link from '@tiptap/extension-link';
	import { Bold, Italic, Link as LinkIcon, List, ListOrdered } from '@lucide/svelte';
	import { m } from '$lib/i18n';

	interface Props {
		content: string;
		placeholder?: string;
	}

	let { content = $bindable(''), placeholder = '' }: Props = $props();

	let editorEl = $state<HTMLDivElement | null>(null);
	let editor: Editor | null = null;
	let tick = $state(0);

	$effect(() => {
		if (!editorEl || editor) return;
		editor = new Editor({
			element: editorEl,
			extensions: [
				StarterKit.configure({
					heading: false,
					strike: false,
					code: false,
					codeBlock: false,
					blockquote: false,
					horizontalRule: false
				}),
				Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true })
			],
			content,
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
	});

	onDestroy(() => {
		editor?.destroy();
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
