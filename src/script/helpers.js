// Run-once helpers for object scripts. The flag lives in the state store
// ("flags.once.<id>.<key>"), so it survives save and load. The flag is set
// before fn runs, so a skipped or interrupted first time is not repeated.
// Object ids must not contain dots.
//
//   onLook: async (c) => {
//     if (await firstLook(c, () => c.say('statue.look.first'))) return;
//     await c.say('statue.look');
//   }
export async function once(ctx, key, fn) {
  const path = `flags.once.${ctx.id}.${String(key).replaceAll('.', '_')}`;
  if (ctx.state.get(path, false)) return false;
  ctx.state.set(path, true);
  await fn(ctx);
  return true;
}

export const firstLook = (ctx, fn) => once(ctx, 'look', fn);
export const firstInteract = (ctx, fn) => once(ctx, 'interact', fn);
// Once per item used on the object.
export const firstUse = (ctx, fn) => once(ctx, `use:${ctx.item}`, fn);
