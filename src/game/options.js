/**
 * The options of {@link createGame} (and of `new Game(options)`). Everything has a default, so pass only what you need.
 *
 * @typedef {Object} GameOptions
 * @property {Array<Object|string>|Object} [rooms=[]] Room objects, or URLs of room JSON files (pictures named in a room file load relative to it). A list, or an object `{ id: room }`.
 * @property {Object<string,string>} [strings={}] Text keys and their text. The built-in answers ("I can't use that.") are already included.
 * @property {Object} [items={}] Inventory items: `{ key: 'brass key' }`, or `{ key: { text: 'brass key', image: 'key.png' } }`.
 * @property {Array<Object>} [recipes=[]] Items that combine: `[{ a: 'stick', b: 'string', result: 'pole' }]`. Each recipe can also have `say` (a text key for the hero to say) and `consume` (which of `a` and `b` are used up).
 * @property {Object<string,string>} [sounds={}] Sound id to file: `{ theme: 'theme.ogg', click: 'click.wav' }`. A room's `music` field plays one.
 * @property {Object<string,string>} [sfx={}] Sounds for events: `{ 'inventory:add': 'pickup' }`.
 * @property {number} [width=640] The game's fixed width. The canvas is scaled to fit, never stretched.
 * @property {number} [height=360] The game's fixed height.
 * @property {Object} [hero={}] The hero's options: `speed` (150), `directions` (4 or 8), `animations`.
 * @property {'smart'|'verbs'} [mode='smart'] `'verbs'` gives a verb list (Look at / Use / Walk to).
 * @property {number} [fadeMs=300] Length of the fade between rooms, in milliseconds.
 * @property {boolean} [followHero=true] In rooms wider than the screen, the camera follows the hero.
 * @property {string|null} [debugKey='d'] The key that toggles the outlines of hotspots and floors. `null` turns it off.
 * @property {string} [language='en'] The language of `strings`.
 * @property {string} [saveSlot='game'] Where {@link Game#save} and {@link Game#load} keep the game.
 * @property {Object} [storage] Where saves and settings go (default: `localStorage`).
 * @property {Function} [Story] inkjs's `Story` class, if you import inkjs instead of loading `ink.js` with a script tag.
 * @property {HTMLElement|string} [parent] An element (or its id) to put the game in. The game fills it. Default: the page.
 * @property {boolean} [fit=true] Scale the canvas to fill its parent, with letterbox bars. `false` leaves it at its size.
 * @property {boolean} [canvas=true] `false` uses a canvas you created yourself.
 */
export const GAME_DEFAULTS = {
  width: 640,
  height: 360,
  rooms: [],
  strings: {},
  language: 'en',
  items: {},
  recipes: [],
  sounds: {},
  sfx: {},
  hero: {},
  mode: 'smart',
  fadeMs: 300,
  followHero: true,
  debugKey: 'd',
  saveSlot: 'game',
  storage: undefined,
  Story: undefined,
};
