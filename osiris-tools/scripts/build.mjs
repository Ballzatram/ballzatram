import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const repo = path.resolve(root, '..');
const read = file => readFile(path.join(repo, file), 'utf8');
const [source, css, engine, lab, assistant] = await Promise.all([
  read('tools/supply-demand/index.html'), read('tools/supply-demand/styles.css'), read('tools/supply-demand/engine.js'), read('tools/supply-demand/app.js'), read('osiris-tools/web/assistant.html')
]);
const bundled = await build({ entryPoints: [path.join(root, 'web/app.mjs')], bundle: true, write: false, format: 'iife', minify: true, target: 'es2022', platform: 'browser', logLevel: 'warning' });
let body = source.match(/<body>([\s\S]*?)<\/body>/)[1];
body = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<nav\b[\s\S]*?<\/nav>/, '').replace(/<section class="osiris-launch"[\s\S]*?<\/section>/, assistant);
body = body.replace('Pages-native · Econ Arcade · zero backend', 'Ballzatram · Econ Arcade').replace('Runs entirely in your browser', 'Local simulation · your AI account');
const hostCss = 'body{margin:0}.lab-shell{max-width:1000px;padding:16px}.lab-hero{padding:22px}.lab-hero h1{font-size:clamp(26px,5vw,42px)}.host-assistant{margin-top:20px}.host-assistant textarea{width:100%;box-sizing:border-box;padding:10px;font:inherit;border:1px solid #aec7bc;border-radius:8px}.host-assistant pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:200px;overflow:auto;font-size:12px}.host-consent{display:flex!important;align-items:start;gap:8px}.host-consent input{width:auto!important;margin-top:5px}[hidden]{display:none!important}';
const script = `${engine}\n(() => {\n${lab}\n})();\n${bundled.outputFiles[0].text}`.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Supply & Demand · Ballzatram</title><style>${css}\n${hostCss}</style></head><body>${body}<script>${script}</script></body></html>`;
await mkdir(path.join(root, 'dist'), { recursive: true });
await writeFile(path.join(root, 'dist/widget.html'), html);
await writeFile(path.join(root, 'dist/widget.mjs'), `export const widgetHtml = ${JSON.stringify(html)};\n`);
console.log(`Built shared lab UI (${Math.round(Buffer.byteLength(html) / 1024)} KiB); no model calls.`);
