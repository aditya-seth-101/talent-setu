const fs = require('fs');
const path = require('path');

const [src, dest] = process.argv.slice(2);
if (!src || !dest) {
  console.error('Usage: node copy-css.js <src> <dest>');
  process.exit(1);
}

const srcPath = path.resolve(src);
const destPath = path.resolve(dest);

fs.mkdirSync(path.dirname(destPath), { recursive: true });
fs.copyFileSync(srcPath, destPath);
console.log(`Copied ${srcPath} -> ${destPath}`);
