import { writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";

const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const pixels = new Uint8Array(size * size * 4);
  fillRect(pixels, size, 0, 0, size, size, [15, 143, 126, 255]);
  const pad = Math.round(size * 0.25);
  const box = Math.max(2, Math.round(size * 0.22));
  const stroke = Math.max(1, Math.round(size * 0.06));
  fillRect(pixels, size, pad, pad, box, box, [255, 255, 255, 255]);
  fillRect(pixels, size, pad + box, pad + Math.round(box * 0.4), box, box, [255, 255, 255, 255]);
  fillRect(pixels, size, pad + box, size - pad - box, box, box, [255, 255, 255, 255]);
  fillRect(pixels, size, pad + box - stroke, pad + box, stroke, size - pad * 2 - box, [255, 255, 255, 255]);
  await writeFile(path.join("public", "icons", `icon-${size}.png`), encodePng(size, size, pixels));
}

function fillRect(pixels, width, x, y, w, h, color) {
  for (let row = y; row < y + h; row += 1) {
    for (let column = x; column < x + w; column += 1) {
      if (row < 0 || column < 0 || row >= width || column >= width) {
        continue;
      }
      const index = (row * width + column) * 4;
      pixels.set(color, index);
    }
  }
}

function encodePng(width, height, rgba) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0;
    Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(raw, y * stride + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", Buffer.concat([uint32(width), uint32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const crcBuffer = Buffer.concat([typeBuffer, data]);
  return Buffer.concat([uint32(data.length), typeBuffer, data, uint32(crc32(crcBuffer))]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
