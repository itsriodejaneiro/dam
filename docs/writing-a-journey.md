# Writing a journey

A journey starts from a document that describes a process in stages: each stage becomes a step. An entity the process needs and the map lacks goes into [Entities](./entities.md) first.

`/admin/journeys` lists the journeys, published or not, with what each one contains.

![The list of journeys in the admin](/screens/writing-a-journey-1.png)

## Create the draft

**New journey** asks for a **Title** in each language, a **Slug**, the end of the journey's address, and a **Map**. **Create** saves a draft and opens the editor.

![The form for a new journey](/screens/writing-a-journey-2.png)

## Details

The first block of the editor holds the title and description in each language, the slug and the map. Changing the map clears the camera and the highlight of every step, after a confirmation, because positions belong to each map.

## Phases

Phases group the steps. Each has a **Title** and, optionally, a **Summary at the end**: a phase with a summary closes with a card, and the summary of the last phase closes the journey. Under **Documents needed to continue**, mark what a person must hold to go on; the last phase has nothing after it, so it does not ask.

![Two phases in the editor](/screens/writing-a-journey-3.png)

A phase with steps stays until its steps move to another phase.

## Steps

**Add step** creates a step and selects it. On the right, set its **Phase**, or **Introduction** to place it before the first phase, its **Title**, its **Duration** and its **Text**. In the list, the arrows change the order.

On the left, the map belongs to the selected step:

- **Highlight.** Click an entity to add it to the step, or to take it out. Adding one brings its connections with those already highlighted; click a connection to add or take out that line alone. With nothing highlighted, the step shows the whole map.
- **Camera.** Drag to move and use the mouse wheel to zoom, then press **Record camera** to keep the framing. **Automatic** returns to the framing that fits the highlighted entities.

![A step with its highlight and recorded camera](/screens/writing-a-journey-4.png)

The line under the map shows the state of the camera and how many entities and connections the step highlights.

## Documents

**Add document** creates one with a **Name**, an **Abbreviation** and **Appears at step**: the step where the person obtains it, or **Held from the start**. The inventory the visitor sees grows from these.

![A document in the editor](/screens/writing-a-journey-5.png)

## Save, preview, publish

The bar at the top stays on screen while you work.

![The editor's bar, with the journey saved](/screens/writing-a-journey-6.png)

- **Save** records the whole draft at once. The page holds everything until then and asks before you leave with unsaved changes.
- **Preview** saves and opens the journey as a visitor sees it, published or not. **← back to the editor** returns.

![The preview of a draft](/screens/writing-a-journey-7.png)

- **Publish** makes the journey public. It needs at least one step. In a published journey, **Save** reaches visitors at once; **Unpublish** takes it back. With unsaved changes, **Unpublish** asks first, and the changes stay in the editor, unsaved.

The list also publishes and unpublishes, and removes a journey with its steps.

![The list with a published journey](/screens/writing-a-journey-8.png)
