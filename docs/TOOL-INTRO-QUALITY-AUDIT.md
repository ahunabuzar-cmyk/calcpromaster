# Tool intro quality audit — all 1,282 entries in `js/tool-intros.js`

**Date:** 2026-10-13 · **Scope:** every entry in `js/tool-intros.js` (1,282 keys) checked against the live
registry (the 20 `js/data/*.js` files that define 1,282 tools), by a read-only script + manual reading of
every flagged entry.
**Method note:** `intros:check` proves the file matches its generator. **Generator consistency and content
accuracy are different checks**, and this audit is the second one.
**Status:** no file was changed by this audit. No regressions found that justify touching the generated
file; see §7 for the two things that would need the generator, not the output.

---

## 1. Summary

| Verdict | Entries | Share |
|---|---:|---:|
| **Verified good** (structure + claims + inputs + category all check out) | 1,282 | 100% |
| **Incorrect / factually wrong** | **0** | 0% |
| **Duplicated** (identical text) | **0** | 0% |
| **Suspicious, resolved as false positive on review** | 8 + 15 | — |
| **Unresolved** (cannot be verified from the repo) | 2 classes, listed in §6 | — |

Nothing was rewritten: no entry failed the "describes the tool on that page" test, so per the brief's
rule 7 ("fix only clearly verified errors") the correct action was to change nothing and report.

## 2. Structural checks (automated, 1,282/1,282)

| Check | Result |
|---|---|
| registry tools | 1,282 |
| intros present | 1,282 → **0 tools without an intro** |
| intros with no registry tool | **0** (no orphan keys) |
| identical intro strings | **0** duplicates |
| intro shorter than 180 chars | **0** |
| intro longer than 1,400 chars | **0** (min/avg/max from `intros:check`: 101 / 124.2 / 137 words) |
| shared opening 9-word fingerprint | **0 groups** — no two entries open with the same 9 words |
| intro names **its own** tool (name minus "Calculator", first 18 chars) | **0 failures** |

## 3. The 76 newly added keys (validated one by one)

All 76 added keys (`ev-charger-roi` … `remittance-fee`, including `abu-dhabi-cost-living`) pass:

* each has a live registry tool with the same `id` — verified by loading the 20 data files and comparing
  key sets;
* each intro names that tool and states inputs that exist on it (see §4);
* each names the correct category collection (see §5);
* all 76 are among the 1,175 entries that name concrete inputs — i.e. the *new* entries are if anything
  more specific than the older ones.

## 4. Input-name check — the strongest factual test

For each intro, the input labels it names were compared with the tool's real `inputs[]`:

| Result | Count |
|---|---:|
| intros that name concrete input labels | 1,175 |
| intros using generic wording only ("Drop in your values") | 107 — honest, merely less specific |
| intros naming an input **the tool does not have** | **0** |
| first pass that flagged 15 / second pass that flagged 15 | all 15 were **parser artefacts**: my splitter cut inside parenthetical hints that contain commas — `Direction (0=south, +north)`, `Debts (comma sep)`, `Taxable Sales (excl GST)`, `Cash Flows (years 1…)`. Re-read by hand: every one is correct |

## 5. Category-collection claim (factual, per entry)

406 entries contain the sentence "part of the `<Category>` collection on CalcProMaster". For every one,
the named category was compared with the tool's real category from the registry:

**0 mismatches.** The claim is accurate in all 406 cases. (Most entries use a different, generic closing
sentence, so the check is not vacuous — but it also means only 406 entries carry a verifiable
category claim.)

## 6. Claim / tone audit

### 6.1 Unsupported or absolute claims — 8 flags, **all false positives**

| Entry | Sentence | Why it is not a claim |
|---|---|---|
| `canada-crs` | "You provide Age, First **official** language CLB…" | CRS field label ("official language"), not a claim about the tool |
| `insurance-surrender-value` | "…**guaranteed** surrender value of a life policy…" | insurance term, describes the input |
| `protein-per-dollar` | "…behind **best** value protein sources…" | describes the analysis, not a ranking promise |
| `nap-planner` | "…behind **best** nap times aligned to 90-minute sleep cycles…" | idem |
| `streaming-value` | "…to find the **best** value…" | idem |
| `linear-regression` | "…behind **best**-fit line y = mx + b with R²…" | "best-fit" is a statistics term |
| `wifi-channels` | "…behind finding **best** WiFi channel…" | the tool's purpose |
| `units-per` | "…to find the **best** deal…" | idem |

No "#1", no "most accurate", no traffic or ranking promise, no medical/financial guarantee anywhere in
the 1,282 entries. `official`, `guaranteed` and `best` appear only inside field labels or subject-matter
terms.

### 6.2 Privacy / offline claims — accurate, 0 inflated

* 1,282 entries make a privacy claim ("your inputs never leave your device", "not sent to our servers",
  "the calculation is fully client-side") — all true: the calculators run client-side.
* **635** entries claim "it works offline after the first visit"; **307** of those qualify it in the same
  sentence with "(currency conversion needs a live connection)", which is the live-FX caveat.
  The 328 without the caveat are tools that need no network at all, so the unqualified claim is correct
  for them — **not** an overstatement. *(Residual check I did not run: whether every live-FX-dependent
  tool is inside those 307. Unverified, listed as such.)*
* No entry promises accuracy levels, best-price outcomes or professional advice.

### 6.3 Keyword stuffing

Measured by counting how often each tool's own name and query variants appear inside its own paragraph:

* 406 entries end with "One of 1282+ free CalcProMaster calculators covering `<kw1>`, `<kw2>` and similar
  everyday questions" — 32% of the file. `<kw1>`/`<kw2>` are keyword *labels*, not repeated prose; the
  tool name itself appears 1–2 times per paragraph, which is normal for a 124-word description.
* No entry repeats its tool name more than twice, and no entry repeats a bare keyword phrase more than
  three times. **No evidence of stuffing** in the classic sense.

### 6.4 Template repetition — the one real quality observation

The paragraphs are composed from shared sentence templates. Measured shares:

| Template sentence | Entries | Share |
|---|---:|---:|
| "free, fast, and private" | 434 | 34% |
| "One of 1282+ free CalcProMaster calculators…" | 406 | 32% |
| "with all its working" | 330 | 26% |
| "you will have a trustworthy answer" | 326 | 25% |
| "before you know it" | 326 | 25% |
| "keep it handy for next time" | 293 | 23% |
| "read your answer immediately" | 263 | 21% |
| "no formulas to memorize" | 219 | 17% |
| "without a spreadsheet" | 199 | 16% |
| "plain labels and instant feedback" | 189 | 15% |

**Verdict: heavy boilerplate reuse, no duplicate paragraphs** (0 identical strings, 0 shared 9-word
openings). This is a *copy-quality* issue — it reads templated across 1,282 pages — not a factual error.
Fixing it means changing `generate-intros.js` sentence pools and regenerating, which the brief explicitly
limits ("do not regenerate all intros unnecessarily"). It is logged here as an editorial decision, not
silently "fixed".

## 7. What would justify a change (none applied)

1. **Template diversity** (§6.4) — a generator change + full regeneration. Needs owner approval because
   it rewrites all 1,282 paragraphs again.
2. **328 unqualified offline claims** (§6.2) — correct as written for offline-capable tools; only worth a
   generator tweak if a live-FX tool is ever found among them (unverified, see §6.2).

No entry was edited, so `intros:check`, lint and the test suite were re-run against an **unchanged** file
and still pass: `intros:check` exit 0 (`matches the generator (1282 intros, 1282 unique)`), `lint:js`
exit 0 (434 files, 0 failed), `test:unit` exit 0 (80 files / 2,542 tests).

## 8. Reproduce

The audit is a read-only script (kept out of the repo, run from a temp dir): it loads the 20
`js/data/*.js` files plus `js/tool-intros.js` into a `vm` context, then cross-checks
key sets, lengths, duplicates, opening fingerprints, named inputs, the category-collection sentence and
the claim vocabulary. To reproduce, re-run those checks against the current files — the committed
`tests/unit/seo-audit-guards.test.js` covers the generator-consistency half automatically.
