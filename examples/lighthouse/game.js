// The Lighthouse: a small complete adventure built from the library's parts.
// Three rooms, one puzzle, an Ink conversation and a skippable ending.
//
// This file has no drawing code. It wires the game together from data, so the
// same code runs in the browser (index.html) and in Node (test/integration/lighthouse.test.js).
import {
  createCore, SceneManager, HoverTracker, createHotspots, applyHotspotState, Navigator, Actor, Inventory, Interactor,
  Cutscenes, Scripts, SubtitleBar, ChoiceMenu, DialogueSession, createInkRunner, inkExternals, defaultStrings,
  saveToSlot, loadFromSlot,
} from '../../src/index.js';
import dockScripts from './scripts/dock.js';
import hallScripts from './scripts/hall.js';
import lampRoomScripts from './scripts/lamp-room.js';

export const ROOMS = ['dock', 'hall', 'lamp-room'];
export const VIEW = { width: 640, height: 360 };

// loadJson(path) and loadText(path) read files relative to this folder (fetch in the
// browser, fs in tests). `Story` is inkjs's Story class; `audio` is optional.
export async function createGame({ loadJson, loadText, Story, audio = null }) {
  const core = createCore();
  core.i18n.add('en', { ...defaultStrings, ...await loadJson('strings.en.json') });

  const rooms = Object.fromEntries(await Promise.all(ROOMS.map(async (id) => [id, await loadJson(`rooms/${id}.json`)])));
  const { items, recipes } = await loadJson('items.json');
  const keeperStory = new Story(await loadText('dialogue/keeper.ink.json'));

  const scene = new SceneManager({
    ...core, viewWidth: VIEW.width, viewHeight: VIEW.height, fadeMs: 300, loadRoom: async (id) => rooms[id],
  });
  const hero = new Actor({ id: 'hero', speed: 160, directions: 4, translate: (key) => core.i18n.t(key) });
  const hover = new HoverTracker(core.events);
  const inventory = new Inventory({ state: core.state, events: core.events, items, recipes });
  const subtitles = new SubtitleBar();
  const menu = new ChoiceMenu({ viewWidth: VIEW.width, viewHeight: VIEW.height });
  const dialogue = new DialogueSession({ events: core.events, subtitles, menu });
  const cutscenes = new Cutscenes({ events: core.events, scheduler: core.scheduler, targets: [hero, scene.fade] });
  const interactor = new Interactor({
    hero, state: core.state, events: core.events, inventory, hover, cutscenes, dialogue, audio,
  });
  const scripts = new Scripts({ interactor });
  scene.scripts = scripts;

  // The keeper's Ink story: `knowsLamp` is kept in the state store (so it is saved), and the
  // story's EXTERNAL functions give items and set flags.
  const newKeeperConversation = () => createInkRunner(keeperStory, {
    state: core.state, sync: ['knowsLamp'], externals: inkExternals({ inventory, state: core.state }),
  });

  const game = {
    core, scene, hero, hover, inventory, interactor, cutscenes, dialogue, subtitles, menu, scripts, rooms,
    newKeeperConversation,
  };
  for (const make of [dockScripts, hallScripts, lampRoomScripts]) scripts.addAll(make(game));

  // Every time a room is entered: its hotspots, its walkable floor, and where the hero stands.
  core.events.on('room:enter', ({ room, start }) => {
    const hotspots = createHotspots(room);
    applyHotspotState(core.state, room.id, hotspots);
    hover.setHotspots(hotspots);
    hero.navigator = Navigator.fromRoom(room);
    const at = room.starts[start];
    hero.teleport(at.x, at.y);
    if (at.dir) hero.face(at.dir);
  });
  core.events.on('update', (dt) => { hero.update(dt); subtitles.update(dt); });

  Object.assign(game, {
    // One frame of game time (the browser's loop does this on its own).
    step(dt = 20) {
      core.scheduler.update(dt);
      core.events.emit('update', dt);
    },
    start: () => scene.goTo('dock'),
    hotspot: (id) => hover.hotspots.find((h) => h.id === id),
    // The hero's position is not part of the state store, so it is saved alongside it.
    save(storage, slot = 'lighthouse') {
      core.state.set('hero', hero.toJSON());
      saveToSlot(core.state, slot, storage);
    },
    async load(storage, slot = 'lighthouse') {
      if (!loadFromSlot(core.state, slot, storage)) return false;
      await scene.restore();
      const saved = core.state.get('hero');
      if (saved) hero.fromJSON(saved);
      return true;
    },
  });
  return game;
}
