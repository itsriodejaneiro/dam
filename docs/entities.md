# Entities

`/admin/entities` is the catalog of the pieces that make up the map: agencies, services, domains, hosting, environments, repositories, credentials and people. The list runs in the order of the map's layers.

![The catalog of entities](/screens/entities-1.png)

## Find an entity

Type in the search box to filter by label or full name. The chips below it filter by category, each with its count; click the active chip, or **All**, to clear it.

![The catalog filtered by the Service category](/screens/entities-2.png)

The filters are part of the address: a link keeps them.

## The form

**New entity** opens an empty form; **edit**, in a row, opens that entity. The panel of [the map](./map.md#for-those-who-edit) opens the same form.

![The entity form](/screens/entities-3.png)

| Field | What it holds |
|---|---|
| **Type** | the [category](./categories.md): the layer and the color on the map |
| **Short label** | the name beside the circle, as in "DNS". Required in the default language |
| **Full label** | the full name, as in "Domain Name System". It appears when pointing at the entity |
| **Description** | formatted text for the entity's panel: bold, italic, links and lists |
| **Related links** | a text and an address for each. Drag them to set their order |
| **Maps** | the [maps](./maps.md) the entity appears on. Choose at least one |

A category must exist before the first entity.

## Remove an entity

**remove**, in a row, asks for a confirmation. The entity's connections are removed with it.
