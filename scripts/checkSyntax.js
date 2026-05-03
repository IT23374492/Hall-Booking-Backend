const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const targetDirs = ['controllers', 'middleware', 'models', 'routes', 'utils'];
const files = [];

const walk = (dir) => {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      return;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  });
};

targetDirs.forEach((dir) => walk(path.join(rootDir, dir)));
files.push(path.join(rootDir, 'server.js'));

files.forEach((filePath) => {
  const source = fs.readFileSync(filePath, 'utf8');
  new vm.Script(source, { filename: filePath });
});

console.log(`Backend syntax check passed for ${files.length} files.`);
