/* Canonical root assets are shared by Pages and the Next.js build; never copy credentials or runtime files. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = [
  ...['ai-config.js', 'ai-features.js', 'subscription-client.js', 'ai-client.js', 'ai-panel.js', 'ai-panel.css'].map(name => `assets/${name}`),
  ...['index.html', 'styles.css', 'app.js'].map(name => `tools/ai/${name}`),
  ...['index.html', 'campaign.js', 'sw.js'].map(name => `econ-arcade/play/${name}`)
];
function sync(destination = path.join(root, 'frontend/public')) {
  for (const name of files) {
    const output = path.join(destination, name);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(root, name), output);
    if (name.startsWith('econ-arcade/')) {
      const legacy = path.join(destination, name.replace('econ-arcade/', 'legacy-econ-arcade/'));
      fs.mkdirSync(path.dirname(legacy), { recursive: true }); fs.copyFileSync(path.join(root, name), legacy);
    }
  }
  return files.length;
}
if (require.main === module) console.log(`Synchronized ${sync()} canonical Osiris files for Next.js.`);
module.exports = { sync, files };
