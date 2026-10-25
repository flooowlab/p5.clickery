import { parseTags, splitSpeaker } from './common.js';

// Ink adapter. Pass an inkjs `Story` (built from a compiled .ink.json):
//
//   import { Story } from 'inkjs';
//   const runner = createInkRunner(new Story(json), { state, sync: ['passed'], externals });
//
// The library never imports inkjs itself, so it stays an optional add-on.
//
//   - Tags: "# speaker: Guard" sets the line's speaker; any other "# key: value"
//     lands in line.tags (for example sfx). Without a speaker tag a "Name: " prefix is used.
//   - externals: { giveItem: (id) => ... } are bound as ink EXTERNAL functions.
//   - sync: names of ink variables mirrored to the state store ("vars.<name>"), both ways.
//
// A runner is one conversation. Creating a new runner for the same Story replaces the
// previous one: it is detached first (externals, variable links), then the story is
// reset to its beginning (pass `reset: false` to carry on a story that is part-way
// through), then `sync` variables are restored from the state store. So a game just
// calls createInkRunner(story, ...) every time the player starts talking.
const attached = new WeakMap(); // story -> the runner currently linked to it

export function createInkRunner(story, { state = null, sync = [], externals = {}, reset = true } = {}) {
  attached.get(story)?.dispose();
  if (reset) story.ResetState();
  const cleanups = [];

  for (const [name, fn] of Object.entries(externals)) {
    try { story.UnbindExternalFunction(name); } catch { /* it was not bound yet */ }
    story.BindExternalFunction(name, fn);
    cleanups.push(() => { try { story.UnbindExternalFunction(name); } catch { /* already gone */ } });
  }

  const ink = story.variablesState;
  if (state) {
    for (const name of sync) {
      const saved = state.get(`vars.${name}`);
      if (saved !== undefined) ink[name] = saved;
      else state.set(`vars.${name}`, ink[name]);
      const observer = (_, value) => {
        if (state.get(`vars.${name}`) !== value) state.set(`vars.${name}`, value);
      };
      story.ObserveVariable(name, observer);
      cleanups.push(() => story.RemoveVariableObserver(observer, name));
      cleanups.push(state.watch(`vars.${name}`, (value) => {
        if (value !== undefined && ink[name] !== value) ink[name] = value;
      }));
    }
  }

  const vars = new Proxy({}, {
    get: (_, k) => (typeof k === 'string' ? ink[k] : undefined),
    set: (_, k, v) => { ink[k] = v; return true; },
    has: (_, k) => ink[String(k)] !== undefined,
  });

  const runner = {
    vars,
    story,

    // Detach from the story and the state store. Called automatically when a newer
    // runner is created for the same story.
    dispose() {
      for (const undo of cleanups.splice(0)) undo();
      if (attached.get(story) === runner) attached.delete(story);
    },

    get done() {
      return !story.canContinue && story.currentChoices.length === 0;
    },

    next() {
      while (story.canContinue) {
        const text = story.Continue().trim();
        const tags = parseTags(story.currentTags ?? []);
        if (!text && Object.keys(tags).length === 0) continue;
        let speaker = tags.speaker ?? null;
        delete tags.speaker;
        let body = text;
        if (speaker === null) ({ speaker, text: body } = splitSpeaker(text));
        return { speaker, text: body, tags };
      }
      return null;
    },

    choices() {
      return story.currentChoices.map((c) => ({ index: c.index, text: c.text }));
    },

    choose(i) {
      if (!Number.isInteger(i) || i < 0 || i >= story.currentChoices.length) throw new RangeError(`no choice ${i}`);
      story.ChooseChoiceIndex(i);
    },
  };
  attached.set(story, runner);
  return runner;
}

// Ready-made EXTERNAL functions for the usual game hooks:
//   EXTERNAL giveItem(item)    EXTERNAL setFlag(name)
export function inkExternals({ inventory, state }) {
  return {
    giveItem: (id) => { inventory.give(id); },
    setFlag: (name) => { state.set(`flags.${name}`, true); },
  };
}
