// Follower engine: matches what the speaker says against the script words.
function norm(w) {
  return String(w).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9À-ɏ]+/g, '');
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const prev = Array(b.length + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}
function same(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  if (Math.min(a.length, b.length) >= 5 && lev(a, b) <= 1) return true;
  return false;
}

// Short words ("is", "a", "in") appear everywhere and are the first ones a speech engine
// drops when someone talks fast, so they count for less than longer words.
function weight(w) { return w.length >= 4 ? 1 : w.length === 3 ? 0.7 : 0.45; }

function createFollower(words, opts) {
  const W = words.map(norm);
  const o = Object.assign({ offWords: 4, offMs: 1500, ahead: 80, tail: 8 }, opts || {});
  const st = { pos: 0, mode: 'following', lastMatchHeard: 0, lastMatchAt: 0, skipped: [], adlibs: 0, adlibStart: 0, adlibMs: 0 };

  // Local alignment of the heard words against the script near the current position.
  // f[i] maps script word j to the best alignment in which heard word i is script word j.
  // Script words the engine missed cost a little (more for long words), extra heard
  // words such as fillers or "[unk]" cost a little more, and each match adds its weight.
  // v scores the whole alignment (where is the speaker?). nv scores only the evidence for
  // new progress: words already passed vouch for the next step but no more, so an ad-lib
  // can't ride on the last sentence the speaker read.
  function align(tail, from, to) {
    const n = tail.length, f = [];
    for (let i = 0; i < n; i++) {
      const row = new Map();
      for (let j = from; j <= to; j++) {
        if (!same(tail[i], W[j])) continue;
        const w = weight(W[j]);
        let v = w, nv = w, m = 1, start = j;
        for (let pi = i - 1; pi >= Math.max(0, i - 4); pi--) {
          const h = i - pi - 1;
          for (const [pj, c] of f[pi]) {
            if (pj >= j || j - pj > 5) continue;
            // A misheard word (heard "out" for "down") pairs one extra heard word with one
            // missed script word and costs less than the two apart.
            const sk = j - pj - 1, subs = Math.min(h, sk);
            let miss = 0;
            for (let k = pj + 1; k < j; k++) miss += W[k].length <= 3 ? 0.2 : 0.5;
            const gap = subs * 0.4 + (h - subs) * 0.6 + (sk ? miss * (sk - subs) / sk : 0);
            const t = c.v - gap + w;
            if (t > v) v = t;
            const tn = (pj < st.pos ? Math.min(c.nv, 1) : c.nv) - gap + w;
            if (tn > nv) { nv = tn; m = c.m + 1; start = c.start; }
          }
        }
        row.set(j, { v, nv, m, start });
      }
      f.push(row);
    }
    return f;
  }

  function update(tailRaw, heardTotal, now) {
    const tail = tailRaw.map(norm).filter(Boolean).slice(-o.tail);
    if (!tail.length) return st;
    const from = Math.max(0, st.pos - 6), to = Math.min(W.length - 1, st.pos + o.ahead);
    const f = align(tail, from, to);
    // The match must reach the newest heard word, or the one before it, because the very
    // last word of a live result is often still being recognised.
    const cands = [];
    for (const [i, late] of [[tail.length - 1, 0], [tail.length - 2, 0.3]]) {
      if (i < 0) continue;
      for (const [e, c] of f[i]) {
        const d = e - st.pos;
        cands.push({ e, c, d, score: c.v - late - 0.04 * Math.max(0, d) - 0.2 * Math.max(0, -d), late });
      }
    }
    // Take the most likely place; a step forward also needs enough new evidence.
    cands.sort((x, y) => y.score - x.score);
    let best = null;
    for (const k of cands) {
      if (k.e < st.pos) { if (k.c.v - k.late >= 1.4) { best = k; break; } continue; }
      let need = k.d <= 3 ? 1.4 : k.d <= 8 ? 2 : k.d <= 15 ? 2.4 : 3.4;
      if (st.pos === 0 && k.e === 0) need = 0.4;
      // The closing words ("let us pray") have nothing after them to confirm them.
      if (k.e === W.length - 1 && k.d <= 10) need = Math.min(need, 1.4);
      if (k.c.nv - k.late >= need && (k.d <= 15 || k.c.m >= 3)) { best = { e: k.e, start: k.c.start }; break; }
    }
    if (best) {
      const newPos = best.e + 1;
      if (newPos > st.pos) {
        if (best.start - st.pos > 12) st.skipped.push([st.pos, best.start - 1]);
        st.pos = newPos;
      }
      st.lastMatchHeard = heardTotal;
      st.lastMatchAt = now || 0;
      if (st.mode === 'waiting') {
        st.mode = 'following';
        st.adlibMs += (now || 0) - st.adlibStart;
      }
    } else if (st.mode !== 'waiting' && heardTotal - st.lastMatchHeard >= o.offWords &&
               (now || 0) - st.lastMatchAt >= o.offMs) {
      // Off script only after several unmatched words *and* a moment without a match,
      // so one misheard phrase in a fast read doesn't flash the Return Cue.
      st.mode = 'waiting';
      st.adlibs++;
      st.adlibStart = now || 0;
    }
    return st;
  }
  function setPos(p) { st.pos = Math.max(0, Math.min(W.length, p)); st.mode = 'following'; }
  return { st, update, setPos, W };
}
if (typeof module !== 'undefined') module.exports = { createFollower, norm };
