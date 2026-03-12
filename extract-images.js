#!/usr/bin/env node
/**
 * Extract base64 images from HTML to images/ and replace with file paths.
 * Run from Portfolio directory: node extract-images.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname);
const IMAGES_DIR = path.join(ROOT, 'images');
const HTML_FILES = ['index.html', 'compensation.html', 'editorder.html', 'inbox.html'];

// Match href="data:image/..." or src="data:image/..."
const DATA_URI_REGEX = /(?:href|src)="(data:image\/(png|jpeg|jpg|gif);base64,([^"]+))"/g;

function hashBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
}

function decodeDataUri(dataUri) {
  const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return null;
  const ext = match[1].toLowerCase() === 'png' ? 'png' : 'jpg';
  const buffer = Buffer.from(match[2], 'base64');
  return { buffer, ext };
}

// Name pool: assign in order of first appearance
const NAME_POOL = [
  'favicon.png',
  'hero.png',
  'card-1.jpg', 'card-2.jpg', 'card-3.jpg',
  'case-1.jpg', 'case-2.jpg', 'case-3.jpg', 'case-4.jpg', 'case-5.jpg', 'case-6.jpg',
  'img-12.jpg', 'img-13.jpg', 'img-14.jpg', 'img-15.jpg', 'img-16.jpg', 'img-17.jpg', 'img-18.jpg'
];

function main() {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const hashToPath = {}; // hash -> "images/favicon.png"
  let nameIndex = 0;

  function getPathForDataUri(dataUri) {
    const decoded = decodeDataUri(dataUri);
    if (!decoded) return null;
    const hash = hashBuffer(decoded.buffer);
    if (hashToPath[hash]) return hashToPath[hash];
    const name = NAME_POOL[nameIndex++] || `img-${nameIndex}.${decoded.ext}`;
    const relPath = `images/${name}`;
    const outPath = path.join(ROOT, relPath);
    fs.writeFileSync(outPath, decoded.buffer);
    hashToPath[hash] = relPath;
    return relPath;
  }

  for (const htmlFile of HTML_FILES) {
    const filePath = path.join(ROOT, htmlFile);
    if (!fs.existsSync(filePath)) continue;
    let html = fs.readFileSync(filePath, 'utf8');
    html = html.replace(DATA_URI_REGEX, (full, dataUri, _subtype) => {
      const relPath = getPathForDataUri(dataUri);
      if (!relPath) return full;
      const attr = full.startsWith('href') ? 'href' : 'src';
      return `${attr}="${relPath}"`;
    });
    fs.writeFileSync(filePath, html);
    console.log('Updated', htmlFile);
  }

  console.log('Extracted', nameIndex, 'images to', IMAGES_DIR);
}

main();
