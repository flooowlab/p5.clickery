---
title: Room editor
status: available
summary: Draw hotspots and floors on top of your room picture, then export the room JSON your game loads.
open: tools/editor/
openLabel: Open the editor
---
Writing coordinates by hand gets old quickly. The room editor is a page that runs in your browser: load your room picture, mark out the clickable areas and the floor with the mouse, try the room in the real engine, and export the JSON file your game loads. Nothing is uploaded anywhere; your work is kept in the browser, so closing the tab does not lose it.

## A first room, in about a minute

1. Press **Open image…**, or **Sample room** to try it out.
2. Choose the shape type in **New shape**: *walkable* for the floor, *hotspot* for things to click, *obstacle* for holes in the floor.
3. Pick the **Wand** and click a coloured area of the picture. **Shift**-click adds more, **Alt**-click takes some away, **Ctrl**-click selects that colour everywhere. The **Tolerance** slider decides how different a colour may be and still count.
4. Press **Enter**. The selection becomes a polygon; **Detail** controls how many corners it gets. For a walkable area, anything inside it that is not floor (a table, a pillar) becomes an obstacle automatically.
5. For shapes the wand cannot find, use the **Polygon** tool: click the corners, then click the first corner again to finish.
6. Name your shapes in the right-hand panel. A hotspot's id is what you use in `game.on('door', ...)`; its name key is the text shown on hover (it defaults to `obj.<id>`).
7. With the **Walk-to** tool, select a hotspot and click where the hero should stand to use it. With the **Start** tool, place where the hero appears.
8. Press **Preview** to try the room: click to walk, hover and click the hotspots. Fix anything the **Check** list warns about.
9. Press **Export…** and save the JSON, for example as `rooms/hall.json`.

## Using the exported room

The file is the room format as it is, so give it to the game by its address:

```js
game = createGame({ rooms: ['rooms/hall.json'] });
```

The picture is named in the JSON (`"background": "hall.png"`) and loads relative to the room file. **Download text keys** gives you a starter list of the hotspot names to put in `strings`.

## Editing afterwards

- **Select** tool: drag a corner to move it, drag the inside to move the whole shape, **Alt**-click a corner to delete it, double-click an edge to add a corner, **Delete** removes the shape.
- Scroll to zoom, drag with the middle or right mouse button (or hold Space) to pan, **F** fits the picture to the window.
- **Ctrl+Z** and **Ctrl+Y** undo and redo.
- **Import…** opens a room JSON again, also one written by hand. Hotspots that use the `svg` or `colorMask` providers are kept as they are; the editor only edits polygon hotspots.

The wand works best on a picture with fairly flat colours: paint or export the floor, the door and so on in distinct colours, or use the Polygon tool.
