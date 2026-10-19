// "Skip" button shown during cutscenes, top right. Pure layout and hit test
// plus a p5 draw; the game calls cutscenes.skip() when hitSkipButton is true.
export function skipButtonRect(viewWidth) {
  return { x: viewWidth - 74, y: 8, w: 66, h: 26 };
}

export function hitSkipButton(x, y, viewWidth) {
  const r = skipButtonRect(viewWidth);
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function drawSkipButton(p, viewWidth) {
  const r = skipButtonRect(viewWidth);
  p.noStroke();
  p.fill(0, 0, 0, 170);
  p.rect(r.x, r.y, r.w, r.h, 4);
  p.fill(255);
  p.textSize(13);
  p.textAlign(p.CENTER, p.CENTER);
  p.text('Skip »', r.x + r.w / 2, r.y + r.h / 2);
}
