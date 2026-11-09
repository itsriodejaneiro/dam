# The map

The map draws the infrastructure as a graph. **maps**, in the header, opens the deployment's first map; each map has its own address, `/maps/<slug>`.

![A whole map, with one band per category](/screens/map-1.png)

## How to read it

- **Layers.** Each horizontal band is one [category](./categories.md), named at its left edge. They run from institutional authority at the top to human responsibility at the bottom.
- **Entities.** Each circle is an entity, in the color of its category. The more connections it has, the larger it is.
- **Connections.** Each line is a dependency between two entities. The lines that cross the layers show how agencies, systems, credentials and people sustain each other.

Point at an entity to read its full name.

![The full name of an entity, beside the pointer](/screens/map-2.png)

## Select an entity

Click an entity to open its panel: name, category, description, related links, what it **connects to** and what it **receives from**. Click a name in those lists to go to that entity. Everything outside the chain of what the entity depends on, and of what depends on it, fades.

![An entity selected: the panel is open and the rest of the map fades](/screens/map-3.png)

The selection is part of the address: copy the link to send someone straight to that entity. The **×** of the panel, or a double click on an empty part of the map, closes it.

## Move an entity

Drag a circle to put it somewhere else on its layer. It stays pinned where you drop it, and the others make room. **release position**, in the panel, or a double click on the circle, returns it to the automatic layout.

For a visitor, the new position lasts until the page reloads. For someone signed in, it is saved for everyone.

## Size

The map fills the width of the window. To see more detail, use your browser's zoom.

## Several maps

A deployment with more than one map shows a tab for each above the graph. See [Maps](./maps.md).

## For those who edit

Signed in, the panel adds two buttons, and the position of the entity appears beside **release position**.

![The panel of a signed-in person, with the edit and connection buttons](/screens/map-4.png)

- **edit** opens the [entity's form](./entities.md#the-form).
- **connection** opens a [new connection](./connections.md#the-form) that starts at this entity.
