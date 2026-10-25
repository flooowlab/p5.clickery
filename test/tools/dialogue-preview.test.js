import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programFrom, analyse } from '../../tools/dialogue/analyse.js';
import { PreviewSession } from '../../tools/dialogue/session.js';

const MARKDOWN = `
# start
Merchant: Welcome. A map costs 5 gold. # sfx:bell
You have {gold} gold.
* {gold >= 5} Buy the map. -> buy
* Leave. -> END

# buy
~ gold -= 5
Merchant: Thanks. {gold} left.
-> END

# secret
~ discovered = true
Nobody ever gets here.
`;

const TWEE = `:: Start
Guard: Halt!
[[Pass->open]]
[[Run->run]]

:: open
<<set $passed to true>>
Guard: Go on.

:: run
Guard: Stop!

:: lost
Never linked.
`;

test('the format is recognised, and compiled', () => {
  assert.equal(programFrom(MARKDOWN).format, 'Markdown');
  assert.equal(programFrom(TWEE).format, 'Twee');
  const twison = JSON.stringify({ startnode: '1', passages: [{ pid: '1', name: 'Start', text: 'Hi\n[[Next->B]]' }, { pid: '2', name: 'B', text: 'Bye' }] });
  assert.equal(programFrom(twison).format, 'Twison');
});

test('compiled Ink, an empty conversation and a broken one are explained', () => {
  assert.throws(() => programFrom('{"inkVersion":21,"root":[]}'), /compiled Ink/);
  assert.throws(() => programFrom('   '), /empty/);
  assert.throws(() => programFrom('# a\n-> nowhere'), /nowhere|missing/);
  assert.throws(() => programFrom(':: A\n<<if $x>>hi<</if>>'), /A/);
});

test('analysis finds sections that can never be reached', () => {
  const result = analyse(programFrom(MARKDOWN).program);
  assert.deepEqual(result.unreachable, ['secret']);
  assert.deepEqual(result.sections.find((s) => s.name === 'start'), { name: 'start', reachable: true, lines: 2, ends: '2 choices' });
  assert.equal(result.sections.find((s) => s.name === 'buy').ends, 'goes to END');
  assert.equal(result.sections.find((s) => s.name === 'secret').ends, 'finishes');
  assert.deepEqual(analyse(programFrom(TWEE).program).unreachable, ['lost']);
});

test('analysis finds variables that are read but never set, and set but never read', () => {
  const { variables } = analyse(programFrom(MARKDOWN).program);
  assert.deepEqual(variables.set, ['discovered', 'gold']);
  assert.deepEqual(variables.read, ['gold']);
  assert.deepEqual(variables.readNeverSet, []);
  assert.deepEqual(variables.setNeverRead, ['discovered']);

  const lonely = analyse(programFrom('# start\n{key} Guard: You have the key.\n-> END').program).variables;
  assert.deepEqual(lonely.readNeverSet, ['key']);
});

test('a Markdown conversation plays with its starting variables, and a transcript', () => {
  const session = new PreviewSession(MARKDOWN, { vars: { gold: 7 } });
  assert.equal(session.format, 'Markdown');
  assert.deepEqual(session.transcript.map((t) => t.text), ['Welcome. A map costs 5 gold.', 'You have 7 gold.']);
  assert.deepEqual(session.transcript[0].tags, { sfx: 'bell' });
  assert.deepEqual(session.options.map((o) => o.text), ['Buy the map.', 'Leave.']);
  assert.equal(session.done, false);

  session.choose(0);
  assert.deepEqual(session.transcript.slice(2).map((t) => [t.type, t.text]), [['choice', 'Buy the map.'], ['line', 'Thanks. 2 left.']]);
  assert.equal(session.vars.gold, 2);
  assert.equal(session.done, true);
  assert.deepEqual(session.options, []);
});

test('with too little gold the conditional choice is not offered', () => {
  const session = new PreviewSession(MARKDOWN, { vars: { gold: 1 } });
  assert.deepEqual(session.options.map((o) => o.text), ['Leave.']);
});

test('the Markdown start section can be chosen', () => {
  const session = new PreviewSession(MARKDOWN, { vars: { gold: 9 }, start: 'buy' });
  assert.equal(session.transcript[0].text, 'Thanks. 4 left.');
  assert.throws(() => new PreviewSession(MARKDOWN, { start: 'nope' }), /no section "nope"/);
});

test('a Twine conversation plays too, with its variables', () => {
  const session = new PreviewSession(TWEE);
  assert.equal(session.format, 'Twee');
  assert.deepEqual(session.options.map((o) => o.text), ['Pass', 'Run']);
  session.choose(0);
  assert.equal(session.vars.passed, true);
  assert.equal(session.done, true);
  assert.throws(() => session.choose(0), RangeError);
});
