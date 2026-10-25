/**
 * p5 2.x does not start calling `draw()` until an async `setup()` has finished, and a game only
 * moves forward from `draw()` (see the addon's `predraw` hook). So a `setup()` that awaits something
 * that needs frames, such as an opening cutscene in a room's `onEntered` or a line of speech, would
 * wait forever. This steps and draws the game from the browser's own frame callback until p5's loop
 * takes over (`game.drawnByP5` is set by the addon's `predraw`), so that code just works, and the
 * player sees the scene play.
 *
 * It does nothing outside a browser, and stops by itself when p5 starts drawing.
 *
 * @param {Game} game
 * @param {Object} [options]
 * @param {function(Function): *} [options.request] Asks for the next frame. Default: `requestAnimationFrame`, if there is one.
 * @returns {function(): void} A function that stops it.
 */
export function driveUntilDrawing(game, { request = globalThis.requestAnimationFrame?.bind(globalThis) } = {}) {
  if (!request) return () => {};
  let stopped = false;
  let last = null;
  const frame = (now) => {
    if (stopped || game.drawnByP5) return;
    game.update(last === null ? 0 : now - last);
    last = now;
    try {
      game.draw?.();
    } catch (err) {
      console.warn('p5.clickery: could not draw the game while setup() was running:', err.message);
      return;
    }
    request(frame);
  };
  request(frame);
  return () => { stopped = true; };
}
