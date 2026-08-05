// Currency module - live rates with 1hr caching + fallback
// NOTE: index.html loads js/core.js which contains a MIRROR of this module
// (the browser uses the core.js copy). Keep BOTH in sync when adding currencies.
const Currency = (function () {
  // NOTE: Removed the previously-hardcoded `API_KEY` constant — it was DEAD CODE:
  // never used anywhere (the module relies on keyless public APIs open.er-api.com
  // and api.frankfurter.app, with static fallback rates), and shipping a key literal
  // in client JS is a security-scan red flag. core.js holds a mirror of this module
  // and it never had the key either — both stay keyless.
  const CACHE_KEY = 'calcpro_currency_cache';
  const CACHE_TTL = 3600000; // 1 hour

  const FALLBACK_RATES = {
    USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5, CNY: 7.24, INR: 83.2, PKR: 278.5,
    CAD: 1.36, AUD: 1.52, CHF: 0.88, SGD: 1.34, HKD: 7.82, NZD: 1.64, SEK: 10.6,
    NOK: 10.7, DKK: 6.9, KRW: 1330, MXN: 17.1, BRL: 4.97, RUB: 92.5, ZAR: 18.8,
    TRY: 32.1, AED: 3.67, SAR: 3.75, THB: 35.8, IDR: 15700, MYR: 4.67, PHP: 56.2,
    VND: 24500, PLN: 4.0, CZK: 23.2, HUF: 360, ILS: 3.7, EGP: 48.9, NGN: 1560,
    KES: 149, MAD: 9.9, QAR: 3.64, KWD: 0.31, BHD: 0.376, OMR: 0.385, JOD: 0.709,
    LKR: 325, BDT: 110, NPR: 133, AFN: 71, IRR: 42000, IQD: 1310, LBP: 89500,
    SYP: 13000, YER: 530, PAB: 1, GTQ: 7.8, HNL: 24.6, NIO: 36.7, CRC: 530,
    PAB: 1, DOP: 58.5, CUP: 240, JMD: 155, TTD: 6.8, BBD: 2, BSD: 1, BZD: 2,
    XCD: 2.7, AWG: 1.8, ANG: 1.8, SRD: 38, GYD: 209, PYG: 7300, UYU: 39.5,
    ARS: 1020, CLP: 950, BOB: 6.9, PEN: 3.75, COP: 3900, VEF: 36, GHS: 15.2,
    XOF: 605, XAF: 605, XPF: 110, DJF: 178, KMF: 470, RWF: 1290, BIF: 2950,
    ETB: 56, SLL: 23000, LRD: 190, GNF: 8600, MZN: 64, AOQ: 850, SDG: 600,
    SOS: 570, ERN: 15, NAD: 18.8, BWP: 13.6, ZWL: 13.5, MUR: 46, MGA: 4700,
    SCR: 14.5, CVE: 110, STN: 24, ZMW: 26, MWK: 1700, TND: 3.1, DZD: 134,
    LYD: 4.85, TMT: 3.5, AMD: 390, AZN: 1.7, GEL: 2.7, UAH: 39.5, BYN: 3.2,
    MDL: 17.5, RON: 4.6, BGN: 1.8, ALL: 94.5, RSD: 108, MKD: 58, BAM: 1.8,
    HRK: 6.95, ISK: 138, FKP: 0.79, GIP: 0.79, SHP: 0.79, TJS: 11, KGS: 89,
    UZS: 12500, AFN: 71, MNT: 3400, LAK: 21000, KHR: 4100, MMK: 2100, BTN: 83.2,
    CDF: 2750, GMD: 66, SLL: 23000, TWD: 31.8, WST: 2.7, FJD: 2.2, TOP: 2.4,
    PGK: 3.7, SBD: 8.5, VUV: 120, XPF: 110, TMT: 3.5, ETB: 56, MZN: 64,
    BIF: 2950, KMF: 470, RWF: 1290, DJF: 178, GNF: 8600, SLL: 23000, LRD: 190,
    ZWL: 13.5, ANG: 1.8, AWG: 1.8, XCD: 2.7, XOF: 605, XAF: 605, XPF: 110,
    BTC: 0.0000166, ETH: 0.00034, XRP: 1.85, LTC: 0.012, DOGE: 12.5, ADA: 2.4,
    TZS: 2650, UGX: 3820, MOP: 8.06, SZL: 18.9, LSL: 18.9, HTG: 131.5, BMD: 1,
    KYD: 0.83, MVR: 15.4, BND: 1.34, XAU: 0.00043, XAG: 0.034,
  };

  const CURRENCY_INFO = {
    USD: { name: 'US Dollar', symbol: '$' }, EUR: { name: 'Euro', symbol: '€' },
    GBP: { name: 'British Pound', symbol: '£' }, JPY: { name: 'Japanese Yen', symbol: '¥' },
    CNY: { name: 'Chinese Yuan', symbol: '¥' }, INR: { name: 'Indian Rupee', symbol: '₹' },
    PKR: { name: 'Pakistani Rupee', symbol: '₨' }, CAD: { name: 'Canadian Dollar', symbol: 'C$' },
    AUD: { name: 'Australian Dollar', symbol: 'A$' }, CHF: { name: 'Swiss Franc', symbol: 'Fr' },
    SGD: { name: 'Singapore Dollar', symbol: 'S$' }, HKD: { name: 'Hong Kong Dollar', symbol: 'HK$' },
    NZD: { name: 'New Zealand Dollar', symbol: 'NZ$' }, SEK: { name: 'Swedish Krona', symbol: 'kr' },
    NOK: { name: 'Norwegian Krone', symbol: 'kr' }, DKK: { name: 'Danish Krone', symbol: 'kr' },
    KRW: { name: 'South Korean Won', symbol: '₩' }, MXN: { name: 'Mexican Peso', symbol: '$' },
    BRL: { name: 'Brazilian Real', symbol: 'R$' }, RUB: { name: 'Russian Ruble', symbol: '₽' },
    ZAR: { name: 'South African Rand', symbol: 'R' }, TRY: { name: 'Turkish Lira', symbol: '₺' },
    AED: { name: 'UAE Dirham', symbol: 'د.إ' }, SAR: { name: 'Saudi Riyal', symbol: '﷼' },
    THB: { name: 'Thai Baht', symbol: '฿' }, IDR: { name: 'Indonesian Rupiah', symbol: 'Rp' },
    MYR: { name: 'Malaysian Ringgit', symbol: 'RM' }, PHP: { name: 'Philippine Peso', symbol: '₱' },
    VND: { name: 'Vietnamese Dong', symbol: '₫' }, PLN: { name: 'Polish Zloty', symbol: 'zł' },
    CZK: { name: 'Czech Koruna', symbol: 'Kč' }, HUF: { name: 'Hungarian Forint', symbol: 'Ft' },
    ILS: { name: 'Israeli Shekel', symbol: '₪' }, EGP: { name: 'Egyptian Pound', symbol: '£' },
    NGN: { name: 'Nigerian Naira', symbol: '₦' }, KES: { name: 'Kenyan Shilling', symbol: 'KSh' },
    MAD: { name: 'Moroccan Dirham', symbol: 'د.م.' }, QAR: { name: 'Qatari Riyal', symbol: '﷼' },
    KWD: { name: 'Kuwaiti Dinar', symbol: 'د.ك' }, BHD: { name: 'Bahraini Dinar', symbol: 'د.ب' },
    OMR: { name: 'Omani Rial', symbol: '﷼' }, JOD: { name: 'Jordanian Dinar', symbol: 'د.ا' },
    LKR: { name: 'Sri Lankan Rupee', symbol: '₨' }, BDT: { name: 'Bangladeshi Taka', symbol: '৳' },
    NPR: { name: 'Nepalese Rupee', symbol: '₨' }, AFN: { name: 'Afghan Afghani', symbol: '؋' },
    IRR: { name: 'Iranian Rial', symbol: '﷼' }, IQD: { name: 'Iraqi Dinar', symbol: 'ع.د' },
    LBP: { name: 'Lebanese Pound', symbol: 'ل.ل' }, SYP: { name: 'Syrian Pound', symbol: '£' },
    YER: { name: 'Yemeni Rial', symbol: '﷼' }, PAB: { name: 'Panamanian Balboa', symbol: 'B/.' },
    GTQ: { name: 'Guatemalan Quetzal', symbol: 'Q' }, HNL: { name: 'Honduran Lempira', symbol: 'L' },
    NIO: { name: 'Nicaraguan Córdoba', symbol: 'C$' }, CRC: { name: 'Costa Rican Colón', symbol: '₡' },
    DOP: { name: 'Dominican Peso', symbol: 'RD$' }, CUP: { name: 'Cuban Peso', symbol: '₱' },
    JMD: { name: 'Jamaican Dollar', symbol: 'J$' }, TTD: { name: 'Trinidad Dollar', symbol: 'TT$' },
    BBD: { name: 'Barbadian Dollar', symbol: 'Bds$' }, BSD: { name: 'Bahamian Dollar', symbol: 'B$' },
    BZD: { name: 'Belize Dollar', symbol: 'BZ$' }, XCD: { name: 'East Caribbean Dollar', symbol: 'EC$' },
    AWG: { name: 'Aruban Florin', symbol: 'ƒ' }, ANG: { name: 'Netherlands Antillean Guilder', symbol: 'ƒ' },
    SRD: { name: 'Surinamese Dollar', symbol: 'Sr$' }, GYD: { name: 'Guyanese Dollar', symbol: 'G$' },
    PYG: { name: 'Paraguayan Guaraní', symbol: '₲' }, UYU: { name: 'Uruguayan Peso', symbol: '$U' },
    ARS: { name: 'Argentine Peso', symbol: '$' }, CLP: { name: 'Chilean Peso', symbol: '$' },
    BOB: { name: 'Bolivian Boliviano', symbol: 'Bs' }, PEN: { name: 'Peruvian Sol', symbol: 'S/' },
    COP: { name: 'Colombian Peso', symbol: '$' }, GHS: { name: 'Ghanaian Cedi', symbol: '₵' },
    XOF: { name: 'West African CFA Franc', symbol: 'CFA' }, XAF: { name: 'Central African CFA Franc', symbol: 'FCFA' },
    XPF: { name: 'CFP Franc', symbol: '₣' }, DJF: { name: 'Djiboutian Franc', symbol: 'Fdj' },
    KMF: { name: 'Comorian Franc', symbol: 'CF' }, RWF: { name: 'Rwandan Franc', symbol: 'FRw' },
    BIF: { name: 'Burundian Franc', symbol: 'FBu' }, ETB: { name: 'Ethiopian Birr', symbol: 'Br' },
    SLL: { name: 'Sierra Leonean Leone', symbol: 'Le' }, LRD: { name: 'Liberian Dollar', symbol: 'L$' },
    GNF: { name: 'Guinean Franc', symbol: 'FG' }, MZN: { name: 'Mozambican Metical', symbol: 'MT' },
    SDG: { name: 'Sudanese Pound', symbol: '£' }, SOS: { name: 'Somali Shilling', symbol: 'Sh' },
    ERN: { name: 'Eritrean Nakfa', symbol: 'Nfk' }, NAD: { name: 'Namibian Dollar', symbol: 'N$' },
    BWP: { name: 'Botswana Pula', symbol: 'P' }, ZWL: { name: 'Zimbabwean Dollar', symbol: 'Z$' },
    MUR: { name: 'Mauritian Rupee', symbol: '₨' }, MGA: { name: 'Malagasy Ariary', symbol: 'Ar' },
    SCR: { name: 'Seychellois Rupee', symbol: '₨' }, CVE: { name: 'Cape Verdean Escudo', symbol: '$' },
    STN: { name: 'São Tomé Dobra', symbol: 'Db' }, ZMW: { name: 'Zambian Kwacha', symbol: 'ZK' },
    MWK: { name: 'Malawian Kwacha', symbol: 'MK' }, TND: { name: 'Tunisian Dinar', symbol: 'د.ت' },
    DZD: { name: 'Algerian Dinar', symbol: 'د.ج' }, LYD: { name: 'Libyan Dinar', symbol: 'ل.د' },
    TMT: { name: 'Turkmenistani Manat', symbol: 'm' }, AMD: { name: 'Armenian Dram', symbol: '֏' },
    AZN: { name: 'Azerbaijani Manat', symbol: '₼' }, GEL: { name: 'Georgian Lari', symbol: '₾' },
    UAH: { name: 'Ukrainian Hryvnia', symbol: '₴' }, BYN: { name: 'Belarusian Ruble', symbol: 'Br' },
    MDL: { name: 'Moldovan Leu', symbol: 'L' }, RON: { name: 'Romanian Leu', symbol: 'lei' },
    BGN: { name: 'Bulgarian Lev', symbol: 'лв' }, ALL: { name: 'Albanian Lek', symbol: 'L' },
    RSD: { name: 'Serbian Dinar', symbol: 'дин' }, MKD: { name: 'Macedonian Denar', symbol: 'ден' },
    BAM: { name: 'Bosnian Mark', symbol: 'KM' }, HRK: { name: 'Croatian Kuna', symbol: 'kn' },
    ISK: { name: 'Icelandic Króna', symbol: 'kr' }, FKP: { name: 'Falkland Pound', symbol: '£' },
    GIP: { name: 'Gibraltar Pound', symbol: '£' }, SHP: { name: 'Saint Helena Pound', symbol: '£' },
    TJS: { name: 'Tajikistani Somoni', symbol: 'ЅМ' }, KGS: { name: 'Kyrgyzstani Som', symbol: 'с' },
    UZS: { name: 'Uzbekistani Som', symbol: 'сўм' }, MNT: { name: 'Mongolian Tugrik', symbol: '₮' },
    LAK: { name: 'Lao Kip', symbol: '₭' }, KHR: { name: 'Cambodian Riel', symbol: '៛' },
    MMK: { name: 'Burmese Kyat', symbol: 'K' }, BTN: { name: 'Bhutanese Ngultrum', symbol: 'Nu' },
    TWD: { name: 'Taiwan Dollar', symbol: 'NT$' }, WST: { name: 'Samoan Tala', symbol: 'WS$' },
    FJD: { name: 'Fijian Dollar', symbol: 'FJ$' }, TOP: { name: 'Tongan Paʻanga', symbol: 'T$' },
    PGK: { name: 'Papua New Guinean Kina', symbol: 'K' }, SBD: { name: 'Solomon Islands Dollar', symbol: 'SI$' },
    VUV: { name: 'Vanuatu Vatu', symbol: 'Vt' }, CDF: { name: 'Congolese Franc', symbol: 'FC' },
    GMD: { name: 'Gambian Dalasi', symbol: 'D' }, BTC: { name: 'Bitcoin', symbol: '₿' },
    ETH: { name: 'Ethereum', symbol: 'Ξ' }, XRP: { name: 'Ripple', symbol: 'X' },
    LTC: { name: 'Litecoin', symbol: 'Ł' }, DOGE: { name: 'Dogecoin', symbol: 'Ð' },
    ADA: { name: 'Cardano', symbol: '₳' }, TZS: { name: 'Tanzanian Shilling', symbol: 'TSh' },
    UGX: { name: 'Ugandan Shilling', symbol: 'USh' }, MOP: { name: 'Macanese Pataca', symbol: 'MOP$' },
    SZL: { name: 'Eswatini Lilangeni', symbol: 'E' }, LSL: { name: 'Lesotho Loti', symbol: 'L' },
    HTG: { name: 'Haitian Gourde', symbol: 'G' }, BMD: { name: 'Bermudian Dollar', symbol: 'BD$' },
    KYD: { name: 'Cayman Islands Dollar', symbol: 'CI$' }, MVR: { name: 'Maldivian Rufiyaa', symbol: 'Rf' },
    BND: { name: 'Brunei Dollar', symbol: 'B$' }, XAU: { name: 'Gold (Troy Ounce)', symbol: 'XAU' },
    XAG: { name: 'Silver (Troy Ounce)', symbol: 'XAG' },
  };

  // Async wrapper for the currency-converter tool: takes { amount, from, to } values
  // and returns the standard { result, extra } display object. (app.js calls Currency.convert)
  async function convert(values) {
    const amount = parseFloat(values && values.amount) || 0;
    const from = (values && values.from || 'USD').toUpperCase();
    const to = (values && values.to || 'EUR').toUpperCase();
    const converted = await convertCurrency(amount, from, to);
    const rate = amount !== 0 ? converted / amount : 0;
    return {
      result: formatAmount(converted, to) + ' (' + getCurrencyName(to) + ')',
      extra: '1 ' + from + ' = ' + formatAmount(rate, to) + ' • ' + getCurrencyName(from) + ' → ' + getCurrencyName(to)
    };
  }

  // Locale-aware money formatter (e.g. 1,234.56 → $1,234.56 / ₹1,234.56 / ¥1,234)
  function formatAmount(amount, code, locale) {
    try {
      const l = (locale && typeof locale === 'string') ? locale : ((typeof I18n !== 'undefined' && I18n.getLocale) ? I18n.getLocale() : 'en-US');
      return new Intl.NumberFormat(l, { style: 'currency', currency: code || 'USD', maximumFractionDigits: 2 }).format(Number(amount) || 0);
    } catch (e) {
      const sym = getCurrencySymbol(code || 'USD');
      return sym + ' ' + (Number(amount) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
  }

  // Multi-source resilience: try live APIs in order, then serve stale cache (up to 24h),
  // and only as a last resort the static snapshot. No single API can take the tools down.
  const API_SOURCES = [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.frankfurter.app/latest?from=USD'
  ];
  async function fetchLiveRates() {
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { cached = null; }
    if (cached && cached.rates && Date.now() - cached.ts < CACHE_TTL) return cached.rates;
    for (const url of API_SOURCES) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data.rates) {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: data.rates }));
          return data.rates;
        }
      } catch (e) { /* try next source */ }
    }
    // Stale-while-error: last-known rates (up to 24h) are better than a static snapshot
    if (cached && cached.rates && Date.now() - cached.ts < 86400000) return cached.rates;
    return FALLBACK_RATES;
  }

  async function convertCurrency(amount, from, to) {
    const rates = await fetchLiveRates();
    const fromRate = rates[from] || FALLBACK_RATES[from] || 1;
    const toRate = rates[to] || FALLBACK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
  }

  function getCurrencySymbol(code) {
    return (CURRENCY_INFO[code] && CURRENCY_INFO[code].symbol) || code;
  }
  function getCurrencyName(code) {
    return (CURRENCY_INFO[code] && CURRENCY_INFO[code].name) || code;
  }
  function getAllCurrencyCodes() {
    return Object.keys(CURRENCY_INFO).sort();
  }

  return { fetchLiveRates, convertCurrency, convert, getCurrencySymbol, getCurrencyName, getAllCurrencyCodes, formatAmount, FALLBACK_RATES, CURRENCY_INFO };
})();
if (typeof window !== 'undefined') window.Currency = Currency;
