// Run-once helpers for object scripts. The flag lives in the state store
// ("flags.once.<id>.<key>"), so it survives save and load. The flag is set
// before fn runs, so a skipped or interrupted first time is not repeated.
// Object ids must not contain dots.

/**
 * Runs `fn` the first time it is called for this object and `key`, and never again (also after
 * saving and loading). The flag is set before `fn` runs, so a first time that was skipped or
 * interrupted is not repeated.
 * @param {ScriptContext} ctx The context a handler receives.
 * @param {string} key Names the thing that happens once, such as `'greeting'`.
 * @param {function(ScriptContext): *} fn What to run the first time. May be async.
 * @returns {Promise<boolean>} `true` if it ran now, `false` if it had run before.
 * @example
 * onInteract: async (ctx) => {
 *   if (await once(ctx, 'greeting', () => ctx.say('guard.hello'))) return;
 *   await ctx.say('guard.again');
 * }
 */
export async function once(ctx, key, fn) {
  const path = `flags.once.${ctx.id}.${String(key).replaceAll('.', '_')}`;
  if (ctx.state.get(path, false)) return false;
  ctx.state.set(path, true);
  await fn(ctx);
  return true;
}

/**
 * Runs `fn` the first time the player looks at this object. See {@link once}.
 * @param {ScriptContext} ctx
 * @param {function(ScriptContext): *} fn
 * @returns {Promise<boolean>} `true` if it ran now.
 * @example
 * onLook: async (ctx) => {
 *   if (await firstLook(ctx, () => ctx.say('statue.look.first'))) return;
 *   await ctx.say('statue.look');
 * }
 */
export const firstLook = (ctx, fn) => once(ctx, 'look', fn);

/**
 * Runs `fn` the first time the player clicks this object. See {@link once}.
 * @param {ScriptContext} ctx
 * @param {function(ScriptContext): *} fn
 * @returns {Promise<boolean>} `true` if it ran now.
 */
export const firstInteract = (ctx, fn) => once(ctx, 'interact', fn);

/**
 * Runs `fn` the first time each item is used on this object. See {@link once}.
 * @param {ScriptContext} ctx
 * @param {function(ScriptContext): *} fn
 * @returns {Promise<boolean>} `true` if it ran now.
 */
export const firstUse = (ctx, fn) => once(ctx, `use:${ctx.item}`, fn);
