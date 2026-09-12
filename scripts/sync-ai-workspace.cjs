// Keep the same AI workspace available on both GitHub Pages and Next.js hosts.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const file of ['assets/ai-client.js', 'assets/storage.js', 'tools/ai/index.html', 'tools/ai/app.js', 'tools/ai/styles.css']) {
  const target = path.join(root, 'frontend/public', file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, file), target);
  if (file === 'tools/ai/index.html') {
    const html = fs.readFileSync(target, 'utf8')
      .replace('href="../../index.html"', 'href="/"')
      .replace('href="../index.html"', 'href="/laboratory"')
      .replace('href="../../privacy.html"', 'href="https://ballzatram.com/privacy.html"');
    fs.writeFileSync(target, html);
  }
}
