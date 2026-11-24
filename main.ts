// news-image-20261124 — one-page newspaper of Tuesday 24 November 2026.
// Node 22, stdlib only, no network, no clock, no randomness. Deterministic.
// Draws everything from code (5x7 bitmap font + vector shapes) and writes
// a 1024x1024 PNG to $MAKEFUN_OUTPUT_DIR/entry.png (default /output).
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);

// ---- palette ----
const PAPER: RGB = [247, 243, 232];
const INK: RGB = [17, 17, 17];
const RED: RGB = [176, 30, 30];
const BLUE: RGB = [29, 78, 137];
const GREY: RGB = [90, 86, 76];
const LIGHT: RGB = [232, 226, 210];
const GOLD: RGB = [160, 120, 20];
type RGB = [number, number, number];

function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, c);
}
function hline(x: number, y: number, w: number, c: RGB, t = 1): void { rect(x, y, w, t, c); }
function vline(x: number, y: number, h: number, c: RGB, t = 1): void { rect(x, y, t, h, c); }
function circle(cx: number, cy: number, r: number, c: RGB): void {
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    if (i * i + j * j <= r * r) px(cx + i, cy + j, c);
  }
}
function ring(cx: number, cy: number, r: number, c: RGB, t = 2): void {
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    const d = i * i + j * j;
    if (d <= r * r && d >= (r - t) * (r - t)) px(cx + i, cy + j, c);
  }
}
// triangle pointing up, base width bw, height bh, apex at (ax, ay)
function triUp(ax: number, ay: number, bw: number, bh: number, c: RGB): void {
  for (let j = 0; j < bh; j++) {
    const half = Math.round((bw / 2) * (j / bh));
    for (let i = -half; i <= half; i++) px(ax + i, ay + j, c);
  }
}
// starburst (explosion) centred at (cx,cy), radius r
function burst(cx: number, cy: number, r: number, c: RGB): void {
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    const len = k % 2 === 0 ? r : Math.round(r * 0.45);
    for (let t = 0; t < len; t++) {
      px(Math.round(cx + Math.cos(a) * t), Math.round(cy + Math.sin(a) * t), c);
      px(Math.round(cx + Math.cos(a) * t), Math.round(cy + Math.sin(a) * t) + 1, c);
    }
  }
  circle(cx, cy, Math.max(3, Math.round(r * 0.28)), c);
}

// ---- 5x7 bitmap font (rows top->bottom, 5 bits each) ----
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "+": [0, 0x04, 0x04, 0x0e, 0x04, 0x04, 0],
  "=": [0, 0, 0x0e, 0, 0x0e, 0, 0],
  "?": [0x0e, 0x11, 0x01, 0x06, 0x04, 0, 0x04],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
};

function textW(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = x;
  for (const ch0 of s) {
    const ch = ch0 >= "a" && ch0 <= "z" ? ch0.toUpperCase() : ch0;
    const g = FONT[ch] ?? FONT["?"];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if ((g[r] >> (4 - col)) & 1) rect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}
function centerText(s: string, y: number, scale: number, c: RGB): void {
  drawText(s, Math.round((W - textW(s, scale)) / 2), y, scale, c);
}
// Wrap text into lines of max width (px). Returns lines.
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? cur + " " + w : w;
    if (textW(cand, scale) <= maxW) { cur = cand; continue; }
    if (cur) lines.push(cur);
    cur = w;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---- PNG encoder (CRC32 + zlib, stdlib only) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  dv.setUint32(8 + data.length, crc);
  return out;
}
function encodePNG(): Uint8Array {
  const raw = new Uint8Array(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W); dv.setUint32(4, H);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

// ---- pictograms (drawn in a 44x44 box at x,y) ----
function pic(kind: string, x: number, y: number, c: RGB): void {
  rect(x, y, 44, 44, LIGHT);
  rect(x, y, 44, 2, c); rect(x, y + 42, 44, 2, c);
  const cx = x + 22, cy = y + 22;
  switch (kind) {
    case "conflict": burst(cx, cy, 15, c); break;
    case "courts": {
      vline(cx, y + 8, 28, c, 3);
      hline(x + 8, y + 12, 28, c, 3);
      triUp(x + 10, y + 16, 12, 10, c);
      triUp(x + 26, y + 16, 12, 10, c);
      hline(x + 12, y + 36, 20, c, 3);
      break;
    }
    case "tech": {
      rect(cx - 10, cy - 10, 20, 20, c);
      rect(cx - 5, cy - 5, 10, 10, PAPER);
      for (let k = 0; k < 3; k++) {
        hline(cx - 14, cy - 7 + k * 7, 4, c, 2);
        hline(cx + 10, cy - 7 + k * 7, 4, c, 2);
      }
      break;
    }
    case "markets": {
      rect(x + 8, y + 26, 6, 10, c);
      rect(x + 18, y + 18, 6, 18, c);
      rect(x + 28, y + 10, 6, 26, c);
      break;
    }
    case "climate": {
      circle(cx, cy, 9, c);
      rect(x + 8, y + 28, 28, 6, c);
      rect(x + 12, y + 34, 20, 4, c);
      break;
    }
    case "sport": {
      ring(cx, cy, 13, c, 3);
      circle(cx, cy, 4, c);
      break;
    }
    case "health": {
      rect(cx - 4, cy - 12, 8, 24, c);
      rect(cx - 12, cy - 4, 24, 8, c);
      break;
    }
    case "world": {
      ring(cx, cy, 13, c, 3);
      hline(x + 10, cy - 2, 24, c, 2);
      vline(cx, y + 10, 24, c, 2);
      break;
    }
  }
}

// ---- page layout ----
rect(0, 0, W, H, PAPER);
rect(0, 0, W, 10, INK);
rect(0, H - 10, W, 10, INK);

// Masthead
centerText("TUESDAY 24 NOVEMBER 2026", 30, 5, INK);
hline(24, 70, W - 48, INK, 3);
centerText("THE WORLD IN ONE IMAGE", 80, 3, RED);
centerText("15 STORIES FROM ONE DAY - CHECKED AGAINST THE DAY'S REPORTS", 108, 2, GREY);
hline(24, 130, W - 48, INK, 2);

// Lead story: Houthi missile hits Riyadh's tallest tower
const LY = 142; // lead top
drawText("LEAD  -  MIDDLE EAST", 24, LY, 2, RED);
hline(24, LY + 20, 540, RED, 2);
const headline = ["HOUTHI MISSILE", "HITS RIYADH'S", "TALLEST TOWER"];
headline.forEach((ln, i) => drawText(ln, 24, LY + 30 + i * 34, 4, INK));
drawText("SECOND TIME IN 5 DAYS", 24, LY + 138, 3, RED);
const leadFacts = wrap("11 people wounded in the strike. Houthi fighters are now about 60 km from Aden.", 540, 2);
leadFacts.forEach((ln, i) => drawText(ln, 24, LY + 172 + i * 18, 2, INK));

// Lead art: tower + smoke + burst (right side, x 600..1000)
{
  const bx = 600, by = LY + 8, bw = 400, bh = 200;
  rect(bx, by, bw, bh, LIGHT);
  rect(bx, by, bw, 2, INK); rect(bx, by + bh - 2, bw, 2, INK);
  rect(bx, by, 2, bh, INK); rect(bx + bw - 2, by, 2, bh, INK);
  // skyline
  rect(bx + 16, by + bh - 70, 60, 70, GREY);
  rect(bx + 300, by + bh - 90, 70, 90, GREY);
  rect(bx + 250, by + bh - 50, 40, 50, GREY);
  // the tower: stepped shaft with lit windows
  const tx = bx + 150, tw = 90;
  rect(tx, by + 40, tw, bh - 40, INK);
  rect(tx - 14, by + 30, tw + 28, 12, INK);
  rect(tx - 8, by + 18, tw + 16, 14, INK);
  triUp(tx + tw / 2 - 6, by + 2, 12, 16, INK);
  for (let r = 0; r < 9; r++) {
    for (let c2 = 0; c2 < 4; c2++) {
      if ((r + c2) % 2 === 0) rect(tx + 12 + c2 * 18, by + 56 + r * 14, 8, 7, GOLD);
    }
  }
  // smoke + explosion at tower top
  circle(tx + 8, by + 22, 16, GREY);
  circle(tx + 30, by + 12, 20, GREY);
  circle(tx + 58, by + 20, 15, GREY);
  burst(tx + tw / 2, by + 26, 22, RED);
  rect(bx + 10, by + bh - 30, 84, 20, PAPER);
  drawText("RIYADH", bx + 16, by + bh - 26, 2, INK);
  rect(bx + bw - 100, by + bh - 30, 92, 20, PAPER);
  drawText("24 NOV", bx + bw - 92, by + bh - 26, 2, RED);
}
hline(24, 360, W - 48, INK, 2);

// ---- story grid: 2 columns x 8 rows ----
type Story = { tag: string; kind: string; color: RGB; title: string; fact: string };
const stories: Story[] = [
  { tag: "CONFLICT", kind: "conflict", color: RED, title: "RUSSIA WARNS ESTONIA", fact: "Moscow warns of open war over Estonia's 1 Dec border closure; Medvedev warns of a nuclear strike." },
  { tag: "CONFLICT", kind: "conflict", color: RED, title: "NATO VOWS TO DEFEND SPACE", fact: "After reports Russia is readying a nuclear-armed satellite. Leaks: up to 700K Russian deaths." },
  { tag: "COURTS", kind: "courts", color: BLUE, title: "ICJ: MYANMAR GENOCIDE", fact: "The International Court of Justice rules Myanmar committed genocide against the Rohingya." },
  { tag: "TECH", kind: "tech", color: BLUE, title: "NVIDIA BRINGS HUANG BACK", fact: "Nvidia reinstates Jensen Huang as CEO after an intervention by Trump." },
  { tag: "CONFLICT", kind: "conflict", color: RED, title: "ISRAEL STRIKE KILLS HAMAS CHIEF", fact: "An Israeli airstrike kills Hamas internal security chief Naeem Abu Nahel and 6 others in Gaza." },
  { tag: "CONFLICT", kind: "conflict", color: RED, title: "RUSSIA HITS ZAPORIZHZHIA", fact: "An overnight Russian strike kills 2 and wounds 40, including 4 children." },
  { tag: "CLIMATE", kind: "climate", color: GOLD, title: "UN CLIMATE SUMMIT: NO DEAL", fact: "The UN climate summit ends with no agreement, split over fossil fuels." },
  { tag: "SPORT", kind: "sport", color: GOLD, title: "SENEGAL CHAMPIONS AGAIN", fact: "Sport's highest court reinstates Senegal as champions of the 2025 Africa Cup of Nations." },
  { tag: "HEALTH", kind: "health", color: RED, title: "US LOSES MEASLES STATUS", fact: "The US loses its measles elimination status after more than 25 years." },
  { tag: "COURTS", kind: "courts", color: BLUE, title: "SPAIN AMNESTIES PUIGDEMONT", fact: "Spain's Supreme Court grants amnesty to Carles Puigdemont." },
  { tag: "MARKETS", kind: "markets", color: BLUE, title: "SANOFI BUYS INSMED: $41BN", fact: "Sanofi agrees to buy US biotech Insmed for $41 billion." },
  { tag: "TECH", kind: "tech", color: BLUE, title: "STATES SUE MUSK OVER GROK", fact: "Several US states sue Musk's business over sexual images from the Grok chatbot." },
  { tag: "CONFLICT", kind: "conflict", color: RED, title: "GERMANY GETS UKRAINE'S DELTA", fact: "Germany gets first access to Ukraine's Delta system. Zelensky urges NATO to admit Ukraine." },
  { tag: "MARKETS", kind: "markets", color: BLUE, title: "TARIFFS FEARED, STOCKS FALL", fact: "Trump is expected to announce tariffs on China, the EU and others. The S&P 500 falls 0.95%." },
  { tag: "WORLD", kind: "world", color: GREY, title: "AROUND THE WORLD", fact: "Iraq's PM orders the takeover of Kurdish oilfields. China opens a corruption probe into Politburo member Chen Jining. Sheikh Hasina plans to return to Bangladesh on 16 Dec. Fighting in Congo traps an Ebola response team." },
];

const GX = 24, GY = 368, CW = 488, CH = 74, GAPX = 0, GAPY = 0;
stories.forEach((s, idx) => {
  const row = Math.floor(idx / 2);
  const col = idx % 2;
  // last story spans full width
  const full = idx === stories.length - 1;
  const x = GX + col * (CW + 0);
  const y = GY + row * (CH + GAPY);
  const w = full ? W - 48 : CW;
  if (idx === 14) { /* full-width row: y already correct (row 7) */ }
  rect(x, y, w, CH, idx % 2 === 0 ? PAPER : LIGHT);
  pic(s.kind, x + 6, y + 14, s.color);
  const tx = x + 58;
  drawText(s.tag, tx, y + 4, 1, s.color);
  drawText(s.title, tx, y + 13, 2, INK);
  const factLines = wrap(s.fact, w - 66, 2);
  if (process.env.DEBUG_WRAP) console.error(idx, factLines.length, JSON.stringify(factLines));
  const maxLines = full ? 3 : 3;
  factLines.slice(0, maxLines).forEach((ln, i) => drawText(ln, tx, y + 30 + i * 15, 2, INK));
});

// Footer
hline(24, 966, W - 48, INK, 2);
centerText("ALL 15 STORIES REPORTED ON TUESDAY 24 NOVEMBER 2026 - ONE DAY, ONE PAGE", 976, 1, GREY);

// ---- write output ----
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/entry.png`, encodePNG());
