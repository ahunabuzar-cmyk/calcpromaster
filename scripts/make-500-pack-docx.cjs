#!/usr/bin/env node
/* Generates BACKLINK-500-MASTER-PACK.docx — no dependencies (hand-rolled minimal DOCX/ZIP writer) */
const fs = require('fs');
const path = require('path');

/* ---------------- minimal ZIP (stored, no compression) ---------------- */
const CRC_TABLE = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function zipCreate(files) {
  const chunks = [], central = []; let offset = 0;
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8'), data = Buffer.from(f.data, 'utf8');
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    chunks.push(lh, nameBuf, data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8); ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([ch, nameBuf]));
    offset += lh.length + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16); eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, cd, eocd]);
}

/* ---------------- minimal DOCX ---------------- */
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function para(text, opts = {}) {
  const runs = [];
  // bold segments marked with ** **
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  for (const p of parts) {
    if (!p) continue;
    const bold = p.startsWith('**') && p.endsWith('**');
    const t = bold ? p.slice(2, -2) : p;
    const props = [];
    if (bold) props.push('<w:b/>');
    if (opts.mono) props.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/>');
    if (opts.head) props.push(`<w:color w:val="1F4E79"/><w:sz w:val="${opts.h2 ? 32 : 40}"/>`);
    runs.push(`<w:r><w:rPr>${props.join('')}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`);
  }
  const pPr = [];
  if (opts.head) pPr.push('<w:pStyle w:val="Heading1"/>');
  if (opts.h2) pPr.push('<w:pStyle w:val="Heading2"/>');
  if (opts.bullet) pPr.push('<w:ind w:left="360"/><w:numPr><w:ilvl w:val="0"/></w:numPr>');
  return `<w:p>${pPr.length ? '<w:pPr>' + pPr.join('') + '</w:pPr>' : ''}${runs.join('')}</w:p>`;
}
function docx(paras) {
  const body = paras.join('');
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="1F4E79"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="2E74B5"/></w:rPr></w:style>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="21"/></w:rPr></w:style>
</w:styles>`;
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  return zipCreate([
    { name: '[Content_Types].xml', data: ct },
    { name: '_rels/.rels', data: rels },
    { name: 'word/_rels/document.xml.rels', data: docRels },
    { name: 'word/styles.xml', data: styles },
    { name: 'word/document.xml', data: document }
  ]);
}

/* ---------------- paste-ready content pack ---------------- */
const NAME = 'CalcProMaster';
const URL = 'https://calcpromaster.com';
const TAGLINE = '1200+ free calculators that show every formula and step';
const DESC = 'CalcProMaster is a free library of 1200+ calculators covering finance, health, math, construction and everyday math. Every calculator shows the exact formula and every calculation step — no black-box answers. No signup, no paywall, 100% in-browser.';
const SHORT = '1200+ free online calculators — loan EMI, mortgage, BMI, percentage, GPA and more. Every formula shown, every step explained. Free forever.';
const KEYWORDS = 'free online calculators, loan EMI calculator, mortgage calculator, BMI calculator, percentage calculator, GPA calculator, compound interest calculator, calorie calculator, free math tools, step by step calculator';
const BIO = 'Building CalcProMaster, 1200+ free online calculators that show every formula and step. ' + URL;

// login column ko aam bol-chaal ki zubaan me likho (koi code jaisa short form nahi)
const loginLabel = (l) => {
  if (l === 'GOOGLE') return 'Google account se login';
  if (l === 'EMAIL') return 'email se naya account';
  if (l === 'GITHUB') return 'GitHub account se login';
  if (l === 'NONE') return 'login ki zaroorat nahi';
  if (l === 'PAID') return 'paid hai, free nahi';
  return l + ' se login';
};

// naam ke aage lage "? skip / ? dup / ? verify" jaise marker ko aam zubaan me badlo
const TAG_WORDS = {
  'skip': 'yeh skip kar do', 'no': 'yeh skip kar do', 'no skip': 'yeh skip kar do',
  'dead': 'yeh dead hai, skip kar do', 'dup': 'duplicate hai, skip kar do',
  'no duplicate': 'duplicate hai, skip kar do', 'down': 'yeh ab band hai',
  'cf': 'Cloudflare block karta hai', 'done': 'yeh pehle ho chuka hai',
  'verify': 'pehle check karo ke chalu hai', '403': 'yeh site bots ko block karti hai',
  'old': 'purani site hai', 'search': 'GitHub par search karke dhoondo',
  'maybe': 'ho sakta hai chal jaye', 'niche': 'sirf isi kaam ke liye',
  'agency': 'sirf agency ke liye', 'careful': 'sambhal ke karo',
  'n/a': 'yahan kaam nahi banega', 'paid check': 'paid ho sakti hai'
};
function prettyName(n) {
  const m = String(n).match(/^(.*?)\s*\?\s*(.*)$/);
  if (!m) return String(n).trim();
  const base = m[1].trim() || m[2].trim();
  const tag = m[2].trim().toLowerCase();
  const label = TAG_WORDS[tag] || ('dhyan rakho: ' + tag);
  return base + ' (' + label + ')';
}
// URL ke aakhir me chipke "? verify / ? skip" jaise shabd hata do
function cleanUrl(u) {
  let s = String(u).trim().replace(/\?\s*(verify|skip|no|down|dead|dup|n\/a|cf|check|done|search|maybe|niche|old|careful|agency|403)\b.*$/i, '').trim();
  if (s && !/^https?:\/\//i.test(s)) s = 'https://' + s;
  return s;
}

/* ---------------- 500+ SITES ---------------- */
// category, name, url, login, note
const SITES = [];
const A = (cat, name, url, login, note) => SITES.push({ cat, name, url, login, note: note || '' });

/* ===== 1. WEB 2.0 / BLOG PLATFORMS (60) ===== */
['Blogger|https://www.blogger.com|GOOGLE|Posts with 2-3 dofollow links',
 'WordPress.com|https://wordpress.com|EMAIL|Free blog, links nofollow but strong',
 'Tumblr|https://www.tumblr.com|GOOGLE|Short posts + link',
 'Medium|https://medium.com|GOOGLE|Story + embedded links, nofollow',
 'Hashnode|https://hashnode.com|GITHUB|Tech article, dofollow',
 'Google Sites|https://sites.google.com|GOOGLE|Mini-site, dofollow',
 'Substack|https://substack.com|EMAIL|Newsletter post',
 'Strikingly|https://www.strikingly.com|EMAIL|One-page site, dofollow',
 'Weebly|https://www.weebly.com|EMAIL|Free site, dofollow',
 'Wix|https://www.wix.com|EMAIL|Free site',
 'Jimdo|https://www.jimdo.com|EMAIL|Free site',
 'Webnode|https://www.webnode.com|EMAIL|Free site',
 'Yola|https://www.yola.com|EMAIL|Free site',
 'Site123|https://www.site123.com|EMAIL|Free site',
 'Duda|https://www.duda.co|EMAIL|Free trial site',
 'Notion|https://notion.so|GOOGLE|Public page + share link',
 'GitBook|https://www.gitbook.com|GITHUB|Docs-style guide',
 'HackMD|https://hackmd.io|GITHUB|Public notes, dofollow',
 'Dev.to|https://dev.to|GITHUB|Article #2 and #3, dofollow',
 'Codeberg Pages|https://codeberg.org|GITHUB|Static page via repo',
 'Neocities|https://neocities.org|EMAIL|Free static site, dofollow',
 'Teleport|https://gohugo.io|NONE|n/a - skip',
 'Bettermode|https://bettermode.com|EMAIL|Community trial',
 'Minds Blog|https://www.minds.com|EMAIL|Blog + post',
 'Steemit|https://steemit.com|EMAIL|Crypto-style blog post',
 'Publish0x|https://www.publish0x.com|EMAIL|Article post',
 'Vocal Media|https://vocal.media|GOOGLE|Story submission',
 'HubPages|https://hubpages.com|EMAIL|Article hub',
 'Wattpad|https://www.wattpad.com|GOOGLE|Story page about the tool',
 'Wix Blog|https://www.wix.com|EMAIL|Same as Wix',
 'Livejournal|https://www.livejournal.com|EMAIL|Journal entry',
 'Storeboard|https://www.storeboard.com|EMAIL|Business blog',
 'Behance Project|https://www.behance.net|GOOGLE|Project page',
 'Dribbble Shot|https://dribbble.com|GOOGLE|Shot description link',
 'Ello|https://ello.co|EMAIL|Creative post',
 'Mastodon|https://joinmastodon.org|EMAIL|Instance profile link',
 'Gab|https://gab.com|EMAIL|Post link',
 'Gettr|https://gettr.com|EMAIL|Post link',
 'Truth Social|https://truthsocial.com|EMAIL|Post link',
 'Reddit Self Post|https://www.reddit.com|GOOGLE|Value post in niche sub',
 'LiveJournal Community|https://www.livejournal.com|EMAIL|Community post',
 'Blogger Custom Domain|https://www.blogger.com|GOOGLE|Second blog',
 'WordPress Post 2|https://wordpress.com|EMAIL|Second post',
 'Medium Publication|https://medium.com|GOOGLE|Own publication',
 'Substack Note|https://substack.com|EMAIL|Notes feature',
 'Quora Blog|https://www.quora.com|GOOGLE|Quora blog post',
 'LinkedIn Article|https://www.linkedin.com|GOOGLE|Article #2',
 'X Profile|https://x.com|GOOGLE|Pinned post link',
 'Facebook Page|https://www.facebook.com|GOOGLE|Page info website',
 'Instagram Bio|https://www.instagram.com|GOOGLE|Bio link',
 'Pinterest Board 2|https://www.pinterest.com|GOOGLE|Second board',
 'TikTok Bio|https://www.tiktok.com|EMAIL|Bio website field',
 'YouTube Channel|https://www.youtube.com|GOOGLE|About + video desc',
 'Vimeo Profile|https://vimeo.com|EMAIL|Profile website',
 'Dailymotion|https://www.dailymotion.com|EMAIL|Video upload + desc link',
 'Odysee|https://odysee.com|EMAIL|Reel upload, dofollow',
 'Rumble|https://rumble.com|EMAIL|Reel upload',
 'BitChute|https://www.bitchute.com|EMAIL|Reel upload',
 'Giphy|https://giphy.com|GOOGLE|GIF source link',
 'Imgur Post|https://imgur.com|EMAIL|Album with site mention'].forEach(s => { const [n,u,l,no] = s.split('|'); A('WEB2.0', n, u, l, no); });

/* ===== 2. BOOKMARK SITES (60) ===== */
['Folkd|https://www.folkd.com|EMAIL',
 'URL.org|https://url.org|EMAIL',
 'A2Bookmarks|https://a2bookmarks.com|EMAIL',
 'Sitejot|https://www.sitejot.com|EMAIL',
 'Bookmax|https://www.bookmax.net|EMAIL',
 'LinkaGoGo|https://linkagogo.com|EMAIL',
 'Start.me|https://start.me|EMAIL',
 'Pearltrees|https://www.pearltrees.com|EMAIL',
 'Scoop.it|https://www.scoop.it|EMAIL',
 'Diigo|https://www.diigo.com|EMAIL',
 'Mix|https://mix.com|GOOGLE',
 'Flipboard|https://flipboard.com|EMAIL',
 'Papaly|https://papaly.com|EMAIL',
 'Raindrop|https://raindrop.io|EMAIL',
 'Blogmarks|https://blogmarks.net|EMAIL',
 'BibSonomy|https://www.bibsonomy.org|EMAIL',
 'Pocket|https://getpocket.com|GOOGLE',
 'Instapaper|https://www.instapaper.com|EMAIL',
 'Savenkeep|https://www.savenkeep.com|EMAIL',
 'Buddymarks|https://buddymarks.com|EMAIL',
 'Bookmark4You|https://www.bookmark4you.com|EMAIL',
 'Bookmarkee|https://bookmarkee.com|EMAIL',
 'Clipclip|https://www.clipclip.com|EMAIL',
 'Fark|https://www.fark.com|EMAIL',
 'Slogbox|https://slogbox.com|EMAIL',
 'Small SEO Bookmarks|https://smallseotools.org|EMAIL',
 'Metafilter|https://www.metafilter.com|EMAIL',
 'Digg|https://digg.com|GOOGLE',
 'Slashdot|https://slashdot.org|EMAIL',
 'Scoopnest|https://www.scoopnest.com|GOOGLE',
 'List.ly|https://list.ly|EMAIL',
 'Symbaloo|https://www.symbaloo.com|EMAIL',
 'Milestonebookmarks|https://milestonebookmarks.com|EMAIL',
 'Bloggertemplates23|https://bloggertemplates23.com|EMAIL',
 'Wirefan|https://www.wirefan.com|EMAIL',
 'Youbookmark|https://youbookmark.com|EMAIL',
 'Skybacklinks|https://skybacklinks.com|EMAIL',
 'Teztourbookmarks|https://teztourbookmarks.com|EMAIL',
 'Otavea|https://otavea.com|EMAIL',
 'Openfaves|https://openfaves.com|EMAIL',
 'Livelinkscollections|https://livelinkscollections.com|EMAIL',
 'Favli|https://favli.com|EMAIL',
 'Bookmarkng|https://bookmarkng.com|EMAIL',
 'Murl|https://murl.com|EMAIL',
 'Spurl|https://www.spurl.net|EMAIL',
 'MySiteVote|https://www.mysitevote.com|EMAIL',
 'Jodohkita|https://jodohkita.info|EMAIL',
 'Ezy.link? skip|https://ezy.link|EMAIL',
 'Moonrocksbookmark|https://moonrocksbookmark.com|EMAIL',
 'Wordable? skip|https://wordable.io|EMAIL',
 'N4G|https://www.n4g.com|EMAIL',
 'DZone|https://dzone.com|EMAIL',
 'Growfollows|https://growfollows.com|EMAIL',
 'Aixindashi|https://aixindashi.org|EMAIL',
 'Bookmarks2.top|https://bookmarks2.top|EMAIL',
 'Emolinks|https://emolinks.com|EMAIL',
 'Artsybookmarks|https://artsybookmarks.com|EMAIL',
 'Mettablog|https://mettablog.com|EMAIL',
 'Bookmarkgroups|https://bookmarkgroups.com|EMAIL',
 'Activebookmarks|https://activebookmarks.com|EMAIL'].forEach(s => { const [n,u,l] = s.split('|'); A('BOOKMARK', n, u, l, 'Submit URL: ' + TAGLINE); });

/* ===== 3. GENERAL DIRECTORIES (60) ===== */
['Somuch|https://www.somuch.com|EMAIL',
 'InfoTiger|https://www.infotiger.com|EMAIL',
 'Directory r-tt|https://directory.r-tt.com|EMAIL',
 '1M1.biz|https://www.1m1.biz|EMAIL',
 'Bedwan|https://www.bedwan.com|EMAIL',
 'Webotopia|https://www.webotopia.org|EMAIL',
 'Fat64|https://www.fat64.net|EMAIL',
 'SubmissionWebDirectory|https://www.submissionwebdirectory.com|EMAIL',
 'ProlinkDirectory|https://www.prolinkdirectory.com|EMAIL',
 'Absolutedirectory|https://www.absolutedirectory.com|EMAIL',
 'FreePRWebDirectory|https://www.freeprwebdirectory.com|EMAIL',
 'Canlinks|https://www.canlinks.net|EMAIL',
 'Jewana|https://jewana.com|EMAIL',
 'Ananar|https://www.ananar.com|EMAIL',
 'A1WebDirectory|https://www.a1webdirectory.org|EMAIL',
 'ABC Directory|https://www.abc-directory.com|EMAIL',
 'Huge Directory|https://www.hugedirectory.com|EMAIL',
 'PR9|https://www.pr9.net|EMAIL',
 'Gmaw|https://www.gmaw.org|EMAIL',
 'Gain Web|https://www.gainweb.org|EMAIL',
 'Loadz Games? skip|https://loadzgames.com|EMAIL',
 'DirectoryFire|https://www.directoryfire.com|EMAIL',
 'Mongoosetop|https://mongoosetop.com|EMAIL',
 'LinkUP Studios Directory|https://www.linkupstudios.com|EMAIL',
 'E Vocative|https://www.evocative.com? skip|EMAIL',
 'Directorydeluxe|https://directorydeluxe.org|EMAIL',
 'BusyBits|https://busybits.com|EMAIL',
 'Pi blotter? skip|https://piblotter.com|EMAIL',
 'LinkPedia|https://linkpedia.net|EMAIL',
 'Bhanvad|https://www.bhanvad.com|EMAIL',
 'Siteswebdirectory|https://www.siteswebdirectory.com|EMAIL',
 'FreeWebDirectories|https://www.freewebdirectories.com|EMAIL',
 'Directoryfreight? skip|https://directoryfreight.com|EMAIL',
 'UntouchableDirectory|https://untouchabledirectory.com|EMAIL',
 'The-Free-Directory|https://www.the-free-directory.co.uk|EMAIL',
 'Directories.net? skip|https://directories.net|EMAIL',
 'Pegasus Directory|https://pegasusdirectory.com|EMAIL',
 'Viesearch|https://www.viesearch.com|EMAIL',
 'Wld Directory|https://www.wld.com|EMAIL',
 'So Much 2|https://www.somuch.com|EMAIL',
 'Best Free Online? skip|https://bestfreeonline.net|EMAIL',
 'Netinsert|https://www.netinsert.com|NONE',
 'Prolink 2|https://www.prolinkdirectory.com|EMAIL',
 'Ace Web Directory? skip|https://acewebdirectory.com|EMAIL',
 'Add Page|https://www.addpage.net|EMAIL',
 'Uncle Directory|https://uncledirectory.com|EMAIL',
 'Directory Wind? skip|https://directorywind.com|EMAIL',
 'Web Direx? skip|https://webdirex.com|EMAIL',
 'Freelistingdirectory? skip|https://freelistingdirectory.com|EMAIL',
 'Icy Directory? skip|https://icydirectory.com|EMAIL',
 'Thales Directory|https://www.thalesdirectory.com|EMAIL',
 'USGeoWebDirectory|https://www.usgeowebdirectory.com|EMAIL',
 'Tsection|https://www.tsection.com|EMAIL',
 'WWW Searcher? skip|https://www.wwwsearcher.com|EMAIL',
 'Yellowise|https://www.yellowise.com|EMAIL',
 'Yellowpages Local? skip|https://local.yahoo.com|EMAIL',
 'Moz? no|https://moz.com|EMAIL',
 'Botw|https://botw.org|PAID',
 'DMOZ clone Curlie|https://curlie.org|NONE'].forEach(s => { const [n,u,l] = s.split('|'); A('DIRECTORY', n, u, l, 'Standard listing form'); });

/* ===== 4. STARTUP / SAAS / TOOL DIRECTORIES (70) ===== */
['StartupBase #3? no duplicate|https://startupbase.io|GOOGLE|Already 2 listings',
 'Launched|https://launched.io|NONE',
 'Startup Catchup|https://startupcatchup.com|NONE',
 'Startup88|https://startup88.com|NONE',
 'ToolsPedia|https://toolspedia.io|NONE',
 'Theres An AI For That|https://theresanaiforthat.com|EMAIL',
 'Futurepedia|https://www.futurepedia.io|EMAIL',
 'AI Tools Directory|https://aitoolsdirectory.com|EMAIL',
 'Top Tools|https://www.toptools.directory|EMAIL',
 'ToolFinder? skip|https://toolfinder.co|EMAIL',
 'SaaSHub 2nd profile|https://www.saashub.com|GOOGLE',
 'AlternativeTo 2? dup|https://alternativeto.net|GOOGLE',
 'StackShare? dead|https://stackshare.io|GITHUB',
 'G2 free listing|https://www.g2.com|EMAIL',
 'Capterra free listing|https://www.capterra.com|EMAIL',
 'GetApp|https://www.getapp.com|EMAIL',
 'Software Advice|https://www.softwareadvice.com|EMAIL',
 'TrustPilot free|https://www.trustpilot.com|EMAIL',
 'TrustRadius|https://www.trustradius.com|EMAIL',
 'Crozdesk? dead|https://crozdesk.com|NONE',
 'SoftwareSuggest|https://www.softwaresuggest.com|EMAIL',
 'SourceForge? 403|https://sourceforge.net|EMAIL',
 'ProductHunt 2nd? dup|https://www.producthunt.com|GOOGLE',
 'Fazier 2nd? dup|https://fazier.com|GOOGLE',
 'Peerlist 2? dup|https://peerlist.io|GOOGLE',
 'Uneed|https://www.uneed.best|GITHUB',
 'Microlaunch|https://microlaunch.net|GITHUB',
 'DevHunt|https://devhunt.org|GITHUB',
 '1000tools|https://1000.tools|NONE',
 'There Is App For That? dead|https://thereisanappforthat.com|NONE',
 'F6S|https://www.f6s.com|EMAIL',
 'StartupBlink|https://www.startupblink.com|EMAIL',
 'Startup Stash|https://startupstash.com|EMAIL',
 'Killer Startups|https://killerstartups.com|PAID',
 'LauchingNext|https://www.launchingnext.com|EMAIL',
 'PitchWall|https://pitchwall.co|GOOGLE',
 'Startup Fame 2? dup|https://startupfa.me|GOOGLE',
 'TinyStartups 2? dup|https://tinystartups.com|NONE',
 'TinyLaunch 2? dup|https://tinylaunch.com|GITHUB',
 'IndieHunt|https://indiehunt.com? verify|NONE',
 'Postmake|https://postmake.io|GITHUB',
 'SideProjectors 2? dup|https://www.sideprojectors.com|GOOGLE',
 'BetaList|https://betalist.com|PAID',
 'StartupRanking|https://www.startupranking.com|EMAIL',
 'StartupBuffer|https://startupbuffer.com|EMAIL',
 'AllTopStartups|https://alltopstartups.com|EMAIL',
 'StartupHits|https://startuphits.com? verify|NONE',
 'FounderPath? no|https://founderpath.com|EMAIL',
 'Launch List|httpslaunchlist.co? skip|EMAIL',
 'EpicLaunch|https://epiclaunch.com|EMAIL',
 'WebAppRater|https://webapprater.com|EMAIL',
 'Chrome Web Store (browser ext later)|https://chrome.google.com/webstore|GOOGLE',
 'Mozilla Addons (ext later)|https://addons.mozilla.org|GITHUB',
 'Framasoft? no|https://framasoft.org|NONE',
 'Awesome screenshot? skip|https://awesomescreenshot.com|NONE',
 'Slant 2? down|https://www.slant.co|NONE',
 'OpenAlternative|https://openalternative.co|GITHUB',
 'FreeForDev PR|https://free-for.dev|GITHUB',
 'ToolPilot|https://www.toolpilot.ai|EMAIL',
 'AIToolsHub? verify|https://aitoolshub.com? verify|NONE',
 'Dang.ai|https://dang.ai|EMAIL',
 'ToolPockets? verify|https://toolpockets.com? verify|NONE',
 'StartupStage|https://startupstage.app|EMAIL',
 'Made In Webflow? skip|https://webflow.com|EMAIL',
 'Built With? no|https://builtwith.com|NONE',
 'Crunchbase 2? dup|https://www.crunchbase.com|GOOGLE',
 'AngelList/WF? cf|https://wellfound.com|GOOGLE',
 'Gust 2? dead|https://gust.com|NONE',
 'TechCrunch Pitch? no|https://techcrunch.com|PAID'].forEach(s => { const [n,u,l,no] = s.split('|'); A('STARTUP-DIR', n, u, l, no || 'Free submit'); });

/* ===== 5. PROFILES (60) ===== */
['Gravatar|https://gravatar.com|GOOGLE',
 'Disqus|https://disqus.com|EMAIL',
 'SlideShare|https://www.slideshare.net|GOOGLE',
 'Scribd|https://www.scribd.com|GOOGLE',
 'CodePen|https://codepen.io|GITHUB',
 'Replit|https://replit.com|GITHUB',
 'Glitch|https://glitch.com|GITHUB',
 'GitLab 2? done|https://gitlab.com|GITHUB',
 'Bitbucket|https://bitbucket.org|GITHUB',
 'Docker Hub|https://hub.docker.com|EMAIL',
 'Kaggle|https://www.kaggle.com|GOOGLE',
 'HuggingFace|https://huggingface.co|EMAIL',
 'NPM|https://www.npmjs.com|GITHUB',
 'PyPI|https://pypi.org|GITHUB',
 'StackExchange|https://stackexchange.com|EMAIL',
 'HackerNews profile|https://news.ycombinator.com|EMAIL',
 'Dribbble 2? dup|https://dribbble.com|GOOGLE',
 'Behance 2? dup|https://www.behance.net|GOOGLE',
 '500px|https://500px.com|EMAIL',
 'Flickr|https://www.flickr.com|GOOGLE',
 'Patreon|https://www.patreon.com|GOOGLE',
 'Ko-fi|https://ko-fi.com|EMAIL',
 'BuyMeACoffee|https://buymeacoffee.com|GOOGLE',
 'Gumroad|https://gumroad.com|EMAIL',
 'ProductHunt bio|https://www.producthunt.com|GOOGLE',
 'IndieHackers post 2|https://www.indiehackers.com|GOOGLE',
 'Medium profile 2? dup|https://medium.com|GOOGLE',
 'Quora profile 2? dup|https://www.quora.com|GOOGLE',
 'Pinterest 2? dup|https://www.pinterest.com|GOOGLE',
 'Reddit profile|https://www.reddit.com|GOOGLE',
 'Chess? no skip|https://www.chess.com|EMAIL',
 'Duolingo? no skip|https://www.duolingo.com|GOOGLE',
 'Goodreads|https://www.goodreads.com|GOOGLE',
 'LastFM|https://www.last.fm|EMAIL',
 'Spotify? no skip|https://spotify.com|GOOGLE',
 'SoundCloud|https://soundcloud.com|GOOGLE',
 'Bandcamp|https://bandcamp.com|EMAIL',
 'Mixcloud|https://www.mixcloud.com|EMAIL',
 'Letterboxd? no skip|https://letterboxd.com|GOOGLE',
 'Untappd? no skip|https://untappd.com|EMAIL',
 'Steam? no skip|https://store.steampowered.com|EMAIL',
 'Itch.io|https://itch.io|EMAIL',
 'Gamejolt? no skip|https://gamejolt.com|EMAIL',
 'Polywork|https://www.polywork.com|GOOGLE',
 'Bento.me|https://bento.me|GOOGLE',
 'Linktree|https://linktr.ee|EMAIL',
 'Beacons|https://beacons.ai|EMAIL',
 'Carrd|https://carrd.co|EMAIL',
 'About.me 2? dup|https://about.me|EMAIL',
 'Fiverr|https://www.fiverr.com|GOOGLE',
 'Upwork|https://www.upwork.com|GOOGLE',
 'Freelancer|https://www.freelancer.com|EMAIL',
 'PeoplePerHour|https://www.peopleperhour.com|EMAIL',
 'Toptal? skip|https://www.toptal.com|EMAIL',
 'Dribbble3? dup|https://dribbble.com|GOOGLE',
 'LinkedIn 2? dup|https://www.linkedin.com|GOOGLE',
 'Xing|https://www.xing.com|EMAIL',
 'Meetup|https://www.meetup.com|GOOGLE',
 'Eventbrite|https://www.eventbrite.com|GOOGLE',
 'SlideServe|https://www.slideserve.com|EMAIL'].forEach(s => { const [n,u,l] = s.split('|'); A('PROFILE', n, u, l, 'Bio + website field'); });

/* ===== 6. PDF / DOC SHARING (30) ===== */
['Issuu|https://issuu.com|EMAIL',
 'Edocr|https://www.edocr.com|EMAIL',
 'Calameo|https://www.calameo.com|EMAIL',
 '4shared|https://www.4shared.com|EMAIL',
 'MediaFire|https://www.mediafire.com|EMAIL',
 'Dropbox public doc|https://www.dropbox.com|GOOGLE',
 'Google Drive public|https://drive.google.com|GOOGLE',
 'Academia.edu|https://www.academia.edu|EMAIL',
 'SlideShare 2? dup|https://www.slideshare.net|GOOGLE',
 'Speaker Deck|https://speakerdeck.com|GITHUB',
 'SlideServe 2? dup|https://www.slideserve.com|EMAIL',
 'AuthorSTREAM|https://www.authorstream.com|EMAIL',
 'PDFArchive? verify|https://www.pdf-archive.com|EMAIL',
 'PDFHost|https://pdfhost.io|EMAIL',
 'DocDroid|https://www.docdroid.net|EMAIL',
 'Viewkick? skip|https://viewkick.com|EMAIL',
 'Yumpu|https://www.yumpu.com|EMAIL',
 'Fiction? no skip|https://www.fictiondb.com|EMAIL',
 'Mega? nofollow|https://mega.nz|EMAIL',
 'Zoho Docs|https://www.zoho.com/docs|EMAIL',
 'OneDrive public? nofollow|https://onedrive.live.com|GOOGLE',
 'Box public|https://www.box.com|EMAIL',
 'pCloud|https://www.pcloud.com|EMAIL',
 'Sync? no skip|https://www.sync.com|EMAIL',
 'Icedrive|https://icedrive.net|EMAIL',
 'Koofr|https://app.koofr.net|EMAIL',
 'TeraBox|https://terabox.com|EMAIL',
 'SendSpace|https://www.sendspace.com|EMAIL',
 'Rapidgator? skip|https://rapidgator.net|EMAIL',
 'Divshare? dead|https://divshare.com|EMAIL'].forEach(s => { const [n,u,l] = s.split('|'); A('PDF-DOC', n, u, l, 'Upload 1200-calculators guide PDF'); });

/* ===== 7. FORUMS / Q&A (50) ===== */
['Money StackExchange|https://money.stackexchange.com|EMAIL',
 'Math StackExchange|https://math.stackexchange.com|EMAIL',
 'WebApps SE|https://webapps.stackexchange.com|EMAIL',
 'SoftwareRecs SE|https://softwarerecs.stackexchange.com|EMAIL',
 'SuperUser|https://superuser.com|EMAIL',
 'OpenSource SE|https://opensource.stackexchange.com|EMAIL',
 'Productivity SE|https://productivity.stackexchange.com|EMAIL',
 'Startups SE|https://startups.stackexchange.com|EMAIL',
 'Interpersonal SE? maybe|https://interpersonal.stackexchange.com|EMAIL',
 'LifeHacks SE|https://lifehacks.stackexchange.com|EMAIL',
 'PersonalFinance SE|https://personal finance SE dup|EMAIL',
 'Quora answer 2|https://www.quora.com|GOOGLE',
 'Quora answer 3|https://www.quora.com|GOOGLE',
 'Quora answer 4|https://www.quora.com|GOOGLE',
 'Quora answer 5|https://www.quora.com|GOOGLE',
 'Quora answer 6|https://www.quora.com|GOOGLE',
 'IndieHackers discussion|https://www.indiehackers.com|GOOGLE',
 'IndieHackers milestone|https://www.indiehackers.com|GOOGLE',
 'Reddit r/personalfinance|https://www.reddit.com|GOOGLE',
 'Reddit r/math|https://www.reddit.com|GOOGLE',
 'Reddit r/InternetIsBeautiful 2|https://www.reddit.com|GOOGLE',
 'Reddit r/somethingiswrong? skip|https://www.reddit.com|GOOGLE',
 'Reddit r/coolwebsites|https://www.reddit.com|GOOGLE',
 'Reddit r/SideProject|https://www.reddit.com|GOOGLE',
 'Reddit r/startups|https://www.reddit.com|GOOGLE',
 'Reddit r/Entrepreneur|https://www.reddit.com|GOOGLE',
 'Reddit r/smallbusiness|https://www.reddit.com|GOOGLE',
 'Reddit r/webdev|https://www.reddit.com|GOOGLE',
 'Reddit r/SideProject2? dup|https://www.reddit.com|GOOGLE',
 'HackerNews comment 2|https://news.ycombinator.com|EMAIL',
 'HackerNews Ask 2|https://news.ycombinator.com|EMAIL',
 'DigitalPoint|https://digitalpoint.com|EMAIL',
 'WarriorForum|https://www.warriorforum.com|EMAIL',
 'WebHostingTalk? niche|https://www.webhostingtalk.com|EMAIL',
 'NamePros|https://www.namepros.com|EMAIL',
 'V7N Forum|https://www.v7n.com|EMAIL',
 'BlackHatWorld? careful|https://www.blackhatworld.com|EMAIL',
 'SEO Chat|https://www.seochat.com|EMAIL',
 'WebmasterWorld|https://www.webmasterworld.com|EMAIL',
 'MyMathForum|https://mymathforum.com|EMAIL',
 'FreeMathHelp|https://www.freemathhelp.com/forum|EMAIL',
 'MathisFun forum|https://www.mathisfunforum.com|EMAIL',
 'Bogleheads|https://www.bogleheads.org/forum|EMAIL',
 'InteractiveBrokers forum? niche|https://forums.interactivebrokers.com|EMAIL',
 'Stack Overflow|https://stackoverflow.com|GOOGLE',
 'Dev Community|https://dev.to|GITHUB',
 'Hashnode forum? n/a|https://hashnode.com|GITHUB',
 'Disqus comments on blogs|https://disqus.com|EMAIL',
 'Hive blog|https://hive.blog|EMAIL',
 'Minds forum? n/a|https://www.minds.com|EMAIL'].forEach(s => { const [n,u,l] = s.split('|'); A('FORUM-QA', n, u, l, 'Genuine value answers only'); });

/* ===== 8. PRESS RELEASE (25) ===== */
['PRLog|https://www.prlog.org|EMAIL',
 'OpenPR|https://www.openpr.com|EMAIL',
 'PressReleasePoint|https://www.pressreleasepoint.com|EMAIL',
 'NewswireToday|https://www.newswiretoday.com|EMAIL',
 'IssueWire free|https://www.issuewire.com|EMAIL',
 'OnlinePRNews free|https://www.onlineprnews.com|EMAIL',
 'PressReleaseJet? verify|https://www.pressreleasejet.com? verify|EMAIL',
 'FreePressRelease? verify|https://www.free-press-release.com|EMAIL',
 'PRInside? verify|https://www.prinside.com|EMAIL',
 'PressBox? verify|https://pressbox.co.uk|EMAIL',
 'ClickPress|https://www.clickpress.com|EMAIL',
 '1888PressRelease|https://www.1888pressrelease.com|EMAIL',
 'PRZoom? verify|https://www.przoom.com|EMAIL',
 'NewsHero? skip|https://newshero.com? verify|EMAIL',
 'PRFire? paid check|https://www.prfire.com|PAID',
 'EINPresswire free? check|https://www.einpresswire.com|PAID',
 'NPR? no skip|https://www.npr.org|NONE',
 'PR.com|https://www.pr.com|EMAIL',
 'ExpressPressRelease? verify|https://expresspressrelease.com? verify|EMAIL',
 '24-7PressRelease|https://www.24-7pressrelease.com|PAID',
 'WebWire|https://www.webwire.com|PAID',
 'PRUnderground|https://www.prunderground.com|PAID',
 'IdeaMarketers|https://www.ideamarketers.com|EMAIL',
 'BusinessWire2? no|https://www.businesswire.com|PAID',
 'SBWire|https://www.sbwire.com|PAID'].forEach(s => { const [n,u,l] = s.split('|'); A('PRESS', n, u, l, 'PR headline: CalcProMaster launches 1200+ free calculators'); });

/* ===== 9. IMAGE / INFOGRAPHIC (20) ===== */
['Pinterest pin 2|https://www.pinterest.com|GOOGLE',
 'Flickr 2? dup|https://www.flickr.com|GOOGLE',
 'Imgur album|https://imgur.com|EMAIL',
 'DeviantArt|https://www.deviantart.com|EMAIL',
 'ArtStation|https://www.artstation.com|EMAIL',
 'Behance 3? dup|https://www.behance.net|GOOGLE',
 'Unsplash? no skip|https://unsplash.com|GOOGLE',
 'Pexels? no skip|https://www.pexels.com|GOOGLE',
 'Pixabay? no skip|https://pixabay.com|GOOGLE',
 'Fotolog? dead|https://fotolog.com|EMAIL',
 '23hq|https://www.23hq.com|EMAIL',
 'Aminus3|https://www.aminus3.com|EMAIL',
 'BetterPhoto? verify|https://www.betterphoto.com|EMAIL',
 'Photobucket|https://photobucket.com|EMAIL',
 'SmugMug|https://www.smugmug.com|EMAIL',
 'Zenfolio|https://zenfolio.com|PAID',
 'FreeImages? no skip|https://www.freeimages.com|EMAIL',
 'ImgBB|https://imgbb.com|EMAIL',
 'PostImages|https://postimages.org|NONE',
 'CubeUpload|https://cubeupload.com|NONE'].forEach(s => { const [n,u,l] = s.split('|'); A('IMAGE', n, u, l, 'Infographic upload + description link'); });

/* ===== 10. BLOG COMMENTING (60 — daily) ===== */
const BLOG_TOPICS = ['personal finance blogs','mortgage blogs','fitness blogs','math education blogs','indie maker blogs','SaaS review blogs'];
['ProBlogger comments|https://problogger.com|NONE',
 'Smart Passive Income blog|https://www.smartpassiveincome.com|NONE',
 'I Will Teach You Rich blog|https://www.iwillteachyoutoberich.com|NONE',
 'GetRichSlowly|https://www.getrichslowly.org|NONE',
 'Mr Money Mustache|https://www.mrmoneymustache.com|NONE',
 'TheSimpleDollar|https://www.thesimpledollar.com|NONE',
 'NerdWallet blog|https://www.nerdwallet.com|NONE',
 'FinancialSamurai|https://www.financialsamurai.com|NONE',
 'BudgetsAreSexy|https://www.budgetsaresexy.com|NONE',
 'ThePennyHoarder|https://www.thepennyhoarder.com|NONE',
 'WalletHacks|https://wallethacks.com|NONE',
 'CashMoneyLife|https://cashmoneylife.com|NONE',
 'MoneyUnder30|https://www.moneyunder30.com|NONE',
 'CreditCards blog|https://www.creditcards.com|NONE',
 'Bankrate blog|https://www.bankrate.com|NONE',
 'Investopedia articles|https://www.investopedia.com|NONE',
 'MathIsFun comments? no|https://www.mathsisfun.com|NONE',
 'BetterExplained|https://betterexplained.com|NONE',
 'MathAcademy blog? skip|https://www.mathacademy.com|NONE',
 'ArtOfProblemSolving blog|https://artofproblemsolving.com|NONE',
 'Preplounge? niche|https://www.preplounge.com|NONE',
 'IndieHackers blogs|https://www.indiehackers.com|GOOGLE',
 'Josh Kaufman blog|https://joshkaufman.net|NONE',
 'NoCSStylr? skip|https://ncase.me|NONE',
 'Swyx blog|https://www.swyx.io|NONE',
 'Tania Rascia|https://www.taniarascia.com|NONE',
 'CSS Tricks|https://css-tricks.com|NONE',
 'Smashing Magazine|https://www.smashingmagazine.com|NONE',
 'Dev.to comments 2|https://dev.to|GITHUB',
 'HackerNoon comments|https://hackernoon.com|GITHUB',
 'Hashnode comments|https://hashnode.com|GITHUB',
 'Medium comments|https://medium.com|GOOGLE',
 'Substack comments|https://substack.com|EMAIL',
 'ProductHunt discussions|https://www.producthunt.com|GOOGLE',
 'BetaList discussions? skip|https://betalist.com|PAID',
 'Toolsology? verify|https://toolsology.com? verify|NONE',
 'MakeUseOf tools articles|https://www.makeuseof.com|NONE',
 'LifeHacker articles|https://lifehacker.com|NONE',
 'Mashable articles? skip|https://mashable.com|NONE',
 'TNW articles? skip|https://thenextweb.com|NONE',
 'TechCrunch articles? skip|https://techcrunch.com|NONE',
 'Gizmodo? skip|https://gizmodo.com|NONE',
 'TheVerge? skip|https://www.theverge.com|NONE',
 'Wired? skip|https://www.wired.com|NONE',
 'Zapier blog|https://zapier.com/blog|NONE',
 'HubSpot blog|https://blog.hubspot.com|NONE',
 'NEILPATEL blog|https://neilpatel.com/blog|NONE',
 'Backlinko blog|https://backlinko.com/blog|NONE',
 'Moz blog|https://moz.com/blog|NONE',
 'Ahrefs blog|https://ahrefs.com/blog|NONE',
 'SearchEngineJournal|https://www.searchenginejournal.com|NONE',
 'SearchEngineLand|https://searchengineland.com|NONE',
 'Kaiserthesage? old|https://kaiserthesage.com|NONE',
 'MatthewWoodward|https://www.matthewwoodward.co.uk|NONE',
 'Gotch SEO|https://www.gotchseo.com|NONE',
 'Detailed.com|https://detailed.com|NONE',
 'NicheHacks? old|https://nichehacks.com|NONE',
 'SideHustleNation|https://www.sidehustlenation.com|NONE',
 'SmartBlogger|https://smartblogger.com|NONE',
 'BloggerJet|https://bloggerjet.com|NONE'].forEach(s => { const [n,u,l] = s.split('|'); A('COMMENTS', n, u, l, 'Genuine comment + name + URL'); });

/* ===== 11. AWESOME-LIST PRs (40) ===== */
['awesome-finance|https://github.com/brandonhimpfen/awesome-finance|GITHUB',
 'awesome-ai-in-finance|https://github.com/georgezouq/awesome-ai-in-finance|GITHUB',
 'awesome-quant|https://github.com/wilsonfreitas/awesome-quant|GITHUB',
 'awesome-fintech|https://github.com/nikita-hlopov/awesome-fintech? verify|GITHUB',
 'awesome-personal-finance? search|https://github.com/search?q=awesome+personal+finance|GITHUB',
 'awesome-math|https://github.com/rossant/awesome-math|GITHUB',
 'awesome-algorithms? maybe|https://github.com/tayllan/awesome-algorithms|GITHUB',
 'awesome-calculators (self)|https://github.com/ahunabuzar-cmyk/awesome-calculators|GITHUB',
 'awesome-public-calculators? search|https://github.com/search?q=awesome+calculators|GITHUB',
 'awesome-education|https://github.com/sindresorhus/awesome#education|GITHUB',
 'awesome-health? search|https://github.com/search?q=awesome+health|GITHUB',
 'awesome-fitness? search|https://github.com/search?q=awesome+fitness|GITHUB',
 'awesome-selfhosted? maybe|https://github.com/awesome-selfhosted/awesome-selfhosted|GITHUB',
 'awesome-free? free-for-dev|https://github.com/free-for-dev/free-for-dev|GITHUB',
 'awesome-static? search|https://github.com/search?q=awesome+static+site+generators|GITHUB',
 'awesome-tools? search|https://github.com/search?q=awesome+online+tools|GITHUB',
 'awesome-productivity|https://github.com/jhguch/awesome-productivity? verify|GITHUB',
 'awesome-open-source? search|https://github.com/search?q=awesome+open+source|GITHUB',
 'awesome-list-of-lists|https://github.com/emijrp/awesome-awesome|GITHUB',
 'awesome-indie|https://github.com/mezod/awesome-indie|GITHUB',
 'awesome-saas? search|https://github.com/search?q=awesome+saas|GITHUB',
 'awesome-first-timers? no|https://github.com/firstcontributions/first-contributions|GITHUB',
 'awesome-javascript? maybe|https://github.com/sorrycc/awesome-javascript|GITHUB',
 'awesome-webdev? search|https://github.com/search?q=awesome+web+dev+resources|GITHUB',
 'awesome-bookmarks|https://github.com/Pungyeon/awesome-bookmarks? verify|GITHUB',
 'awesome-producthunt? no|https://github.com/search?q=awesome+product+hunt|GITHUB',
 'awesome-npm-scripts? no|https://github.com/search?q=awesome+npm|GITHUB',
 'awesome-opensource-apps|https://github.com/mattdesl/awesome-opensource-apps? verify|GITHUB',
 'awesome-scifi? no skip|https://github.com/search?q=awesome+science|GITHUB',
 'awesome-data-science? maybe|https://github.com/academic/awesome-datascience|GITHUB',
 'awesome-machine-learning? no|https://github.com/josephmisiti/awesome-machine-learning|GITHUB',
 'awesome-python? no|https://github.com/vinta/awesome-python|GITHUB',
 'awesome-devtools? search|https://github.com/search?q=awesome+dev+tools|GITHUB',
 'awesome-browser-tools? search|https://github.com/search?q=awesome+browser+extensions|GITHUB',
 'awesome-curated? search|https://github.com/search?q=awesome+curated+list|GITHUB',
 'awesome-math2? dup check|https://github.com/search?q=awesome+math+resources|GITHUB',
 'awesome-finance2? dup|https://github.com/search?q=awesome+finance|GITHUB',
 'awesome-healthcare? maybe|https://github.com/kakitz/awesome-healthcare? verify|GITHUB',
 'awesome-construction? search|https://github.com/search?q=awesome+construction|GITHUB',
 'awesome-engineering? search|https://github.com/search?q=awesome+engineering+tools|GITHUB'].forEach(s => { const [n,u,l] = s.split('|'); A('AWESOME-PR', n, u, l, 'Fork + add line + PR'); });

/* ===== 12. MISC / SOCIAL / VIDEO / LOCAL (45) ===== */
['Netlify showcase|https://answers.netlify.com|EMAIL',
 'Vercel showcase? skip|https://vercel.com|GOOGLE',
 'Cloudflare community|https://community.cloudflare.com|EMAIL',
 'Webflow forum? skip|https://forum.webflow.com|EMAIL',
 'Google My Business|https://business.google.com|GOOGLE',
 'Bing Places|https://www.bingplaces.com|GOOGLE',
 'Apple Maps? skip|https://mapsconnect.apple.com|GOOGLE',
 'Foursquare|https://foursquare.com|GOOGLE',
 'Yelp|https://www.yelp.com|EMAIL',
 'Hotfrog|https://www.hotfrog.com|EMAIL',
 'Manta|https://www.manta.com|EMAIL',
 'Brownbook|https://www.brownbook.net|EMAIL',
 'Cybo|https://www.cybo.com|EMAIL',
 'Tupalo|https://tupalo.com|EMAIL',
 'Cylex|https://www.cylex.us.com|EMAIL',
 'MagicPin? skip|https://magicpin.in|EMAIL',
 'JustDial? skip|https://www.justdial.com|EMAIL',
 'Sulekha? skip|https://www.sulekha.com|EMAIL',
 'ClearTax? no skip|https://www.clear.tax|NONE',
 'Yellow Pages|https://www.yellowpages.com|EMAIL',
 'TrueLocal? skip|https://www.truelocal.com.au|EMAIL',
 'StartUs|https://www.startus.cc|EMAIL',
 'Crunchbase profile 2? dup|https://www.crunchbase.com|GOOGLE',
 'Angel List? cf block|https://angel.co|GOOGLE',
 'Clutch|https://clutch.co|EMAIL',
 'GoodFirms|https://www.goodfirms.co|EMAIL',
 'DesignRush? agency|https://www.designrush.com|EMAIL',
 'Extract? no skip|https://extractors? no|NONE',
 'Bizapedia? no skip|https://www.bizapedia.com|NONE',
 'ChamberofCommerce|https://www.chamberofcommerce.com|EMAIL',
 'Tresdias? skip|https://tresdias.org? no|NONE',
 'EnrollBusiness|https://www.enrollbusiness.com|EMAIL',
 'CitySquares|https://www.citysquares.com|EMAIL',
 'YellowPagesCy? skip|https://www.yellowpagescy.com? no|EMAIL',
 'Fyple|https://www.fyple.com|EMAIL',
 'Salespider|https://www.salespider.com|EMAIL',
 'Iglobal? skip|https://www.iglobal.co|EMAIL',
 'Storeboard 2? dup|https://www.storeboard.com|EMAIL',
 'ProvenExpert|https://www.provenexpert.com|EMAIL',
 'Zaubacorp? no skip|https://www.zauba.com|NONE',
 'Opendi|https://www.opendi.us|EMAIL',
 'Misterwhat|https://www.misterwhat.com|EMAIL',
 'Finding嘴角? skip|https://finding嘴角.com? no|NONE',
 '192 directory|https://www.192.com|PAID',
 'The Trades Directory? skip|https://www.thetradefinder.co.uk? no|EMAIL'].forEach(s => { const [n,u,l] = s.split('|'); A('LOCAL-MISC', n, u, l, 'Business listing + website'); });

console.log('TOTAL SITES:', SITES.length);

/* ---------------- DOCX BUILD ---------------- */
const P = [];
P.push(para('BACKLINK-500+ MASTER PACK — CalcProMaster', { head: true }));
P.push(para('Goal: 1000+ backlinks in 30 days • All free • Generated 2026-10-01'));
P.push(para('Total sites in this pack: ' + SITES.length + ' (alive-check karte jana; dead ho to list me agli site use karo)'));

P.push(para('HOW TO USE (3 steps)', { h2: true }));
P.push(para('1. Har site par jao, account banao (email + password neeche diya hai), aur "Submit URL/Add site" form me content paste karo.', { bullet: true }));
P.push(para('2. Email verification aaye to inbox/spam check karke verify karo — iske bina listing live nahi hoti.', { bullet: true }));
P.push(para('3. Ek site = 1 backlink. Roz 33 sites karo → 30 din me 1000+. Tracker me tick karo (1000-campaign-progress.csv).', { bullet: true }));

P.push(para('UNIVERSAL PASTE-READY CONTENT (har site me yehi use karo)', { h2: true }));
P.push(para('SITE NAME field:', { mono: true }));
P.push(para(NAME, { mono: true }));
P.push(para('URL field:', { mono: true }));
P.push(para(URL, { mono: true }));
P.push(para('TAGLINE / TITLE / SHORT DESC field:', { mono: true }));
P.push(para(SHORT, { mono: true }));
P.push(para('LONG DESCRIPTION field:', { mono: true }));
P.push(para(DESC, { mono: true }));
P.push(para('KEYWORDS field (comma separated):', { mono: true }));
P.push(para(KEYWORDS, { mono: true }));
P.push(para('ACCOUNT CREDENTIALS (sab sites ke liye same):', { mono: true }));
P.push(para('Email: ahunabuzar@gmail.com, Password: CalcPro@2026!, aur jab username maange to likho: ahunabuzar', { mono: true }));
P.push(para('USERNAME/BIO field (jab site mange):', { mono: true }));
P.push(para('Building CalcProMaster - 1200+ free online calculators that show every formula and step. ' + URL, { mono: true }));
P.push(para('DAILY PLAN (33/day)', { h2: true }));
P.push(para('Week 1: 60 BOOKMARK + 40 DIRECTORY + comments daily'));
P.push(para('Week 2: 60 WEB2.0 + 50 PROFILE + PRs start'));
P.push(para('Week 3: 70 STARTUP-DIR + 30 PDF + PRESS + FORUM answers'));
P.push(para('Week 4: AWESOME-PR + LOCAL-MISC + IMAGE + remaining + repeat backup list'));

P.push(para('ALL 500+ SITES BY CATEGORY', { head: true }));

const cats = [...new Set(SITES.map(s => s.cat))];
for (const cat of cats) {
  const list = SITES.filter(s => s.cat === cat);
  P.push(para(cat + ' — ' + list.length + ' sites', { h2: true }));
  let i = 1;
  for (const s of list) {
    P.push(para(`**${i}. ${prettyName(s.name)}** — ${cleanUrl(s.url)} — ${loginLabel(s.login)}${s.note ? ' — ' + s.note : ''}`));
    i++;
  }
}

const buf = docx(P);
const out = path.join(__dirname, '..', 'docs', 'BACKLINK-500-MASTER-PACK.docx');
fs.writeFileSync(out, buf);
console.log('WROTE', out, buf.length, 'bytes');

/* ---------------- PLAIN TEXT VERSION ---------------- */
const T = [];
T.push('CalcProMaster — 500+ Free Backlink Sites');
T.push('========================================');
T.push('');
T.push('Ye poori list 30 din ke plan ki hai: 1000 backlinks, sab free. Har site par account banao, URL aur description paste karo, email verify karo aur link LIVE ho jayega. Ek site barabar ek backlink. Roz 33 sites karo to 30 din me 1000 se upar. Koi site dead mile to list me agli site le lo, rukna nahi hai.');
T.push('');
T.push('SABSE PEHLE — yehi paanch cheezein har site me paste karni hain:');
T.push('');
T.push('  Site ka naam: ' + NAME);
T.push('  URL: ' + URL);
T.push('  Chhoti description (title ya tagline wale khane me): ' + SHORT);
T.push('  Lambi description (description wale khane me): ' + DESC);
T.push('  Keywords (comma wale khane me): ' + KEYWORDS);
T.push('');
T.push('Account har site ke liye same hai. Email: ahunabuzar@gmail.com, Password: CalcPro@2026!, aur jab username maange to likho: ahunabuzar');
T.push('');
T.push('Bio jab site maange to yeh daalo: ' + BIO);
T.push('');
T.push('ROZ KA PLAN — 33 links har din:');
T.push('');
T.push('  Pehla hafta: BOOKMARK ki 60 sites aur DIRECTORY ki 60 sites start karo, saath me roz 2-3 blog comments.');
T.push('  Dusra hafta: WEB2.0 ki 60 sites aur PROFILE ki 50 sites, aur Awesome-list ke PRs shuru kar do.');
T.push('  Teesra hafta: STARTUP-DIR ki 70 sites, PDF-DOC ki 30 sites, PRESS ki 25 sites aur FORUM ke genuine jawab.');
T.push('  Chautha hafta: IMAGE ki 20 sites, LOCAL-MISC ki 45 sites, COMMENTS ki 60 sites, aur jo reh gaya wo poora karo.');
T.push('');
T.push('Har complete link ki ek row yahan daalo: docs/1000-campaign-progress.csv');
T.push('');
T.push('======================================================================');
T.push('');
for (const cat of cats) {
  const list = SITES.filter(s => s.cat === cat);
  T.push(cat + ' — ' + list.length + ' sites');
  T.push('');
  list.forEach((s, i) => {
    T.push('  ' + (i + 1) + '. ' + prettyName(s.name) + ' — ' + cleanUrl(s.url) + ' — ' + loginLabel(s.login) + (s.note ? ' — ' + s.note : ''));
  });
  T.push('');
}
const txtOut = path.join(__dirname, '..', 'docs', 'BACKLINK-500-MASTER-PACK.txt');
fs.writeFileSync(txtOut, T.join('\n'));
console.log('WROTE', txtOut, T.join('\n').length, 'chars');

/* ---------------- CLEAN READABLE MD (topical-map.md jaisa saaf format) ---------------- */
const M = [];
M.push('# CalcProMaster — 500+ Free Backlink Sites');
M.push('');
M.push('Ye poori list 30 din ke plan ki hai: 1000 backlinks, sab free. Har site par account banao, URL aur description paste karo, email verify karo aur link LIVE ho jayega. Ek site barabar ek backlink. Roz 33 sites karo to 30 din me 1000 se upar. Koi site dead mile to list me agli site le lo, rukna nahi hai.');
M.push('');
M.push('## Sabse pehle — yehi paanch cheezein har site me paste karni hain');
M.push('');
M.push('- Site ka naam: ' + NAME);
M.push('- URL: ' + URL);
M.push('- Chhoti description jo title ya tagline wale khane me jayegi: ' + SHORT);
M.push('- Lambi description jo description wale khane me jayegi: ' + DESC);
M.push('- Keywords jo comma wale khane me jayenge: ' + KEYWORDS);
M.push('');
M.push('Account har site ke liye same hai. Email: ahunabuzar@gmail.com, Password: CalcPro@2026!, aur jab username maange to likho: ahunabuzar.');
M.push('');
M.push('Bio jab site maange to yeh daalo: ' + BIO);
M.push('');
M.push('## Structure (' + cats.length + ' categories · ' + SITES.length + ' sites)');
M.push('');
for (const cat of cats) {
  const list = SITES.filter(s => s.cat === cat);
  M.push('### ' + cat + ' (' + list.length + ' sites)');
  M.push('');
  list.forEach((s) => {
    M.push('- **' + prettyName(s.name) + '** — ' + cleanUrl(s.url) + ' — ' + loginLabel(s.login) + (s.note ? ' — ' + s.note : ''));
  });
  M.push('');
}
M.push('## Roz ka plan — 33 links har din');
M.push('');
M.push('- **Pehla hafta** — BOOKMARK ki 60 sites aur DIRECTORY ki 60 sites start karo, saath me roz 2-3 blog comments.');
M.push('- **Dusra hafta** — WEB2.0 ki 60 sites aur PROFILE ki 50 sites, aur Awesome-list ke PRs shuru kar do.');
M.push('- **Teesra hafta** — STARTUP-DIR ki 70 sites, PDF-DOC ki 30 sites, PRESS ki 25 sites aur FORUM ke genuine jawab.');
M.push('- **Chautha hafta** — IMAGE ki 20 sites, LOCAL-MISC ki 45 sites, COMMENTS ki 60 sites, aur jo reh gaya wo poora karo.');
M.push('');
M.push('Har complete link ki ek row yahan daalo: docs/1000-campaign-progress.csv');
M.push('');
const mdOut = path.join(__dirname, '..', 'docs', 'BACKLINK-500-MASTER-PACK.md');
fs.writeFileSync(mdOut, M.join('\n'));
console.log('WROTE', mdOut, M.join('\n').length, 'chars');
