import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const room = path.join(root, 'internal', 'reading-room');
const coversDir = path.join(room, 'covers');
fs.mkdirSync(coversDir, { recursive: true });

function loadConst(file, name) {
  const src = fs.readFileSync(path.join(room, file), 'utf8') + `\n;globalThis.__OUT__=${name};`;
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { timeout: 5000 });
  return ctx.__OUT__;
}

const DATA = loadConst('books.js', 'DATA');
const PERSONAL_FINISHED = loadConst('finished.js', 'PERSONAL_FINISHED');
const seen = new Map();
for (const rows of Object.values(DATA)) for (const [title, author] of rows) seen.set(title, [title, author]);
for (const [title, author] of PERSONAL_FINISHED) seen.set(title, [title, author]);

const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function googleCandidate(title, author) {
  const q = `intitle:"${title}" inauthor:"${author.split('&')[0].trim()}"`;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Ballzatram-Reading-Room/1.0' } });
    if (!r.ok) return null;
    const j = await r.json();
    for (const item of j.items || []) {
      const links = item?.volumeInfo?.imageLinks || {};
      const u = links.extraLarge || links.large || links.medium || links.small || links.thumbnail || links.smallThumbnail;
      if (u) return u.replace(/^http:/, 'https:').replace('zoom=1', 'zoom=2');
    }
  } catch {}
  return null;
}

async function openLibraryCandidate(title, author) {
  const qs = new URLSearchParams({ title, author, limit: '5', fields: 'cover_i,title,author_name' });
  try {
    const r = await fetch(`https://openlibrary.org/search.json?${qs}`, { headers: { 'User-Agent': 'Ballzatram-Reading-Room/1.0' } });
    if (!r.ok) return null;
    const j = await r.json();
    const d = (j.docs || []).find(x => x.cover_i);
    return d ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null;
  } catch {}
  return null;
}

async function fetchImage(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 BallzatramReadingRoom/1.0' } });
    if (!r.ok) return null;
    const type = r.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return null;
    const ab = await r.arrayBuffer();
    if (ab.byteLength < 4000) return null;
    return { buf: Buffer.from(ab), type };
  } catch {}
  return null;
}

function extFor(type) {
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  return 'jpg';
}

const manifest = {};
let i = 0;
for (const [title, author] of seen.values()) {
  i++;
  const base = slug(title);
  const existing = fs.readdirSync(coversDir).find(f => f === `${base}.jpg` || f === `${base}.png` || f === `${base}.webp`);
  if (existing) {
    manifest[title] = `/internal/reading-room/covers/${existing}`;
    continue;
  }
  let candidate = await googleCandidate(title, author);
  let image = await fetchImage(candidate);
  if (!image) {
    candidate = await openLibraryCandidate(title, author);
    image = await fetchImage(candidate);
  }
  if (image) {
    const file = `${base}.${extFor(image.type)}`;
    fs.writeFileSync(path.join(coversDir, file), image.buf);
    manifest[title] = `/internal/reading-room/covers/${file}`;
    console.log(`[${i}/${seen.size}] saved ${title}`);
  } else {
    console.log(`[${i}/${seen.size}] no cover ${title}`);
  }
  await sleep(80);
}

fs.writeFileSync(path.join(room, 'local-covers.js'), `const LOCAL_COVERS=${JSON.stringify(manifest, null, 2)};\n`);
console.log(`Pinned ${Object.keys(manifest).length}/${seen.size} covers.`);
