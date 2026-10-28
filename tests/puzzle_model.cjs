const assert = require('node:assert/strict');
global.window = {FB: {translations: {en: {}, vi: {}}}};
global.FB = window.FB;
require('../src/puzzle.js');
const {createModel: create, matches, legalMoves} = FB.puzzle;
const types = ['apple', 'grape', 'orange', 'pear', 'berry'];

const initial = create();
const before = initial.snapshot();
assert.equal(before.board.length, 36);
assert.equal(before.movesLeft, 18);
assert.equal(matches(before.board).length, 0);
assert.ok(initial.legalMoves().length);
assert.deepEqual(create().snapshot(), before, 'The sample stage must be repeatable');
for (const pair of [[-1, 0], [0, 7], [0, 35], [5, 6], [0, 0], [0, 36], [0, 1]]) {
  assert.equal(initial.swap(...pair).valid, false, `Unexpected accepted swap ${pair}`);
  assert.deepEqual(initial.snapshot(), before, `Rejected swap changed the stage ${pair}`);
}
const exposed = initial.snapshot();
exposed.board[0] = 'invalid';
exposed.collected.apple = 200;
assert.deepEqual(initial.snapshot(), before, 'Snapshots must not expose mutable model state');
console.log('PASS Repeatable 6×6 stage; invalid, diagonal and row-wrapping swaps cost no moves');

const cross = Array(36).fill(null);
for (const i of [8, 13, 14, 15, 20]) cross[i] = 'apple';
assert.deepEqual(matches(cross).sort((a,b)=>a-b), [8,13,14,15,20], 'Cross centre must be counted once');
const game = create();
let sawChain = false;
while (game.snapshot().status === 'playing') {
  const old = game.snapshot();
  const result = game.swap(...game.legalMoves()[0]);
  assert.equal(result.valid, true);
  assert.equal(result.after.movesUsed, old.movesUsed + 1, 'A cascade uses only one move');
  const totals = Object.fromEntries(types.map(t=>[t, 0]));
  for (const step of result.steps) {
    assert.equal(new Set(step.matched).size, step.matched.length);
    step.matched.forEach(i => totals[step.board[i]]++);
    for (let col=0;col<6;col++) {
      const survivors = Array.from({length:6},(_,row)=>row*6+col)
        .filter(i=>!step.matched.includes(i)).map(i=>step.board[i]);
      const afterColumn = Array.from({length:6},(_,row)=>step.after[row*6+col]);
      assert.deepEqual(afterColumn.slice(6-survivors.length), survivors, 'Gravity changed surviving fruit order');
    }
  }
  for (const type of types) assert.equal(result.after.collected[type]-old.collected[type], totals[type]);
  assert.equal(result.removed, Object.values(totals).reduce((a,b)=>a+b,0));
  assert.equal(matches(result.after.board).length, 0, 'Cascade left unresolved matches');
  assert.ok(result.after.board.every(type=>types.includes(type)), 'Refill left holes');
  sawChain ||= result.steps.length > 1;
  if (result.after.status === 'playing') assert.ok(game.legalMoves().length, 'Stage became stuck');
}
const won = game.snapshot();
assert.equal(won.status, 'won');
assert.ok(won.collected.apple >= 12 && won.collected.grape >= 9);
assert.equal(won.movesUsed, 10);
assert.ok(sawChain);
assert.equal(game.swap(0, 6), null);
assert.deepEqual(game.snapshot(), won);
console.log('PASS Cascades, gravity order, refill, unique counting, ten-move win, and post-win input lock');

const losing = create({moves:1, goals:{apple:999,grape:999}});
losing.swap(...losing.legalMoves()[0]);
const lost = losing.snapshot();
assert.equal(lost.status, 'lost');
assert.equal(lost.movesLeft, 0);
assert.equal(losing.swap(0, 6), null);
assert.deepEqual(losing.snapshot(), lost);
assert.deepEqual(losing.legalMoves(), []);
const finalMove = create({moves:1, goals:{apple:0,grape:3}});
finalMove.swap(...finalMove.legalMoves()[0]);
assert.equal(finalMove.snapshot().movesLeft, 0);
assert.equal(finalMove.snapshot().status, 'won', 'Completing goals on the last move takes precedence over exhaustion');
console.log('PASS Move exhaustion, post-loss input lock, and a win on the last move');

const dead = Array.from({length:36},(_,i)=>types[(Math.floor(i/6)*2+i%6)%5]);
assert.equal(matches(dead).length, 0);
assert.equal(legalMoves(dead).length, 0);
const rescued = create({board:dead});
assert.ok(rescued.legalMoves().length);
assert.equal(rescued.snapshot().movesUsed, 0);
assert.equal(matches(rescued.snapshot().board).length, 0);
let reshuffles = 0;
for (let seed=0; seed<100; seed++) {
  const sample = create({seed, moves:30, goals:{apple:999,grape:999}});
  while(sample.snapshot().status === 'playing') {
    const choices = sample.legalMoves();
    assert.ok(choices.length);
    const result = sample.swap(...choices[(seed+sample.snapshot().movesUsed)%choices.length]);
    reshuffles += Number(result.reshuffled);
    assert.equal(matches(result.after.board).length, 0);
    assert.ok(result.after.board.every(type=>types.includes(type)));
  }
}
assert.ok(reshuffles > 0, 'Seed exercise did not cover automatic dead-board recovery');
console.log(`PASS Dead starting board recovery and 3,000 seeded moves (${reshuffles} automatic reshuffles)`);
