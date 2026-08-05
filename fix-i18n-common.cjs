// fix-i18n-common.cjs — Add 'common.calculators' ('Calculators') to all 19 locales.
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'js', 'i18n.js');
let src = fs.readFileSync(FILE, 'utf8');

const VAL = {
  en: 'Calculators', es: 'Calculadoras', hi: 'कैलकुलेटर', ur: 'کیلکولیٹرز',
  fr: 'Calculatrices', de: 'Rechner', pt: 'Calculadoras', ar: 'حاسبات',
  ru: 'калькуляторы', ja: '計算機', zh: '计算器', ko: '계산기',
  it: 'Calcolatrici', nl: 'rekenmachines', tr: 'Hesap Makineleri',
  id: 'Kalkulator', vi: 'Máy tính', th: 'เครื่องคิดเลข', bn: 'ক্যালকুলেটর'
};

let n = 0;
for (const [locale, val] of Object.entries(VAL)) {
  const re = new RegExp("(^    " + locale + ": \\{[\\s\\S]*?)(^      'cat\\.utilities': '[^']*',)", 'm');
  const m = src.match(re);
  if (!m) { console.log('SKIP ' + locale); continue; }
  if (src.slice(m.index, m.index + 4000).indexOf("'common.calculators'") !== -1) { console.log('ALREADY ' + locale); continue; }
  const insert = `\n      'common.calculators': '${val}',\n`;
  src = src.slice(0, m.index + m[0].length) + insert + src.slice(m.index + m[0].length);
  n++;
}
fs.writeFileSync(FILE, src);
console.log('Inserted common.calculators into ' + n + ' locales');
