// Generate a unique cinematic OG share-card for EVERY calculator (566 tools).
// Design: deep-space gradient + radial glow + subtle grid + film-grain noise,
// per-category color themes and per-tool layout variation (hash-driven) so no
// two cards look alike. Small JPEG output, zero external assets — offline-safe.
// Usage: node scripts/generate-tool-og.cjs          (all tools)
//        LIMIT=50 node scripts/generate-tool-og.cjs (first 50 only)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'og');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Load tools from the real data files
const files = fs.readdirSync(path.join(ROOT, 'js', 'data')).filter(f => f.endsWith('.js'));
const tools = [];
for (const f of files) {
  const mod = require(path.join(ROOT, 'js', 'data', f));
  if (Array.isArray(mod)) {
    const catKey = f.replace('.js', '');
    for (const t of mod) tools.push({ id: t.id, name: t.name, desc: (t.desc || '').slice(0, 90), catKey });
  }
}

const CAT_NAMES = {
  'auto-transport': 'Auto & Transport', 'business': 'Business', 'career-freelance': 'Career & Freelance',
  'construction': 'Construction', 'conversion': 'Conversion', 'education': 'Education',
  'engineering': 'Engineering', 'everyday': 'Everyday', 'finance': 'Finance',
  'fitness-exercise': 'Fitness', 'food-nutrition': 'Food & Nutrition', 'health': 'Health',
  'home-garden': 'Home & Garden', 'lifestyle': 'Lifestyle', 'math': 'Math',
  'parenting-family': 'Family', 'regional': 'Regional', 'science': 'Science',
  'tech-digital': 'Tech & Digital', 'utilities': 'Utilities'
};

// Per-category cinematic theme: [deep base, mid tone, glow color, accent]
const THEMES = {
  'auto-transport': ['#0b1026', '#1b2b5e', '#22d3ee', '#38bdf8'],
  'business':       ['#04150f', '#0c3b2a', '#34d399', '#10b981'],
  'career-freelance': ['#140b2e', '#3b1d6e', '#a78bfa', '#8b5cf6'],
  'construction':   ['#170d04', '#4a2a0a', '#fbbf24', '#f59e0b'],
  'conversion':     ['#0a1028', '#1d3a8f', '#60a5fa', '#3b82f6'],
  'education':      ['#180a24', '#4a1d5e', '#e879f9', '#c026d3'],
  'engineering':    ['#0b1220', '#1f2f4d', '#94a3b8', '#64748b'],
  'everyday':       ['#051510', '#0f3d2c', '#2dd4bf', '#14b8a6'],
  'finance':        ['#03130a', '#0d4a22', '#4ade80', '#22c55e'],
  'fitness-exercise': ['#1c0a04', '#5c1a08', '#fb923c', '#f97316'],
  'food-nutrition': ['#0a1404', '#2a4d0a', '#a3e635', '#84cc16'],
  'health':         ['#1c0410', '#5c0f2e', '#fb7185', '#f43f5e'],
  'home-garden':    ['#081208', '#1c4012', '#86efac', '#4ade80'],
  'lifestyle':      ['#1c0620', '#4a1057', '#f0abfc', '#d946ef'],
  'math':           ['#070d22', '#14286b', '#818cf8', '#6366f1'],
  'parenting-family': ['#04141c', '#0e3a52', '#38bdf8', '#0ea5e9'],
  'regional':       ['#170d02', '#52300a', '#fcd34d', '#eab308'],
  'science':        ['#0f061e', '#2b1055', '#c084fc', '#a855f7'],
  'tech-digital':   ['#040f17', '#0c3c52', '#22d3ee', '#06b6d4'],
  'utilities':      ['#0a1018', '#1e3247', '#93c5fd', '#60a5fa']
};

// Per-category emoji (hero glyph)
const EMOJI = {
  'auto-transport': '🚗', 'business': '📈', 'career-freelance': '💼', 'construction': '🏗️',
  'conversion': '🔄', 'education': '🎓', 'engineering': '⚙️', 'everyday': '🛠️',
  'finance': '💰', 'fitness-exercise': '💪', 'food-nutrition': '🥗', 'health': '🩺',
  'home-garden': '🌿', 'lifestyle': '✨', 'math': '🧮', 'parenting-family': '👨‍👩‍👧',
  'regional': '🇮🇳', 'science': '🔬', 'tech-digital': '💻', 'utilities': '🧰'
};

// Deterministic per-tool hash → unique layout variation
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// SVG noise (film grain) as data-URI — safe chars only
const NOISE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/><feColorMatrix type="saturate" values="0"/></filter><rect width="300" height="300" filter="url(%23n)" opacity="0.55"/></svg>'
);

function cardHtml(t) {
  const th = THEMES[t.catKey] || THEMES.utilities;
  const [c1, c2, glow, accent] = th;
  const h = hash(t.id + t.name);
  // Slight per-tool hue/position variation so every card is visually unique
  const hueShift = (h % 21) - 10;                       // -10..+10 degrees
  const r1 = 18 + (h % 22);                             // ring radius variation
  const ringX = 72 + (h % 20);                          // ring center variation
  const glowX = 62 + (h % 16);                          // glow position variation
  const chipCls = h % 2 === 0 ? 'chip' : 'chip chip-alt';
  const emoji = EMOJI[t.catKey] || '🧮';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:1200px; height:630px; overflow:hidden; font-family:'Segoe UI',Arial,sans-serif; background:${c1}; }
    .stage { position:relative; width:1200px; height:630px; overflow:hidden; filter:hue-rotate(${hueShift}deg); }
    /* Deep cinematic base */
    .base { position:absolute; inset:0; background:linear-gradient(158deg, ${c1} 0%, ${c2} 58%, #000 130%); }
    /* Radial glows */
    .glow-a { position:absolute; top:-24%; right:${glowX}%; width:62%; height:78%; border-radius:50%;
      background:radial-gradient(circle at 50% 50%, ${glow} 0%, rgba(0,0,0,0) 68%); opacity:.34; filter:blur(8px); }
    .glow-b { position:absolute; bottom:-30%; left:-14%; width:56%; height:70%; border-radius:50%;
      background:radial-gradient(circle at 50% 50%, ${accent} 0%, rgba(0,0,0,0) 66%); opacity:.20; filter:blur(10px); }
    /* Subtle blueprint grid */
    .grid { position:absolute; inset:0; opacity:.07;
      background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);
      background-size:72px 72px; }
    /* Decorative orbit rings — unique per tool */
    .ring { position:absolute; border:1.5px solid ${glow}; border-radius:50%; opacity:.22; }
    .ring-1 { width:${r1 * 8}px; height:${r1 * 8}px; top:-${r1 * 2}px; right:${ringX}%; }
    .ring-2 { width:${r1 * 5}px; height:${r1 * 5}px; bottom:-${r1 * 1.4}px; left:${100 - ringX - 18}%; opacity:.13; }
    .ring-3 { width:${r1 * 2.6}px; height:${r1 * 2.6}px; top:${34 + (h % 12)}%; right:${8 + (h % 14)}%; opacity:.30; }
    /* Floating emoji orb */
    .orb { position:absolute; top:${40 + (h % 8)}%; right:${9 + (h % 10)}%; width:${150 + (h % 40)}px; height:${150 + (h % 40)}px;
      border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:${66 + (h % 20)}px;
      background:radial-gradient(circle at 32% 28%, rgba(255,255,255,.24), rgba(255,255,255,.05) 60%);
      border:1.5px solid rgba(255,255,255,.28); box-shadow:0 24px 60px rgba(0,0,0,.55), 0 0 46px ${glow}55; }
    /* Film grain */
    .noise { position:absolute; inset:0; opacity:.05; background-image:url('${NOISE}'); mix-blend-mode:overlay; }
    /* Vignette */
    .vig { position:absolute; inset:0; box-shadow:inset 0 0 210px rgba(0,0,0,.62); }
    .content { position:relative; height:630px; padding:54px 64px; display:flex; flex-direction:column; z-index:2; }
    .top { display:flex; align-items:center; gap:16px; }
    .logo { width:58px; height:58px; border-radius:16px; display:flex; align-items:center; justify-content:center;
      font-size:34px; font-weight:800; color:#fff; background:linear-gradient(135deg, ${accent}, ${glow});
      box-shadow:0 10px 26px rgba(0,0,0,.45), 0 0 22px ${glow}66; }
    .brand { font-size:27px; font-weight:800; color:#f8fafc; letter-spacing:-.3px; }
    .brand small { display:block; font-size:12px; color:#a7b4c8; letter-spacing:2.5px; text-transform:uppercase; font-weight:600; }
    .hero { flex:1; display:flex; flex-direction:column; justify-content:center; max-width:830px; }
    .chip, .chip-alt { display:inline-flex; align-items:center; gap:9px; background:rgba(255,255,255,.07);
      border:1px solid rgba(255,255,255,.2); color:#dbe4f0; font-size:15px; font-weight:700; padding:8px 20px;
      border-radius:40px; align-self:flex-start; margin-bottom:26px; backdrop-filter:blur(6px); }
    .chip-alt { border-color:${glow}66; color:${glow}; background:${glow}1f; }
    .hero h1 { font-size:${h % 2 === 0 ? 60 : 54}px; font-weight:800; color:#fff; line-height:1.08; letter-spacing:-1.2px;
      background:linear-gradient(92deg, #ffffff 12%, ${glow} 62%, ${accent} 100%); -webkit-background-clip:text; background-clip:text;
      -webkit-text-fill-color:transparent; color:#fff; text-shadow:0 6px 30px rgba(0,0,0,.35); max-width:790px; }
    .hero p { font-size:21px; color:#c7d2e0; margin-top:20px; max-width:730px; line-height:1.5; text-shadow:0 2px 14px rgba(0,0,0,.5); }
    .bottom { display:flex; justify-content:space-between; align-items:center; }
    .bottom .tag { font-size:15px; color:#94a3b8; }
    .bottom .url { font-size:18px; font-weight:700; color:${glow}; text-shadow:0 0 18px ${glow}44; }
  </style></head><body>
  <div class="stage">
    <div class="base"></div>
    <div class="grid"></div>
    <div class="glow-a"></div><div class="glow-b"></div>
    <div class="ring ring-1"></div><div class="ring ring-2"></div><div class="ring ring-3"></div>
    <div class="orb">${emoji}</div>
    <div class="noise"></div><div class="vig"></div>
    <div class="content">
      <div class="top"><div class="logo">C</div><div class="brand">CalcProMaster<small>Free Online Calculators</small></div></div>
      <div class="hero">
        <span class="${chipCls}">${esc(CAT_NAMES[t.catKey] || t.catKey)}</span>
        <h1>${esc(t.name)}</h1>
        <p>${esc(t.desc)}</p>
      </div>
      <div class="bottom"><span class="tag">100% free · Step-by-step solutions · No sign-up · Runs in your browser</span><span class="url">calcpromaster.netlify.app</span></div>
    </div>
  </div>
  </body></html>`;
}

(async () => {
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome' }); }
  catch (e) { browser = await chromium.launch(); }
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  let done = 0, failed = 0;
  const t0 = Date.now();
  const limit = parseInt(process.env.LIMIT || '0', 10);
  let list = limit > 0 ? tools.slice(0, limit) : tools;
  // SKIP_EXISTING=1: only generate cards that are missing (idempotent re-runs)
  if (process.env.SKIP_EXISTING === '1') {
    list = list.filter((t) => !fs.existsSync(path.join(OUT_DIR, t.id + '.jpg')));
    console.log('SKIP_EXISTING: ' + list.length + ' cards missing out of ' + tools.length + ' tools');
  }
  for (const t of list) {
    const out = path.join(OUT_DIR, t.id + '.jpg');
    try {
      await page.setContent(cardHtml(t), { waitUntil: 'load' });
      await page.waitForTimeout(12); // let gradients settle
      await page.screenshot({ path: out, type: 'jpeg', quality: 78 });
      done++;
    } catch (e) { failed++; console.log('FAIL ' + t.id + ': ' + e.message.split('\n')[0]); }
    if (done % 100 === 0) console.log(done + '/' + list.length + ' done...');
  }
  await browser.close();
  const size = fs.readdirSync(OUT_DIR).reduce((s, f) => s + fs.statSync(path.join(OUT_DIR, f)).size, 0) / 1048576;
  console.log('DONE: ' + done + ' generated, ' + failed + ' failed in ' + Math.round((Date.now() - t0) / 1000) + 's');
  console.log('Total folder size: ' + size.toFixed(1) + ' MB');
  if (failed > 0) process.exit(1);
})().catch((e) => { console.error('FATAL:', e.message.split('\n')[0]); process.exit(1); });
