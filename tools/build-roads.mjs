// 預先下載台北市各行政區的「區界」與「完整路網」，壓縮後存成 data/<key>.js。
// 遊戲每局會在選定行政區內隨機挑一塊區域當狙擊場。
// 用法：node tools/build-roads.mjs             （全部重抓）
//       node tools/build-roads.mjs xinyi daan   （只抓指定行政區）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data');
mkdirSync(OUT, { recursive: true });
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const HIGHWAY = '^(footway|pedestrian|residential|living_street|service|tertiary|secondary|primary|unclassified|path|steps|trunk)$';

// 從 index.html 讀出行政區清單（key 與 OSM 名稱）
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const src = html.match(/const DISTRICTS = \{([\s\S]*?)\n\};/)[1];
const DISTRICTS = {};
for (const m of src.matchAll(/(\w+)\s*:\s*\{name:'([^']+)'/g)) DISTRICTS[m[1]] = m[2];
const only = process.argv.slice(2);

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function overpass(q) {
  for (let round = 0; round < 3; round++)
    for (const url of SERVERS) {
      try {
        const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'skykiller-prototype/0.2' } });
        if (res.ok) { const j = await res.json(); if (j.elements?.length) return j; console.log('  空結果'); }
        else console.log(`  ${new URL(url).host} -> ${res.status}`);
      } catch (e) { console.log(`  ${new URL(url).host} -> ${e.message}`); }
      await sleep(4000);
    }
  throw new Error('所有伺服器都失敗');
}

// 把 relation 的 outer 線段接成封閉多邊形
function assembleRings(rel) {
  const segs = rel.members.filter(m => m.type === 'way' && m.role !== 'inner' && m.geometry)
    .map(m => m.geometry.map(p => [p.lat, p.lon]));
  const key = p => p[0].toFixed(7) + ',' + p[1].toFixed(7);
  const rings = [];
  while (segs.length) {
    let ring = segs.shift();
    let grew = true;
    while (key(ring[0]) !== key(ring[ring.length - 1]) && grew) {
      grew = false;
      const end = key(ring[ring.length - 1]);
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (key(s[0]) === end) { ring = ring.concat(s.slice(1)); }
        else if (key(s[s.length - 1]) === end) { ring = ring.concat(s.slice().reverse().slice(1)); }
        else continue;
        segs.splice(i, 1); grew = true; break;
      }
    }
    if (ring.length > 3) rings.push(ring);
  }
  return rings;
}
// Douglas-Peucker 簡化（公尺）
function simplify(pts, tol, MLNG) {
  const MLAT = 111320;
  const xy = pts.map(p => [p[1] * MLNG, p[0] * MLAT]);
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let md = 0, mi = -1;
    const [ax, ay] = xy[a], [bx, by] = xy[b], L = Math.hypot(bx - ax, by - ay) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      // 封閉環的頭尾是同一點（L≈0），此時改用到端點的距離
      const d = L < 1e-6 ? Math.hypot(xy[i][0] - ax, xy[i][1] - ay)
        : Math.abs((bx - ax) * (ay - xy[i][1]) - (ax - xy[i][0]) * (by - ay)) / L;
      if (d > md) { md = d; mi = i; }
    }
    if (md > tol) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const enc = (pts, base) => {   // 1e-6 度差分
  const out = []; let la = Math.round(base[0] * 1e6), lg = Math.round(base[1] * 1e6);
  for (const p of pts) { const a = Math.round(p[0] * 1e6), b = Math.round(p[1] * 1e6); out.push(a - la, b - lg); la = a; lg = b; }
  return out;
};

for (const [key, name] of Object.entries(DISTRICTS)) {
  if (only.length && !only.includes(key)) continue;
  process.stdout.write(`${key} ${name} … `);
  const q = `[out:json][timeout:180];
area["name"="臺北市"]["admin_level"="4"]->.tp;
rel(area.tp)["boundary"="administrative"]["name"="${name}"]->.r;
.r out geom;
.r map_to_area->.d;
way["highway"~"${HIGHWAY}"](area.d)->.w;
.w out skel qt;
node(w.w);
out skel qt;`;
  const js = await overpass(q);
  const rel = js.elements.find(e => e.type === 'relation');
  if (!rel) throw new Error(name + ' 找不到區界');
  const rings = assembleRings(rel);
  let s = 90, n = -90, w = 180, e = -180;
  for (const r of rings) for (const [la, lg] of r) { s = Math.min(s, la); n = Math.max(n, la); w = Math.min(w, lg); e = Math.max(e, lg); }
  const c = [+((s + n) / 2).toFixed(6), +((w + e) / 2).toFixed(6)];
  const MLNG = 111320 * Math.cos(c[0] * Math.PI / 180);

  const nodes = new Map(); const order = [];
  for (const el of js.elements) if (el.type === 'node') { nodes.set(el.id, order.length); order.push([el.lat, el.lon]); }
  const ways = [];
  for (const el of js.elements) if (el.type === 'way') {
    const ids = el.nodes.map(id => nodes.get(id)).filter(i => i !== undefined);
    if (ids.length < 2) continue;
    const d = []; let prev = 0; for (const i of ids) { d.push(i - prev); prev = i; }
    ways.push(d);
  }
  const data = {
    name, c,
    b: rings.map(r => enc(simplify(r, 4, MLNG), c)),
    p: enc(order, c),
    w: ways,
  };
  const body = `window.SK_ROADS=window.SK_ROADS||{};SK_ROADS[${JSON.stringify(key)}]=${JSON.stringify(data)};\n`;
  writeFileSync(join(OUT, key + '.js'), body);
  console.log(`${order.length} 節點，${ways.length} 條路，區界 ${rings.length} 圈，${(body.length / 1024).toFixed(0)} KB`);
  await sleep(3000);   // 對免費伺服器客氣一點
}
console.log('完成');
