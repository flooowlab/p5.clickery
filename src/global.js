// Entry point of dist/p5.clickery.js and dist/p5.clickery.min.js, the files for a
// <script> tag after p5.js: registers the addon with p5 and puts the whole library on
// p5.clickery (p5.clickery.Navigator, p5.clickery.createMarkdownRunner, ...).
import * as clickery from './index.js';

const p5 = globalThis.p5;
if (p5) {
  clickery.registerClickery(p5);
  Object.assign(p5.clickery, clickery);
} else {
  console.error('p5.clickery: load p5.js before p5.clickery.js');
}
