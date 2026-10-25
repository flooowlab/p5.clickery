---
title: Dialogue
blurb: Conversations in Markdown or Twine: running them by hand, tags, subtitles and choices.
---
<!-- page: Run a conversation by hand -->
<!-- covers: DialogueRunner, createMarkdownRunner, GraphRunner#next, GraphRunner#choices, GraphRunner#choose, GraphRunner#done, parseMarkdown -->
`game.talk` plays a conversation with the subtitle bar and the choice menu. Underneath, every format becomes a **runner** (see {@link DialogueRunner}) with four things: `next()` returns the next line, or `null` when it is waiting for a choice or has finished; `choices()` lists the options; `choose(i)` picks one; and `done` is `true` at the end. With those you can build any dialogue screen you like.

Markdown conversations have sections (`# name`), lines (`Speaker: text`), choices (`* text -> section`), variables (`~ gold -= 5`) and conditions (`{gold >= 5}`). Here the runner is driven by hand and drawn as plain text. Click, or press **1**, **2**, **3** to choose.

```js
const { createMarkdownRunner } = p5.clickery;
let game;
let runner;
let said = [];

const script = `
# start
Merchant: Welcome, traveller. A map costs 5 gold.
You have {gold} gold.
* {gold >= 5} Buy the map. -> buy
* Haggle. -> haggle
* Leave. -> END

# buy
~ gold -= 5
Merchant: Pleasure doing business. You have {gold} gold left.
-> END

# haggle
Merchant: Ha! Five gold, and not a coin less.
* Fine, here is the gold. -> buy
* Then I will leave. -> END
`;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
    }],
  });
  await game.start();
  runner = createMarkdownRunner(script, { state: game.state, vars: { gold: 7 } });
  advance();
}

function advance() {
  for (let line = runner.next(); line; line = runner.next()) {
    said.push(line.speaker ? line.speaker + ': ' + line.text : line.text);
  }
}

function choose(i) {
  const options = runner.choices();
  if (!options[i]) return;
  said.push('> ' + options[i].text);
  runner.choose(i);
  advance();
}

function draw() {
  game.draw();
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  fill(255);
  textSize(14);
  said.slice(-6).forEach((line, i) => text(line, 20, 40 + i * 22));
  runner.choices().forEach((o, i) => { fill('#ffd678'); text((i + 1) + '. ' + o.text, 20, 200 + i * 22); });
  fill(180);
  text(runner.done ? '(the conversation is over)  gold: ' + game.state.get('vars.gold') : 'gold: ' + game.state.get('vars.gold'), 20, height - 16);
}

function keyPressed() {
  choose(Number(key) - 1);
}

function mousePressed() {
  choose(Math.floor((mouseY - 184) / 22)); // the rows are 22 pixels high, starting at y 184
}
```

<!-- page: Speakers and tags -->
<!-- covers: DialogueLine, DialogueSession#play, DialogueSession#active, splitSpeaker, parseTags -->
A line is `{ speaker, text, tags }` (see {@link DialogueLine}). A Markdown line can end with tags: `Guard: Halt! # sfx:alarm # loud`. A tag with a value becomes `{ sfx: 'alarm' }` and a bare word becomes `{ loud: true }`. When a line has tags, the game sends a `dialogue:tag` event for each, which is how `sfx:` plays a sound, and you can listen for your own, say `mood:angry` to change the guard's picture.

`splitSpeaker` and `parseTags` are the little functions that do the reading. `game.dialogue.active` is `true` while a conversation plays, and the game ignores clicks on the room (they belong to the conversation). Click the guard.

```js
const { splitSpeaker, parseTags } = p5.clickery;
let game;
let tagLog = [];

const talk = `
# start
Guard: Halt! Who goes there? # sfx:alarm # mood:angry
Guard: Oh, it is only you. # mood:calm
`;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'guard', name: 'obj.guard', provider: 'polygon', color: '#4f7cac',
        points: [[400, 150], [450, 150], [450, 250], [400, 250]], walkTo: { x: 360, y: 290, dir: 'right' },
      }],
    }],
    strings: { 'obj.guard': 'Guard' },
  });

  game.events.on('dialogue:tag', ({ key, value }) => tagLog.push(key + ' = ' + value));
  game.on('guard', { onInteract: () => game.talk(talk) });

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text('conversation active: ' + game.dialogue.active, 10, 22);
  text('splitSpeaker: ' + JSON.stringify(splitSpeaker('Guard: Halt!')), 10, 40);
  text('parseTags: ' + JSON.stringify(parseTags(['sfx:alarm', 'loud'])), 10, 58);
  text('tags seen: ' + tagLog.join(', '), 10, 76);
}
```

<!-- page: Twine -->
<!-- covers: createTwineRunner, parseTwee, parseTwison, compileTwine -->
If you write your stories in [Twine](https://twinery.org), export them and give them to `game.talk`: either **Twee 3** text (passages starting with `::`) or **Twison** JSON; the format is detected. Links are `[[text->target]]` (also `[[target<-text]]`, `[[text|target]]` and `[[target]]`) and become the choices; `<<set $name to value>>` sets a variable and `$name` in a line shows it. Anything else (`<<if>>`, `<<print>>`, Harlowe or SugarCube macros) is refused with the passage's name, instead of showing up as text.

`parseTwee` and `parseTwison` read the two formats, `compileTwine` turns the passages into something runnable, and `createTwineRunner` does all three. Click the guard and pick an answer.

```js
let game;

const story = `:: Start
Guard: Halt! Who goes there?
[[A friend->friend]]
[[A thief->thief]]

:: friend
<<set $welcome to 5>>
Guard: Then welcome, friend. Have $welcome gold.

:: thief
Guard: Not on my watch!
`;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'guard', name: 'obj.guard', provider: 'polygon', color: '#4f7cac',
        points: [[400, 150], [450, 150], [450, 250], [400, 250]], walkTo: { x: 360, y: 290, dir: 'right' },
      }],
    }],
    strings: { 'obj.guard': 'Guard' },
  });

  game.on('guard', { onInteract: () => game.talk(story) });

  await game.start();
}

function draw() {
  game.draw();
  fill(255);
  textSize(13);
  text('welcome gold in memory: ' + game.state.get('vars.welcome', 'not yet'), 10, 22);
}
```

<!-- page: Subtitles and choices -->
<!-- covers: SubtitleBar#speed, SubtitleBar#enabled, SubtitleBar#charsPerSecond, SubtitleBar#visibleText, SubtitleBar#active, ChoiceMenu#open, ChoiceMenu#options, Game#subtitles, Game#menu -->
Lines appear in the **subtitle bar** (`game.subtitles`) with a typewriter reveal. `speed` multiplies the reveal and the reading time (the player's text speed setting changes it), `charsPerSecond` is the reveal rate, `enabled` hides the bar while lines still take their time, and `visibleText` is what has appeared so far. Click or tap to show the rest of a line, and again to move on; Escape moves on at once.

Choices appear in the **choice menu** (`game.menu`); `menu.open` is `true` while a question is up and `menu.options` lists it. Click the guard, then press **+** and **-** to change the speed while he talks.

```js
let game;

const talk = `
# start
Guard: This line is revealed slowly, one character after another, so that you can see the typewriter at work.
* Fine. -> END
* Whatever. -> END
`;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]], color: '#3c4659' }],
      hotspots: [{
        id: 'guard', name: 'obj.guard', provider: 'polygon', color: '#4f7cac',
        points: [[400, 150], [450, 150], [450, 250], [400, 250]], walkTo: { x: 360, y: 290, dir: 'right' },
      }],
    }],
    strings: { 'obj.guard': 'Guard' },
  });

  game.subtitles.charsPerSecond = 20;
  game.on('guard', { onInteract: () => game.talk(talk) });

  await game.start();
}

function draw() {
  game.draw();
  const s = game.subtitles;
  fill(255);
  textSize(13);
  text(`subtitle speed ${s.speed.toFixed(1)}, ${s.charsPerSecond} chars/s, shown: ${s.active ? s.visibleText.length : 0} characters`, 10, 22);
  text(`choice menu open: ${game.menu.open}   options: ${game.menu.options.length}`, 10, 40);
}

function keyPressed() {
  if (key === '+') game.subtitles.speed = Math.min(4, game.subtitles.speed + 0.5);
  if (key === '-') game.subtitles.speed = Math.max(0.5, game.subtitles.speed - 0.5);
}
```
