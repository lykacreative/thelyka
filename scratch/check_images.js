const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const portfolioDir = path.join(publicDir, 'portfolio');

console.log('Portfolio Directory:', portfolioDir);

function traverseDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      traverseDir(fullPath);
    } else if (entry.isFile()) {
      const relPath = path.relative(publicDir, fullPath);
      const size = fs.statSync(fullPath).size;
      console.log(`File: ${relPath}, Size: ${size} bytes`);
    }
  }
}

if (fs.existsSync(portfolioDir)) {
  traverseDir(portfolioDir);
} else {
  console.log('portfolioDir does not exist');
}
