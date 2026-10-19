import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Story } from 'inkjs/full';
import { createGame, ROOMS } from '../examples/lighthouse/game.js';
import { parseRoom } from '../src/index.js';

// The Lighthouse example doubles as the library's integration test: the whole game is
// played through the same objects a player's clicks go through.
const root = new URL('../examples/lighthouse/', import.meta.url);
const loadText = async (path) => fs.readFileSync(new URL(path, root), 'utf8');
const loadJson = async (path) => JSON.parse(await loadText(path));

const memoryStorage = () => {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
};

async function newGame() {
  const game = await createGame({ loadJson, loadText, Story });
  const said = [];
  const say = game.hero.say.bind(game.hero);
  game.hero.say = (key, options) => { said.push(key); return say(key, options); };
  game.errors = [];
  game.interactor.onError = (err) => game.errors.push(err);
  game.said = said;
  return game;
}

// Runs frames until `promise` settles, reading dialogue like a player: advancing lines
// and picking `choose` from any menu.
async function settle(game, promise, { choose = 0, limit = 6000 } = {}) {
  let done = false;
  promise.then(() => { done = true; }, () => { done = true; });
  for (let i = 0; i < limit && !done; i++) {
    await new Promise((r) => setImmediate(r));
    game.step();
    if (game.menu.open) game.menu.pick(choose);
    else if (game.subtitles.active) { game.subtitles.advance(); game.subtitles.advance(); }
  }
  assert.ok(done, 'the action never finished');
  return promise;
}

const click = (game, id, options) => settle(game, game.interactor.clickHotspot(game.hotspot(id)), options);
const look = (game, id) => settle(game, game.interactor.lookHotspot(game.hotspot(id)));
const use = (game, item, id) => { game.interactor.select(item); return click(game, id); };
const room = (game) => game.scene.room.id;

// The whole solution, from wherever the player is.
async function solve(game, { skipEnding = false } = {}) {
  if (!game.inventory.has('oil-can') && !game.inventory.has('matches') && !game.core.state.get('flags.lampFilled')) {
    if (room(game) !== 'dock') throw new Error('solve() starts on the dock');
    await click(game, 'oil-can');
  }
  if (room(game) === 'dock') await click(game, 'door');
  if (!game.inventory.has('matches') && !game.core.state.get('flags.keeperMet')) await click(game, 'keeper', { choose: 1 });
  await click(game, 'stairs');
  assert.equal(room(game), 'lamp-room');
  await use(game, 'oil-can', 'lamp');
  if (!skipEnding) return use(game, 'matches', 'lamp');
  game.interactor.select('matches');
  const ending = game.interactor.clickHotspot(game.hotspot('lamp'));
  for (let i = 0; i < 60 && !game.cutscenes.active; i++) { await new Promise((r) => setImmediate(r)); game.step(); }
  assert.ok(game.cutscenes.skip());
  return settle(game, ending);
}

describe('the data', () => {
  it('every room file is valid room JSON with its hotspots, floor and a start', async () => {
    for (const id of ROOMS) {
      const parsed = parseRoom(await loadJson(`rooms/${id}.json`));
      assert.equal(parsed.id, id);
      assert.ok(parsed.walkable.length >= 1 && Object.keys(parsed.starts).length >= 1 && parsed.hotspots.length >= 3, id);
      for (const h of parsed.hotspots) assert.ok(h.walkTo, `${id}/${h.id} has a walk-to point`);
    }
  });

  it('every name, item and line the scripts say has a text', async () => {
    const game = await newGame();
    for (const r of Object.values(game.rooms)) for (const h of r.hotspots) assert.ok(game.core.i18n.has(h.name), `name ${h.name}`);
    for (const item of Object.values(game.inventory.items)) assert.ok(game.core.i18n.has(item.name), `item ${item.name}`);
    await game.start().then(() => {});
    // (the playthrough below checks the lines that are actually spoken)
  });
});

describe('playing the Lighthouse', () => {
  it('can be finished: oil, matches from the keeper, then the lamp', async () => {
    const game = await newGame();
    await settle(game, game.start());
    assert.equal(room(game), 'dock');
    assert.equal(game.core.state.get('currentRoom'), 'dock');

    await click(game, 'oil-can');
    assert.deepEqual(game.inventory.list, ['oil-can']);
    assert.equal(game.hotspot('oil-can').enabled, false, 'the can is gone from the dock');

    await click(game, 'door');
    assert.equal(room(game), 'hall');
    assert.deepEqual([game.hero.x, game.hero.y].map(Math.round), [80, 300], 'the hero walks in at the default start');

    // the keeper blocks the stairs until they have talked
    await click(game, 'stairs');
    assert.equal(room(game), 'hall');
    assert.equal(game.said.at(-1), 'stairs.blocked');

    await click(game, 'keeper', { choose: 1 });
    assert.ok(game.inventory.has('matches'), 'the Ink story gave the matches');
    assert.equal(game.core.state.get('flags.keeperMet'), true);
    assert.equal(game.core.state.get('vars.knowsLamp'), true, 'an Ink variable lives in the state store');

    await click(game, 'stairs');
    assert.equal(room(game), 'lamp-room');

    await use(game, 'oil-can', 'lamp');
    assert.equal(game.core.state.get('flags.lampFilled'), true);
    assert.equal(game.inventory.has('oil-can'), false);
    assert.equal(game.core.state.get('flags.lampLit'), undefined);

    const events = [];
    game.core.events.on('cutscene:start', () => events.push('start'));
    game.core.events.on('cutscene:end', (e) => events.push(e.skipped ? 'end skipped' : 'end'));
    await use(game, 'matches', 'lamp');
    assert.equal(game.core.state.get('flags.lampLit'), true);
    assert.equal(game.core.state.get('flags.ending'), true);
    assert.deepEqual(events, ['start', 'end']);
    assert.deepEqual(game.inventory.list, []);
    assert.deepEqual(game.said.slice(-3), ['lamp.lit', 'ending.boat', 'ending.the-end']);
    assert.deepEqual(game.errors, []);

    // every line spoken during the whole game has a text
    for (const key of game.said) assert.ok(game.core.i18n.has(key), `missing text for ${key}`);
  });

  it('answers sensibly when things are done in the wrong order', async () => {
    const game = await newGame();
    await settle(game, game.start());
    await click(game, 'oil-can');
    await click(game, 'door');
    await click(game, 'keeper', { choose: 0 });
    assert.equal(game.inventory.has('matches'), false, 'just looking around: no matches');
    assert.equal(game.core.state.get('flags.keeperMet'), true);
    await click(game, 'stairs');
    assert.equal(room(game), 'lamp-room');

    await look(game, 'lamp');
    await look(game, 'lamp');
    assert.deepEqual(game.said.slice(-2), ['lamp.look.first', 'lamp.look'], 'firstLook plays the first time only');

    await click(game, 'lamp');
    assert.equal(game.said.at(-1), 'lamp.cold');
    await use(game, 'oil-can', 'window');
    assert.equal(game.said.at(-1), 'default.use', 'oil on the window: the default answer');
    assert.equal(game.inventory.has('oil-can'), true, 'and it was not used up');

    await use(game, 'oil-can', 'lamp');
    assert.equal(game.said.at(-1), 'lamp.filled');
    assert.throws(() => game.interactor.select('oil-can'), /not carrying/, 'the can is used up, so it cannot be held again');

    // matches before oil: a different game, same room
    const other = await newGame();
    await settle(other, other.start());
    await click(other, 'door');
    await click(other, 'keeper', { choose: 1 });
    await click(other, 'stairs');
    await use(other, 'matches', 'lamp');
    assert.equal(other.said.at(-1), 'lamp.nothing-to-burn');
    assert.equal(other.inventory.has('matches'), true, 'the matches are kept');
    assert.equal(other.core.state.get('flags.lampLit'), undefined);
  });

  it('the keeper remembers you (Ink state restored from the store)', async () => {
    const game = await newGame();
    await settle(game, game.start());
    await click(game, 'door');
    await click(game, 'keeper', { choose: 1 });
    const lines = [];
    game.core.events.on('dialogue:line', (l) => lines.push(l.text));
    await click(game, 'keeper', { choose: 1 });
    assert.deepEqual(lines, ['Still here? The lamp will not light itself, you know.']);
    assert.deepEqual(game.inventory.list, ['matches'], 'no second pair of matches');
  });

  it('can be saved in the middle and finished in a fresh session', async () => {
    const first = await newGame();
    await settle(first, first.start());
    await click(first, 'oil-can');
    await click(first, 'door');
    await click(first, 'keeper', { choose: 1 });
    const position = [first.hero.x, first.hero.y].map(Math.round);
    const storage = memoryStorage();
    first.save(storage);

    const second = await newGame();
    assert.equal(await second.load(storage), true);
    assert.equal(room(second), 'hall');
    assert.deepEqual(second.inventory.list.sort(), ['matches', 'oil-can']);
    assert.deepEqual([second.hero.x, second.hero.y].map(Math.round), position);
    assert.equal(second.core.state.get('flags.keeperMet'), true);

    await click(second, 'stairs');
    await use(second, 'oil-can', 'lamp');
    await use(second, 'matches', 'lamp');
    assert.equal(second.core.state.get('flags.ending'), true);
    assert.deepEqual(second.errors, []);

    // a game that was saved before picking anything up still has the can on the dock
    const early = await newGame();
    await settle(early, early.start());
    early.save(storage, 'early');
    const late = await newGame();
    await late.load(storage, 'early');
    assert.equal(late.hotspot('oil-can').enabled, true);
    assert.equal(await newGame().then((g) => g.load(storage, 'none')), false);
  });

  it('a skipped ending ends in the same state as a played one', async () => {
    const played = await newGame();
    await settle(played, played.start());
    await solve(played);

    const skipped = await newGame();
    await settle(skipped, skipped.start());
    await solve(skipped, { skipEnding: true });

    const flags = (g) => g.core.state.get('flags');
    assert.deepEqual(flags(skipped), flags(played));
    assert.deepEqual(skipped.inventory.list, played.inventory.list);
    assert.equal(skipped.cutscenes.active, false);
    assert.deepEqual(skipped.errors, []);
  });

  it('the first visit is reported once per room, and the hero is on the right start', async () => {
    const game = await newGame();
    const visits = [];
    game.core.events.on('room:enter', ({ room: r, firstVisit, start }) => visits.push([r.id, firstVisit, start]));
    await settle(game, game.start());
    await click(game, 'door');
    await click(game, 'door-out');
    await click(game, 'door');
    assert.deepEqual(visits, [['dock', true, 'default'], ['hall', true, 'default'], ['dock', false, 'fromHall'], ['hall', false, 'default']]);
  });
});
