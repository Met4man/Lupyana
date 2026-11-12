/**
 * Split assets/img/logo.png into the six transparent layers the opening ident
 * animates: black line art, green figures, blue figures, orange cradling hand,
 * green "LUPYANA" wordmark and black "POLYCLINIC" wordmark.
 *
 * The source logo is a flat 512x512 RGBA file on an opaque white plate, so the
 * layers are recovered by classifying every pixel against the brand palette and
 * rebuilding a transparency value from its distance to that palette colour.
 * That keeps anti-aliased edges soft instead of producing a hard cut-out.
 *
 * Run:  node tools/extract-intro-layers.mjs [--ascii]
 *
 * Output: assets/img/intro/{inkIcon,greenIcon,blueIcon,orangeIcon,greenWord,inkWord}.png
 *
 * The composite of the six layers is compared against the original and the
 * mean absolute error is printed, so a regression is obvious.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "assets", "img", "logo.png");
const OUT_DIR = join(ROOT, "assets", "img", "intro");

/* -------------------------------------------------------------------------- */
/* Minimal PNG read/write (8-bit, non-interlaced)                             */
/* -------------------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let offset = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colourType = 0;
  const idat = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colourType = data[9];
      if (data[12]) throw new Error("interlaced PNGs are not supported");
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (depth !== 8) throw new Error("unsupported bit depth " + depth);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colourType];
  if (!channels) throw new Error("unsupported colour type " + colourType);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * channels);
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const current = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? current[i - channels] : 0;
      const b = previous[i];
      const c = i >= channels ? previous[i - channels] : 0;
      let value = line[i];
      if (filter === 1) value = (value + a) & 0xff;
      else if (filter === 2) value = (value + b) & 0xff;
      else if (filter === 3) value = (value + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value = (value + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      } else if (filter !== 0) {
        throw new Error("unsupported row filter " + filter);
      }
      current[i] = value;
    }
    previous = current;
  }
  return { width, height, channels, data: out };
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------------------- */
/* Layer recovery                                                             */
/* -------------------------------------------------------------------------- */

const PALETTE = {
  black: [0, 0, 0],
  orange: [249, 156, 27],
  green: [107, 174, 68],
  blue: [32, 144, 208],
};

// Vertical bands of the lockup. The green wordmark carries dark anti-aliased
// edges, so the black wordmark needs its own band below it.
const BANDS = { icon: [0, 331], green: [331, 405], black: [405, 512] };

const LAYERS = [
  { key: "inkIcon", kind: "black", band: "icon" },
  { key: "orangeIcon", kind: "orange", band: "icon" },
  { key: "greenIcon", kind: "green", band: "icon" },
  { key: "blueIcon", kind: "blue", band: "icon" },
  { key: "greenWord", kind: "green", band: "green" },
  { key: "inkWord", kind: "black", band: "black" },
];

const MIN_ALPHA = 0.12;

function nearestColour(r, g, b) {
  let best = "black";
  let distance = Infinity;
  for (const name of ["orange", "green", "blue"]) {
    const c = PALETTE[name];
    const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
    if (d < distance) {
      distance = d;
      best = name;
    }
  }
  return best;
}

function alphaAt(source, index, kind) {
  const r = source[index];
  const g = source[index + 1];
  const b = source[index + 2];
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  const luminance = (r + g + b) / 3;
  if (saturation < 26) return kind === "black" ? (255 - luminance) / 255 : 0;
  if (nearestColour(r, g, b) !== kind) return 0;
  const colour = PALETTE[kind];
  const span = 765 - (colour[0] + colour[1] + colour[2]);
  return span > 0 ? Math.min(1, (765 - (r + g + b)) / span) : 0;
}

function main() {
  const showAscii = process.argv.includes("--ascii");
  const logo = decodePng(readFileSync(SOURCE));
  const { width, height } = logo;
  const pixels = logo.channels === 4 ? logo.data : null;
  if (!pixels) throw new Error("expected an RGBA logo");

  mkdirSync(OUT_DIR, { recursive: true });

  const results = {};
  for (const layer of LAYERS) {
    const [bandTop, bandBottom] = BANDS[layer.band];
    let x0 = width;
    let y0 = height;
    let x1 = -1;
    let y1 = -1;

    for (let y = bandTop; y < bandBottom; y++) {
      for (let x = 0; x < width; x++) {
        if (alphaAt(pixels, (y * width + x) * 4, layer.kind) <= MIN_ALPHA) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) throw new Error("layer " + layer.key + " is empty");

    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const rgba = Buffer.alloc(w * h * 4);
    const colour = PALETTE[layer.kind];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const alpha = Math.max(0, Math.min(1, alphaAt(pixels, (y * width + x) * 4, layer.kind)));
        const o = ((y - y0) * w + (x - x0)) * 4;
        rgba[o] = colour[0];
        rgba[o + 1] = colour[1];
        rgba[o + 2] = colour[2];
        rgba[o + 3] = Math.round(alpha * 255);
      }
    }
    const file = join(OUT_DIR, layer.key + ".png");
    writeFileSync(file, encodePng(w, h, rgba));
    results[layer.key] = { x: x0, y: y0, w, h, bytes: Buffer.byteLength(rgba) };
  }

  /* Composite the layers back together and measure the drift from the source. */
  const composite = Buffer.alloc(width * height * 3, 255);
  for (const layer of LAYERS) {
    const r = results[layer.key];
    const decoded = decodePng(readFileSync(join(OUT_DIR, layer.key + ".png")));
    const colour = PALETTE[layer.kind];
    for (let y = 0; y < decoded.height; y++) {
      for (let x = 0; x < decoded.width; x++) {
        const i = (y * decoded.width + x) * 4;
        const alpha = decoded.data[i + 3] / 255;
        if (alpha <= 0) continue;
        const target = ((y + r.y) * width + (x + r.x)) * 3;
        for (let k = 0; k < 3; k++) {
          composite[target + k] = Math.round(composite[target + k] * (1 - alpha) + colour[k] * alpha);
        }
      }
    }
  }

  let sum = 0;
  let worst = 0;
  let over = 0;
  for (let i = 0; i < width * height; i++) {
    for (let k = 0; k < 3; k++) {
      const d = Math.abs(composite[i * 3 + k] - pixels[i * 4 + k]);
      sum += d;
      if (d > worst) worst = d;
      if (d > 40) over++;
    }
  }

  const box = Object.values(results).reduce(
    (acc, r) => ({
      x: Math.min(acc.x, r.x),
      y: Math.min(acc.y, r.y),
      right: Math.max(acc.right, r.x + r.w),
      bottom: Math.max(acc.bottom, r.y + r.h),
    }),
    { x: width, y: height, right: 0, bottom: 0 }
  );

  console.log("layers written to assets/img/intro/");
  for (const [key, r] of Object.entries(results)) {
    console.log(
      "  " + key.padEnd(11) + " x=" + String(r.x).padStart(3) + " y=" + String(r.y).padStart(3) +
      " w=" + String(r.w).padStart(3) + " h=" + String(r.h).padStart(3)
    );
  }
  console.log("  union box  x=" + box.x + " y=" + box.y + " w=" + (box.right - box.x) + " h=" + (box.bottom - box.y));
  console.log(
    "  composite  meanAbs=" + (sum / (width * height * 3)).toFixed(3) +
    " max=" + worst + " channels>40=" + over + " (" + ((over / (width * height * 3)) * 100).toFixed(1) + "%)"
  );

  if (showAscii) {
    const ink = decodePng(readFileSync(join(OUT_DIR, "inkIcon.png")));
    const r = results.inkIcon;
    const cols = 96;
    const rows = Math.round((cols * r.h) / r.w / 2);
    const lines = [];
    for (let row = 0; row < rows; row++) {
      let line = "";
      for (let col = 0; col < cols; col++) {
        const x0 = Math.floor((col * r.w) / cols);
        const x1 = Math.floor(((col + 1) * r.w) / cols);
        const y0 = Math.floor((row * r.h) / rows);
        const y1 = Math.floor(((row + 1) * r.h) / rows);
        let peak = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const a = ink.data[(y * ink.width + x) * 4 + 3];
            if (a > peak) peak = a;
          }
        }
        line += peak > 200 ? "#" : peak > 120 ? "+" : peak > 40 ? "." : " ";
      }
      lines.push(String(row).padStart(2, "0") + "|" + line + "|  y=" + (r.y + Math.round((row * r.h) / rows)));
    }
    console.log("\ninkIcon alpha map (" + r.w + "x" + r.h + ")");
    console.log(lines.join("\n"));
  }

  if (process.argv.includes("--runs")) {
    const ink = decodePng(readFileSync(join(OUT_DIR, "inkIcon.png")));
    const r = results.inkIcon;
    const solid = (x, y) => ink.data[(y * ink.width + x) * 4 + 3] > 128;
    console.log("\nink runs in logo.png coordinates (alpha > 50%)");
    for (let y = 55; y <= 328; y += 8) {
      const runs = [];
      let start = -1;
      for (let x = 0; x <= r.w; x++) {
        const on = x < r.w && solid(x, y - r.y);
        if (on && start < 0) start = x;
        if (!on && start >= 0) {
          if (x - start >= 2) runs.push(r.x + start + ".." + (r.x + x - 1));
          start = -1;
        }
      }
      console.log("  y=" + String(y).padStart(3) + "  " + (runs.join("  ") || "-"));
    }
  }
}

main();
