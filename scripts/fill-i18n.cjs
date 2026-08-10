// Fill all missing i18n keys for every language (18 languages, 18-19 keys each).
// Inserts only keys that are missing per language (idempotent).
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'js', 'i18n.js');
let src = fs.readFileSync(file, 'utf8');

// ---------- Translations for the 19 recently-added keys ----------
const T = {
  es: {
    'tool.pin': 'Fijar', 'tool.chain': 'Cadena', 'tool.scenario': 'Escenario', 'tool.voice': 'Voz',
    'tool.qr': 'Código QR', 'tool.compare': 'Comparar', 'tool.load_preset': 'Cargar preajuste',
    'tool.save_preset': 'Guardar preajuste', 'tool.solve_for': 'Resolver para',
    'adv.chain_bar': 'Resultados recientes', 'adv.scenario_bar': 'Escenarios', 'adv.pin_bar': 'Fijados',
    'adv.compare_btn': 'Comparar', 'adv.clear_btn': 'Borrar', 'adv.qr_title': 'Compartir por QR',
    'adv.achievements_locked': 'Bloqueado', 'adv.achievements_unlocked': 'Desbloqueado',
    'adv.daily_tip': 'Consejo del día', 'home.logo': 'CalcProMaster'
  },
  hi: {
    'tool.pin': 'पिन करें', 'tool.chain': 'श्रृंखला', 'tool.scenario': 'परिदृश्य', 'tool.voice': 'आवाज़',
    'tool.qr': 'क्यूआर कोड', 'tool.compare': 'तुलना करें', 'tool.load_preset': 'प्रीसेट लोड करें',
    'tool.save_preset': 'प्रीसेट सहेजें', 'tool.solve_for': 'इसके लिए हल करें',
    'adv.chain_bar': 'हाल के परिणाम', 'adv.scenario_bar': 'परिदृश्य', 'adv.pin_bar': 'पिन किए गए',
    'adv.compare_btn': 'तुलना', 'adv.clear_btn': 'साफ़ करें', 'adv.qr_title': 'क्यूआर से साझा करें',
    'adv.achievements_locked': 'लॉक', 'adv.achievements_unlocked': 'अनलॉक', 'adv.daily_tip': 'दैनिक सुझाव',
    'home.logo': 'CalcProMaster'
  },
  ur: {
    'tool.pin': 'پن کریں', 'tool.chain': 'سلسلہ', 'tool.scenario': 'منظر', 'tool.voice': 'آواز',
    'tool.qr': 'کیو آر کوڈ', 'tool.compare': 'موازنہ کریں', 'tool.load_preset': 'پری سیٹ لوڈ کریں',
    'tool.save_preset': 'پری سیٹ محفوظ کریں', 'tool.solve_for': 'حل کریں',
    'adv.chain_bar': 'حالیہ نتائج', 'adv.scenario_bar': 'مناظر', 'adv.pin_bar': 'پن شدہ',
    'adv.compare_btn': 'موازنہ', 'adv.clear_btn': 'صاف کریں', 'adv.qr_title': 'کیو آر سے شیئر کریں',
    'adv.achievements_locked': 'مقفل', 'adv.achievements_unlocked': 'غیر مقفل',
    'adv.daily_tip': 'روزانہ تجویز', 'home.logo': 'CalcProMaster'
  },
  fr: {
    'tool.pin': 'Épingler', 'tool.chain': 'Enchaîner', 'tool.scenario': 'Scénario', 'tool.voice': 'Voix',
    'tool.qr': 'Code QR', 'tool.compare': 'Comparer', 'tool.load_preset': 'Charger le préréglage',
    'tool.save_preset': 'Enregistrer le préréglage', 'tool.solve_for': 'Résoudre pour',
    'adv.chain_bar': 'Résultats récents', 'adv.scenario_bar': 'Scénarios', 'adv.pin_bar': 'Épinglés',
    'adv.compare_btn': 'Comparer', 'adv.clear_btn': 'Effacer', 'adv.qr_title': 'Partager via QR',
    'adv.achievements_locked': 'Verrouillé', 'adv.achievements_unlocked': 'Déverrouillé',
    'adv.daily_tip': 'Astuce du jour', 'home.logo': 'CalcProMaster'
  },
  de: {
    'tool.pin': 'Anheften', 'tool.chain': 'Verkettung', 'tool.scenario': 'Szenario', 'tool.voice': 'Sprache',
    'tool.qr': 'QR-Code', 'tool.compare': 'Vergleichen', 'tool.load_preset': 'Voreinstellung laden',
    'tool.save_preset': 'Voreinstellung speichern', 'tool.solve_for': 'Berechnen für',
    'adv.chain_bar': 'Letzte Ergebnisse', 'adv.scenario_bar': 'Szenarien', 'adv.pin_bar': 'Angeheftet',
    'adv.compare_btn': 'Vergleichen', 'adv.clear_btn': 'Löschen', 'adv.qr_title': 'Per QR teilen',
    'adv.achievements_locked': 'Gesperrt', 'adv.achievements_unlocked': 'Freigeschaltet',
    'adv.daily_tip': 'Täglicher Tipp', 'home.logo': 'CalcProMaster'
  },
  pt: {
    'tool.pin': 'Fixar', 'tool.chain': 'Encadear', 'tool.scenario': 'Cenário', 'tool.voice': 'Voz',
    'tool.qr': 'Código QR', 'tool.compare': 'Comparar', 'tool.load_preset': 'Carregar predefinição',
    'tool.save_preset': 'Salvar predefinição', 'tool.solve_for': 'Resolver para',
    'adv.chain_bar': 'Resultados recentes', 'adv.scenario_bar': 'Cenários', 'adv.pin_bar': 'Fixados',
    'adv.compare_btn': 'Comparar', 'adv.clear_btn': 'Limpar', 'adv.qr_title': 'Compartilhar via QR',
    'adv.achievements_locked': 'Bloqueado', 'adv.achievements_unlocked': 'Desbloqueado',
    'adv.daily_tip': 'Dica do dia', 'home.logo': 'CalcProMaster'
  },
  ar: {
    'tool.pin': 'تثبيت', 'tool.chain': 'سلسلة', 'tool.scenario': 'سيناريو', 'tool.voice': 'صوت',
    'tool.qr': 'رمز QR', 'tool.compare': 'قارن', 'tool.load_preset': 'تحميل الإعداد',
    'tool.save_preset': 'حفظ الإعداد', 'tool.solve_for': 'حل لـ',
    'adv.chain_bar': 'النتائج الأخيرة', 'adv.scenario_bar': 'سيناريوهات', 'adv.pin_bar': 'مثبت',
    'adv.compare_btn': 'قارن', 'adv.clear_btn': 'مسح', 'adv.qr_title': 'مشاركة عبر QR',
    'adv.achievements_locked': 'مقفل', 'adv.achievements_unlocked': 'مفتوح',
    'adv.daily_tip': 'نصيحة اليوم', 'home.logo': 'CalcProMaster'
  },
  ru: {
    'tool.pin': 'Закрепить', 'tool.chain': 'Цепочка', 'tool.scenario': 'Сценарий', 'tool.voice': 'Голос',
    'tool.qr': 'QR-код', 'tool.compare': 'Сравнить', 'tool.load_preset': 'Загрузить пресет',
    'tool.save_preset': 'Сохранить пресет', 'tool.solve_for': 'Решить для',
    'adv.chain_bar': 'Последние результаты', 'adv.scenario_bar': 'Сценарии', 'adv.pin_bar': 'Закреплено',
    'adv.compare_btn': 'Сравнить', 'adv.clear_btn': 'Очистить', 'adv.qr_title': 'Поделиться через QR',
    'adv.achievements_locked': 'Заблокировано', 'adv.achievements_unlocked': 'Открыто',
    'adv.daily_tip': 'Совет дня', 'home.logo': 'CalcProMaster'
  },
  ja: {
    'tool.pin': 'ピン留め', 'tool.chain': 'チェーン', 'tool.scenario': 'シナリオ', 'tool.voice': '音声',
    'tool.qr': 'QRコード', 'tool.compare': '比較', 'tool.load_preset': 'プリセットを読み込む',
    'tool.save_preset': 'プリセットを保存', 'tool.solve_for': '解く値',
    'adv.chain_bar': '最近の結果', 'adv.scenario_bar': 'シナリオ', 'adv.pin_bar': 'ピン留め済み',
    'adv.compare_btn': '比較', 'adv.clear_btn': 'クリア', 'adv.qr_title': 'QRで共有',
    'adv.achievements_locked': 'ロック中', 'adv.achievements_unlocked': '達成済み',
    'adv.daily_tip': '今日のヒント', 'home.logo': 'CalcProMaster'
  },
  zh: {
    'tool.pin': '固定', 'tool.chain': '链式', 'tool.scenario': '场景', 'tool.voice': '语音',
    'tool.qr': '二维码', 'tool.compare': '比较', 'tool.load_preset': '加载预设',
    'tool.save_preset': '保存预设', 'tool.solve_for': '求解',
    'adv.chain_bar': '最近结果', 'adv.scenario_bar': '场景', 'adv.pin_bar': '已固定',
    'adv.compare_btn': '比较', 'adv.clear_btn': '清除', 'adv.qr_title': '通过二维码分享',
    'adv.achievements_locked': '未解锁', 'adv.achievements_unlocked': '已解锁',
    'adv.daily_tip': '每日提示', 'home.logo': 'CalcProMaster'
  },
  ko: {
    'tool.pin': '고정', 'tool.chain': '체인', 'tool.scenario': '시나리오', 'tool.voice': '음성',
    'tool.qr': 'QR 코드', 'tool.compare': '비교', 'tool.load_preset': '프리셋 불러오기',
    'tool.save_preset': '프리셋 저장', 'tool.solve_for': '풀기 대상',
    'adv.chain_bar': '최근 결과', 'adv.scenario_bar': '시나리오', 'adv.pin_bar': '고정됨',
    'adv.compare_btn': '비교', 'adv.clear_btn': '지우기', 'adv.qr_title': 'QR로 공유',
    'adv.achievements_locked': '잠김', 'adv.achievements_unlocked': '해제됨',
    'adv.daily_tip': '오늘의 팁', 'home.logo': 'CalcProMaster'
  },
  it: {
    'tool.pin': 'Fissa', 'tool.chain': 'Catena', 'tool.scenario': 'Scenario', 'tool.voice': 'Voce',
    'tool.qr': 'Codice QR', 'tool.compare': 'Confronta', 'tool.load_preset': 'Carica preimpostazione',
    'tool.save_preset': 'Salva preimpostazione', 'tool.solve_for': 'Risolvi per',
    'adv.chain_bar': 'Risultati recenti', 'adv.scenario_bar': 'Scenari', 'adv.pin_bar': 'Fissati',
    'adv.compare_btn': 'Confronta', 'adv.clear_btn': 'Cancella', 'adv.qr_title': 'Condividi via QR',
    'adv.achievements_locked': 'Bloccato', 'adv.achievements_unlocked': 'Sbloccato',
    'adv.daily_tip': 'Consiglio del giorno', 'home.logo': 'CalcProMaster'
  },
  nl: {
    'tool.pin': 'Vastpinnen', 'tool.chain': 'Keten', 'tool.scenario': 'Scenario', 'tool.voice': 'Stem',
    'tool.qr': 'QR-code', 'tool.compare': 'Vergelijken', 'tool.load_preset': 'Voorinstelling laden',
    'tool.save_preset': 'Voorinstelling opslaan', 'tool.solve_for': 'Oplossen voor',
    'adv.chain_bar': 'Recente resultaten', 'adv.scenario_bar': "Scenario's", 'adv.pin_bar': 'Vastgezet',
    'adv.compare_btn': 'Vergelijken', 'adv.clear_btn': 'Wissen', 'adv.qr_title': 'Delen via QR',
    'adv.achievements_locked': 'Vergrendeld', 'adv.achievements_unlocked': 'Ontgrendeld',
    'adv.daily_tip': 'Dagelijkse tip', 'home.logo': 'CalcProMaster'
  },
  tr: {
    'tool.pin': 'Sabitle', 'tool.chain': 'Zincir', 'tool.scenario': 'Senaryo', 'tool.voice': 'Ses',
    'tool.qr': 'QR Kod', 'tool.compare': 'Karşılaştır', 'tool.load_preset': 'Ön ayarı yükle',
    'tool.save_preset': 'Ön ayarı kaydet', 'tool.solve_for': 'Çöz',
    'adv.chain_bar': 'Son sonuçlar', 'adv.scenario_bar': 'Senaryolar', 'adv.pin_bar': 'Sabitlendi',
    'adv.compare_btn': 'Karşılaştır', 'adv.clear_btn': 'Temizle', 'adv.qr_title': 'QR ile paylaş',
    'adv.achievements_locked': 'Kilitli', 'adv.achievements_unlocked': 'Açıldı',
    'adv.daily_tip': 'Günün ipucu', 'home.logo': 'CalcProMaster'
  },
  id: {
    'tool.pin': 'Sematkan', 'tool.chain': 'Rantai', 'tool.scenario': 'Skenario', 'tool.voice': 'Suara',
    'tool.qr': 'Kode QR', 'tool.compare': 'Bandingkan', 'tool.load_preset': 'Muat preset',
    'tool.save_preset': 'Simpan preset', 'tool.solve_for': 'Hitung untuk',
    'adv.chain_bar': 'Hasil terbaru', 'adv.scenario_bar': 'Skenario', 'adv.pin_bar': 'Disematkan',
    'adv.compare_btn': 'Bandingkan', 'adv.clear_btn': 'Bersihkan', 'adv.qr_title': 'Bagikan via QR',
    'adv.achievements_locked': 'Terkunci', 'adv.achievements_unlocked': 'Terbuka',
    'adv.daily_tip': 'Tips harian', 'home.logo': 'CalcProMaster'
  },
  vi: {
    'tool.pin': 'Ghim', 'tool.chain': 'Chuỗi', 'tool.scenario': 'Kịch bản', 'tool.voice': 'Giọng nói',
    'tool.qr': 'Mã QR', 'tool.compare': 'So sánh', 'tool.load_preset': 'Tải cấu hình',
    'tool.save_preset': 'Lưu cấu hình', 'tool.solve_for': 'Giải cho',
    'adv.chain_bar': 'Kết quả gần đây', 'adv.scenario_bar': 'Kịch bản', 'adv.pin_bar': 'Đã ghim',
    'adv.compare_btn': 'So sánh', 'adv.clear_btn': 'Xóa', 'adv.qr_title': 'Chia sẻ qua QR',
    'adv.achievements_locked': 'Đã khóa', 'adv.achievements_unlocked': 'Đã mở',
    'adv.daily_tip': 'Mẹo hàng ngày', 'home.logo': 'CalcProMaster'
  },
  th: {
    'tool.pin': 'ปักหมุด', 'tool.chain': 'ลูกโซ่', 'tool.scenario': 'สถานการณ์', 'tool.voice': 'เสียง',
    'tool.qr': 'คิวอาร์โค้ด', 'tool.compare': 'เปรียบเทียบ', 'tool.load_preset': 'โหลดค่าที่ตั้งไว้',
    'tool.save_preset': 'บันทึกค่าที่ตั้งไว้', 'tool.solve_for': 'แก้หาค่า',
    'adv.chain_bar': 'ผลลัพธ์ล่าสุด', 'adv.scenario_bar': 'สถานการณ์', 'adv.pin_bar': 'ปักหมุดแล้ว',
    'adv.compare_btn': 'เปรียบเทียบ', 'adv.clear_btn': 'ล้าง', 'adv.qr_title': 'แชร์ผ่าน QR',
    'adv.achievements_locked': 'ล็อก', 'adv.achievements_unlocked': 'ปลดล็อก',
    'adv.daily_tip': 'เคล็ดลับประจำวัน', 'home.logo': 'CalcProMaster'
  },
  bn: {
    'tool.pin': 'পিন করুন', 'tool.chain': 'চেইন', 'tool.scenario': 'দৃশ্যকল্প', 'tool.voice': 'কণ্ঠস্বর',
    'tool.qr': 'কিউআর কোড', 'tool.compare': 'তুলনা করুন', 'tool.load_preset': 'প্রিসেট লোড করুন',
    'tool.save_preset': 'প্রিসেট সংরক্ষণ করুন', 'tool.solve_for': 'সমাধান করুন',
    'adv.chain_bar': 'সাম্প্রতিক ফলাফল', 'adv.scenario_bar': 'দৃশ্যকল্প', 'adv.pin_bar': 'পিন করা',
    'adv.compare_btn': 'তুলনা', 'adv.clear_btn': 'মুছুন', 'adv.qr_title': 'কিউআর দিয়ে শেয়ার',
    'adv.achievements_locked': 'লক', 'adv.achievements_unlocked': 'আনলক',
    'adv.daily_tip': 'দৈনিক টিপ', 'home.logo': 'CalcProMaster'
  }
};

// ---------- Locate each language block and insert missing keys ----------
function findLangBlock(src, lang) {
  const re = new RegExp('\\n    ' + lang + ': \\{');
  const m = re.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length - 1; // position of '{'
  let depth = 0, i = start;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  return { open: start, close: i };
}

// Parse current keys per language to only insert missing ones
const parseStart = src.indexOf('const TRANSLATIONS = ');
const brace = src.indexOf('{', parseStart);
let depth = 0, parseEnd = -1;
for (let i = brace; i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { parseEnd = i + 1; break; } }
}
const TRANSLATIONS = eval('(' + src.slice(brace, parseEnd) + ')');

const langs = Object.keys(T);
let inserted = 0;
let out = src;
for (const lang of langs) {
  const block = findLangBlock(out, lang);
  if (!block) { console.log('WARN: block not found for ' + lang); continue; }
  const existing = TRANSLATIONS[lang] || {};
  const missing = Object.keys(T[lang]).filter(k => !(k in existing));
  if (missing.length === 0) { console.log(lang + ': already complete'); continue; }
  const insertLines = missing.map(k => "      '" + k + "': " + JSON.stringify(T[lang][k]) + ",").join('\n');
  out = out.slice(0, block.close) + '\n' + insertLines + '\n    ' + out.slice(block.close);
  inserted += missing.length;
  console.log(lang + ': +' + missing.length + ' keys');
}

fs.writeFileSync(file, out);
console.log('\nTotal inserted: ' + inserted);
