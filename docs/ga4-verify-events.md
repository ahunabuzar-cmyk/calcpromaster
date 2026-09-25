# CalcProMaster — GA4 Events Verify Guide

GA4 wiring ke baad (Measurement ID set + deploy), ye check karta hai ki events **asli mein fire** ho rahe hain ya nahi.

## Method 1 — Browser Network tab (2 min, sabse reliable)

1. Live site kholo: https://calcpromaster.com
2. **F12** → **Network** tab
3. Filter box mein likho: `collect` (ya `gtag`)
4. Page refresh karo → `googletagmanager.com/gtag/js?id=G-...` (HTTP 200) dikhna chahiye
5. Koi calculator kholo (e.g. `/finance/loan-emi`) → **Calculate** dabao
6. Network mein ek nayi `collect` request aani chahiye
7. Uski **Payload** tab kholo → `en=calculator_use`, `tool_id=loan-emi`, `tool_category=finance` hoga

> ❌ Agar `collect` request nahi aati: consent overlay pe **Accept** daba kar try karo
> (consent-gated hai — bina consent ke data nahi jaata, by design).

## Method 2 — GA4 Realtime report (1 min)

1. https://analytics.google.com → apna property → **Reports → Realtime**
2. Ek tab mein live site kholo → koi calculator calculate karo
3. Realtime mein **5-30 sec** mein dikhega:
   - `page_view` event (page kholne pe)
   - `calculator_use` event (calculate dabane pe) — Event count ke saath
4. "Users in last 30 minutes" counter bhi update hoga

> Realtime sirf current users dikhata hai. Agar koi aur aapke saath site khol raha hai,
> aapko bhi dikh jayega. Standard reports mein data **24-48h** baad aata hai.

## Method 3 — Script check (deployed code confirm, 1 min)

```bash
# app.js mein event code present hai?
curl -s https://calcpromaster.com/js/app.js | grep -c calculator_use
# → 1 aaye = event deployed

# gtag loader live hai?
curl -s https://calcpromaster.com/js/site-config.js | grep -o "ga4Id: '[^']*'"
# → ga4Id: 'G-XXXX' (real ID) aaye = config deployed
```

## Kya events fire hote hain

| Event | Kab | Data (kya bheja jaata hai) |
|---|---|---|
| `page_view` | Har page load | Standard GA4 (URL, referrer) |
| `calculator_use` | Har calculation | `tool_id` (e.g. `loan-emi`), `tool_category` (e.g. `finance`) |

**Kya kabhi nahi jaata:** input values (loan amount, health data, email), PII, aur kuch bhi
calculator-specific. Sirf tool identity — isliye analytics privacy-safe hai.

## Problem-solving

| Problem | Likely cause | Fix |
|---|---|---|
| gtag.js request hi nahi | ID set nahi hua ya placeholder | `node scripts/set-ga4.cjs G-REAL_ID` (ya `js/site-config.js` check) |
| gtag.js 200 hai, `collect` nahi | Consent nahi diya | Overlay pe Accept dabao |
| `collect` aata hai, Realtime mein nahi | 5-30 sec wait karo | Page refresh + dobara calculate |
| Realtime mein sirf aap dikhte ho | Koi aur nahi tha us waqt | Normal — 24-48h standard reports mein data aayega |
| Adblock on hai | gtag block ho sakta hai | Test browser mein adblock off karo |
