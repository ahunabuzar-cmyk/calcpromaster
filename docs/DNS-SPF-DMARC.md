# SPF + DMARC — EXACT DNS Records (Spaceship Panel)

**Verified aaj (27 Sep):** `calcpromaster.com` par SPF/DMARC dono MISSING hain (DNS lookup: DMARC = NXDOMAIN).
Ye 2 records add karne se audit ka "DMARC/SPF missing" + email spoofing ka masla khatam.

## Kahan add karna hai
1. **spaceship.com** → login (wahi jahan domain kharida tha)
2. Domain **calcpromaster.com** → **DNS Settings / Manage DNS**
3. **Add Record** → type **TXT** → neeche wale 2 records ek-ek karke

## Record 1 — SPF (bhejne wali server saaf batao)
| Field | Value |
|---|---|
| Type | `TXT` |
| Name / Host | `@` (khali bhi chalega — root) |
| Value | `v=spf1 include:_spf.google.com ~all` |
| TTL | `3600` (ya Auto) |

**Matlab:** sirf Google Workspace (gmail apni taraf se) mail bhej sakta hai; baqi sab soft-fail.
(Tumhi Gmail se email bhejte ho — outreach emails isliye Gmail se hain, aur SPF sahi beth raha hai.)

## Record 2 — DMARC (spoofing roko + reports dekho)
| Field | Value |
|---|---|
| Type | `TXT` |
| Name / Host | `_dmarc` |
| Value | `v=DMARC1; p=none; rua=mailto:calpromaster@gmail.com; fo=1` |
| TTL | `3600` (ya Auto) |

**Matlab:** `p=none` = monitor-only (pehle mahine ka safe start). Reports har email activity ki
Gmail par aayengi. 2-4 hafte baad jab dikh jaye koi legit mail block ho raha nahi, to:
`p=quarantine` kar dena (phir `p=reject` — full protection).

## Verify (2 ghante-24 ghante baad)
```
nslookup -type=TXT calcpromaster.com
nslookup -type=TXT _dmarc.calcpromaster.com
```
Ya web pe: mxtoolbox.com/spf.aspx + mxtoolbox.com/dmarc.aspx → `calcpromaster.com` daalo.

## Optional (agar baad mein custom-domain email lo, jaise abuzar@calcpromaster.com)
Google Workspace lo → MX records + SPF wahi rahega + DKIM CNAME Workspace ke admin se aayega.
Abhi ke liye SPF+DMARC kaafi hain (audit ka point clear ho jayega).
