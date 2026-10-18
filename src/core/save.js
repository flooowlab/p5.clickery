// Save and load. Slots live in localStorage under "p5.clickery:<slot>"; file
// export/import goes through the same JSON envelope.
export const SAVE_VERSION = 1;
const PREFIX = 'p5.clickery:';

export function serialize(store, now = Date.now()) {
  return JSON.stringify({ version: SAVE_VERSION, savedAt: now, state: store.toJSON() });
}

// Parses a save envelope and restores the store. Throws on bad or newer data
// before touching the store.
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

export function saveToSlot(store, slot, storage = globalThis.localStorage) {
  storage.setItem(PREFIX + slot, serialize(store));
}

// Returns false when the slot is empty.
export function loadFromSlot(store, slot, storage = globalThis.localStorage) {
  const text = storage.getItem(PREFIX + slot);
  if (text === null) return false;
  deserialize(store, text);
  return true;
}

export function deleteSlot(slot, storage = globalThis.localStorage) {
  storage.removeItem(PREFIX + slot);
}

// Browser only: offers the save as a file download.
export function exportToFile(store, filename = 'savegame.json') {
  const url = URL.createObjectURL(new Blob([serialize(store)], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

// Browser only: restores from a File chosen by the player.
export async function importFromFile(store, file) {
  return deserialize(store, await file.text());
}
