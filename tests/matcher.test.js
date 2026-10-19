// Matcher tests: node tests/matcher.test.js (exits non-zero on failure).
const assert = require('assert');
const { createFollower } = require('../src/engine.js');
const script = "Jesus is Lord, Jesus is coming back again. If you believe, you shall be saved. Grace is not earned, it is received. Today we talk about stewardship. Every good gift comes from above. What you have in your hand is a seed. Faithful in little means faithful in much. So what does faithful look like with your paycheck? It starts with a plan.";
const words = script.split(/\s+/);
// Feeds the spoken words one at a time, msPerWord apart; returns the position after each word.
function run(spoken, label, msPerWord = 400) {
  const f = createFollower(words);
  const heard = [], log = [], pos = {};
  spoken.split(/\s+/).forEach((w, k) => {
    heard.push(w);
    const st = f.update(heard.slice(-8), heard.length, k * msPerWord);
    log.push(`${w}->${st.pos}${st.mode === 'waiting' ? 'W' : ''}`);
    pos[k] = st;
  });
  console.log(label + '\n ' + log.join(' ') + '\n skipped=' + JSON.stringify(f.st.skipped) + ' adlibs=' + f.st.adlibs);
  return { f, log };
}
let r = run("Jesus is Lord Jesus is coming back again prodigal child come home the father is waiting for you tonight okay fine church if you believe you shall be saved", "Dan's example");
assert.ok(r.log.includes('tonight->8W'), 'waits during the ad-lib');
assert.strictEqual(r.f.st.pos, 15); assert.strictEqual(r.f.st.adlibs, 1);

r = run("Jesus is Lord Jesus is coming back again if you believe you shall be saved grace is not earned it is received", 'straight read');
assert.strictEqual(r.f.st.pos, 22); assert.strictEqual(r.f.st.adlibs, 0);
assert.ok(r.log.every((x, k) => +x.split('->')[1] === k + 1), 'moves on every word');

r = run("Jesus is Lord Jesus is coming back again let me tell you a story about my first job faithful in little means faithful in much so what does", 'skip ahead');
assert.ok(r.log.includes('you->8'), 'an ad-lib word does not move it');
assert.deepStrictEqual(r.f.st.skipped, [[8, 41]]); assert.strictEqual(r.f.st.pos, 52);

r = run("Jesus is Lord uh Jesus is uh coming back again if you if you believe you shall be saved", 'fillers and repeats');
assert.strictEqual(r.f.st.pos, 15); assert.strictEqual(r.f.st.adlibs, 0);

// Very fast speech: the engine swallows most short words.
r = run("jesus lord jesus coming back again believe you shall saved grace not earned received today talk stewardship every gift comes above", 'fast, words swallowed', 150);
assert.strictEqual(r.f.st.pos, 33); assert.strictEqual(r.f.st.adlibs, 0); assert.deepStrictEqual(r.f.st.skipped, []);

// Very slow speech: a long time between words is not an ad-lib.
r = run("Jesus is Lord Jesus is coming back again if you believe", 'very slow', 2500);
assert.strictEqual(r.f.st.pos, 11); assert.strictEqual(r.f.st.adlibs, 0);

// A repeated phrase later in the script ("in your hand") must not pull it ahead.
const f2 = createFollower("God placed it in your hands today . What you have in your hand is a seed".split(' '));
const h2 = 'god placed it in your hands'.split(' ');
f2.update(h2, 6, 0); f2.update(h2.concat('hands'), 7, 300);
assert.strictEqual(f2.st.pos, 6, 'repeat of a phrase that appears later');
console.log('all matcher tests passed');
