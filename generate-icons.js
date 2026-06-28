// Genera iconos PNG para la PWA
const fs = require("fs");
const zlib = require("zlib");

function createPNG(size) {
  // Create a simple solid-color PNG with the accent color
  const width = size;
  const height = size;

  // RGBA pixel data (top-to-bottom, left-to-right)
  const rawData = Buffer.alloc(width * height * 4);
  const gradient = { r: 124, g: 106, b: 240 }; // #7c6af0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Simple gradient from accent to darker
      const t = y / height;
      rawData[idx] = Math.round(gradient.r * (1 - t) + 60 * t);     // R
      rawData[idx + 1] = Math.round(gradient.g * (1 - t) + 40 * t); // G
      rawData[idx + 2] = Math.round(gradient.b * (1 - t) + 20 * t); // B
      rawData[idx + 3] = 255; // A
    }
  }

  // Compress with zlib (deflate)
  const deflated = zlib.deflateSync(rawData);

  // PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk("IHDR", ihdr);

  // IDAT chunk
  const idatChunk = createChunk("IDAT", deflated);

  // IEND chunk
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc);
  return Buffer.concat([len, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const sizes = [192, 512];
sizes.forEach((s) => {
  const png = createPNG(s);
  fs.writeFileSync(`icon-${s}.png`, png);
  console.log(`✅ icon-${s}.png created (${(png.length / 1024).toFixed(1)} KB)`);
});
