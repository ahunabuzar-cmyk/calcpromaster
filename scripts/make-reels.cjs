#!/usr/bin/env node
// REELS v2 — voice + motion + hooks.
// Each reel = scenes: TTS voice (ur-PK) + timed on-screen text + fx.
// Usage: node scripts/make-reels.cjs [name ...]   (default: all)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'reels');
const FFMPEG = require(path.join(ROOT, 'node_modules', 'ffmpeg-static'));
const FONT = 'C:/Windows/Fonts/arialbd.ttf';
if (!fs.existsSync(FONT)) { console.error('font missing:', FONT); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
// ffmpeg runs with cwd=OUT; all filter paths relative (no C:\ colon pain)
const FONT_LOCAL = '_reels-font.ttf';
fs.copyFileSync(FONT, path.join(OUT, FONT_LOCAL));

const cleanup = [];
const addCleanup = (p) => { if (p) cleanup.push(p); };

// ---------- TTS ----------
const mod = require('msedge-tts');
const MsEdgeTTS = mod.MsEdgeTTS || mod.default;
const OUTPUT_FORMAT = mod.OUTPUT_FORMAT;

async function synthesize(text, idx) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('ur-PK-AsadNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioFilePath, metadataFilePath } = await tts.toFile(OUT, text);
  addCleanup(audioFilePath); addCleanup(metadataFilePath);
  const base = path.basename(audioFilePath);
  // measure duration via ffmpeg -i (stderr parse; exit code 1 is expected)
  let dur = 0;
  try { execFileSync(FFMPEG, ['-i', base], { cwd: OUT, stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (e) {
    const m = String(e.stderr).match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (m) dur = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
  }
  if (!dur) throw new Error('cannot measure audio: ' + base);
  return { file: base, dur };
}

// ---------- drawtext helper ----------
let tfi = 0;
function TF(text) {
  const f = path.join(OUT, `.tf-${Date.now()}-${tfi++}.txt`);
  fs.writeFileSync(f, text);
  addCleanup(f);
  return path.basename(f);
}
// scene text: slide-in + fade, centered
function line({ text, fs: size, color = 'white', y, S, E, border = 6 }) {
  const a = `'min(1,max(0,(t-${S})/0.3))'`;
  const yy = `('${y}+36-36*min(1,max(0,(t-${S})/0.3))')`;
  return `drawtext=fontfile=${FONT_LOCAL}:textfile='${TF(text)}':fontsize=${size}:fontcolor=${color}` +
    `:x='(w-text_w)/2':y=${yy}:alpha=${a}:borderw=${border}:bordercolor=black` +
    `:shadowx=2:shadowy=2:shadowcolor=black@0.55:enable='between(t,${S},${E})'`;
}
// hook text: shake first 0.6s then settle
function hookLine({ text, fs: size, y, E, color = 'white' }) {
  const x = `'if(lt(t,0.6),(w-text_w)/2+9*sin(46*t),(w-text_w)/2)'`;
  return `drawtext=fontfile=${FONT_LOCAL}:textfile='${TF(text)}':fontsize=${size}:fontcolor=${color}` +
    `:x=${x}:y='${y}':borderw=8:bordercolor=black:shadowx=3:shadowy=3:shadowcolor=black@0.6` +
    `:enable='between(t,0.1,${E})'`;
}
// CTA lines with gold highlight box on the URL
function ctaLines(S, E) {
  return [
    line({ text: '1200+ free calculators', fs: 60, y: 700, S, E }),
    `drawtext=fontfile=${FONT_LOCAL}:textfile='${TF('calcpromaster.com')}':fontsize=92:fontcolor=black` +
    `:x='(w-text_w)/2':y='${880 - 26}':box=1:boxcolor=0xFFD700@0.92:boxborderw=28:alpha='min(1,max(0,(t-${S + 0.2})/0.25))'` +
    `:enable='between(t,${S},${E})'`,
    line({ text: 'No signup. Shows every step.', fs: 46, color: '#DDDDDD', y: 1040, S, E }),
  ];
}

// flash: red pulse at reveal moments
const flash = (t0) => `drawbox=c=0xFF3B30@0.28:t=fill:enable='between(t,${t0},${t0 + 0.12})'`;

const GAP = 0.3;   // silence between scenes
const TAIL = 1.1;  // video tail after last voice

// ---------- REEL DEFINITIONS (voice=Urdu script, screen=English keywords) ----------
const REELS = {
  'reel-01-bmi': {
    scenes: [
      { fx: 'hook', screen: [['BMI calculators are', 90, 'white'], ['HIDING something', 96, '#FF6B6B']], voice: 'رکو! بی ایم آئی کیلکولیٹر اصل میں آپ سے کچھ چھپا رہا ہے۔' },
      { screen: [['70 kg  +  170 cm', 76, 'white'], ['BMI = 24.2  (Normal)', 70, '#2ECC40']], voice: 'مثال کے طور پر، ستر کلو اور سترہ سینٹی میٹر پر بی ایم آئی آتا ہے چوبیس پوائنٹ دو — نارمل۔' },
      { screen: [['Formula + EVERY step', 72, '#FFD700'], ['sirf number nahi', 56, '#7FDBFF']], voice: 'لیکن اصل فرق یہ ہے — ہم فارمولا اور ہر اسٹیپ دکھاتے ہیں، صرف نمبر نہیں۔' },
      { cta: true, voice: 'کیلک پرو ماسٹر ڈاٹ کام پر جائیں۔ بارہ سو سے زیادہ فری کیلکولیٹرز۔ کوئی سائن اپ نہیں۔' },
    ],
  },
  'reel-02-emi': {
    scenes: [
      { fx: 'hook', screen: [['Your bank hopes', 88, 'white'], ['you NEVER see this', 90, '#FF6B6B']], voice: 'آپ کا بینک امید کرتا ہے کہ آپ یہ کبھی نہ دیکھیں۔' },
      { screen: [['EMI = P x r x (1+r)^n', 58, '#7FDBFF'], ['  / ((1+r)^n - 1)', 58, '#7FDBFF']], voice: 'یہ ہے اصل ای ایم آئی فارمولا۔' },
      { fx: 'flash', screen: [['50 lakh @ 8% / 20 yrs', 62, 'white'], ['EMI = Rs 41,822', 84, '#2ECC40']], voice: 'پچاس لاکھ کا قرض، آٹھ فیصد سود، بیس سال۔ ای ایم آئی بنتی ہے صرف اکتالیس ہزار آٹھ سو بائیس۔' },
      { fx: 'flash', screen: [['TOTAL INTEREST', 54, 'white'], ['Rs 50,37,280', 88, '#FF6B6B']], voice: 'لیکن ٹوٹل انٹرسٹ — پچاس لاکھ، سینتیس ہزار، دو سو اسّی۔ خود قرض سے زیادہ!' },
      { cta: true, voice: 'پورا کیلکولیشن اسٹیپ بائی اسٹیپ کیلک پرو ماسٹر پر دیکھیں۔ لنک بائیو میں ہے۔' },
    ],
  },
  'reel-03-calories': {
    scenes: [
      { fx: 'hook', screen: [['Why is EVERY app\'s', 74, 'white'], ['calorie number DIFFERENT?', 66, '#FF6B6B']], voice: 'ہر ایپ الگ کیلوری نمبر کیوں دیتی ہے؟' },
      { screen: [['The standard formula:', 54, '#CCCCCC'], ['Mifflin-St Jeor', 84, '#FFD700']], voice: 'کیونکہ اصل اسٹینڈرڈ ہے — میفلن سینٹ جیور فارمولا۔' },
      { screen: [['80kg 175cm 30y male', 56, 'white'], ['BMR = 1,805 kcal', 80, '#2ECC40']], voice: 'اسی کلو، ایک سو پچہتر سینٹی میٹر، تیس سال کے میل کا بی ایم آر — اٹھارہ سو پانچ کیلوریز۔' },
      { cta: true, voice: 'اپنا صحیح نمبر نکالیں — کیلک پرو ماسٹر ڈاٹ کام، ہر اسٹیپ کے ساتھ۔' },
    ],
  },
  'reel-04-rent-vs-buy': {
    scenes: [
      { fx: 'hook', screen: [['Rent or Buy?', 96, 'white'], ['OPINIONS everywhere', 62, '#FF6B6B']], voice: 'کرایہ لینا ٹھیک ہے یا گھر خریدنا؟ سب اپنی رائے دیتے ہیں۔' },
      { fx: 'flash', screen: [['Rs 25,000 rent / month', 60, 'white'], ['= Rs 30,00,000 in 10 yrs', 62, '#FF6B6B']], voice: 'پچیس ہزار کرایہ مطلب دس سال میں تیس لاکھ — صرف کرایہ۔' },
      { screen: [['Buying costs too:', 58, 'white'], ['interest + tax + repairs', 60, '#7FDBFF']], voice: 'لیکن خریدنے میں بھی لگتا ہے — انٹرسٹ، ٹیکس، اور رپیئرز۔' },
      { cta: true, voice: 'دونوں کے نمبر خود چلا کر دیکھیں — کیلک پرو ماسٹر ڈاٹ کام۔ بالکل فری۔' },
    ],
  },
  'reel-05-tax': {
    scenes: [
      { fx: 'hook', screen: [['TAX SLAB MYTH', 88, '#FF6B6B'], ['— busted', 72, 'white']], voice: 'ٹیکس سلیب کا سب سے بڑا جھوٹ — کہ پوری انکم پر اونچا ریٹ لگتا ہے۔' },
      { screen: [['Each slab taxes only', 60, 'white'], ['ITS OWN slice', 68, '#7FDBFF']], voice: 'سچ یہ ہے — ہر سلیب صرف اپنے حصے پر لگتا ہے۔' },
      { fx: 'flash', screen: [['Rs 15,00,000 income', 58, 'white'], ['real rate is LOWER', 64, '#2ECC40']], voice: 'پندرہ لاکھ انکم پر اصل ریٹ کافی کم نکلتا ہے۔ خود کیلکولیٹ کریں۔' },
      { cta: true, voice: 'انکم ٹیکس کیلکولیٹر کیلک پرو ماسٹر پر — ہر سلیب کا حساب صاف دکھتا ہے۔' },
    ],
  },
  'reel-06-fuel': {
    scenes: [
      { fx: 'hook', screen: [['REAL fuel average', 88, 'white'], ['of YOUR car?', 76, '#FF6B6B']], voice: 'کیا آپ اپنی کار کی اصل فیول اوسط جانتے ہیں؟' },
      { screen: [['average = km / litres', 58, '#7FDBFF'], ['450 km / 30 L = 15 km/L', 60, '#2ECC40']], voice: 'فارمولا سادہ ہے: کلومیٹر تقسیم لیٹرز۔ چار سو پچاس کلومیٹر، تیس لیٹر — پندرہ کلومیٹر فی لیٹر۔' },
      { fx: 'flash', screen: [['1,200 km / month =', 56, 'white'], ['Rs 22,400 petrol', 78, '#FF6B6B']], voice: 'اگر مہینے کے بارہ سو کلومیٹر چلتی ہے، تو پیٹرول خرچ بائیس ہزار چار سو روپے۔' },
      { cta: true, voice: 'فیول اوسط کیلکولیٹر کیلک پرو ماسٹر پر۔ پیسہ بچاؤ — پہلے حساب کرو۔' },
    ],
  },
  'reel-07-gpa': {
    scenes: [
      { fx: 'hook', screen: [['Your GPA,', 92, 'white'], ['decoded', 92, '#FFD700']], voice: 'آپ کا جی پی اے کیسے بنتا ہے؟ آج ہی سمجھ لو۔' },
      { screen: [['GPA = total points', 58, '#7FDBFF'], ['/ total credit hours', 58, '#7FDBFF']], voice: 'جی پی اے برابر ہے — ٹوٹل پوائنٹس تقسیم ٹوٹل کریڈٹ آورز۔' },
      { screen: [['A(4.0) x 3cr = 12', 54, 'white'], ['B+(3.5) x 4cr = 14', 54, 'white'], ['B(3.0) x 3cr = 9', 54, 'white']], voice: 'اے چار پوائنٹ زیرو، تین کریڈٹس۔ بی پلس تین پوائنٹ پانچ، چار کریڈٹس۔ بی تین، تین کریڈٹس۔ ٹوٹل پینتیس پوائنٹس۔' },
      { fx: 'flash', screen: [['GPA = 35 / 10', 62, 'white'], ['= 3.5', 96, '#2ECC40']], voice: 'دس کریڈٹ آورز پر تقسیم کریں — جی پی اے تین پوائنٹ پانچ۔' },
      { cta: true, voice: 'جی پی اے کیلکولیٹر کیلک پرو ماسٹر پر — اپنی گریڈز کی اصل ویلیو جانیں۔' },
    ],
  },
};

// ---------- timing ----------
function computeTimeline(scenes, audio) {
  let t = 0.35; // lead-in silence
  const marks = [];
  for (let i = 0; i < scenes.length; i++) {
    marks.push({ start: t, end: t + audio[i].dur });
    t += audio[i].dur + (i < scenes.length - 1 ? GAP : 0);
  }
  return { marks, total: t + TAIL };
}

// ---------- render one reel ----------
async function render(name) {
  const reel = REELS[name];
  console.log('... TTS', name);
  const audio = [];
  for (const sc of reel.scenes) audio.push(await synthesize(sc.voice, audio.length));
  const { marks, total } = computeTimeline(reel.scenes, audio);

  // video filter chain
  const vfParts = [
    `crop=1080:1920:20:'(ih-1920)/2+16*sin(t/5)'`,
  ];
  reel.scenes.forEach((sc, i) => {
    const { start: S, end: E } = marks[i];
    if (sc.cta) { vfParts.push(...ctaLines(S, E)); return; }
    if (sc.fx === 'hook') {
      sc.screen.forEach(([txt, size, color], li) =>
        vfParts.push(hookLine({ text: txt, fs: size, color, y: String(760 + li * 130), E: E + 0.2 })));
      return;
    }
    sc.screen.forEach(([txt, size, color], li) =>
      vfParts.push(line({ text: txt, fs: size, color, y: String(700 + li * 140), S, E: E + 0.2 })));
    if (sc.fx === 'flash') vfParts.push(flash(S + Math.min(0.8, audio[i].dur * 0.55)));
  });
  vfParts.push(`fade=t=in:st=0:d=0.4`, `fade=t=out:st=${(total - 0.8).toFixed(2)}:d=0.8`, `format=yuv420p`);

  // audio: lead silence + [scene, gap]... then loudnorm + pad
  const inputs = ['-f', 'lavfi', '-i', `gradients=s=1120x1990:c0=0x0f0c29:c1=0x302b63:x0=80:y0=150:x1=1040:y1=1840:speed=0.03`];
  const labels = [];
  let ai = 1;
  const addSilence = (d) => {
    inputs.push('-f', 'lavfi', '-t', d.toFixed(2), '-i', 'anullsrc=r=24000:cl=mono');
    labels.push(`[${ai}:a]`); ai++;
  };
  addSilence(0.35);
  reel.scenes.forEach((sc, i) => { labels.push(`[${ai}:a]`); inputs.push('-i', audio[i].file); ai++; if (i < reel.scenes.length - 1) addSilence(GAP); });
  const fc = `[0:v]${vfParts.join(',')}[vout];${labels.join('')}concat=n=${labels.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11,apad[aout]`;

  const args = ['-y', ...inputs,
    '-filter_complex', fc,
    '-map', '[vout]', '-map', '[aout]',
    '-r', '30', '-t', total.toFixed(2),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
    '-c:a', 'aac', '-b:a', '96k',
    '-movflags', '+faststart',
    name + '.mp4'];
  execFileSync(FFMPEG, args, { cwd: OUT, stdio: ['ignore', 'ignore', 'pipe'] });
  const kb = Math.round(fs.statSync(path.join(OUT, name + '.mp4')).size / 1024);
  console.log('OK', name + '.mp4', kb + 'KB', total.toFixed(1) + 's', `(${reel.scenes.length} scenes, voice included)`);
}

async function main() {
  const which = process.argv.slice(2);
  const list = which.length ? which : Object.keys(REELS);
  for (const name of list) {
    if (!REELS[name]) { console.error('unknown reel:', name); continue; }
    try { await render(name); } catch (e) { console.error('FAIL', name, String(e.stderr || e.message).slice(-500)); }
  }
  for (const f of cleanup.concat([path.join(OUT, FONT_LOCAL)])) { try { fs.unlinkSync(f); } catch (e) {} }
}
main();
