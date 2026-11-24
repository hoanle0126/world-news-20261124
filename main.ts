import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 1048576;
const MAX_DIM = 1024;
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_IEND = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

function inspectImage(buf: Buffer): { format: 'png' | 'jpeg'; width: number; height: number } {
  if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) {
    throw new Error(`entry.png size ${buf.byteLength} exceeds [1, ${MAX_BYTES}] bytes`);
  }
  if (buf.subarray(0, 8).equals(PNG_SIG)) {
    const ihdrType = buf.subarray(12, 16).toString('ascii');
    if (buf.byteLength < 33 || ihdrType !== 'IHDR' || !buf.subarray(-12).equals(PNG_IEND)) {
      throw new Error('Invalid or truncated PNG structure');
    }
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width < 1 || height < 1 || width > MAX_DIM || height > MAX_DIM) {
      throw new Error(`PNG dimensions ${width}x${height} exceed ${MAX_DIM}x${MAX_DIM}`);
    }
    return { format: 'png', width, height };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[buf.byteLength - 2] === 0xff && buf[buf.byteLength - 1] === 0xd9) {
    return { format: 'jpeg', width: MAX_DIM, height: MAX_DIM };
  }
  throw new Error('entry.png is neither a whole PNG nor JPEG');
}

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = join(here, 'entry.png');
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const outPath = join(outDir, 'entry.png');

const bytes = readFileSync(srcPath);
const meta = inspectImage(bytes);
const digest = createHash('sha256').update(bytes).digest('hex');

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, bytes);
const written = readFileSync(outPath);
const outDigest = createHash('sha256').update(written).digest('hex');
if (outDigest !== digest) {
  throw new Error(`Checksum mismatch after write: ${outDigest} !== ${digest}`);
}
console.log(JSON.stringify({ ok: true, format: meta.format, width: meta.width, height: meta.height, bytes: bytes.byteLength, sha256: digest }));
