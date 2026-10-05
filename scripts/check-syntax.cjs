const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
function scripts(directory, recursive) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return recursive ? scripts(file, true) : [];
    return /\.(?:js|cjs|mjs)$/.test(entry.name) ? [file] : [];
  });
}
const files = [
  ...scripts(root, false),
  ...['functions', 'scripts', 'tests'].flatMap(dir => scripts(path.join(root, dir), true)),
];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checked ${files.length} JavaScript files.`);
