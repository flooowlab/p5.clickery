/**
 * What the player carries. The list lives in the state store (`inventory`, a list of item ids), so
 * it is saved with everything else. Items are unique: giving one twice does nothing. A game makes
 * one from its `items` and `recipes` options: `game.inventory`.
 *
 * A recipe works in either order and uses up both ingredients unless `consume` lists which to
 * remove (`['b']` keeps item `a`, for example a knife). Events: `inventory:add` and
 * `inventory:remove`, each with `{ id }`.
 *
 * @example
 * const inventory = new Inventory({
 *   state, events,
 *   items: { stick: { name: 'item.stick' }, string: { name: 'item.string' }, pole: { name: 'item.pole' } },
 *   recipes: [{ a: 'stick', b: 'string', result: 'pole', say: 'combine.pole' }],
 * });
 *
 * @param {Object} options
 * @param {StateStore} options.state Where the list is kept.
 * @param {EventBus} [options.events] Where `inventory:add` and `inventory:remove` are sent.
 * @param {Object<string, {name: string}>} [options.items] Item ids and their definitions. `name` is a text key.
 * @param {Array<Object>} [options.recipes] `{ a, b, result, say?, consume? }`.
 */
export class Inventory {
  constructor({ state, events, items = {}, recipes = [] }) {
    /** The state store the list is kept in. @type {StateStore} */
    this.state = state;
    /** The event bus. @type {EventBus|undefined} */
    this.events = events;
    /** The item definitions by id. @type {Object<string, {name: string}>} */
    this.items = items;
    /** The recipes. @type {Array<Object>} */
    this.recipes = recipes;
  }

  /**
   * The ids of the items carried, in the order they were picked up.
   * @type {string[]}
   */
  get list() {
    return this.state.get('inventory', []);
  }

  /**
   * Asks whether an item is carried.
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this.list.includes(id);
  }

  /**
   * The definition of an item.
   * @param {string} id
   * @returns {{name: string}}
   * @throws {Error} For an id that is not in `items`.
   */
  define(id) {
    if (!(id in this.items)) throw new Error(`unknown item "${id}"`);
    return this.items[id];
  }

  /**
   * Puts an item in the inventory.
   * @param {string} id An id from `items`.
   * @returns {boolean} `true`, or `false` when it was already carried.
   * @example
   * inventory.give('stick');
   */
  give(id) {
    this.define(id);
    if (this.has(id)) return false;
    this.state.set('inventory', [...this.list, id]);
    this.events?.emit('inventory:add', { id });
    return true;
  }

  /**
   * Takes an item out of the inventory.
   * @param {string} id
   * @returns {boolean} `true`, or `false` when it was not carried.
   */
  remove(id) {
    if (!this.has(id)) return false;
    this.state.set('inventory', this.list.filter((i) => i !== id));
    this.events?.emit('inventory:remove', { id });
    return true;
  }

  /**
   * Looks up the recipe for two items, in either order. Does not check what is carried.
   * @param {string} a
   * @param {string} b
   * @returns {Object|null} The recipe, or `null` when the two do not combine.
   */
  recipeFor(a, b) {
    return this.recipes.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a)) ?? null;
  }

  /**
   * Combines two carried items: removes the ingredients the recipe uses up and gives the result.
   * @param {string} a
   * @param {string} b
   * @returns {Object|null} The recipe used, or `null` when there is none or either item is not carried.
   * @example
   * inventory.combine('stick', 'string'); // now carrying 'pole'
   */
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
