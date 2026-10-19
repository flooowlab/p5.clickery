// Inventory over the state store ("inventory" is a list of item ids, so it is
// saved with everything else). Items are unique: giving one twice does nothing.
//
//   items:   { rope: { name: "item.rope", description: "item.rope.look" }, ... }
//   recipes: [{ a: "stick", b: "string", result: "pole", say: "combine.pole" }]
// A recipe works in either order and consumes both ingredients unless
// `consume` lists which to remove (e.g. ["b"] keeps the knife).
//
// Events: "inventory:add" and "inventory:remove" with { id }.
export class Inventory {
  constructor({ state, events, items = {}, recipes = [] }) {
    this.state = state;
    this.events = events;
    this.items = items;
    this.recipes = recipes;
  }

  get list() {
    return this.state.get('inventory', []);
  }

  has(id) {
    return this.list.includes(id);
  }

  define(id) {
    if (!(id in this.items)) throw new Error(`unknown item "${id}"`);
    return this.items[id];
  }

  // Returns false when the player already has it.
  give(id) {
    this.define(id);
    if (this.has(id)) return false;
    this.state.set('inventory', [...this.list, id]);
    this.events?.emit('inventory:add', { id });
    return true;
  }

  remove(id) {
    if (!this.has(id)) return false;
    this.state.set('inventory', this.list.filter((i) => i !== id));
    this.events?.emit('inventory:remove', { id });
    return true;
  }

  recipeFor(a, b) {
    return this.recipes.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a)) ?? null;
  }

  // Combines two carried items. Returns the recipe used, or null when there is
  // none or either item is missing.
  combine(a, b) {
    if (a === b || !this.has(a) || !this.has(b)) return null;
    const recipe = this.recipeFor(a, b);
    if (!recipe) return null;
    const used = { [recipe.a]: 'a', [recipe.b]: 'b' };
    const consume = recipe.consume ?? ['a', 'b'];
    for (const id of [a, b]) if (consume.includes(used[id])) this.remove(id);
    this.give(recipe.result);
    return recipe;
  }
}
