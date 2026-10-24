import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const source = await readFile(new URL("../public/icons/icon.svg", import.meta.url));

async function renderIcon(size, padding = 0) {
  let image = sharp(source, { density: 288 })
    .resize(size - padding * 2, size - padding * 2)
    .flatten({ background: "#ffffff" });

  if (padding) {
    image = image.extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: "#ffffff",
    });
  }

  // PNGs embedded in ICO files must be RGBA for Turbopack's decoder.
  return image.ensureAlpha().png().toBuffer();
}

for (const [filename, size, padding] of [
  ["icon-192.png", 192, 0],
  ["icon-512.png", 512, 0],
  ["apple-touch-icon.png", 180, 0],
  // Keep this mark within the launcher's central circular safe zone.
  ["icon-maskable-512.png", 512, 64],
]) {
  await writeFile(new URL(`../public/icons/${filename}`, import.meta.url), await renderIcon(size, padding));
}

const sizes = [32, 48];
const images = await Promise.all(sizes.map((size) => renderIcon(size)));
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;

for (const [index, png] of images.entries()) {
  const entry = 6 + index * 16;
  directory[entry] = sizes[index];
  directory[entry + 1] = sizes[index];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(png.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += png.length;
}

await writeFile(new URL("../src/app/favicon.ico", import.meta.url), Buffer.concat([directory, ...images]));
console.log("Generated PWA, Apple touch, maskable, and favicon icons from public/icons/icon.svg.");
