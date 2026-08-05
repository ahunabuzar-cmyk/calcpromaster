// fix-i18n-full.cjs — Add 9 missing category translation keys + nav.home + cat.count
// to ALL 19 locale blocks in js/i18n.js. Inserts after each locale's 'cat.utilities' line.
// Run: node fix-i18n-full.cjs
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'js', 'i18n.js');
let src = fs.readFileSync(FILE, 'utf8');

// [locale][key] -> translation
const CATS = {
  en: {
    'cat.lifestyle': 'Lifestyle & Home',
    'cat.regional': 'Regional (India/PK/UAE)',
    'cat.food': 'Food & Nutrition',
    'cat.fitness': 'Fitness & Exercise',
    'cat.auto': 'Auto & Transport',
    'cat.career': 'Career & Freelance',
    'cat.homegarden': 'Home & Garden',
    'cat.tech': 'Tech & Digital',
    'cat.family': 'Parenting & Family',
    'nav.home': 'Home',
    'cat.count': '{count} calculators'
  },
  es: {
    'cat.lifestyle': 'Estilo de vida y hogar',
    'cat.regional': 'Regional (India/PK/EAU)',
    'cat.food': 'Alimentos y nutrición',
    'cat.fitness': 'Fitness y ejercicio',
    'cat.auto': 'Auto y transporte',
    'cat.career': 'Carrera y freelance',
    'cat.homegarden': 'Hogar y jardín',
    'cat.tech': 'Tecnología y digital',
    'cat.family': 'Paternidad y familia',
    'nav.home': 'Inicio',
    'cat.count': '{count} calculadoras'
  },
  hi: {
    'cat.lifestyle': 'जीवनशैली और घर',
    'cat.regional': 'क्षेत्रीय (भारत/पाक/यूएई)',
    'cat.food': 'भोजन और पोषण',
    'cat.fitness': 'फिटनेस और व्यायाम',
    'cat.auto': 'ऑटो और परिवहन',
    'cat.career': 'करियर और फ्रीलांस',
    'cat.homegarden': 'घर और बगीचा',
    'cat.tech': 'तकनीक और डिजिटल',
    'cat.family': 'पेरेंटिंग और परिवार',
    'nav.home': 'होम',
    'cat.count': '{count} कैलकुलेटर'
  },
  ur: {
    'cat.lifestyle': 'طرز زندگی اور گھر',
    'cat.regional': 'علاقائی (بھارت/پاک/یو اے ای)',
    'cat.food': 'خوراک اور غذائیت',
    'cat.fitness': 'فٹنس اور ورزش',
    'cat.auto': 'آٹو اور ٹرانسپورٹ',
    'cat.career': 'کیریئر اور فری لانس',
    'cat.homegarden': 'گھر اور باغ',
    'cat.tech': 'ٹیک اور ڈیجیٹل',
    'cat.family': 'والدین اور خاندان',
    'nav.home': 'ہوم',
    'cat.count': '{count} کیلکولیٹر'
  },
  fr: {
    'cat.lifestyle': 'Style de vie et maison',
    'cat.regional': 'Régional (Inde/PK/UAE)',
    'cat.food': 'Alimentation et nutrition',
    'cat.fitness': 'Fitness et exercice',
    'cat.auto': 'Auto et transport',
    'cat.career': 'Carrière et freelance',
    'cat.homegarden': 'Maison et jardin',
    'cat.tech': 'Tech et numérique',
    'cat.family': 'Parentalité et famille',
    'nav.home': 'Accueil',
    'cat.count': '{count} calculatrices'
  },
  de: {
    'cat.lifestyle': 'Lifestyle & Zuhause',
    'cat.regional': 'Regional (Indien/PK/UAE)',
    'cat.food': 'Ernährung',
    'cat.fitness': 'Fitness & Bewegung',
    'cat.auto': 'Auto & Transport',
    'cat.career': 'Karriere & Freelance',
    'cat.homegarden': 'Haus & Garten',
    'cat.tech': 'Technik & Digital',
    'cat.family': 'Elternschaft & Familie',
    'nav.home': 'Startseite',
    'cat.count': '{count} Rechner'
  },
  pt: {
    'cat.lifestyle': 'Estilo de vida e lar',
    'cat.regional': 'Regional (Índia/PK/EAU)',
    'cat.food': 'Alimentação e nutrição',
    'cat.fitness': 'Fitness e exercício',
    'cat.auto': 'Automóvel e transporte',
    'cat.career': 'Carreira e freelance',
    'cat.homegarden': 'Casa e jardim',
    'cat.tech': 'Tecnologia e digital',
    'cat.family': 'Paternidade e família',
    'nav.home': 'Início',
    'cat.count': '{count} calculadoras'
  },
  ar: {
    'cat.lifestyle': 'نمط الحياة والمنزل',
    'cat.regional': 'إقليمي (الهند/باكستان/الإمارات)',
    'cat.food': 'الطعام والتغذية',
    'cat.fitness': 'اللياقة والتمارين',
    'cat.auto': 'السيارات والنقل',
    'cat.career': 'المهنة والعمل الحر',
    'cat.homegarden': 'المنزل والحديقة',
    'cat.tech': 'التقنية والرقمية',
    'cat.family': 'الأبوة والأسرة',
    'nav.home': 'الرئيسية',
    'cat.count': '{count} حاسبات'
  },
  ru: {
    'cat.lifestyle': 'Образ жизни и дом',
    'cat.regional': 'Региональные (Индия/Пакистан/ОАЭ)',
    'cat.food': 'Еда и питание',
    'cat.fitness': 'Фитнес и упражнения',
    'cat.auto': 'Авто и транспорт',
    'cat.career': 'Карьера и фриланс',
    'cat.homegarden': 'Дом и сад',
    'cat.tech': 'Технологии и цифровые',
    'cat.family': 'Родительство и семья',
    'nav.home': 'Главная',
    'cat.count': '{count} калькуляторов'
  },
  ja: {
    'cat.lifestyle': 'ライフスタイルとホーム',
    'cat.regional': '地域別（インド/パキスタン/UAE）',
    'cat.food': '食品と栄養',
    'cat.fitness': 'フィットネスと運動',
    'cat.auto': '自動車と交通',
    'cat.career': 'キャリアとフリーランス',
    'cat.homegarden': '家庭と庭',
    'cat.tech': 'テクノロジーとデジタル',
    'cat.family': '子育てと家族',
    'nav.home': 'ホーム',
    'cat.count': '{count}個の計算機'
  },
  zh: {
    'cat.lifestyle': '生活方式与家居',
    'cat.regional': '地区（印度/巴基斯坦/阿联酋）',
    'cat.food': '食品与营养',
    'cat.fitness': '健身与运动',
    'cat.auto': '汽车与交通',
    'cat.career': '职业与自由职业',
    'cat.homegarden': '家居与花园',
    'cat.tech': '科技与数字',
    'cat.family': '育儿与家庭',
    'nav.home': '首页',
    'cat.count': '{count} 个计算器'
  },
  ko: {
    'cat.lifestyle': '라이프스타일 & 홈',
    'cat.regional': '지역별 (인도/파키스탄/UAE)',
    'cat.food': '음식 및 영양',
    'cat.fitness': '피트니스 및 운동',
    'cat.auto': '자동차 및 교통',
    'cat.career': '커리어 및 프리랜스',
    'cat.homegarden': '홈 & 가든',
    'cat.tech': '테크 & 디지털',
    'cat.family': '육아 및 가족',
    'nav.home': '홈',
    'cat.count': '{count}개 계산기'
  },
  it: {
    'cat.lifestyle': 'Stile di vita e casa',
    'cat.regional': 'Regionale (India/PK/EAU)',
    'cat.food': 'Cibo e nutrizione',
    'cat.fitness': 'Fitness ed esercizio',
    'cat.auto': 'Auto e trasporti',
    'cat.career': 'Carriera e freelance',
    'cat.homegarden': 'Casa e giardino',
    'cat.tech': 'Tech e digitale',
    'cat.family': 'Genitorialità e famiglia',
    'nav.home': 'Home',
    'cat.count': '{count} calcolatrici'
  },
  nl: {
    'cat.lifestyle': 'Lifestyle & thuis',
    'cat.regional': 'Regionaal (India/PK/UAE)',
    'cat.food': 'Voeding',
    'cat.fitness': 'Fitness & beweging',
    'cat.auto': 'Auto & vervoer',
    'cat.career': 'Carrière & freelance',
    'cat.homegarden': 'Huis & tuin',
    'cat.tech': 'Tech & digitaal',
    'cat.family': 'Ouderschap & gezin',
    'nav.home': 'Home',
    'cat.count': '{count} rekenmachines'
  },
  tr: {
    'cat.lifestyle': 'Yaşam Tarzı ve Ev',
    'cat.regional': 'Bölgesel (Hindistan/PK/BAE)',
    'cat.food': 'Yiyecek ve Beslenme',
    'cat.fitness': 'Fitness ve Egzersiz',
    'cat.auto': 'Araç ve Ulaşım',
    'cat.career': 'Kariyer ve Serbest Çalışma',
    'cat.homegarden': 'Ev ve Bahçe',
    'cat.tech': 'Teknoloji ve Dijital',
    'cat.family': 'Ebeveynlik ve Aile',
    'nav.home': 'Ana Sayfa',
    'cat.count': '{count} hesap makinesi'
  },
  id: {
    'cat.lifestyle': 'Gaya Hidup & Rumah',
    'cat.regional': 'Regional (India/PK/UAE)',
    'cat.food': 'Makanan & Nutrisi',
    'cat.fitness': 'Kebugaran & Olahraga',
    'cat.auto': 'Mobil & Transportasi',
    'cat.career': 'Karier & Freelance',
    'cat.homegarden': 'Rumah & Taman',
    'cat.tech': 'Teknologi & Digital',
    'cat.family': 'Pengasuhan & Keluarga',
    'nav.home': 'Beranda',
    'cat.count': '{count} kalkulator'
  },
  vi: {
    'cat.lifestyle': 'Lối sống & Nhà cửa',
    'cat.regional': 'Khu vực (Ấn Độ/PK/UAE)',
    'cat.food': 'Thực phẩm & Dinh dưỡng',
    'cat.fitness': 'Thể dục & Tập luyện',
    'cat.auto': 'Ô tô & Giao thông',
    'cat.career': 'Sự nghiệp & Tự do',
    'cat.homegarden': 'Nhà & Vườn',
    'cat.tech': 'Công nghệ & Kỹ thuật số',
    'cat.family': 'Nuôi dạy con & Gia đình',
    'nav.home': 'Trang chủ',
    'cat.count': '{count} máy tính'
  },
  th: {
    'cat.lifestyle': 'ไลฟ์สไตล์และบ้าน',
    'cat.regional': 'ภูมิภาค (อินเดีย/ปากีสถาน/UAE)',
    'cat.food': 'อาหารและโภชนาการ',
    'cat.fitness': 'ฟิตเนสและการออกกำลังกาย',
    'cat.auto': 'รถยนต์และการขนส่ง',
    'cat.career': 'อาชีพและฟรีแลนซ์',
    'cat.homegarden': 'บ้านและสวน',
    'cat.tech': 'เทคและดิจิทัล',
    'cat.family': 'การเลี้ยงดูและครอบครัว',
    'nav.home': 'หน้าแรก',
    'cat.count': '{count} เครื่องคิดเลข'
  },
  bn: {
    'cat.lifestyle': 'লাইফস্টাইল ও বাড়ি',
    'cat.regional': 'আঞ্চলিক (ভারত/পাকিস্তান/ইউএই)',
    'cat.food': 'খাদ্য ও পুষ্টি',
    'cat.fitness': 'ফিটনেস ও ব্যায়াম',
    'cat.auto': 'গাড়ি ও পরিবহন',
    'cat.career': 'ক্যারিয়ার ও ফ্রিল্যান্স',
    'cat.homegarden': 'বাড়ি ও বাগান',
    'cat.tech': 'টেক ও ডিজিটাল',
    'cat.family': 'প্যারেন্টিং ও পরিবার',
    'nav.home': 'হোম',
    'cat.count': '{count} ক্যালকুলেটর'
  }
};

let inserted = 0;
for (const [locale, keys] of Object.entries(CATS)) {
  // Find the locale block's 'cat.utilities' line and insert after it
  const re = new RegExp('(^    ' + locale + ': \\{[\\s\\S]*?)(^      \'cat\\.utilities\': \'[^\']*\',)', 'm');
  const m = src.match(re);
  if (!m) {
    console.log('SKIP (no cat.utilities in ' + locale + ')');
    continue;
  }
  // Guard against double-insert
  if (src.slice(m.index, m.index + 4000).indexOf("'cat.lifestyle'") !== -1) {
    console.log('ALREADY (skip ' + locale + ')');
    continue;
  }
  const insert = '\n' + Object.entries(keys)
    .map(([k, v]) => `      '${k}': '${v}',`)
    .join('\n') + '\n';
  // Insert AFTER the full match (m[0] = locale header + cat.utilities line).
  // Using m[2].length here is WRONG — it points into the middle of the block.
  src = src.slice(0, m.index + m[0].length) + insert + src.slice(m.index + m[0].length);
  inserted++;
}

fs.writeFileSync(FILE, src);
console.log('Inserted into ' + inserted + ' locales. Total keys added: ' + inserted * 11);
