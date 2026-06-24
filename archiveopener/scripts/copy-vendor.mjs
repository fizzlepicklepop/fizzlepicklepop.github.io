import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

async function copy(src, dest) {
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(src, dest);
}

async function findExisting(paths) {
  for (const path of paths) {
    try {
      await stat(path);
      return path;
    } catch {}
  }
  throw new Error(`Could not find any of: ${paths.join(', ')}`);
}

const fflateSrc = await findExisting([
  'node_modules/fflate/esm/browser.js',
  'node_modules/fflate/esm/index.js'
]);
await copy(fflateSrc, 'vendor/fflate.module.js');

await copy('node_modules/libarchive.js/main.js', 'vendor/libarchive.js/main.js');

async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  for (const entry of await readdir(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(from, to);
    else await copy(from, to);
  }
}

await copyDir('node_modules/libarchive.js/dist', 'vendor/libarchive.js/dist');
console.log('Vendor files copied. Static PWA is ready for GitHub Pages.');
