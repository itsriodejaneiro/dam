# Categories

A category is a kind of entity and a layer of [the map](./map.md). `/admin/categories` lists them in the order of the layers, from the top of the map to the bottom. A new deployment starts with eight: Agency, Service, Domain, Hosting, Dev environment, Repository, Credential and Person.

![The list of categories](/screens/categories-1.png)

The arrows of a row move the category up or down, which moves its whole layer on the map.

## The form

**New category** adds a layer at the bottom of the map; **edit** opens a category.

![The category form](/screens/categories-2.png)

| Field | What it holds |
|---|---|
| **Label** | the name of one, as in "Agency", in each language |
| **Plural** | the name of many, as in "Agencies": the name of the layer on the map |
| **Slug** | the identifier in the address of a filter: lowercase letters, numbers and hyphens |
| **Color** | one of the eight colors of the [theme](./configure.md#the-fields) |
| **Base size** | the size of the circle of an entity with no connections |

## Remove a category

A category with no entities leaves after a confirmation. One with entities asks first where they go: choose the **Target category**, and **Move nodes and remove** moves them and removes the category.

![Choosing where the entities of a removed category go](/screens/categories-3.png)
