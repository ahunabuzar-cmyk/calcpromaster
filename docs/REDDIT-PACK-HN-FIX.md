# Reddit Pack + HN Block Fix (ready-to-paste)

**Aap sirf submit karoge** — har post ka title, body, exact subreddit URL, flair aur
rules-warning sab yahan hai. Pehle HN wala masla + uska fix, phir Reddit.

---

## 0) HN "Sorry, your account isn't able to submit this site" — kya hai + 3 fixes

Ye message **aapki site ka masla NAHI hai** — HN naye/low-karma accounts ko `netlify.app`
jaise free-hosting domains par submissions se rokta hai (spam-control). Confirm kiya:
 Algolia HN search par calcpromaster ka koi purana spam-record nahi hai (0 hits).

**Fix options (priority order):**

1. **Email HN moderators (sabse seedha, 1 din mein jawab aata hai):**
   - To: `hn@ycombinator.com`
   - Subject: `New account unable to submit (netlify.app site)`
   - Body (copy-paste):
     ```
     Hi,

     My account is new, so I can't submit to Show HN yet ("Sorry, your account
     isn't able to submit this site"). Could you enable submissions for my
     account?

     What I want to post (Show HN):
     Title: Show HN: CalcProMaster – 1200 calculators that show their work (formulas + steps)
     URL: https://calcpromaster.netlify.app/

     It's a free, no-signup library of 1200+ client-side calculators where every
     tool states its formula, shows a step-by-step derivation from your inputs,
     and documents its limits. Happy to answer any questions.

     Username: <APNA_HN_USERNAME>
     Thanks!
     ```
2. **Karma route:** HN par 2–4 din sirf genuine comments karo (koi tech thread pakro),
   karma 10–20 hone par ye block khud hat jata hai — phir seedha submit karo.
3. **Text-post trick (aaj hi try karo):** URL field KHAALI chhod kar **text post** likho
   ("Ask HN: I built 1200 calculators that show their work — feedback?") — kabhi-kabhi
   text-post allow hote hain jab URL blocked ho. Agar ye bhi block ho to option 1 pakka.

**Reddit ke liye HN rukna zaroori NAHI** — dono parallel chal sakte hain.

---

## 1) Reddit — pehle 3 cheezein (10 min setup)

1. **Account:** purana karma-wala account use karo agar hai; naya hai to pehle din sirf
   comments/upvotes karo — naye account ki pehli post link ho to removal chance high.
2. **Read-first rule:** har subreddit ka 30-second rules check (sidebar → Rules) — niche
   neeche flair/rules likhe hain.
3. **Timing:** US morning (5:30–7:30 PM IST/PKT) — Tuesday–Thursday best.

### Subreddit shortlist (exact submit URLs + kya post hoga)

| Subreddit | Submit URL | Post type | Risk note |
|---|---|---|---|
| r/InternetIsBeautiful | reddit.com/r/InternetIsBeautiful/submit | **Link post** (site URL) | High-traffic, site showcase ok; title clickbait na ho |
| r/SideProject | reddit.com/r/SideProject/submit | Link ya Text | Launch-friendly, mods soft |
| r/SomebodyMakeThis | reddit.com/r/SomebodyMakeThis/submit | Link post | Small but zero-risk |
| r/math | reddit.com/r/math/submit | **Text post only** | Self-promo strict — formula-transparency angle se discuss karo |
| r/personalfinance | reddit.com/r/personalfinance/submit | Text post (answer context mein) | Strict — sirf EMI/loan thread ke jawab mein link |
| r/Fitness | reddit.com/r/Fitness/submit | Text post | Strict — BMR/TDEE discussion mein tool mention |
| r/excel | reddit.com/r/excel/submit | Text post | Agar Excel-formula tools ka angle banao |

**Safe play:** pehle din sirf r/InternetIsBeautiful + r/SideProject (link posts), agle din
2 niche text-answers.

---

## 2) r/InternetIsBeautiful — copy-paste (LINK POST)

**Submit URL:** https://www.reddit.com/r/InternetIsBeautiful/submit
**Type:** Link · **URL field:** `https://calcpromaster.netlify.app/`

**Title (copy-paste):**
```
I built a site with 1200+ free calculators that show every step of the math — no black boxes
```

**Reddit body (Link post mein bhi "text" section hota hai — ye paste karo):**
```
Most calculator sites give you a number and hide where it came from. This one states the
exact formula each tool uses (standard amortization for loans, Mifflin-St Jeor for calories,
Darcy-Weisbach for pipe loss...), shows the derivation from YOUR inputs step by step, and
documents its assumptions and limits on every page.

Everything runs in the browser — no accounts, no data sent anywhere, works offline after
first load. There's also a public QA dashboard that tracks the verification status of every
calculator's math.

Examples to try:
- Loan EMI: https://calcpromaster.netlify.app/finance/loan-emi/
- BMI (with the formula + zone breakdown): https://calcpromaster.netlify.app/health/bmi/
- Concrete slab (bags + wastage buffer): https://calcpromaster.netlify.app/construction/concrete-slab/

Happy to take requests — if a calculator is missing or a formula looks wrong, tell me and
I'll fix it publicly.
```

**Flair:** agar list mein ho to `Website`/`Site` choose karo.

---

## 3) r/SideProject — copy-paste (TEXT POST best yahan)

**Submit URL:** https://www.reddit.com/r/SideProject/submit

**Title:**
```
Launched: 1200+ free calculators that show their work (formulas + step-by-step, no signup)
```

**Body:**
```
Hey! Over the last few months I built CalcProMaster — 1200+ calculators across finance,
health, construction, math and everyday stuff.

The differentiator: every calculator shows its work. Formula, step-by-step derivation from
your inputs, worked examples, and an honest "what this does NOT model" section (e.g. the
German payroll tool says plainly it approximates the official Lohnsteuer formula).

Stack: vanilla JS, no framework, static-site generator prerenders all 1300+ routes; the
whole site is static files. Works offline after first load, no accounts, nothing tracked.

URL: https://calcpromaster.netlify.app/

What I'd love feedback on:
1. Is the step-by-step breakdown useful or noise?
2. Which calculators are missing that you'd actually use?

Roast the formulas — verifiability is the whole point.
```

---

## 4) Niche answers (agle din — 2 minimum, copy-paste + 1 line customize)

### r/personalfinance style answer (kisi "how much house can I afford" thread ke jawab mein)

```
When I ran the numbers, the down payment wasn't the binding constraint — it was the
PMI + property-tax stack. If you want to check your own case, I built a free calculator
that shows the full payment breakdown with the formula visible (no signup, runs in browser):
https://calcpromaster.netlify.app/mortgage/ — the steps panel shows exactly how PMI drops
off once equity crosses 20%.
```
*(Thread dhoondo: reddit.com/r/personalfinance/search/?q=how%20much%20house%20can%20i%20afford&sort=new)*

### r/math style answer (kisi "how do I compute X" thread mein)

```
Depends on your definition of least squares — if you want the slope/intercept/R² explicitly,
I keep a calculator that shows the normal-equation derivation step by step:
https://calcpromaster.netlify.app/math/linear-regression/ (client-side, no signup). The
steps panel prints XᵀX and Xᵀy so you can verify by hand.
```
*(Thread dhoondo: reddit.com/r/math/search/?q=least%20squares%20calculator&sort=new&restrict_sr=1)*

### r/Fitness style answer (TDEE/BMR threads)

```
Formula matters more than the app here — most sites hide which equation they use. Mine
states it (Mifflin-St Jeor, with the population limits it was derived from) and shows the
math: https://calcpromaster.netlify.app/health/tdee-macro/ — no signup, runs locally.
```

**Reddit golden rules:** comment pehle, link baad mein; ek thread mein sirf apna link NAHI;
"check out my site" nahi — "here's the math, verify it" framing; 10 upvotes ka bhi jawab do.

---

## 5) Submit ke baad checklist (main karunga)

- [ ] Live-site verify (naya og-image live hai?)
- [ ] IndexNow re-ping (referral traffic ke pehle cache warm)
- [ ] GSC batch #3 + 7-din tracker (PH/HN/Reddit spike impressions report)
