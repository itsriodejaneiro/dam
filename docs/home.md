# The home page

The home page, at `/`, opens with a title and a lede, and under them come the blocks. You write all of it in **home**, in the admin (`/admin/home`): visitors read the published copy, and saving keeps your edit until you publish it.

![The top of the home page, in the editor](/screens/home-1.png)

A new deployment starts with the default top, "Digital Assets Map of the digital infrastructure of *your deployment's name*" and its lede, in each of its languages, and under it an example: a text about the map, a picture of the example entities and two cards, one to the map and one to the example journey. Change them or remove them.

## The top

The **Top** card holds the title and the lede, in each language. The title takes italics, for the words that stand out, and line breaks: Enter starts a new line. The lede is plain text, in a field that grows with it.

The deployment starts with the default text, with its [name](./configure.md#the-fields) in italics, and edits it like any other: a page needs a title and a lede, so saving asks for both in the default language. A language left empty shows the default language. A deployment installed before the top was editable receives the same default text on its first start, in its edit and on the site, when its top is empty.

![The home editor with the example's blocks](/screens/home-2.png)

## Blocks

| Block | What it holds |
|---|---|
| **Text** | text in each language, with headings, subheadings, bold, italic, links and lists |
| **Image** | one file, with a description for screen readers and a caption in each language |
| **Cards** | one to three cards side by side, each with a title and a line in each language, leading to a map, a published journey or an address |
| **Logos** | one to eight logos, each with a file, a name and an optional link, the same in every language |

**Add block**, at the end, and the **+** between two blocks offer the four types. The bar of a block moves it up or down, collapses it, or removes it after a confirmation.

Files are PNG, JPEG, WebP or SVG, up to 400 KB. A file uploads as soon as you choose it, and publishing deletes the files no block uses.

A card leads to a map, to a published journey, or to an address that starts with `https://`, `http://` or `mailto:`, or with `/` for a page of this site. An address outside the site opens in another tab. A card whose map is removed, or whose journey is unpublished, leaves the home page; with the [journeys](./configure.md#the-fields) off, so do the cards that lead to one.

## Logos

Each logo sits in a white square, in both modes, so one file reads on a light page and on a dark one. The block shows the squares in both modes, in the deployment's theme, as soon as the files are up.

![A block of logos, previewed in light and dark mode](/screens/home-3.png)

A logo's **Name** is what screen readers say. With a **Link**, the whole square opens it in another tab.

## Languages

The top and every block hold all the deployment's languages. The buttons above them, **All**, **EN**, **FR** …, show one language's fields at a time, to translate. The top and each block mark how many fields a language lacks among those another language has written.

![The French field of a text written in English alone](/screens/home-4.png)

Visitors see the default language where a field is empty. Saving asks for the title and the lede of the top, the text of a text block and the title of each card in the default language.

## Save, preview, publish

The bar works as in [a journey](./writing-a-journey.md#save-preview-publish):

- **Save** records all the blocks at once. The page asks before you leave with unsaved changes.
- **Preview** saves and opens the home page with your edit. **← back to the editor** returns.
- **Publish** saves, puts the edit on the site and deletes the files no block uses. It needs a title, a lede or a block.
- **Discard edit** brings the edit back to what visitors read, after a confirmation.
- **Unpublish** takes the top and the blocks off the site, so the home page shows the default top alone, and keeps the edit.

![The published home page, with the logos, in dark mode](/screens/home-5.png)

![The same page in light mode](/screens/home-6.png)
