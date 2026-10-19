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

function createFollower(words, opts) {
  const W = words.map(norm);
  const o = Object.assign({ offWords: 4, ahead: 80 }, opts || {});
  const st = { pos: 0, mode: 'following', lastMatchHeard: 0, skipped: [], adlibs: 0, adlibStart: 0, adlibMs: 0 };

  // Length of the matched run that ends at script word e and at the last spoken word.
  // Tolerates one filler word ("uh", "church") or one dropped script word at a time.
  function run(tail, e) {
    let i = tail.length - 1, j = e, m = 0, gaps = 0;
    while (i >= 0 && j >= 0 && gaps <= 1) {
      if (same(tail[i], W[j])) { m++; i--; j--; gaps = 0; }
      else if (i > 0 && same(tail[i - 1], W[j])) { i--; gaps++; }
      else if (j > 0 && same(tail[i], W[j - 1])) { j--; gaps++; }
      else break;
    }
    return m;
  }

  function update(tailRaw, heardTotal, now) {
    const tail = tailRaw.map(norm).filter(Boolean).slice(-6);
    if (!tail.length) return st;
    const last = tail[tail.length - 1];
    let best = null;
    const from = Math.max(0, st.pos - 4), to = Math.min(W.length - 1, st.pos + o.ahead);
    for (let e = from; e <= to; e++) {
      if (!same(last, W[e])) continue;
      const s = run(tail, e);
      const d = e - st.pos;
      let need = d <= 3 ? 2 : d <= 15 ? 3 : 4;
      if (st.pos === 0 && e === 0) need = 1;
      if (s < need) continue;
      const score = s * 10 - Math.abs(d) * 0.5;
      if (!best || score > best.score) best = { e, s, score };
    }
    if (best) {
      const newPos = best.e + 1;
      if (newPos > st.pos) {
        const reentry = best.e - best.s + 1;
        if (reentry - st.pos > 12) st.skipped.push([st.pos, reentry - 1]);
        st.pos = newPos;
      }
      st.lastMatchHeard = heardTotal;
      if (st.mode === 'waiting') {
        st.mode = 'following';
        st.adlibMs += (now || 0) - st.adlibStart;
      }
    } else if (st.mode !== 'waiting' && heardTotal - st.lastMatchHeard >= o.offWords) {
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
