// fix-i18n-toolkeys.cjs — Add tool-button translation keys (Settings, Goal Seek,
// Batch, Embed, CSV, PDF, search_in) to ALL 19 locale blocks in js/i18n.js.
// Run: node fix-i18n-toolkeys.cjs
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'js', 'i18n.js');
let src = fs.readFileSync(FILE, 'utf8');

const KEYS = {
  en: { 'tool.settings': 'Settings', 'tool.goal_seek': 'Goal Seek', 'tool.batch': 'Batch', 'tool.embed': 'Embed', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': 'Search in {name}…' },
  es: { 'tool.settings': 'Ajustes', 'tool.goal_seek': 'Objetivo', 'tool.batch': 'Lote', 'tool.embed': 'Insertar', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': 'Buscar en {name}…' },
  hi: { 'tool.settings': 'सेटिंग्स', 'tool.goal_seek': 'गोल सीक', 'tool.batch': 'बैच', 'tool.embed': 'एम्बेड', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': '{name} में खोजें…' },
  ur: { 'tool.settings': 'ترتیبات', 'tool.goal_seek': 'گول سیک', 'tool.batch': 'بیچ', 'tool.embed': 'ایمبیڈ', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': '{name} میں تلاش کریں…' },
  fr: { 'tool.settings': 'Paramètres', 'tool.goal_seek': 'Objectif', 'tool.batch': 'Lot', 'tool.embed': 'Intégrer', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': 'Rechercher dans {name}…' },
  de: { 'tool.settings': 'Einstellungen', 'tool.goal_seek': 'Zielwert', 'tool.batch': 'Stapel', 'tool.embed': 'Einbetten', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': 'In {name} suchen…' },
  pt: { 'tool.settings': 'Configurações', 'tool.goal_seek': 'Meta', 'tool.batch': 'Lote', 'tool.embed': 'Incorporar', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': 'Pesquisar em {name}…' },
  ar: { 'tool.settings': 'الإعدادات', 'tool.goal_seek': 'الهدف', 'tool.batch': 'دفعة', 'tool.embed': 'تضمين', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': 'ابحث في {name}…' },
  ru: { 'tool.settings': 'Настройки', 'tool.goal_seek': 'Подбор', 'tool.batch': 'Пакет', 'tool.embed': 'Встраивание', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': 'Поиск в {name}…' },
  ja: { 'tool.settings': '設定', 'tool.goal_seek': 'ゴールシーク', 'tool.batch': 'バッチ', 'tool.embed': '埋め込み', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': '{name}を検索…' },
  zh: { 'tool.settings': '设置', 'tool.goal_seek': '目标求解', 'tool.batch': '批量', 'tool.embed': '嵌入', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': '在{name}中搜索…' },
  ko: { 'tool.settings': '설정', 'tool.goal_seek': '목표값', 'tool.batch': '일괄', 'tool.embed': '삽입', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': '{name}에서 검색…' },
  it: { 'tool.settings': 'Impostazioni', 'tool.goal_seek': 'Obiettivo', 'tool.batch': 'Lotto', 'tool.embed': 'Incorpora', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': 'Cerca in {name}…' },
  nl: { 'tool.settings': 'Instellingen', 'tool.goal_seek': 'Doel zoeken', 'tool.batch': 'Batch', 'tool.embed': 'Insluiten', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': 'Zoeken in {name}…' },
  tr: { 'tool.settings': 'Ayarlar', 'tool.goal_seek': 'Hedef Ara', 'tool.batch': 'Toplu', 'tool.embed': 'Göm', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': '{name} içinde ara…' },
  id: { 'tool.settings': 'Pengaturan', 'tool.goal_seek': 'Cari Target', 'tool.batch': 'Batch', 'tool.embed': 'Sematkan', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': 'Cari di {name}…' },
  vi: { 'tool.settings': 'Cài đặt', 'tool.goal_seek': 'Tìm mục tiêu', 'tool.batch': 'Hàng loạt', 'tool.embed': 'Nhúng', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': 'Tìm trong {name}…' },
  th: { 'tool.settings': 'การตั้งค่า', 'tool.goal_seek': 'หาเป้าหมาย', 'tool.batch': 'ชุด', 'tool.embed': 'ฝัง', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': 'ค้นหาใน{name}…' },
  bn: { 'tool.settings': 'সেটিংস', 'tool.goal_seek': 'গোল সিক', 'tool.batch': 'ব্যাচ', 'tool.embed': 'এম্বেড', 'tool.csv': 'CSV', 'tool.pdf': 'PDF', 'cat.search_in': '{name}-এ খুঁজুন…' }
};

let inserted = 0;
for (const [locale, keys] of Object.entries(KEYS)) {
  const re = new RegExp('(^    ' + locale + ': \\{[\\s\\S]*?)(^      \'cat\\.utilities\': \'[^\']*\',)', 'm');
  const m = src.match(re);
  if (!m) { console.log('SKIP (no cat.utilities in ' + locale + ')'); continue; }
  if (src.slice(m.index, m.index + 4000).indexOf("'tool.settings'") !== -1) {
    console.log('ALREADY (skip ' + locale + ')'); continue;
  }
  const insert = '\n' + Object.entries(keys)
    .map(([k, v]) => `      '${k}': '${v}',`)
    .join('\n') + '\n';
  src = src.slice(0, m.index + m[0].length) + insert + src.slice(m.index + m[0].length);
  inserted++;
}

fs.writeFileSync(FILE, src);
console.log('Inserted into ' + inserted + ' locales. Total keys added: ' + inserted * 7);
