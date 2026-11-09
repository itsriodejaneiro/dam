# Connections

A connection documents a real dependency between two entities: hosting, custody, authorship, accountability. `/admin/connections` lists them all, each with its **Source** and its **Target**. Type in the search box to find the connections of an entity.

![The list of connections](/screens/connections-1.png)

## The form

**New connection** asks for a **Source** and a **Target**. You need at least two [entities](./entities.md) first.

![The connection form](/screens/connections-2.png)

The direction is what the map reads: the panel of the source lists the target under **connects to**, and the panel of the target lists the source under **receives from**. The form refuses a connection that already exists.

**edit** changes the two ends of a connection, and **remove** deletes it after a confirmation.

## Duplicates

Records that arrive from outside the form, by the API or an import, can repeat a pair. A banner above the list then counts the extra records. Click it to see each pair, then **Remove all** to keep one record of each.

![The report of duplicate connections](/screens/connections-3.png)
