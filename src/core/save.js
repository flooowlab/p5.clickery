// Save and load. Slots live in localStorage under "p5.clickery:<slot>"; file
// export/import goes through the same JSON envelope.

/**
 * The version of the save format. A save from a newer version is refused.
 * @type {number}
 */
export const SAVE_VERSION = 1;
const PREFIX = 'p5.clickery:';

/**
 * Turns the state into save text: `{ version, savedAt, state }` as JSON.
 * @param {StateStore} store
 * @param {number} [now] The time to record. Default: now.
 * @returns {string}
 */
export function serialize(store, now = Date.now()) {
  return JSON.stringify({ version: SAVE_VERSION, savedAt: now, state: store.toJSON() });
}

/**
 * Reads save text and restores the state from it. Throws on bad or newer data before touching the store.
 * @param {StateStore} store
 * @param {string} text What {@link serialize} made.
 * @returns {Object} The save: `{ version, savedAt, state }`.
 * @throws {Error} When the text is not valid JSON, has no state, or is from a newer version.
 */
export function deserialize(store, text) {
  let save;
  try {
    save = JSON.parse(text);
  } catch {
    throw new Error('Save data is not valid JSON');
  }
  if (save === null || typeof save !== 'object' || typeof save.state !== 'object' || save.state === null) {
    throw new Error('Save data has no state');
  }
  if (save.version > SAVE_VERSION) {
    throw new Error(`Save version ${save.version} is newer than supported version ${SAVE_VERSION}`);
  }
  store.fromJSON(save.state);
  return save;
}

/**
 * Saves the state to a slot in `localStorage`. ({@link Game#save} does this and also keeps where the hero stands.)
 * @param {StateStore} store
 * @param {string} slot A name, such as `'game'` or `'slot2'`.
 * @param {Storage} [storage] Default: `localStorage`.
 */
export function saveToSlot(store, slot, storage = globalThis.localStorage) {
  storage.setItem(PREFIX + slot, serialize(store));
}

/**
 * Restores the state from a slot.
 * @param {StateStore} store
 * @param {string} slot
 * @param {Storage} [storage] Default: `localStorage`.
 * @returns {boolean} `false` when the slot is empty.
 */
export function loadFromSlot(store, slot, storage = globalThis.localStorage) {
  const text = storage.getItem(PREFIX + slot);
  if (text === null) return false;
  deserialize(store, text);
  return true;
}

/**
 * Empties a slot.
 * @param {string} slot
 * @param {Storage} [storage] Default: `localStorage`.
 */
export function deleteSlot(slot, storage = globalThis.localStorage) {
  storage.removeItem(PREFIX + slot);
}

/**
 * Browser only: offers the state as a file download, so the player can keep a save outside the browser.
 * @param {StateStore} store
 * @param {string} [filename='savegame.json']
 */
export function exportToFile(store, filename = 'savegame.json') {
  const url = URL.createObjectURL(new Blob([serialize(store)], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Browser only: restores the state from a file the player chose.
 * @param {StateStore} store
 * @param {File} file
 * @returns {Promise<Object>} The save that was read.
 */
export async function importFromFile(store, file) {
  return deserialize(store, await file.text());
}
