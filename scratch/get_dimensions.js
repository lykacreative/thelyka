const fs = require('fs');
const path = require('path');

function getJpegSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  let i = 4;
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    throw new Error('Not a valid JPEG file');
  }

  while (i < buffer.length) {
    while (buffer[i] !== 0xFF) {
      i++;
      if (i >= buffer.length) return null;
    }
    while (buffer[i] === 0xFF) {
      i++;
    }
    const marker = buffer[i];
    i++;

    if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) || (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
      i += 3;
      const height = buffer.readUInt16BE(i);
      const width = buffer.readUInt16BE(i + 2);
      return { width, height };
    } else {
      const length = buffer.readUInt16BE(i);
      i += length;
    }
  }
  return null;
}

const publicDir = path.join(__dirname, '..', 'public');
const portfolioDir = path.join(publicDir, 'portfolio');

function traverseDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      traverseDir(fullPath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.jpg')) {
      const relPath = path.relative(publicDir, fullPath);
      try {
        const dims = getJpegSize(fullPath);
        console.log(`${relPath}:`, dims);
      } catch (e) {
        console.log(`${relPath}: error`, e.message);
      }
    }
  }
}

traverseDir(portfolioDir);
