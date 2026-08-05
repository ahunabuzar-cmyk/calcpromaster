// Fix: add 5 missing footer i18n keys to all 19 locales in js/i18n.js
const fs = require('fs');
const path = 'js/i18n.js';
let src = fs.readFileSync(path, 'utf8');

const more = ['More', 'Más', 'और', 'مزید', 'Plus', 'Mehr', 'Mais', 'المزيد', 'Ещё', 'もっと見る', '更多', '더보기', 'Altro', 'Meer', 'Daha Fazla', 'Lainnya', 'Xem thêm', 'เพิ่มเติม', 'আরও'];
const dGen = ['General', 'General', 'सामान्य', 'عمومی', 'Général', 'Allgemein', 'Geral', 'عام', 'Общий', '一般', '一般', '일반', 'Generale', 'Algemeen', 'Genel', 'Umum', 'Chung', 'ทั่วไป', 'সাধারণ'];
const dFin = ['Financial', 'Financiero', 'वित्तीय', 'مالی', 'Financier', 'Finanzen', 'Financeiro', 'مالي', 'Финансовый', '財務', '金融', '금융', 'Finanziario', 'Financieel', 'Finansal', 'Keuangan', 'Tài chính', 'การเงิน', 'আর্থিক'];
const dHea = ['Health', 'Salud', 'स्वास्थ्य', 'صحت', 'Santé', 'Gesundheit', 'Saúde', 'صحي', 'Здоровье', '健康', '健康', '건강', 'Salute', 'Gezondheid', 'Sağlık', 'Kesehatan', 'Sức khỏe', 'สุขภาพ', 'স্বাস্থ্য'];

const lines = src.split('\n');
const out = [];
let localeIdx = -1;
let inserted = 0;
const seenLocales = new Set();

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  out.push(line);
  if (/^\s*_name:/.test(line)) {
    localeIdx++;
  }
  // Insert after the footer.settings line of each locale
  if (/^\s*'footer\.settings':/.test(line)) {
    if (localeIdx < 0 || localeIdx > more.length - 1 || seenLocales.has(localeIdx)) {
      console.error('SKIP unexpected footer.settings at idx', localeIdx, 'line', i + 1);
      continue;
    }
    seenLocales.add(localeIdx);
    const indent = line.match(/^\s*/)[0];
    const pad = indent + '  ';
    const block = [
      `${pad}'footer.brand': 'CalcProMaster',`,
      `${pad}'footer.more': '${more[localeIdx]}',`,
      `${pad}'footer.disclaimer_general': '${dGen[localeIdx]}',`,
      `${pad}'footer.disclaimer_finance': '${dFin[localeIdx]}',`,
      `${pad}'footer.disclaimer_health': '${dHea[localeIdx]}',`
    ];
    out.push(...block);
    inserted++;
  }
}

if (inserted !== 19) {
  console.error('EXPECTED 19 insertions, got', inserted);
  process.exit(1);
}

fs.writeFileSync(path, out.join('\n'), 'utf8');
console.log('OK: inserted footer keys into', inserted, 'locales');
