---
title: Room checker
status: available
summary: A command that checks room files for mistakes, for your own build or CI.
---
The editor has a **Check** list for the room you are editing. The same kind of checks, as a command, run on a whole folder of room files and can fail a build:

```text
node tools/check-rooms.mjs rooms/*.json
node tools/check-rooms.mjs --strings strings.en.json rooms/hall.json rooms/cellar.json
node tools/check-rooms.mjs --strict rooms/*.json
```

It prints one line per problem and a summary, and exits with 1 when a room has an error (with `--strict`, a warning fails too).

**Errors** are things the game cannot work with:

- a room that does not load: no id, a size that is not above 0, no start, a floor or obstacle with fewer than three corners, a duplicate id;
- a hotspot with an unknown `provider`, a polygon with fewer than three points, an `svg` hotspot with no `d` or `svg`, a `colorMask` hotspot with no `mask` or `color`;
- a `walkTo` without numbers.

**Warnings** are probably mistakes:

- a room with no walkable area;
- a start, or a hotspot's `walkTo`, that is not on the floor;
- a `walkTo` the hero cannot reach from the start (for example it is on an island behind an obstacle);
- with `--strings`, a hotspot whose name key is not in your strings (a hotspot with no name shows its id, so the id counts as the key).

Example output:

```text
rooms/hall.json: warning: hotspot "door": walkTo (850, 120) is not on the floor
rooms/cellar.json: error: room "cellar": needs at least one start position
2 room files checked: 1 error, 1 warning
```

The checks run the same `parseRoom` and navigation the game uses, so a room that passes loads in the game.
