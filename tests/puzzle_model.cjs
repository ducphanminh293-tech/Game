const assert = require('node:assert/strict');
global.window = {FB: {translations: {en: {}, vi: {}}}};
global.FB = window.FB;
require('../src/puzzle.js');
const create = FB.puzzle.createModel;

const model = create();
for (const [x, y] of [[160,98], [256,98], [384,98], [480,98]]) {
  model.shoot(Math.atan2(y - 382, x - 320));
}
assert.equal(model.snapshot().status, 'won');
assert.equal(model.snapshot().shotsUsed, 4);
assert.ok(model.snapshot().collected.apple >= 12);
assert.ok(model.snapshot().collected.grape >= 9);
const won = model.snapshot();
assert.equal(model.shoot(-1.5), null);
assert.deepEqual(model.snapshot(), won);
console.log('PASS Handcrafted stage is solvable; goals and post-win input lock');

const bounce = create().trace(-0.3);
assert.ok(bounce.bounces > 0);
assert.ok(bounce.path.every(p => p.x >= 112 && p.x <= 528));
assert.ok(bounce.hit || bounce.y <= 42);
console.log('PASS Reflected trajectory stays inside side walls and reaches board');

for (const [angle, reason, expectedShots] of [[-0.3, 'shots', 18], [-Math.PI/2, 'line', 12]]) {
  const game = create();
  for (let i = 0; i < 18 && game.snapshot().status === 'playing'; i++) game.shoot(angle);
  const state = game.snapshot();
  assert.equal(state.status, 'lost');
  assert.equal(state.reason, reason);
  assert.equal(state.shotsUsed, expectedShots);
  assert.equal(new Set(state.board.map(f => `${f.row}:${f.col}`)).size, state.board.length);
}
console.log('PASS Shot-limit and garden-gate losses; no overlapping snapped cells');

const dropping = create();
let result;
for (const angle of [-1.0518305605044591,-2.461750353605021,-2.605361066479236,-1.577208019362297,-1.72645569650922,-2.1162586781778376,-1.6243206338491292,-1.701084390829783,-1.4936726136831568,-1.3553176256013104,-1.6187806902453306]) {
  const before = dropping.snapshot();
  result = dropping.shoot(angle);
  for (const type of ['apple', 'grape']) {
    assert.equal(result.after.collected[type] - before.collected[type], result.removed.filter(f => f.type === type).length);
  }
}
assert.ok(result.removed.some(f => f.dropped));
console.log('PASS Detached fruit falls and each removed fruit is counted once');
