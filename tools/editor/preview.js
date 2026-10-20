// Runs a room exported by the editor in the real engine: the same JSON the game
// loads. The room comes from the editor (localStorage) or from ?room=<url>&image=<url>.
import { registerClickery } from '../../src/index.js';

registerClickery(p5);
const $ = (id) => document.getElementById(id);
const query = new URLSearchParams(location.search);

async function source() {
  if (query.get('room')) return { room: await (await fetch(query.get('room'))).json(), imageURL: query.get('image') };
  const saved = JSON.parse(localStorage.getItem('p5.clickery.editor.preview') ?? 'null');
  if (!saved) throw new Error('Nothing to preview. Press Preview in the editor.');
  return saved;
}

const { room, imageURL } = await source().catch((err) => {
  document.body.insertAdjacentHTML('afterbegin', `<div id="error">${err.message}</div>`);
  throw err;
});

new p5((p) => {
  let game;

  p.setup = async () => {
    game = p.createGame({
      rooms: [room],
      width: room.width,
      height: room.height,
      // Hotspot names are text keys; in the preview each one simply shows its hotspot's id.
      strings: Object.fromEntries(room.hotspots.map((h) => [h.name ?? h.id, h.id])),
    });
    game.debug = true; // outlines on (D toggles them)
    if (imageURL && room.background) game.images.set(room.id, { [room.background]: await p.loadImage(imageURL) });
    window.preview = game;
    await game.start(room.id);
  };

  p.draw = () => {
    if (!game?.room) return;
    game.draw();
    const { hero } = game;
    $('info').textContent = `hero ${Math.round(hero.x)}, ${Math.round(hero.y)}  scale ${hero.scale.toFixed(2)}`;
  };
}, $('stage'));
