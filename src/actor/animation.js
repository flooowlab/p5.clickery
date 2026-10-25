// Animation state for a sprite: a state (idle, walk, talk) plus a facing
// direction pick one animation. Animations are { frames: [...], delay: ms, loop }.
// Name them "<state>_<direction>" ("walk_right"), or just "<state>". A missing
// direction falls back to its mirror (flipped), then to the sides of a diagonal,
// then to the plain state, so 2, 4 and 8 direction sets all work.

/**
 * The four facing directions, clockwise from the top.
 * @type {string[]}
 */
export const DIRS4 = ['up', 'right', 'down', 'left'];

/**
 * The eight facing directions, clockwise from the top.
 * @type {string[]}
 */
export const DIRS8 = ['up', 'up_right', 'right', 'down_right', 'down', 'down_left', 'left', 'up_left'];

/**
 * The direction name for a movement, in screen coordinates (y grows down).
 * @param {number} dx
 * @param {number} dy
 * @param {number} [count=8] `4` or `8` directions.
 * @returns {string} For example `'up'` or `'down_left'`.
 * @example
 * directionFromVector(10, 0); // 'right'
 */
export function directionFromVector(dx, dy, count = 8) {
  const dirs = count === 4 ? DIRS4 : DIRS8;
  const angle = Math.atan2(dx, -dy); // 0 is up, clockwise
  const step = (Math.PI * 2) / dirs.length;
  return dirs[((Math.round(angle / step) % dirs.length) + dirs.length) % dirs.length];
}

/**
 * The same direction seen in a mirror: left becomes right and the other way round.
 * @param {string} dir
 * @returns {string}
 * @example
 * mirrorDirection('up_left'); // 'up_right'
 */
export function mirrorDirection(dir) {
  return dir.replace('left', '\0').replace('right', 'left').replace('\0', 'right');
}

/**
 * Which animation is playing, and which frame of it. The state (`idle`, `walk` or `talk`) and the
 * direction the character faces choose the animation, named `<state>_<direction>` (`walk_right`) or
 * just `<state>`. If a direction is missing, the mirror image (flipped) is tried, then the sides
 * of a diagonal, then the plain state, so a hero can start with only `walk_right` and `walk_down`.
 * An actor owns one: `hero.anim`.
 *
 * An animation is `{ frames, delay, loop }`: a list of pictures, the milliseconds each is shown (default
 * 100), and whether it repeats (default `true`).
 *
 * @example
 * const anim = new AnimationState({
 *   idle: { frames: [idleImg], delay: 200 },
 *   walk_right: { frames: [r1, r2, r3, r4], delay: 120 }, // also used, flipped, for 'left'
 * });
 *
 * @param {Object<string, {frames: Array, delay: number, loop: boolean}>} [animations]
 */
export class AnimationState {
  /** `'idle'`, `'walk'` or `'talk'`. @type {string} */
  state = 'idle';
  /** The direction faced, such as `'down'`. @type {string} */
  dir = 'down';
  #elapsed = 0;
  #key = null;

  constructor(animations = {}) {
    /** The animations by name. @type {Object} */
    this.animations = animations;
  }

  /**
   * Changes the state. The animation restarts when the state is a new one.
   * @param {string} state
   */
  set(state) {
    if (state !== this.state) {
      this.state = state;
      this.#elapsed = 0;
    }
  }

  /**
   * Changes the direction faced.
   * @param {string} dir
   */
  face(dir) {
    this.dir = dir;
  }

  /**
   * Moves the animation forward.
   * @param {number} dt Milliseconds.
   */
  update(dt) {
    const { key } = this.current;
    if (key !== this.#key) { this.#key = key; this.#elapsed = 0; }
    this.#elapsed += dt;
  }

  /**
   * The animation for the state and direction now.
   * @type {{key: string|null, anim: Object|null, flip: boolean}} `key` is `null` when none is defined; `flip` is `true` when the mirror image is used.
   */
  get current() {
    const { state, dir } = this;
    const tries = [[dir, false]];
    if (mirrorDirection(dir) !== dir) tries.push([mirrorDirection(dir), true]);
    if (dir.includes('_')) {
      const [v, h] = dir.split('_');
      tries.push([h, false], [mirrorDirection(h), true], [v, false]);
    }
    tries.push([null, false]);
    for (const [d, flip] of tries) {
      const key = d ? `${state}_${d}` : state;
      if (this.animations[key]) return { key, anim: this.animations[key], flip };
    }
    return { key: null, anim: null, flip: false };
  }

  /**
   * `true` when the picture should be drawn mirrored.
   * @type {boolean}
   */
  get flip() {
    return this.current.flip;
  }

  /**
   * The picture to draw now, or `null` when there is no animation.
   * @type {*}
   */
  get frame() {
    const { anim } = this.current;
    if (!anim?.frames?.length) return null;
    const step = Math.floor(this.#elapsed / (anim.delay ?? 100));
    const n = anim.frames.length;
    return anim.frames[anim.loop === false ? Math.min(step, n - 1) : step % n];
  }

  /**
   * `true` once an animation that does not loop has played to its end.
   * @type {boolean}
   */
  get finished() {
    const { anim } = this.current;
    return anim?.loop === false && this.#elapsed >= anim.frames.length * (anim.delay ?? 100);
  }
}

/**
 * Draws the current frame of an animation, with its feet at a point (the picture is centred on `x`
 * and sits on `y`). Browser only.
 * @param {Object} p The p5 sketch.
 * @param {AnimationState} anim For example `hero.anim`.
 * @param {number} x
 * @param {number} y
 * @param {number} [scale=1] For example `hero.scale`.
 * @returns {boolean} `false` when there was nothing to draw.
 * @example
 * game.drawHero = (p, hero) => drawAnimation(p, hero.anim, hero.x, hero.y, hero.scale);
 */
export function drawAnimation(p, anim, x, y, scale = 1) {
  const frame = anim.frame;
  if (!frame) return false;
  p.push();
  p.translate(x, y);
  p.scale(anim.flip ? -scale : scale, scale);
  p.image(frame, -frame.width / 2, -frame.height);
  p.pop();
  return true;
}
