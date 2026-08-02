import { ShowcaseExample } from './types';

export const towerStackExample: ShowcaseExample = {
  id: 'tower-stack',
  title: 'Tower Stack',
  description: 'A tiny stacking game — press Space to drop the bar onto the one below',
  category: 'advanced',
  thumbnail: '/assets/tower-stack-thumbnail.png',
  code: `// Tower Stack - a small game built out of plain Shapes.
// SPACE (or click the canvas) drops the moving bar.
// Whatever hangs over the bar below is sliced off, and the rest becomes the new top.

import { init } from '@thorvg/webcanvas';

const TVG = await init({
  renderer: 'gl',
  locateFile: (path) => '/webcanvas/' + path.split('/').pop()
});

const SIZE = 600;
const canvas = new TVG.Canvas('#canvas', {
  width: SIZE,
  height: SIZE,
});

//The playground re-executes this file on every edit, so tear down the previous
//session first. Without this, listeners pile up and one keypress drops many bars.
globalThis.__towerStack?.abort();
const session = new AbortController();
globalThis.__towerStack = session;

const BAR_W = 250;              //width of the very first bar
const BAR_H = 30;
const MAX_QUEUE = 5;            //bars kept on screen; pushing a 6th drops the front one
const BASE_Y = SIZE - BAR_H;    //the bottom bar rests on the canvas floor
const SPEED = 160;              //bar speed on the first row, in px/s
const SPEED_GAIN = 0.05;        //share of SPEED added per row: 2x by row 20

//Every bar lives in this queue. The new bar always starts one row above
//queue[queue.length - 1] and is exactly as wide as it. Once the queue is full each
//push shifts the front out, so the tower appears to climb while the bar stays at a
//fixed height - no camera maths needed.
let queue, bar, slide, score, over;

//The canvas keeps its scene between frames, so build it once here and let the loop
//just move the shapes that changed.
const sky = new TVG.Shape();
sky.appendRect(0, 0, SIZE, SIZE);
sky.fill(163, 209, 240);
canvas.add(sky);

//One shape per row: the queued bars plus the moving one above them
const bars = [];
for (let i = 0; i <= MAX_QUEUE; i++) {
  const shape = new TVG.Shape();
  shape.fill(255, 118, 92);
  canvas.add(shape);
  bars.push(shape);
}

//ThorVG ships no built-in font, so the game-over label needs one. Loading it without
//awaiting keeps the game playable from the first frame.
let overText = null;
fetch('/fonts/PublicSans-Regular.ttf')
  .then(res => res.arrayBuffer())
  .then(buf => {
    TVG.Font.load('ui', new Uint8Array(buf), { type: 'ttf' });
    overText = new TVG.Text();
    overText.font('ui').fontSize(36).fill(24, 52, 84)
      .align(0.5, 0.5).translate(SIZE / 2, SIZE / 2);
    canvas.add(overText);
  });

//Screen Y of row i, including the offset left over from the last queue shift
function rowY(i) {
  return BASE_Y - i * BAR_H + slide;
}

function reset() {
  queue = [{ x: (SIZE - BAR_W) / 2, w: BAR_W }];
  slide = 0;
  score = 0;
  over = false;
  spawn();
}

function spawn() {
  const last = queue[queue.length - 1];
  //Pick the starting edge at random so the timing can't be memorised
  const fromLeft = Math.random() < 0.5;
  bar = {
    x: fromLeft ? 0 : SIZE - last.w,
    w: last.w,
    dir: fromLeft ? 1 : -1,
    speed: SPEED * (1 + score * SPEED_GAIN),
  };
}

function drop() {
  if (over) { reset(); return; }

  //Keep only the part that overlaps the bar below
  const last = queue[queue.length - 1];
  const left = Math.max(bar.x, last.x);
  const right = Math.min(bar.x + bar.w, last.x + last.w);

  if (right - left <= 0) { bar = null; over = true; return; }

  queue.push({ x: left, w: right - left });
  score++;

  //Full queue: drop the front bar and slide everything down one row
  if (queue.length > MAX_QUEUE) {
    queue.shift();
    slide = -BAR_H;
  }

  spawn();
}

function update(dt) {
  slide -= slide * Math.min(1, dt * 12);    //ease the shift offset back to zero
  if (!bar) return;

  bar.x += bar.dir * bar.speed * dt;
  if (bar.x <= 0) { bar.x = 0; bar.dir = 1; }
  else if (bar.x + bar.w >= SIZE) { bar.x = SIZE - bar.w; bar.dir = -1; }
}

function draw() {
  //Nothing is added to or removed from the scene: an unused slot is just hidden.
  //reset() drops the old path but keeps the fill, so the colour is set only once.
  for (let i = 0; i < bars.length; i++) {
    const row = i < queue.length ? queue[i] : (i === queue.length ? bar : null);
    bars[i].visible(row !== null);
    if (row) bars[i].reset().appendRect(row.x, rowY(i), row.w, BAR_H);
  }

  if (overText) {
    overText.visible(over);
    if (over) overText.text('GAME OVER  ' + score);
  }

  canvas.update();
  canvas.render();
}

const el = document.querySelector('#canvas');
addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  drop();
}, { signal: session.signal });
el.addEventListener('pointerdown', drop, { signal: session.signal });

reset();

let last = 0;
function frame(now) {
  if (session.signal.aborted) return;
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;

  update(dt);
  draw();

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
`
};
