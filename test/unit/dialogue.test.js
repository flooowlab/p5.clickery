import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Compiler } from 'inkjs/full';
import {
  createMarkdownRunner, parseMarkdown, createTwineRunner, parseTwee, parseTwison, createInkRunner, inkExternals,
  splitSpeaker, parseTags, StateStore, EventBus, Inventory, SubtitleBar, ChoiceMenu, DialogueSession, Interactor,
} from '../../src/index.js';

// ---- the same short conversation, written three ways ----

const MARKDOWN = `
# start
Guard: Halt! Who goes there? # sfx:alarm
* A friend. -> friend
* Nobody. -> nobody

# friend
Guard: Pass, friend.
~ passed = true
-> END

# nobody
Guard: Then be off!
-> END
`;

const TWEE = `:: StoryTitle
The Guard

:: StoryData
{"ifid": "ABC", "start": "Start"}

:: Start
Guard: Halt! Who goes there?
[[A friend.->friend]]
[[Nobody.->nobody]]

:: friend [talk]
Guard: Pass, friend.
<<set $passed to true>>

:: nobody
Guard: Then be off!
`;

const TWISON = {
  name: 'The Guard',
  startnode: '1',
  passages: [
    { pid: 1, name: 'Start', text: 'Guard: Halt! Who goes there?\n[[A friend.|friend]]\n[[friend<-Nobody.]]'.replace('[[friend<-Nobody.]]', '[[Nobody.->nobody]]') },
    { pid: 2, name: 'friend', text: 'Guard: Pass, friend.\n<<set $passed = true>>' },
    { pid: 3, name: 'nobody', text: 'Guard: Then be off!' },
  ],
};

const inkStory = () => new Compiler(fs.readFileSync(new URL('../fixtures/guard.ink', import.meta.url), 'utf8')).Compile();
const inkRunner = (options = {}) => createInkRunner(inkStory(), { externals: { giveItem: () => {} }, ...options });

const adapters = {
  markdown: () => createMarkdownRunner(MARKDOWN),
  'twee 3': () => createTwineRunner(TWEE),
  twison: () => createTwineRunner(TWISON),
  ink: () => inkRunner(),
};

// Plays a runner to the end, always taking choice `pick`.
function transcript(runner, pick) {
  const out = [];
  for (let guard = 0; guard < 50; guard++) {
    const line = runner.next();
    if (line) { out.push(`${line.speaker}: ${line.text}`); continue; }
    const choices = runner.choices();
    if (choices.length === 0) break;
    out.push(`? ${choices.map((c) => c.text).join(' | ')}`);
    runner.choose(pick);
  }
  return out;
}

describe('one conversation through every adapter', () => {
  const expected = {
    0: ['Guard: Halt! Who goes there?', '? A friend. | Nobody.', 'Guard: Pass, friend.'],
    1: ['Guard: Halt! Who goes there?', '? A friend. | Nobody.', 'Guard: Then be off!'],
  };

  for (const [name, make] of Object.entries(adapters)) {
    for (const pick of [0, 1]) {
      it(`${name}, choice ${pick}`, () => {
        const runner = make();
        assert.deepEqual(transcript(runner, pick), expected[pick]);
        assert.equal(runner.done, true);
        assert.equal(Boolean(runner.vars.passed), pick === 0, 'the passed variable');
        assert.equal(runner.next(), null);
        assert.deepEqual(runner.choices(), []);
      });
    }
  }

  it('choices carry their index; choosing out of range throws', () => {
    for (const make of Object.values(adapters)) {
      const runner = make();
      runner.next();
      assert.deepEqual(runner.choices().map((c) => c.index), [0, 1]);
      assert.equal(runner.next(), null, 'waiting for a choice');
      assert.equal(runner.done, false);
      assert.throws(() => runner.choose(5), RangeError);
    }
  });
});

describe('markdown format', () => {
  const run = (src, options) => createMarkdownRunner(src, options);
  const lines = (r) => { const out = []; for (let l = r.next(); l; l = r.next()) out.push(l); return out; };

  it('reads speakers, narration, tags and comments', () => {
    const r = run('// hi\nGuard: Halt! # sfx:alarm # loud\nThe wind howls.\nNote: no speaker here is fine\n');
    const got = lines(r);
    assert.deepEqual(got[0], { speaker: 'Guard', text: 'Halt!', tags: { sfx: 'alarm', loud: true } });
    assert.deepEqual(got[1], { speaker: null, text: 'The wind howls.', tags: {} });
    assert.equal(got[2].speaker, 'Note');
    assert.equal(r.done, true);
  });

  it('evaluates conditions on lines and choices', () => {
    const src = `
{met} Guard: Back again?
{!met} Guard: First time.
{gold >= 5} Guard: Rich.
{gold < 5} Guard: Poor.
{name == "Ada"} Guard: Hello Ada.
~ met = true
* {met} Greet. -> hi
* {!met} Hide. -> hi
# hi
Guard: Hi.
`;
    const first = run(src, { vars: { gold: 3, name: 'Ada' } });
    assert.deepEqual(lines(first).map((l) => l.text), ['First time.', 'Poor.', 'Hello Ada.']);
    assert.deepEqual(first.choices().map((c) => c.text), ['Greet.']);
    const second = run(src, { vars: { met: true, gold: 9 } });
    assert.deepEqual(lines(second).map((l) => l.text), ['Back again?', 'Rich.']);
  });

  it('sets, adds and subtracts variables, and interpolates them into text and choices', () => {
    const r = run('~ gold = 10\n~ gold -= 3\n~ gold += 1\nYou have {gold} gold and {missing}.\n* Pay {gold}. -> end\n# end\nDone.');
    assert.equal(r.next().text, 'You have 8 gold and {missing}.');
    assert.equal(r.next(), null);
    assert.equal(r.choices()[0].text, 'Pay 8.');
    r.choose(0);
    assert.equal(r.next().text, 'Done.');
  });

  it('jumps between sections; a section with no ending finishes', () => {
    const r = run('# a\nOne.\n-> b\n# b\nTwo.\n');
    assert.deepEqual(lines(r).map((l) => l.text), ['One.', 'Two.']);
    assert.ok(r.done);
  });

  it('with every choice hidden the conversation ends', () => {
    const r = run('Hello.\n* {never} Nope. -> end\n# end\nx');
    r.next();
    assert.equal(r.next(), null);
    assert.ok(r.done);
  });

  it('keeps variables in the state store when given one', () => {
    const state = new StateStore();
    state.set('vars.gold', 4);
    const r = run('~ gold += 1\n~ flag = true\nDone {gold}.', { state });
    assert.equal(r.next().text, 'Done 5.');
    assert.deepEqual(state.get('vars'), { gold: 5, flag: true });
    assert.equal(r.vars.gold, 5);
  });

  it('can start at a named section', () => {
    const r = run('# a\nA.\n# b\nB.', { start: 'b' });
    assert.equal(r.next().text, 'B.');
    assert.throws(() => run('# a\nA.', { start: 'zzz' }), /no section/);
  });

  it('reports mistakes with line numbers', () => {
    assert.throws(() => parseMarkdown('Hello\n* No arrow'), /line 2: a choice needs/);
    assert.throws(() => parseMarkdown('# a\n-> nowhere'), /missing section "nowhere"/);
    assert.throws(() => parseMarkdown('# a\nx\n# a\ny'), /line 3: duplicate section/);
    assert.throws(() => parseMarkdown('-> END\nText after'), /line 2: nothing can follow/);
    assert.throws(() => parseMarkdown('* A -> x\nText\n# x\ny'), /line 2: nothing can follow/);
    assert.throws(() => parseMarkdown('~ broken'), /line 1: bad assignment/);
    assert.throws(() => parseMarkdown('{??} Hi'), /line 1: bad condition/);
    assert.throws(() => parseMarkdown('  \n// only a comment'), /empty/);
  });

  it('a loop that never speaks is stopped', () => {
    const r = run('# a\n-> b\n# b\n-> a');
    assert.throws(() => r.next(), /loops/);
  });
});

describe('twine support', () => {
  it('reads the Twee 3 structure: special passages, tags, start', () => {
    const { passages, start } = parseTwee(TWEE);
    assert.deepEqual(passages.map((p) => p.name), ['Start', 'friend', 'nobody']);
    assert.deepEqual(passages[1].tags, ['talk']);
    assert.equal(start, 'Start');
  });

  it('understands every link style', () => {
    const r = createTwineRunner(':: Start\n[[Go->a]] [[b<-Back]] [[Pipe|c]] [[d]]\n:: a\nA\n:: b\nB\n:: c\nC\n:: d\nD');
    assert.equal(r.next(), null);
    assert.deepEqual(r.choices().map((c) => c.text), ['Go', 'Back', 'Pipe', 'd']);
    r.choose(1);
    assert.equal(r.next().text, 'B');
  });

  it('runs set macros in order, with to / = / += / -=, and shows $variables', () => {
    const r = createTwineRunner(':: Start\n<<set $gold to 5>>\nYou have $gold gold.\n<<set $gold += 2>><<set $name = "Ada">>\nHi $name, $gold $nothing.');
    assert.equal(r.next().text, 'You have 5 gold.');
    assert.equal(r.next().text, 'Hi Ada, 7 $nothing.');
    assert.equal(r.vars.gold, 7);
  });

  it('starts at "Start", else the first passage, else the Twison startnode', () => {
    assert.equal(createTwineRunner(':: Intro\nFirst\n:: Start\nSecond').next().text, 'Second');
    assert.equal(createTwineRunner(':: Intro\nFirst\n:: Other\nSecond').next().text, 'First');
    const twison = { startnode: '2', passages: [{ pid: 1, name: 'A', text: 'one' }, { pid: 2, name: 'B', text: 'two' }] };
    assert.equal(createTwineRunner(twison).next().text, 'two');
    assert.equal(createTwineRunner(JSON.stringify(twison)).next().text, 'two');
    assert.equal(parseTwison(twison).start, 'B');
  });

  it('rejects what it does not support, naming the passage', () => {
    assert.throws(() => createTwineRunner(':: Start\n<<if $x>>hi<<endif>>'), /passage "Start": unsupported macro <<if>>/);
    assert.throws(() => createTwineRunner(':: Start\n<<set oops>>'), /cannot read/);
    assert.throws(() => createTwineRunner(':: Start\n[[go->missing]]'), /passage "Start" leads to missing passage "missing"/);
    assert.throws(() => createTwineRunner(':: A\nx\n:: A\ny'), /duplicate passage/);
    assert.throws(() => createTwineRunner(':: StoryData\nnot json\n:: A\nx'), /StoryData/);
    assert.throws(() => createTwineRunner('{"nope": 1}'), /passages/);
    assert.throws(() => createTwineRunner(''), /no passages/);
  });

  it('shares variables with the state store', () => {
    const state = new StateStore();
    const r = createTwineRunner(TWEE, { state });
    transcript(r, 0);
    assert.equal(state.get('vars.passed'), true);
  });
});

describe('ink adapter', () => {
  it('reads tags: sfx into line.tags, an explicit speaker tag wins over the prefix', () => {
    const r = inkRunner();
    assert.deepEqual(r.next(), { speaker: 'Guard', text: 'Halt! Who goes there?', tags: { sfx: 'alarm' } });
    const story = new Compiler('Someone: Hello # speaker: Captain # mood: grim\n# sfx:door\n').Compile();
    const t = createInkRunner(story);
    assert.deepEqual(t.next(), { speaker: 'Captain', text: 'Someone: Hello', tags: { mood: 'grim' } });
  });

  it('a tag-only line is returned with empty text, so sound cues are not lost', () => {
    const t = createInkRunner(new Compiler('Hello.\n# sfx:door\nBye.\n').Compile());
    const got = [];
    for (let l = t.next(); l; l = t.next()) got.push([l.text, l.tags]);
    assert.ok(got.some(([, tags]) => tags.sfx === 'door'));
    assert.ok(got.some(([text]) => text === 'Bye.'));
  });

  it('binds external functions to the game (giveItem) through inkExternals', () => {
    const state = new StateStore();
    const inventory = new Inventory({ state, events: new EventBus(), items: { badge: { name: 'item.badge' } } });
    const r = createInkRunner(inkStory(), { externals: inkExternals({ inventory, state }) });
    transcript(r, 0);
    assert.deepEqual(inventory.list, ['badge']);
    const again = createInkRunner(inkStory(), { externals: inkExternals({ inventory, state }) });
    transcript(again, 1);
    assert.deepEqual(inventory.list, ['badge'], 'the other branch gives nothing');
  });

  it('syncs listed variables with the state store in both directions', () => {
    const state = new StateStore();
    const r = inkRunner({ state, sync: ['passed'] });
    assert.equal(state.get('vars.passed'), false);
    transcript(r, 0);
    assert.equal(state.get('vars.passed'), true, 'ink -> state');

    const state2 = new StateStore();
    state2.set('vars.passed', true);
    const r2 = inkRunner({ state: state2, sync: ['passed'] });
    assert.equal(r2.vars.passed, true, 'a saved value is loaded into the story');
    state2.set('vars.passed', false);
    assert.equal(r2.vars.passed, false, 'state -> ink while running');
  });

  it('one story can run many conversations: externals rebind, old links detach, saved variables survive the reset', () => {
    const state = new StateStore();
    const story = inkStory();
    const given = [];
    const make = () => createInkRunner(story, { state, sync: ['passed'], externals: { giveItem: (id) => given.push(id) } });
    transcript(make(), 0);
    assert.deepEqual(given, ['badge']);
    assert.equal(state.get('vars.passed'), true);
    const again = make();
    assert.equal(again.vars.passed, true, 'the reset did not wipe the saved variable');
    assert.equal(state.get('vars.passed'), true);
    transcript(again, 1);
    assert.deepEqual(given, ['badge'], 'the "nobody" branch gives nothing, and no handler ran twice');
    again.dispose();
    state.set('vars.passed', false);
    assert.equal(story.variablesState.passed, true, 'a disposed runner no longer follows the store');
  });

  it('reset: false carries on a story that is part-way through', () => {
    const story = inkStory();
    const first = createInkRunner(story, { externals: { giveItem() {} } });
    first.next();
    const carried = createInkRunner(story, { externals: { giveItem() {} }, reset: false });
    assert.equal(carried.next(), null, 'still waiting at the choice from before');
    assert.equal(carried.choices().length, 2);
  });

  it('vars can be read and written directly', () => {
    const r = inkRunner();
    r.vars.passed = true;
    assert.equal(r.vars.passed, true);
    assert.ok('passed' in r.vars);
  });
});

describe('helpers', () => {
  it('splitSpeaker needs a space after the colon', () => {
    assert.deepEqual(splitSpeaker('Guard: Hi'), { speaker: 'Guard', text: 'Hi' });
    assert.deepEqual(splitSpeaker('Time is 10:30 now'), { speaker: null, text: 'Time is 10:30 now' });
    assert.deepEqual(splitSpeaker('Guard:Hi'), { speaker: null, text: 'Guard:Hi' });
  });

  it('parseTags handles keys, values and bare tags', () => {
    assert.deepEqual(parseTags(['sfx:alarm', ' speaker : Guard ', 'loud']), { sfx: 'alarm', speaker: 'Guard', loud: true });
  });
});

describe('SubtitleBar', () => {
  const line = (text) => ({ speaker: 'Guard', text, tags: {} });

  it('reveals text over time, then holds, then resolves', async () => {
    const bar = new SubtitleBar();
    bar.charsPerSecond = 100;
    let done = false;
    const p = bar.show(line('0123456789')).then(() => { done = true; });
    assert.equal(bar.visibleText, '');
    bar.update(50);
    assert.equal(bar.visibleText, '01234');
    bar.update(50);
    assert.ok(bar.fullyShown);
    bar.update(bar.holdMs - 1);
    await Promise.resolve();
    assert.equal(done, false);
    bar.update(2);
    await p;
    assert.ok(done && !bar.active);
  });

  it('advance completes the reveal first, then moves on', async () => {
    const bar = new SubtitleBar();
    const p = bar.show(line('A long line of text'));
    bar.advance();
    assert.equal(bar.visibleText, 'A long line of text');
    assert.ok(bar.active);
    bar.advance();
    await p;
    assert.ok(!bar.active);
  });

  it('speed shortens reveal and reading time; skip resolves at once', async () => {
    const slow = new SubtitleBar();
    slow.show(line('x'.repeat(40)));
    const fast = new SubtitleBar();
    fast.speed = 4;
    fast.show(line('x'.repeat(40)));
    assert.equal(fast.holdMs, slow.holdMs / 4);
    slow.update(250);
    fast.update(250);
    assert.ok(fast.visibleCount > slow.visibleCount);
    const p = slow.show(line('again'));
    slow.skip();
    await p;
  });

  it('a new line ends the previous one; abort rejects; hide is quiet', async () => {
    const bar = new SubtitleBar();
    const first = bar.show(line('one'));
    bar.show(line('two'));
    await first;
    assert.equal(bar.line.text, 'two');
    const ctl = new AbortController();
    const p = bar.show(line('three'), ctl.signal);
    ctl.abort(new Error('stop'));
    await assert.rejects(p, /stop/);
    await assert.rejects(bar.show(line('four'), ctl.signal), /stop/);
    const q = bar.show(line('five'));
    bar.hide();
    assert.equal(bar.active, false);
    q.catch(() => {});
  });
});

describe('ChoiceMenu', () => {
  const choices = [{ index: 0, text: 'A' }, { index: 1, text: 'B' }, { index: 2, text: 'C' }];
  const menu = () => new ChoiceMenu({ viewWidth: 640, viewHeight: 360 });

  it('lays rows out from the bottom and hit-tests them', () => {
    const m = menu();
    m.ask(choices);
    const r2 = m.rowRect(2);
    assert.equal(r2.y + r2.h, 360 - m.bottom);
    assert.equal(m.itemAt(100, m.rowRect(1).y + 3), 1);
    assert.equal(m.itemAt(2, m.rowRect(1).y + 3), null, 'in the margin');
    assert.equal(m.itemAt(100, 10), null);
    m.move(100, m.rowRect(0).y + 1);
    assert.equal(m.hovered, 0);
  });

  it('click and keyboard pick resolve with the choice index', async () => {
    const m = menu();
    const a = m.ask(choices);
    assert.ok(m.open);
    assert.equal(m.click(2, 2), false);
    assert.equal(m.click(100, m.rowRect(2).y + 2), true);
    assert.equal(await a, 2);
    assert.ok(!m.open);
    const b = m.ask(choices);
    assert.equal(m.pick(7), false);
    assert.equal(m.pick(0), true);
    assert.equal(await b, 0);
    assert.equal(m.pick(0), false, 'nothing open');
  });

  it('close with a reason rejects the question', async () => {
    const m = menu();
    const p = m.ask(choices);
    m.close(new Error('gone'));
    await assert.rejects(p, /gone/);
    const ctl = new AbortController();
    const q = m.ask(choices, ctl.signal);
    ctl.abort(new Error('aborted'));
    await assert.rejects(q, /aborted/);
  });
});

describe('DialogueSession', () => {
  const setup = () => {
    const events = new EventBus();
    const subtitles = new SubtitleBar();
    const menu = new ChoiceMenu({ viewWidth: 640, viewHeight: 360 });
    const session = new DialogueSession({ events, subtitles, menu });
    const log = [];
    for (const type of ['dialogue:start', 'dialogue:line', 'dialogue:tag', 'dialogue:choose', 'dialogue:end']) {
      events.on(type, (e) => log.push([type, e?.key ?? e?.text ?? e?.index ?? null]));
    }
    // Plays the UI like a player would: taps through lines, picks choices.
    const player = async (promise, pick = 0) => {
      let done = false;
      promise.then(() => { done = true; }, () => { done = true; });
      for (let i = 0; i < 200 && !done; i++) {
        await new Promise((r) => setImmediate(r));
        if (menu.open) menu.pick(pick);
        else if (subtitles.active) { subtitles.advance(); subtitles.advance(); }
      }
      return promise;
    };
    return { events, subtitles, menu, session, log, player };
  };

  it('plays a conversation: lines, tag events, choices, end', async () => {
    const { session, log, player } = setup();
    const runner = createMarkdownRunner(MARKDOWN);
    assert.equal(session.active, false);
    const p = session.play(runner);
    assert.equal(session.active, true);
    await player(p, 0);
    assert.equal(session.active, false);
    assert.deepEqual(log, [
      ['dialogue:start', null],
      ['dialogue:tag', 'sfx'],
      ['dialogue:line', 'Halt! Who goes there?'],
      ['dialogue:choose', 'A friend.'],
      ['dialogue:line', 'Pass, friend.'],
      ['dialogue:end', null],
    ]);
    assert.equal(runner.vars.passed, true);
  });

  it('works the same with an ink runner, and the other choice', async () => {
    const { session, log, player } = setup();
    const runner = inkRunner();
    await player(session.play(runner), 1);
    assert.ok(log.some(([t, v]) => t === 'dialogue:line' && v === 'Then be off!'));
    assert.equal(runner.done, true);
  });

  it('tag-only lines emit the tag but show no subtitle', async () => {
    const { session, log, player } = setup();
    await player(session.play(createInkRunner(new Compiler('Hi.\n# sfx:door\nBye.\n').Compile())));
    assert.ok(log.some(([t, v]) => t === 'dialogue:tag' && v === 'sfx'));
    assert.deepEqual(log.filter(([t]) => t === 'dialogue:line').map(([, v]) => v), ['Hi.', 'Bye.']);
  });

  it('one at a time; abort cuts it short and cleans up', async () => {
    const { session, subtitles, menu } = setup();
    const ctl = new AbortController();
    const p = session.play(createMarkdownRunner(MARKDOWN), { signal: ctl.signal });
    await assert.rejects(session.play(createMarkdownRunner(MARKDOWN)), /already running/);
    await new Promise((r) => setImmediate(r));
    ctl.abort(new Error('walked away'));
    await assert.rejects(p, /walked away/);
    assert.equal(session.active, false);
    assert.equal(subtitles.active, false);
    assert.equal(menu.open, false);
  });

  it('locks the interactor while a conversation runs', async () => {
    const { session, player } = setup();
    const interactor = new Interactor({
      hero: { walkTo: async () => true, say: async () => {} }, state: new StateStore(), events: new EventBus(),
      inventory: new Inventory({ state: new StateStore(), events: new EventBus() }), dialogue: session,
    });
    assert.equal(interactor.locked, false);
    const p = session.play(createMarkdownRunner(MARKDOWN));
    assert.equal(interactor.locked, true);
    assert.equal(await interactor.clickGround({ x: 1, y: 1 }), false);
    await player(p);
    assert.equal(interactor.locked, false);
  });
});
