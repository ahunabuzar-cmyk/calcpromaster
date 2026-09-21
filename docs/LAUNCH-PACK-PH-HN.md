# Launch Pack — Product Hunt + Show HN (ready-to-paste)

**Aap sirf 3 kaam karoge:** (1) neeche ke LINKS kholo, (2) COPY karo, (3) PASTE + Submit.
Baqi sab (content, tagline, comments, timing) yahin ready hai.

⚠️ **Pehle deploy zaroori hai** — PH/HN traffic seedhe site par aata hai. Live site abhi purani
deploy hai; push + deploy ke BAAD hi launch karo.

---

## 1) Product Hunt

**Submit link:** https://www.producthunt.com/posts/new (login ke baad khulega)

**Best time:** Tuesday–Thursday, 12:01 AM Pacific (12:31 PM IST / 12:31 PKT). Launch Tuesday rakho,
weekday traffic sabse zyada hota hai.

### Paste-ready fields

**Name (60 chars max):**
```
CalcProMaster — 1200+ Free Calculators
```

**Tagline (60 chars max):**
```
1200+ free calculators that show every step of the math
```

**Website URL:**
```
https://calcpromaster.netlify.app/
```

**Description (260 chars max):**
```
1200+ free online calculators across finance, health, math, construction and more. Unlike
black-box tools, every calculator shows the exact formula, a step-by-step breakdown and
worked examples — so you can verify the math. No sign-up, runs in your browser.
```

**Topics (pick 3):** Productivity · Web App · Education

**First comment (post AS the maker, immediately after submit):**
```
Hi PH! 👋

I built CalcProMaster because every calculator site I tried felt like a black box — you get a
number but no idea where it came from.

So I built 1200+ calculators that show their work:
• The exact formula each tool uses (amortization, Mifflin-St Jeor, concrete volumes…)
• Step-by-step breakdown of YOUR inputs → result
• Worked examples, assumptions and limits documented on every page
• A public QA dashboard that tracks verification status of every calculator's math

It's completely free, no sign-up, everything runs in your browser — nothing leaves your device.

What I'd love feedback on:
1. Is the step-by-step breakdown actually useful, or noise?
2. Which calculator did you try first, and did it give the answer you expected?

Roast my formulas — the whole point is verifiability. 🔍
```

**Gallery tip:** Homepage screenshot + 1 tool page (loan EMI, jo steps panel dikha raha ho) +
1 chart screenshot. Free tool: https://screenshot.guru ya browser full-page screenshot.

---

## 2) Hacker News — Show HN

**Submit link:** https://news.ycombinator.com/submit (login zaroori)

**Best time:** Tuesday–Thursday, 8–10 AM Eastern (5:30–7:30 PM IST/PKT) — US morning pe
front-page activity peak hoti hai.

**Title (exact format — "Show HN" prefix lazmi):**
```
Show HN: CalcProMaster – 1200 calculators that show their work (formulas + steps)
```

**URL field:** `https://calcpromaster.netlify.app/`
(Ask HN style text-post nahi — direct URL post karo)

**First comment (aap khud turant post karo):**
```
Hi HN! I built this because calculator sites mostly give you a number and hide the math.

Every one of the 1200 calculators:

- states the exact formula it uses (e.g. standard amortization for loans, Mifflin-St Jeor
  for BMR, Darcy-Weisbach for pipe loss)
- shows a step-by-step derivation from your inputs to the result
- documents assumptions and where it deliberately does NOT model reality (e.g. the German
  payroll tool says plainly it approximates the piecewise Lohnsteuer formula)
- links to a public QA dashboard tracking the verification status of every calculator's math

No accounts, no server round-trips — all client-side JS, works offline after first load.

The part I'm most unsure about: whether "show your work" calculators are actually preferred
by users, or whether people just want the number. Would love to hear what this crowd thinks.

Technical notes: vanilla JS, no framework, no build pipeline beyond a static-site generator
that prerenders all 1337 routes; the whole site is static files on Netlify.
```

**HN etiquette (important — votes/meta-gaming rule toot gaya to flag ho jata hai):**
- Kisi se vote ya comment MAAT mango — HN ise strictly penalize karta hai
- Agar front page par aaya to comments ka JAWAB DENA zaroori (pehle 2 hours critical)
- "1200 calculators" skepticism aa sakta hai — jawab: QA dashboard + formula transparency
  link do, har tool ka formula page pe visible hai

---

## 3) Submit ke baad (main karunga)

Jab aap dono submissions kar do, mujhe bolo — main:
1. Deploy-live verify (canonical/sitemap/schema live check)
2. GSC batch #3 inspection (indexing movement)
3. PH/HN referral spike ka GSC impressions impact track karunga (tracker already set hai)

## Backup listing (agar PH moderator "previously posted" flag kare)

Alternative tagline variant:
```
Every calculator shows the formula — 1200 of them, all free
```
Alternative HN title variant:
```
Show HN: 1200 client-side calculators with visible formulas and step-by-step math
```
