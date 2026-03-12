#!/usr/bin/env node
/**
 * Optimize images: compress PNGs, convert JPGs to WebP, update HTML references.
 * Run from Portfolio: node optimize-images.js
 */
const fs = require('fs');
const path = require('path');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('sharp not installed. Run: npm install && node optimize-images.js');
  process.exit(1);
}

const ROOT = path.join(__dirname);
const IMAGES_DIR = path.join(ROOT, 'images');
const HTML_FILES = ['index.html', 'compensation.html', 'editorder.html', 'inbox.html'];
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;
const PNG_COMPRESSION = 9;

async function optimize() {
  const files = fs.readdirSync(IMAGES_DIR).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
  const jpgToWebp = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);
    const inputPath = path.join(IMAGES_DIR, file);

    if (ext === '.png') {
      let pipeline = sharp(inputPath);
      const meta = await pipeline.metadata();
      if (meta.width > MAX_WIDTH) pipeline = pipeline.resize(MAX_WIDTH, null, { withoutEnlargement: true });
      await pipeline
        .png({ compressionLevel: PNG_COMPRESSION })
        .toFile(path.join(IMAGES_DIR, file));
      console.log('Compressed', file);
    } else {
      const outPath = path.join(IMAGES_DIR, `${base}.webp`);
      let pipeline = sharp(inputPath);
      const meta = await pipeline.metadata();
      if (meta.width > MAX_WIDTH) pipeline = pipeline.resize(MAX_WIDTH, null, { withoutEnlargement: true });
      await pipeline
        .webp({ quality: WEBP_QUALITY })
        .toFile(outPath);
      fs.unlinkSync(inputPath);
      jpgToWebp.push({ from: file, to: `${base}.webp` });
      console.log('Converted', file, '->', `${base}.webp`);
    }
  }

  for (const { from, to } of jpgToWebp) {
    const fromPath = `images/${from}`;
    const toPath = `images/${to}`;
    for (const htmlFile of HTML_FILES) {
      const filePath = path.join(ROOT, htmlFile);
      if (!fs.existsSync(filePath)) continue;
      let html = fs.readFileSync(filePath, 'utf8');
      if (html.includes(fromPath)) {
        html = html.split(fromPath).join(toPath);
        fs.writeFileSync(filePath, html);
        console.log('Updated', htmlFile, fromPath, '->', toPath);
      }
    }
  }
}

optimize().catch(err => { console.error(err); process.exit(1); });
