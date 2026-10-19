// Slides made inside Elite Prompter, shared by the presenter and audience screens.
// A slide is { title, sub }; the deck also carries its frame format and theme.
const SLIDE_FORMATS = {
  '16:9': { w: 16, h: 9, label: 'Widescreen 16:9 (projectors, TVs, Zoom)' },
  '4:3': { w: 4, h: 3, label: 'Standard 4:3 (older projectors)' },
  '9:16': { w: 9, h: 16, label: 'Vertical 9:16 (phones, Reels, Shorts, Status)' },
  '1:1': { w: 1, h: 1, label: 'Square 1:1 (social posts)' }
};
const SLIDE_THEMES = {
  night: { label: 'Night', bg: '#0f1420', bg2: '#1b2438', fg: '#f4efe4', sub: '#c9b98f', accent: '#f6b93b' },
  light: { label: 'Daylight', bg: '#f7f4ee', bg2: '#ece5d8', fg: '#1d1f24', sub: '#5b5f6a', accent: '#b5651d' },
  royal: { label: 'Royal', bg: '#3a1230', bg2: '#5c1d4b', fg: '#fdf7ee', sub: '#f0cf8a', accent: '#f0cf8a' },
  forest: { label: 'Forest', bg: '#0f2a22', bg2: '#173d31', fg: '#f1f5ef', sub: '#a9d3b5', accent: '#e8c46a' }
};

function slideSize(format, maxW, maxH) {
  const f = SLIDE_FORMATS[format] || SLIDE_FORMATS['16:9'];
  const scale = Math.min(maxW / f.w, maxH / f.h);
  return { w: Math.round(f.w * scale), h: Math.round(f.h * scale) };
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Draws one slide filling a w x h canvas area.
function drawSlide(ctx, w, h, slide, themeKey) {
  const t = SLIDE_THEMES[themeKey] || SLIDE_THEMES.night;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, t.bg); g.addColorStop(1, t.bg2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const unit = Math.min(w, h);
  const pad = unit * 0.09;
  const maxW = w - pad * 2;
  const family = '"Atkinson Hyperlegible", "Segoe UI", Roboto, Arial, sans-serif';
  // Shrink the title until it fits in at most 4 lines.
  let size = unit * (w >= h ? 0.12 : 0.11), lines;
  do {
    ctx.font = `700 ${size}px ${family}`;
    lines = wrapLines(ctx, slide.title, maxW);
    if (lines.length <= 4) break;
    size *= 0.88;
  } while (size > unit * 0.04);
  const lh = size * 1.15;
  const subSize = size * 0.42;
  ctx.font = `400 ${subSize}px ${family}`;
  const subLines = slide.sub ? wrapLines(ctx, slide.sub, maxW).slice(0, 3) : [];
  const total = lines.length * lh + (subLines.length ? subSize * 0.9 + subLines.length * subSize * 1.3 : 0);
  let y = (h - total) / 2;
  ctx.fillStyle = t.accent;
  ctx.fillRect(pad, y - unit * 0.05, unit * 0.08, Math.max(3, unit * 0.008));
  ctx.textBaseline = 'top';
  ctx.fillStyle = t.fg;
  ctx.font = `700 ${size}px ${family}`;
  for (const l of lines) { ctx.fillText(l, pad, y); y += lh; }
  if (subLines.length) {
    y += subSize * 0.9;
    ctx.fillStyle = t.sub;
    ctx.font = `400 ${subSize}px ${family}`;
    for (const l of subLines) { ctx.fillText(l, pad, y); y += subSize * 1.3; }
  }
}

// Parses "[slide: Title | Subtitle]" cue text into a slide, or null for a plain [slide].
function parseSlideCue(inner) {
  const m = /^slide\s*:\s*(.+)$/i.exec(inner.trim());
  if (!m) return null;
  const [title, sub] = m[1].split('|').map(s => s.trim());
  return { title: title || '', sub: sub || '' };
}
