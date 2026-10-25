// What the animation previewer works out: which frames of a sprite sheet an animation uses, whether
// the animations make sense, and the code that goes in your game. Pure functions, so they run in the
// page and in tests.

export const STATES = ['idle', 'walk', 'talk'];
export const DIRECTIONS = ['up', 'right', 'down', 'left', 'up_right', 'down_right', 'down_left', 'up_left'];

/**
 * Reads a list of frames: `'0, 2, 4'`, a range `'4-7'`, or both `'0, 4-7'`. A range can run backwards (`'7-4'`).
 * @param {string} text
 * @returns {number[]}
 * @throws {Error} For anything that is not whole numbers and ranges.
 */
export function parseFrameList(text) {
  const frames = [];
  for (const part of String(text).split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!m) throw new Error(`"${part}" is not a frame number or a range like 4-7`);
    const from = Number(m[1]);
    const to = m[2] === undefined ? from : Number(m[2]);
    const step = from <= to ? 1 : -1;
    for (let i = from; i !== to + step; i += step) frames.push(i);
  }
  return frames;
}

/**
 * How a sheet is cut up.
 * @returns {{columns: number, rows: number, count: number}}
 */
export function sheetGrid(sheetWidth, sheetHeight, frameWidth, frameHeight) {
  if (!(frameWidth > 0) || !(frameHeight > 0)) return { columns: 0, rows: 0, count: 0 };
  const columns = Math.floor(sheetWidth / frameWidth);
  const rows = Math.floor(sheetHeight / frameHeight);
  return { columns, rows, count: columns * rows };
}

/** The rectangle of a frame on the sheet. */
export function frameRect(index, frameWidth, frameHeight, columns) {
  return { x: (index % columns) * frameWidth, y: Math.floor(index / columns) * frameHeight, w: frameWidth, h: frameHeight };
}

/**
 * Warnings about a set of animations: `{ name: { frames: number[], delay: number, loop: boolean } }`.
 * @returns {string[]}
 */
export function checkAnimations(animations, frameCount) {
  const warnings = [];
  const names = Object.keys(animations);
  if (!names.length) warnings.push('there are no animations yet');
  for (const [name, a] of Object.entries(animations)) {
    const m = /^([a-z]+)(?:_([a-z_]+))?$/.exec(name);
    if (!m || !STATES.includes(m[1])) warnings.push(`"${name}": a name starts with ${STATES.join(', ')}, then optionally _direction, such as walk_right`);
    else if (m[2] && !DIRECTIONS.includes(m[2])) warnings.push(`"${name}": "${m[2]}" is not a direction (${DIRECTIONS.join(', ')})`);
    if (!a.frames.length) warnings.push(`"${name}" has no frames`);
    const beyond = a.frames.filter((f) => f >= frameCount);
    if (beyond.length && frameCount > 0) warnings.push(`"${name}" uses frame ${beyond[0]}, but the sheet has only ${frameCount} (0 to ${frameCount - 1})`);
    if (!(a.delay > 0)) warnings.push(`"${name}": the delay must be above 0`);
  }
  if (names.length && !names.some((n) => n === 'idle' || n.startsWith('idle_'))) warnings.push('there is no idle animation, so a standing hero draws nothing');
  return warnings;
}

/**
 * The code for the game: loads the sheet, cuts the frames and sets the `hero` option.
 * @param {Object} config
 * @param {string} config.file The sheet's file name.
 * @param {number} config.frameWidth
 * @param {number} config.frameHeight
 * @param {number} config.columns
 * @param {Object<string, {frames: number[], delay: number, loop: boolean}>} config.animations
 * @param {4|8} [config.directions=4]
 * @returns {string}
 */
export function buildSnippet({ file, frameWidth, frameHeight, columns, animations, directions = 4 }) {
  const entries = Object.entries(animations).map(([name, a]) => {
    const frames = `[${a.frames.join(', ')}].map(frame)`;
    return `      ${name}: { frames: ${frames}, delay: ${a.delay}${a.loop === false ? ', loop: false' : ''} },`;
  });
  return [
    `const sheet = await loadImage(${JSON.stringify(file)});`,
    `const frame = (i) => sheet.get((i % ${columns}) * ${frameWidth}, Math.floor(i / ${columns}) * ${frameHeight}, ${frameWidth}, ${frameHeight});`,
    '',
    'const game = createGame({',
    '  hero: {',
    `    directions: ${directions},`,
    '    animations: {',
    ...entries,
    '    },',
    '  },',
    '  // rooms, items, strings...',
    '});',
    '',
    '// draw the hero with its animation (this is what the default does when the hero has animations):',
    '// game.drawHero = (p, hero) => p5.clickery.drawAnimation(p, hero.anim, hero.x, hero.y, hero.scale);',
    '',
  ].join('\n');
}
