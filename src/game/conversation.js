import { createMarkdownRunner } from '../dialogue/markdown.js';
import { createTwineRunner } from '../dialogue/twine.js';
import { createInkRunner, inkExternals } from '../dialogue/ink.js';

// Turns whatever the game was given into a dialogue runner, so game.talk() takes
// any format:
//   a runner already            -> used as it is
//   an inkjs Story              -> Ink
//   compiled Ink JSON (object or text with "inkVersion") -> Ink, using inkjs's Story
//   a Twison object ({ passages }) or Twee 3 text (starting with "::") -> Twine
//   any other text              -> the Markdown format
const stories = new WeakMap(); // compiled-JSON object -> its Story, so it is parsed once
const storiesByText = new Map();

const isRunner = (s) => s && typeof s.next === 'function' && typeof s.choices === 'function';
const isInkStory = (s) => s && typeof s.Continue === 'function' && 'variablesState' in s;

function inkStoryFrom(source, Story) {
  const StoryClass = Story ?? globalThis.inkjs?.Story;
  if (!StoryClass) {
    throw new Error('this is an Ink story: load ink.js first (<script src="ink.js">) or pass { Story } from inkjs');
  }
  if (typeof source === 'string') {
    if (!storiesByText.has(source)) storiesByText.set(source, new StoryClass(source));
    return storiesByText.get(source);
  }
  if (!stories.has(source)) stories.set(source, new StoryClass(source));
  return stories.get(source);
}

// All global variable names of an Ink story (inkjs keeps them in a private map).
function inkVariableNames(story) {
  const vars = story.variablesState?._globalVariables;
  return vars instanceof Map ? [...vars.keys()] : [];
}

export function toRunner(source, { state, inventory, Story, sync, externals = {}, start } = {}) {
  if (isRunner(source)) return source;

  const looksLikeInk = isInkStory(source)
    || (source && typeof source === 'object' && 'inkVersion' in source)
    || (typeof source === 'string' && /^\s*\{\s*"inkVersion"/.test(source));
  if (looksLikeInk) {
    const story = isInkStory(source) ? source : inkStoryFrom(source, Story);
    return createInkRunner(story, {
      state,
      sync: sync ?? inkVariableNames(story),
      externals: { ...inkExternals({ inventory, state }), ...externals },
    });
  }

  if (source && typeof source === 'object' && Array.isArray(source.passages)) return createTwineRunner(source, { state });
  if (typeof source !== 'string') throw new TypeError('talk() needs dialogue text (Markdown or Twee), Twison, an Ink story or a runner');
  if (source.trimStart().startsWith('::')) return createTwineRunner(source, { state });
  return createMarkdownRunner(source, { state, start });
}
