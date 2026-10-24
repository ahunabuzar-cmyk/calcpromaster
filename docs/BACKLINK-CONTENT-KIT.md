# CalcProMaster — Content & Outreach Kit (link-magnet distribution)

**Maqsad:** har hafte 2–3 backlinks jo **organic** milein (kisi directory me bhik nahi maang rahe) —
content publish karo jisme aapka **embed widget** aur **tool pages** natural tarike se link hon.

**Do link magnets jo pehle se site par hain:**
- Embed page: `https://calcpromaster.com/embed/` (ready-to-paste iframe snippets)
- 1,282 tool pages + 11 guides: `https://calcpromaster.com/`

**Rule:** ek hi text ko multiple sites par copy-paste na karo. Har platform ke liye thoda badlo
(title + intro). Anchor 90% brand (`CalcProMaster`) ya naked URL.

---

## 1) Dev.to / Hashnode — tech article (dofollow)

**Title:** How I shipped 1,282 calculators as static pages (and why every answer shows its formula)

**Tags:** webdev, javascript, seo, performance

**Body:**

> Most online calculators are a black box: you type numbers, a bare result appears, and you have
> no idea which formula ran or whether the rounding is right. I wanted the opposite.
>
> **CalcProMaster** is a library of **1,282 free calculators** — EMI, mortgage, BMI, percentage,
> GPA, CAGR, SIP, calorie deficit and far more. Every tool does two things differently:
>
> 1. It shows the **exact formula** it used.
> 2. It shows the **full working, step by step**, so you can check it yourself.
>
> ### Why static?
> The whole thing is generated at build time. Each calculator is prerendered as its own HTML page
> with real `<title>`, meta description and canonical, so search engines and no-JS users get a
> complete page. A small client-side script then hydrates the live calculator. That keeps the
> bundle tiny (no framework), the pages fast, and the SEO honest — no cloaking, no doorway pages.
>
> ### Make it embeddable
> The nicest surprise: other publishers wanted the calculators on their own blogs. So there's a
> free embed page — one `<iframe>` snippet per tool, no signup, no tracking of the host's readers:
>
> > `https://calcpromaster.com/embed/`
>
> ### What I'd do differently
> - Show the formula *and* a worked example on the page, not just the input form.
> - Give each calculator a stable, human URL (`/finance/loan-emi`) instead of one giant SPA route.
> - Treat calculators as content: unique copy, not a template with the numbers swapped.
>
> Try it: **https://calcpromaster.com** — free, no signup, everything runs in your browser.

---

## 2) Medium — general / finance angle

**Title:** The quiet problem with every "free online calculator"

**Body:**

> Search any calculation and you'll find a hundred free calculators. Most share one flaw: they
> never tell you **how** they got the number.
>
> As someone who builds tools, that bothered me. So I built **CalcProMaster** — **1,282 free
> calculators** across finance, health, math, construction and everyday life, and every single one
> **shows its formula and its working**.
>
> A few examples of what that means in practice:
> - **Loan EMI:** you see the exact amortisation formula, not just the monthly figure.
> - **BMI:** the formula *and* the category thresholds are printed beside the result.
> - **Compound interest / SIP:** every period is broken out, so the growth is not a mystery.
>
> It's free forever, there's no signup, and nothing is uploaded — all calculations happen in your
> browser. If you run a blog, you can even **embed** any calculator on your own site in one line
> (`https://calcpromaster.com/embed/`).
>
> Free calculator library: **https://calcpromaster.com**

---

## 3) Short post (LinkedIn / Indie Hackers / X thread)

> Built **CalcProMaster** — 1,282 free online calculators, and every one shows the formula + the
> full working. No signup, no paywall, runs entirely in the browser.
>
> Bonus for bloggers: you can embed any calculator on your site with one `<iframe>` →
> https://calcpromaster.com/embed/
>
> → https://calcpromaster.com

---

## 4) Outreach email — for bloggers who write about finance/health/math

**Subject:** Free embeddable calculator for your [topic] articles (no signup)

> Hi [Name],
>
> I read your post on [specific article] — genuinely useful.
>
> I run **CalcProMaster**, a free library of 1,282 calculators that all show their formula and
> working (EMI, mortgage, BMI, percentage, GPA, etc.). For writers, the useful bit is the **free
> embed**: you can drop any calculator into your article with one `<iframe>` snippet — no signup,
> no tracking of your readers, mobile-friendly.
>
> Snippets: https://calcpromaster.com/embed/
>
> If it's useful, feel free to embed one; if you'd rather link, the matching tool page works too.
> Happy to answer anything.
>
> Thanks,
> [Your name] — CalcProMaster
> https://calcpromaster.com

**Rule:** sirf un logon ko email karo jinke articles me *actually* calculator relevant ho. Generic
blast = spam signal. Personalize karo (1 line unke content ke baare me).

---

## 5) GitHub awesome-list PR lines (paste-ready, white-hat)

Har list ke `README.md` me apne relevant section me ek line add karo (fork → branch → PR). Example
lines (exact wording list ke style ke hisaab se badlo):

- **awesome-finance** (`brandonhimpfen/awesome-finance`):
  `- [CalcProMaster](https://calcpromaster.com) - 1,282 free finance & everyday calculators that show the formula and every step.`
- **awesome-selfhosted / tools (embed section):**
  `- [CalcProMaster Embed](https://calcpromaster.com/embed/) - Free embeddable calculator widgets (EMI, BMI, percentage) for any website.`
- **awesome-calculators / awesome-math-tools (jo mile):**
  `- [CalcProMaster](https://calcpromaster.com) - 1,282 free calculators with transparent formulas and step-by-step working.`

PR etiquette: ek PR = ek list. Maintainer ke contributing rules padho. Reject ho to argue na karo.

---

## 6) Cadence (safe)

| Hafte | Kaam |
|---|---|
| Week 1 | Dev.to + Hashnode tech article, Medium article, LinkedIn short |
| Week 2 | 10 personalized outreach emails (bloggers), 2 awesome-list PRs |
| Week 3 | Data study draft ("what 1,282 calculators / X searches tell us"), 2 more PRs |
| Week 4 | Publish data study, reply to any embed requests, refresh tracker |

Ye route 2000 mass-links se behtar hai: kam links, par **editorial + relevant + dofollow**.
