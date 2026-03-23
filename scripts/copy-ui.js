const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const srcDir = path.join(distDir, 'src');
const uiPath = path.join(distDir, 'ui.html');
const targetPath = path.join(srcDir, 'ui.html');

if (fs.existsSync(uiPath)) {
  fs.mkdirSync(srcDir, { recursive: true });
  fs.copyFileSync(uiPath, targetPath);
}
