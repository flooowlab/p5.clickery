import { page } from './layout.mjs';
import { codeBlock } from './markdown.mjs';

const SNIPPET = `let game;

async function setup() {
  game = createGame({
    rooms: [{
      id: 'yard', width: 640, height: 360, color: '#2d3a55',
      starts: { default: { x: 80, y: 300 } },
      walkable: [{ id: 'floor', points: [[0, 250], [640, 250], [640, 340], [0, 340]] }],
    }],
  });
  await game.start();
}

function draw() {
  game.draw();
}`;

export function homePage() {
  return page({
    title: 'p5.clickery · point-and-click adventures for p5.js', root: '', section: '',
    description: 'A p5.js library for point-and-click adventure games: rooms, hotspots, walking, inventory, cutscenes and dialogue.',
    body: `<section class="hero">
  <h1>Make a point-and-click adventure with p5.js</h1>
  <p class="lead">Rooms, clickable objects, a hero who walks, an inventory, cutscenes and conversations. Describe the game as data, then write what happens as small scripts.</p>
</section>
<section class="choices">
  <a class="choice" href="learn/"><b>Learn</b><span>Short lessons with a live, editable game on every page. Start here if you are new.</span></a>
  <a class="choice" href="docs/"><b>Docs</b><span>Every function, property and option, with examples. Generated from the source.</span></a>
  <a class="choice" href="tools/"><b>Tools</b><span>The room editor, and the other helpers for making a game.</span></a>
  <a class="choice" href="examples/"><b>Examples</b><span>Complete small games to play and read.</span></a>
</section>
<section class="home-more">
  <h2>The whole thing, in one screen</h2>
  <p>Load p5, load p5.clickery, and describe a room. That is a game you can walk around in:</p>
  ${codeBlock(SNIPPET)}
  <pre class="code"><code>&lt;script src="https://cdn.jsdelivr.net/npm/p5@2/lib/p5.min.js"&gt;&lt;/script&gt;
&lt;script src="https://flooowlab.github.io/p5.clickery/dist/p5.clickery.min.js"&gt;&lt;/script&gt;</code></pre>
  <p>Works with p5.js 2.x. MIT licence. <a href="https://github.com/flooowlab/p5.clickery">Source on GitHub</a>.</p>
</section>`,
  });
}
