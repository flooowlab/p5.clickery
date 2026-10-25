/**
 * The text for the hover label. In smart mode: the object's name, or "Use rope with Door" while an item
 * is held. In verbs mode: "Look at Door". Names are text keys, translated with `t`.
 * @param {Object} options
 * @param {Hotspot|null} [options.hotspot] The hotspot under the pointer.
 * @param {string|null} [options.item] The inventory item under the pointer.
 * @param {string|null} [options.held] The item being held.
 * @param {Inventory} options.inventory
 * @param {'smart'|'verbs'} [options.mode='smart']
 * @param {string} [options.verb='interact']
 * @param {function(string, Object=): string} options.t A translation function, such as `game.i18n.t`.
 * @returns {string} The label, or an empty string.
 */
export function hoverLabel({ hotspot = null, item = null, held = null, inventory, mode = 'smart', verb = 'interact', t }) {
  const itemName = (id) => t(inventory.define(id).name);
  if (item) {
    if (held && held !== item) return t('ui.use_on', { item: itemName(held), target: itemName(item) });
    return itemName(item);
  }
  if (!hotspot) return held ? t('ui.use_item', { item: itemName(held) }) : '';
  const name = t(hotspot.name);
  if (held) return t('ui.use_on', { item: itemName(held), target: name });
  return mode === 'verbs' ? `${t(`verb.${verb}`)} ${name}` : name;
}
