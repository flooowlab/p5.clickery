// Text for the hover label. `t` is i18n.t; item and hotspot names are localisation keys.
//   smart mode: the object name, or "Use rope with Door" while an item is held
//   verbs mode: "Look at Door"
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
