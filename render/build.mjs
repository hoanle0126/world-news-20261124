import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ENTRY_DIR = '/home/hoanle0126/.cache/bounty-verify/makefun-news-image-20261124/entry';
const ART_DIR = '/home/hoanle0126/.cache/bounty-verify/makefun-news-image-20261124/art';
const BASE_DIR = '/home/hoanle0126/.cache/bounty-verify/makefun-news-image-20261124';

function toDataUri(path) {
  const b64 = readFileSync(path).toString('base64');
  return `data:image/png;base64,${b64}`;
}

const tpl = readFileSync(join(ENTRY_DIR, 'render/poster.html'), 'utf8');
const html = tpl
  .replace('{{HERO_GULF}}', toDataUri(join(ART_DIR, 'hero-gulf.png')))
  .replace('{{MARKETS_CHIP}}', toDataUri(join(ART_DIR, 'markets-chip.png')))
  .replace('{{EUROPE_STRIKE}}', toDataUri(join(ART_DIR, 'europe-strike.png')))
  .replace('{{AFRICA_EBOLA}}', toDataUri(join(ART_DIR, 'africa-ebola.png')));

const compiledPath = join(BASE_DIR, 'compiled-poster.html');
const outPng = join(ENTRY_DIR, 'entry.png');
const thumbPng = join(BASE_DIR, 'thumb-300.png');
writeFileSync(compiledPath, html, 'utf8');

execFileSync('/usr/bin/google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--force-device-scale-factor=1',
  '--hide-scrollbars',
  '--window-size=1024,1024',
  '--virtual-time-budget=2000',
  `--screenshot=${outPng}`,
  `file://${compiledPath}`
], { stdio: 'inherit' });

execFileSync('python3', ['-c', `
import os
from PIL import Image

im = Image.open("${outPng}")
im.load()
print("Raw rendered:", im.format, im.size, "bytes:", os.path.getsize("${outPng}"))
if im.size != (1024, 1024):
    im = im.resize((1024, 1024), Image.LANCZOS)
rgb = im.convert("RGB")
rgb.save("${outPng}", format="PNG", optimize=True, compress_level=9)
sz = os.path.getsize("${outPng}")
print("Lossless optimized PNG bytes:", sz)
if sz > 720000:
    q = rgb.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    q.save("${outPng}", format="PNG", optimize=True, compress_level=9)
    print("Quantized PNG bytes:", os.path.getsize("${outPng}"))
rgb.resize((300, 300), Image.LANCZOS).save("${thumbPng}", format="PNG", optimize=True, compress_level=9)
Image.open("${outPng}").verify()
print("Verified PNG integrity OK")
`], { stdio: 'inherit' });
