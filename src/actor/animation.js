// Animation state for a sprite: a state (idle, walk, talk) plus a facing
// direction pick one animation. Animations are { frames: [...], delay: ms, loop }.
// Name them "<state>_<direction>" ("walk_right"), or just "<state>". A missing
// direction falls back to its mirror (flipped), then to the sides of a diagonal,
// then to the plain state, so 2, 4 and 8 direction sets all work.
export const DIRS4 = ['up', 'right', 'down', 'left'];
export const DIRS8 = ['up', 'up_right', 'right', 'down_right', 'down', 'down_left', 'left', 'up_left'];

// Direction name for a movement vector (screen coordinates, y grows down).
export function directionFromVector(dx, dy, count = 8) {
  const dirs = count === 4 ? DIRS4 : DIRS8;
  const angle = Math.atan2(dx, -dy); // 0 is up, clockwise
  const step = (Math.PI * 2) / dirs.length;
  return dirs[((Math.round(angle / step) % dirs.length) + dirs.length) % dirs.length];
}

export function mirrorDirection(dir) {
  return dir.replace('left', '\0').replace('right', 'left').replace('\0', 'right');
}

export class AnimationState {
  state = 'idle';
  dir = 'down';
  #elapsed = 0;
  #key = null;

  constructor(animations = {}) {
    this.animations = animations;
  }

  set(state) {
    if (state !== this.state) {
      this.state = state;
      this.#elapsed = 0;
    }
  }

  face(dir) {
    this.dir = dir;
  }

  update(dt) {
    const { key } = this.current;
    if (key !== this.#key) { this.#key = key; this.#elapsed = 0; }
    this.#elapsed += dt;
  }

  // { key, anim, flip } for the state and direction now, or key null when none is defined.
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

  get flip() {
    return this.current.flip;
  }

  get frame() {
    const { anim } = this.current;
    if (!anim?.frames?.length) return null;
    const step = Math.floor(this.#elapsed / (anim.delay ?? 100));
    const n = anim.frames.length;
    return anim.frames[anim.loop === false ? Math.min(step, n - 1) : step % n];
  }

  get finished() {
    const { anim } = this.current;
    return anim?.loop === false && this.#elapsed >= anim.frames.length * (anim.delay ?? 100);
  }
}

// Draws the current frame with its feet at (x, y). Browser only.
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
