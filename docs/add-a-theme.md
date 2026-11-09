# Add a theme

A theme, or pack, is a set of colors a deployment chooses in [Settings](./configure.md). Each pack has a light and a dark mode.

The packs that ship with the DAM:

| Pack | Character |
|---|---|
| `legacy` | the default: warm neutrals with an orange accent |
| `green` | green neutrals and accent |
| `orange` | neutral background with an orange accent |

1. Copy `src/lib/styles/themes/legacy.css` to a new file named after the pack, and change the values. Keep every token, in both modes: the chrome tokens, the eight `--node-slot-N` of the entities and the three `--status-*`.
2. Replace `legacy` with the name of your pack in the file's selectors.
3. Import the file in `src/lib/styles/themes/index.css`.
4. Add the name to `PACKS` in `src/lib/theme.ts` and to `KNOWN` in `src/app.html`.
5. Run `bun run db:setup` to add the name to the options of the `theme` field.
6. List the pack in the table above and in the **Theme** row of [Configure your deployment](./configure.md), so the manual stays complete.

The pack then appears under **Theme** in the settings, and in the [design system page](./design-system.md).
