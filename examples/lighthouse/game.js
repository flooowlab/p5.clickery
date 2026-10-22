// The Lighthouse: a small complete adventure. Three rooms, one puzzle, an Ink
// conversation and a skippable ending.
//
// This module is the game's logic and nothing else: it reads the data files and adds
// the scripts. index.html adds the canvas and drawing; test/integration/lighthouse.test.js
// plays it in Node. Both use the same game object.
import { Game } from '../../src/index.js';
import dockScripts from './scripts/dock.js';
import hallScripts from './scripts/hall.js';
import lampRoomScripts from './scripts/lamp-room.js';

export const ROOMS = ['dock', 'hall', 'lamp-room'];

// loadJson(path) and loadText(path) read files relative to this folder (fetch in the
// browser, fs in tests). Other options go to the Game (Story, storage, sounds, ...).
export async function createLighthouse({ loadJson, loadText, ...options }) {
  const { items, recipes } = await loadJson('items.json');
  const game = new Game({
    rooms: await Promise.all(ROOMS.map((id) => loadJson(`rooms/${id}.json`))),
    strings: await loadJson('strings.en.json'),
    items,
    recipes,
    saveSlot: 'lighthouse',
    sfx: { 'inventory:add': 'pickup' },
    ...options,
  });
  const dialogue = { keeper: await loadText('dialogue/keeper.ink.json') };
  for (const scripts of [dockScripts, hallScripts, lampRoomScripts]) {
    for (const [id, handlers] of Object.entries(scripts(game, dialogue))) game.on(id, handlers);
  }
  return game;
}
