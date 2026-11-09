# Maps

A map is a selection of entities drawn as a graph: one for the whole infrastructure, others for a theme or a sector. `/admin/maps` lists the maps of the deployment. The first one, marked **main**, is what **maps** opens in the header, and it stays in first place.

![The list of maps](/screens/maps-2.png)

## The form

**New map** asks for a **Label** in each language and a **Slug**, the end of the map's address (`/maps/<slug>`): lowercase letters, numbers and hyphens.

![The map form](/screens/maps-1.png)

The arrows of a row change the order of the maps, and **edit** opens one. The main map has neither.

## Put entities on a map

An entity joins a map in its own form, under [**Maps**](./entities.md#the-form). Each map keeps its own positions: dragging an entity on one map leaves the others as they are.

## Tabs

With two or more maps, [the map page](./map.md) shows a tab for each one.

![The tabs above the map, with a second map](/screens/maps-3.png)

## Remove a map

**remove** asks for a confirmation and takes the entities off the map; the entities stay in the catalog. A map with [journeys](./writing-a-journey.md) stays until you remove them or change their map.
