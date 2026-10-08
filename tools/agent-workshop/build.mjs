import { build } from 'esbuild';
import {readFile, readdir, writeFile} from 'node:fs/promises';
const result = await build({ entryPoints: ['app.mjs'], bundle: true, outfile: 'workshop.js',
  platform: 'browser', format: 'esm', target: 'es2022', minify: true,
  legalComments: 'linked', metafile: true });
const packageRoots = [...new Set(Object.keys(result.metafile.inputs).filter(path => path.startsWith('node_modules/')).map(path => {
  const parts = path.split('/'); return parts.slice(0, parts[1].startsWith('@') ? 3 : 2).join('/');
}))].sort();
const notices = ['Third-party packages bundled in workshop.js. Their licenses apply to their respective code.\n'];
for (const root of packageRoots) {
  const pkg = JSON.parse(await readFile(`${root}/package.json`, 'utf8'));
  const files = (await readdir(root)).filter(file => /^(licen[sc]e|copying)(\..*)?$/i.test(file));
  notices.push(`\n${pkg.name} ${pkg.version} (${pkg.license || 'see package'})\n`);
  for (const file of files) notices.push(await readFile(`${root}/${file}`, 'utf8'));
}
await writeFile('THIRD_PARTY_NOTICES.txt', notices.join('\n'));
