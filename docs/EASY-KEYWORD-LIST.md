# Easy-KeyWord Target List — Rank-Karan ke liye Verified Keywords

> **Generated:** 2026-09-19 · **Method:** Live Google SERP probes (15 representative keywords,
> har ek ke top-10 results ka manual verdict) + site inventory se 273 EASY-tier candidates.
> **Regenerate:** probes live hain, is doc ko machine-generate nahi kiya gaya — niche-level
> rules se naye candidates nikaalne ke liye `scripts/keyword-difficulty.cjs` tiering use karo.

---

## Tumhara rule — aur iska honest translation

Tumhara rule tha: *volume/traffic acha ho + top-10 mein jo rank karte hain unki DR 20 se kam ho.*

- **DR API (Ahrefs) ka access nahi hai** — isliye DR ko do asli proxies se measure kiya:
  1. **Brand-wall check:** kya top-10 mein calculator.net, omnicalculator, gigacalculator,
     bade fintech (Groww, ICICI, Paisabazaar), hardware brands (Seagate, Synology) hain?
     Inke DR 70-90 hote hain — yeSERP aane par keyword REJECT.
  2. **Microsite count:** top-10 mein kitni chhoti/weak sites hain (naye tools sites,
     single-purpose calculators, chhote SaaS, gov/edu extension pages)? Zyada microsites =
     Google ko is query par koi strong page nahi mila = WINNABLE.
- **Volume:** exact search volume ke liye GSC/API credentials chahiye (abhi locked). Demand ka
  proxy: keyword length (4+ shabd = specific intent), People-Also-Ask box ka hona, related
  searches ki tadaad, aur ye ke query ek "kaam karne wale" tool intent hai (calculator/need/
  cost/how many). PAA + related-rich SERPs = real search demand.

**Bottom line:** neeche ki GO list par ye keywords aisay hain jahan top-10 mein
**strong brands 2 se kam** hain — tumhare "DR 20 se kam wali sites rank karti hain" wale
rule ka seedha implementation.

---

## 1. Evidence — 15 live probes (aaj ke Google results)

| # | Keyword (probed) | Top-10 mein strong brands | Verdict |
|---|---|---|---|
| 1 | late payment interest calculator overdue invoice | **0** — sirf chhote SaaS/microsites + 2 gov pages | ✅ WIN |
| 2 | speech time calculator words per minute | **1** — 6-7 microsites | ✅ WIN |
| 3 | post hole concrete calculator fence posts | **2** — 6 chhoti DIY sites | ✅ WIN |
| 4 | UPS battery sizing calculator ah runtime backup | **2-3 (Eaton/APC vendor pages)** — 6-7 microsites | ✅ WIN |
| 5 | lawn fertilizer calculator nitrogen rate per 1000 sq ft | **0 commercial tools** — gov/edu extension pages rank karti hain = intent gap | ✅ WIN |
| 6 | prorated rent calculator partial month | 2-3 (apartment/listing brands) | ⚠️ BORDERLINE |
| 7 | food cost percentage calculator restaurant | 2-3 + aadha SERP articles | ⚠️ BORDERLINE |
| 8 | PPI calculator pixels per inch | 2-3 | ⚠️ BORDERLINE |
| 9 | hybrid vs gas savings calculator mpg | 2-3 (automotive media) | ⚠️ BORDERLINE |
| 10 | stair stringer calculator riser height tread depth | 3 (calculator.net #3, decks.com) | ⚠️ BORDERLINE |
| 11 | gravel driveway calculator tons cubic yards | 2-3 | ⚠️ BORDERLINE |
| 12 | how many bags of concrete do i need calculator | 4+ (calculator.net, omnicalculator, inchcalculator) | ❌ BRAND WALL |
| 13 | TDEE calculator macro split | 4+ (health brands) | ❌ BRAND WALL |
| 14 | CAGR calculator compound annual growth rate | 5+ (Groww, Investopedia, Paisabazaar) | ❌ BRAND WALL |
| 15 | FD vs RD calculator | 5+ (ICICI, Groww, Paisabazaar) | ❌ BRAND WALL |
| — | RAID calculator usable capacity raid 5 raid 10 | 5+ (Seagate, WD, Synology, QNAP) | ❌ BRAND WALL |
| — | loan/EMI/mortgage/BMI/BMR/salary/tax heads | 5+ har probe mein | ❌ BRAND WALL |

**Pattern (rule derivation):**
- **WIN niches:** SME/invoicing, DIY-construction ek-step-deep queries, IT/power sizing,
  lab/engineering single-formula, lawn/garden, speech/productivity. Non-YMYL, koi bada
  calculator-brand ne in niches ko cover nahi kiya.
- **BORDERLINE:** chhaan-ne par winnable hain lekin pehle on-page gap dekhna hoga.
- **BRAND WALL:** finance/YMYL heads + generic 2-3 shabd calculator queries — **abhi mat
  target karo** (ye wahi keywords hain jahan DR 80+ brands rank karti hain).

---

## 2. GO LIST — Tier A: probe-verified (in par abhi kaam shuru karo)

Har row: target keyword → jo page already site par bana hua hai (naya page banane ki zaroorat nahi).

| # | Keyword (volume-proxy: tool-intent + PAA-rich) | Target page | Niche |
|---|---|---|---|
| 1 | late payment interest calculator overdue invoice | `/finance/late-fee-interest` | SME/invoicing |
| 2 | speech time calculator words per minute | `/utilities/speech-time` | productivity |
| 3 | post hole concrete calculator fence posts | `/construction/post-hole-concrete` | DIY-construction |
| 4 | UPS battery sizing calculator ah runtime backup | `/engineering/ups-sizing` | IT/power |
| 5 | lawn fertilizer calculator nitrogen rate per 1000 sq ft | `/lifestyle/lawn-fertilizer` | lawn/garden |




**Ye 5 sabse pehle karo:** inke SERPs mein strong competition zero/near-zero hai, aur site ke
paas already matching tool page hai. Kaam sirf ye hai: page ke title/H1/kw in exact phrases par
align karo (already aligned hain — `kw` fields inhi phrases ko target karti hain), internal
links cluster se do (CLUSTER-LINKING-PLAN.md), aur IndexNow ping deploy ke baad.

## 3. GO LIST — Tier B: same-niche siblings (model-predicted, probe pending)

In niches ke jo SERP weak nikle, wahan ke sibling long-tails bhi practically utne hi easy
hain (same competitors har sibling query par aate hain). Ye Tier A ke saath batch mein target karo:

**SME/utility (probe #1, #2 family)**
| Keyword | Page |
|---|---|
| invoice late fee calculator percent per month | `/finance/late-fee-interest` |
| meeting speech time calculator word count pace | `/utilities/speech-time` |
| words to minutes converter presentation | `/utilities/speech-time` |

**DIY-construction (probe #3 family — sabse deep inventory yahan hai)**
| Keyword | Page |
|---|---|
| fence post spacing calculator distance between posts | `/construction/post-hole-concrete` sibling |
| concrete footing calculator post size depth | `/construction/post-hole-concrete` |
| siding squares calculator vinyl waste factor | `/construction/siding-squares` |
| insulation coverage calculator batts r value | `/construction/insulation-batts` |
| stair stringer calculator total rise run code (sirf code-compliance modifier ke saath — generic stair wala borderline hai) | `/construction/stair-stringer` |

**IT/power/engineering (probe #4 family)**
| Keyword | Page |
|---|---|
| inverter battery backup time calculator load watts | `/engineering/ups-sizing` |
| three phase power calculator kva power factor | `/engineering/three-phase-power` |
| pulley speed calculator rpm diameter ratio | `/engineering/pulley-speed` |
| manning equation calculator pipe flow slope | `/engineering/manning-flow` |
| radiation shielding calculator half value layer | `/engineering/radiation-shielding` |
| shaft torsion calculator shear stress torque | `/engineering/shaft-torsion` |

**Lab/science single-formula (weak SERP pattern — university pages hi rank karti hain)**
| Keyword | Page |
|---|---|
| rcf calculator g force centrifuge rpm rotor radius | `/engineering/rcf-gforce` |
| freezing point depression calculator molality kf | `/science/freezing-depression` |
| carbon dating calculator c14 half life | `/science/carbon-dating` |
| air density calculator altitude temperature engine tuning | `/science/air-density` |
| sound intensity addition calculator decibel combine sources | `/science/sound-intensity` |

**Lawn/garden (probe #5 family)**
| Keyword | Page |
|---|---|
| fertilizer bag coverage calculator npk ratio lawn | `/lifestyle/lawn-fertilizer` |

**Tech-digital (microsite-dominated SERPs, non-YMYL)**
| Keyword | Page |
|---|---|
| video file size calculator bitrate duration | `/tech-digital/video-bitrate` |
| password entropy calculator bits crack time | `/utilities/password-entropy` |
| wifi throughput calculator real transfer rate overhead | `/tech-digital/wifi-throughput` |
| load test virtual users calculator rps | `/tech-digital/load-test-users` |

**Tier B total: ~21 keywords** (5 niches, har niche ka SERP probe se weak confirm).

## 4. BORDERLINE queue (Tier C — Tier A/B ke baad dekho)

Prorated rent partial month, food cost percentage restaurant, PPI pixels per inch,
hybrid vs gas savings mpg, stair stringer generic, gravel driveway tons.
In par entry tab karo jab: (a) Tier A/B ke 10-15 wins rank karne lagein (site authority thodi
ban jayegi), ya (b) GSC data aaye aur in queries ke impressions dikhne lagein.

## 5. REJECT list — waqt barbaad (brand-wall, abhi bilkul nahi)

- Finance/YMYL heads: loan, EMI, mortgage, CAGR, FD-vs-RD, salary, tax, insurance,
  retirement, investment — top-10 full of DR 70-90 fintech brands.
- Health heads: BMI, BMR, TDEE, calorie — health-brand wall.
- Generic 2-3 shabd calculator queries: "concrete calculator", "RAID calculator",
  "percentage calculator" — calculator.net/omnicalculator/inchcalculator wall.
- Ye keywords doc `KEYWORD-DIFFICULTY.md` mein HARD/PARK tier mein already marked hain —
  authority ban jane ke baad (100+ ranking pages, real backlinks) dobara dekho.

---

## 6. Kaise use karo (priority order)

1. **Tier A ke 5 keywords** par pages ki on-page already aligned hai — inhe CLUSTER-LINKING-PLAN
   ke hisaab se internally link karo.
2. **Deploy push karo** (Netlify) — phir IndexNow auto-ping (CI workflow wired hai) + Bing
   verification file live ho jayegi.
3. **2-4 hafton baad** GSC (credentials abhi pending) + Bing Webmaster data se in 5 ka
   impressions/positions check karo — pehla real feedback loop.
4. Jo win ho jaye, usi niche ke **Tier B siblings** expand karo. Jo na chale, niche REJECT
   samjho — probes ke bina ye iterate karna hi sahi strategy hai.
5. Naya content likhne se pehle ye doc update karo — **naye pages nahi, existing 1,332 pages
   in keywords par already hain.** Yehi site ki sabse badi strength hai.

**Honest limits:** (a) exact search volumes ke liye GSC/API chahiye — volume proxies
structural hain; (b) DR exact nahi, brand-presence proxy hai; (c) probes ka snapshot
2026-09-19 ka hai — SERPs drift karte hain, entry se pehle ek re-check banta hai.
