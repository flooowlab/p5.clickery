// A small made-up room used to try the editor and in the tests. Flat colours,
// no antialiasing, so the magic wand picks each thing out cleanly:
//   sky, a floor with a table standing on it, a door, and a round lamp.
export const SAMPLE = {
  width: 640,
  height: 360,
  colors: {
    sky: [40, 50, 80],
    floor: [90, 100, 120],
    table: [120, 80, 50],
    door: [150, 100, 60],
    lamp: [250, 230, 120],
  },
  floorTop: 240,
  table: { x1: 300, y1: 270, x2: 380, y2: 320 },
  door: { x1: 560, y1: 110, x2: 620, y2: 240 },
  lamp: { x: 200, y: 150, r: 30 },
};

// RGBA pixels for the sample room: { width, height, data }.
export function sampleScene() {
  const { width, height, colors, floorTop, table, door, lamp } = SAMPLE;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let c = y >= floorTop ? colors.floor : colors.sky;
      if (x >= table.x1 && x < table.x2 && y >= table.y1 && y < table.y2) c = colors.table;
      if (x >= door.x1 && x < door.x2 && y >= door.y1 && y < door.y2) c = colors.door;
      if ((x + 0.5 - lamp.x) ** 2 + (y + 0.5 - lamp.y) ** 2 <= lamp.r ** 2) c = colors.lamp;
      data.set([...c, 255], (y * width + x) * 4);
    }
  }
  return { width, height, data };
}
