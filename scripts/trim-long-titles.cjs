#!/usr/bin/env node
// Trim overlong <title> (>65 chars) and meta description (>160 chars) in
// guides/*.html and blog/*.html. Idempotent. Word-boundary clipping, entities
// decoded before measuring and re-escaped on write.
const fs = require('fs');
const path = require('path');

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function clipWords(s, max) {
  if (s.length <= max) return s;
  let cut = s.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  if (sp > max * 0.6) cut = cut.slice(0, sp);
  return cut.replace(/[\s,\-—:;]+$/, '');
}

let titlesTrimmed = 0, descsTrimmed = 0;
const dirs = ['guides', 'blog'];
for (const d of dirs) {
  const files = fs.readdirSync(d).filter((f) => f.endsWith('.html'));
  for (const f of files) {
    const p = path.join(d, f);
    let s = fs.readFileSync(p, 'utf8');
    // ---- title ----
    const tm = s.match(/<title>([^<]*)<\/title>/);
    if (tm) {
      const t = decode(tm[1]);
      if (t.length > 65) {
        const body = t.replace(/\s*\|\s*CalcProMaster\s*$/, '');
        let final = body.length <= 65 ? body : clipWords(body, 65);
        if (final !== t) {
          s = s.replace(/<title>[^<]*<\/title>/, '<title>' + esc(final) + '</title>');
          titlesTrimmed++;
        }
      }
    }
    // ---- meta description ----
    const dm = s.match(/<meta name="description" content="([^"]*)">/);
    if (dm) {
      const dsc = decode(dm[1]);
      if (dsc.length > 160) {
        const final = clipWords(dsc, 158) + '…';
        if (final !== dsc) {
          s = s.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(final) + '">');
          descsTrimmed++;
        }
      }
    }
    fs.writeFileSync(p, s, 'utf8');
  }
}
console.log('titles trimmed: ' + titlesTrimmed);
console.log('descriptions trimmed: ' + descsTrimmed);
