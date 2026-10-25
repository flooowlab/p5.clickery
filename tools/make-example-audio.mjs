// Writes the small placeholder sounds shared by the examples into examples/assets/audio:
//   node tools/make-example-audio.mjs
// Plain 16-bit mono WAV, synthesised from sine waves, so the demo needs no audio assets.
import fs from 'node:fs';

const RATE = 22050;
const TAU = Math.PI * 2;

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const render = (seconds, fn) => Array.from({ length: Math.round(seconds * RATE) }, (_, i) => fn(i / RATE, i));
const tone = (f, t) => Math.sin(TAU * f * t);

// A pluck: a sine that decays quickly after the note starts.
const pluck = (f, t, start, length) => (t < start || t > start + length ? 0 : tone(f, t - start) * Math.exp(-(t - start) * 5));

// ~4 s loop. Notes decay to silence before the end, so it loops without a click.
const yard = render(4, (t) => {
  const notes = [220, 261.63, 329.63, 261.63, 440, 329.63, 261.63, 196];
  return 0.35 * notes.reduce((sum, f, i) => sum + pluck(f, t, i * 0.5, 0.5), 0);
});

// A low drone. Frequencies give whole cycles in 4 s, so the loop is seamless.
const cellar = render(4, (t) => 0.22 * (tone(55, t) + 0.6 * tone(82.5, t) + 0.3 * tone(110, t)) * (0.75 + 0.25 * Math.sin(TAU * 0.5 * t)));

const pickup = render(0.18, (t) => 0.4 * tone(520 + 1800 * t, t) * Math.exp(-t * 12));
const click = render(0.06, (t) => 0.35 * tone(900, t) * Math.exp(-t * 60));
const alarm = render(0.6, (t) => 0.3 * tone(t % 0.3 < 0.15 ? 880 : 660, t) * Math.min(1, (0.6 - t) * 8));
const door = render(0.5, (t, i) => 0.4 * (Math.sin(i * 12.9898) * 0.5 + tone(90 - 60 * t, t)) * Math.exp(-t * 7));

fs.mkdirSync('examples/assets/audio', { recursive: true });
for (const [name, samples] of Object.entries({ 'music-yard': yard, 'music-cellar': cellar, pickup, click, alarm, door })) {
  fs.writeFileSync(`examples/assets/audio/${name}.wav`, wav(samples));
  console.log(`examples/assets/audio/${name}.wav`, `${(samples.length / RATE).toFixed(2)}s`);
}
