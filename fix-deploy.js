// ====== CalcProMaster Deploy Fix Script (reusable) ======
// Usage:   node fix-deploy.js [domain]   (default: calcpromaster.netlify.app)
// What it does on index.html:
//   1. Rebrands CalcPro -> CalcProMaster (title, meta, schema, logo, footer)
//   2. Replaces the placeholder domain with your real domain
//   3. Adds og:image + twitter:image meta (og-image.png exists)
//   4. Adds `defer` to ALL body external scripts (site-config.js in <head> stays sync)
//   5. Wraps the module-init inline script in DOMContentLoaded (safe with defer)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname);
const file = path.join(root, 'index.html');
const domain = (process.argv[2] || 'calcpromaster.netlify.app').replace(/^https?:\/\//, '').replace(/\/$/, '');
const origin = 'https://' + domain;

let html = fs.readFileSync(file, 'utf8');
let changes = [];

function rep(oldStr, newStr) {
  if (html.indexOf(oldStr) === -1) { changes.push('SKIP: ' + oldStr.substring(0, 50)); return; }
  html = html.split(oldStr).join(newStr);
  changes.push('OK: ' + oldStr.substring(0, 50) + ' -> ' + newStr.substring(0, 40));
}

// ---------- 1. Branding ----------
rep('CalcPro - 524+ Free Online Calculators', 'CalcProMaster - 500+ Free Online Calculators');
rep('CalcPro', 'CalcProMaster'); // bulk rebrand (single pass, safe)

// ---------- 2. Domain ----------
rep('https://calcpro.example.com', origin);
rep('calcpro.example.com', domain);

// ---------- 3. og:image + twitter:image (og-image.png file exists) ----------
if (html.indexOf('og:image') === -1) {
  html = html.replace(
    '<meta property="og:type" content="website">',
    '<meta property="og:type" content="website">\n  <meta property="og:image" content="' + origin + '/og-image.png">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:image" content="' + origin + '/og-image.png">'
  );
  changes.push('OK: og:image + twitter:image added');
}

// ---------- 4. defer on body external scripts (skip head site-config.js) ----------
const beforeDefer = html;
html = html.replace(/<script src="js\/(?!site-config\.js)[^"]*\.js">/g, function (m) {
  return m.replace('<script ', '<script defer ');
});
if (html !== beforeDefer) changes.push('OK: defer added to body external scripts');

// ---------- 5. Wrap module-init inline script in DOMContentLoaded ----------
// The bottom init block calls CalculatorOfTheDay.init() etc. With defer, modules
// load before DOMContentLoaded fires — so wrapping in DOMContentLoaded is safe.
const initStart = '    // Initialize Calculator of the Day';
const initEnd = '    if (window.I18nUI) {\n      I18nUI.init();\n    }';
const sIdx = html.indexOf(initStart);
const eIdx = html.indexOf(initEnd);
if (sIdx !== -1 && eIdx !== -1) {
  const end = eIdx + initEnd.length;
  const block = html.substring(sIdx, end);
  const wrapped = '    document.addEventListener(\'DOMContentLoaded\', function () {\n' + block + '\n    });';
  html = html.substring(0, sIdx) + wrapped + html.substring(end);
  changes.push('OK: module-init block wrapped in DOMContentLoaded');
}

// ---------- 6. Canonical + theme color ----------
rep('<meta name="theme-color" content="#4f7cff">', '<meta name="theme-color" content="#4f46e5">');
rep('content="#3b82f6"', 'content="#4f46e5"');

fs.writeFileSync(file, html);
console.log('=== fix-deploy.js complete for domain: ' + origin + ' ===');
changes.forEach(c => console.log('  ' + c));
console.log('Next: node --check && live browser test');
