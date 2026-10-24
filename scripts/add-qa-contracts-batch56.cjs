#!/usr/bin/env node
// Adds QA contracts for the 15 regional tools shipped in batches #5 and #6.
// They were missing from docs/qa-contracts.json, so the sitemap quality gate
// flagged them with "no QA contract". Idempotent: skips ids that already exist.
// Verification evidence:
//   tests/unit/regional-takehome-batch56-qa.test.js (independent known-answer models)
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'docs', 'qa-contracts.json');
const c = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const arr = Array.isArray(c) ? c : (c.contracts || c.calculators);
const TEST = 'SEE tests/unit/regional-takehome-batch56-qa.test.js';

const NEW = [
  // ---- batch #5 ----
  ['kenya-take-home-salary', 'Kenya Take-Home Salary Calculator', 'Gross Monthly Salary (KES) (number)',
   'PAYE 2025 monthly bands 10% to 24,000 / 25% to 32,333 / 30% to 500,000 / 32.5% to 800,000 / 35% above; personal relief KES 2,400/mo; NSSF 6% employee matched (capped on KES 108,000 upper limit); SHIF 2.75% of gross; Housing Levy 1.5% of gross; take-home = gross - PAYE - NSSF - SHIF - Levy'],
  ['nigeria-take-home-salary', 'Nigeria Take-Home Salary Calculator', 'Gross Monthly Salary (NGN) (number)',
   'Nigeria Tax Act 2025 annual bands 0% to 800,000 / 15% to 3,000,000 / 18% to 12,000,000 / 21% to 25,000,000 / 23% to 50,000,000 / 25% above; pension 8% of gross (employee); take-home = gross - PAYE/12 - pension'],
  ['philippines-take-home-salary', 'Philippines Take-Home Salary Calculator', 'Gross Monthly Salary (PHP) (number)',
   'BIR 2025 monthly graduated 0% to 20,833 / 15% to 33,333 / 20% to 66,667 / 25% to 166,667 / 30% to 666,667 / 35% above; SSS 5% employee capped at MSC 35,000; PhilHealth 2.5% capped at 100,000; Pag-IBIG 2% capped at 10,000; take-home = gross - SSS - PhilHealth - Pag-IBIG - tax'],
  ['bangladesh-income-tax', 'Bangladesh Income Tax Calculator', 'Annual Income (BDT) (number); Taxpayer Category (select General / Woman or senior 65+ / Physically challenged / War-wounded freedom fighter)',
   'FY 2025-26 slabs 10% to 400,000 (threshold) / 15% to 800,000 / 20% to 1,200,000 / 25% to 1,600,000 / 30% above; threshold 400,000 general, 450,000 woman or senior 65+, 525,000 physically challenged, 550,000 war-wounded freedom fighter; minimum tax BDT 5,000 applies above the threshold'],
  ['egypt-take-home-salary', 'Egypt Take-Home Salary Calculator', 'Gross Monthly Salary (EGP) (number)',
   'Social insurance 11% of gross capped at EGP 16,700/mo wage; annual exemption EGP 20,000; annual brackets 0% to 60,000 / 10% to 105,000 / 15% to 180,000 / 20% to 370,000 / 22.5% to 670,000 / 25% to 1,620,000 / 27.5% above; take-home = gross - SI - annual tax/12'],
  // ---- batch #6 ----
  ['brazil-take-home-salary', 'Brazil Take-Home Salary Calculator', 'Gross Monthly Salary (BRL) (number)',
   'INSS 2026 progressive 7.5% to 1,621 / 9% to 2,902.84 / 12% to 4,354.27 / 14% to 8,475.55 (cap contribution BRL 988.09); IRRF table withholdings 0% to 2,428.80 / 7.5% - 182.16 to 2,826.65 / 15% - 394.16 to 3,751.05 / 22.5% - 675.49 to 4,664.68 / 27.5% - 908.73 above; take-home = gross - INSS - IRRF'],
  ['mexico-isr-salary', 'Mexico ISR Salary Calculator', 'Gross Monthly Salary (MXN) (number)',
   'SAT Art 96 monthly ISR table (Anexo 8, 2026 inflation adjustment 13.21%): lower/upper/fixedQuota/marginalRate rows from 0.01 to 425,642.00+; ISR = fixedQuota + (taxable - lower) x marginalRate; net = gross - ISR'],
  ['vietnam-take-home-salary', 'Vietnam Take-Home Salary Calculator', 'Gross Monthly Salary (VND) (number)',
   'Law 109/2025 insurance 10.5% (8% social + 1.5% health + 1% unemployment) capped at 20x base; personal deduction VND 15,500,000/mo; monthly PIT bands 5% to 10m / 10% to 30m / 20% to 60m / 30% to 100m / 35% above; take-home = gross - insurance - PIT'],
  ['indonesia-take-home-salary', 'Indonesia Take-Home Salary Calculator', 'Gross Monthly Salary (IDR) (number)',
   'BPJS employee JHT 2% + JP 1% (JP base cap 10,547,400) + Kesehatan 1% (cap 12,000,000); biaya jabatan 5% capped 500,000/mo; PTKP 54,000,000/yr; JHT+JP deductible, Kesehatan not; PPh 21 annual bands 5% to 60m / 15% to 250m / 25% to 500m / 30% to 5bn / 35% above; take-home = gross - BPJS - PPh21/12'],
  ['thailand-take-home-salary', 'Thailand Take-Home Salary Calculator', 'Gross Monthly Salary (THB) (number)',
   'SSO 5% employee capped at THB 875/mo on wage base 17,500 (2026); expense deduction 50% capped 100,000/yr; personal allowance 60,000/yr; SS deductible; annual PIT bands 0% to 150k / 5% to 300k / 10% to 500k / 15% to 750k / 20% to 1m / 25% to 3m / 30% to 5m / 35% above; take-home = gross - SSO - PIT/12'],
  ['colombia-take-home-salary', 'Colombia Take-Home Salary Calculator', 'Gross Monthly Salary (COP) (number)',
   'Health + pension employee 8% (4% + 4%); UVT 2026 = COP 52,374; first 95 UVT exempt then 25% renta exenta applied to (gross - aportes); Art 383 withholding table 0% / 19% / 28% / 33% / 35% / 37% / 39% at 95 / 150 / 360 / 640 / 945 / 2,300 UVT; net = gross - aportes - withholding'],
  ['chile-take-home-salary', 'Chile Take-Home Salary Calculator', 'Gross Monthly Salary (CLP) (number)',
   'AFP 10% + health 7% + cesantia 0.6%; UTM 2026 = CLP 71,506; second-category table in UTM: exempt to 13.5, 4% - 0.54 to 30, 8% - 1.74 to 50, 13.5% - 4.49 to 70, 23% - 11.14 to 90, 30.4% - 17.8 to 120, 35% - 23.32 to 150, 40% - 30.82 above; take-home = gross - AFP - health - cesantia - tax'],
  ['peru-take-home-salary', 'Peru Take-Home Salary Calculator', 'Gross Monthly Salary (PEN) (number)',
   'ONP 13% of gross; UIT 2026 = PEN 5,350; annual exempt 7 UIT (37,450); fifth-category scale in UIT 8% to 5 / 14% to 20 / 17% to 35 / 20% to 45 / 30% above; take-home = gross - ONP - annual tax/12'],
  ['poland-take-home-salary', 'Poland Take-Home Salary Calculator', 'Gross Monthly Salary (PLN) (number)',
   'ZUS employee 13.71% (9.76% pension + 1.5% disability + 2.45% sickness); health 9% of (gross - ZUS), not tax-deductible; PIT 12% up to PLN 120,000/yr then 32%, minus tax-reducing amount PLN 300/mo; take-home = gross - ZUS - health - PIT'],
  ['romania-take-home-salary', 'Romania Take-Home Salary Calculator', 'Gross Monthly Salary (RON) (number)',
   'CAS 25% + CASS 10%; income tax 10% of (gross - CAS - CASS); employer CAM 2.25% not deducted from employee; take-home = gross - CAS - CASS - income tax'],
];

let added = 0;
for (const [id, name, inputs, formula] of NEW) {
  if (arr.some((x) => x.calculatorId === id)) continue;
  arr.push({
    calculatorId: id,
    name,
    category: 'regional',
    route: '/regional/' + id,
    inputs,
    formula,
    verificationStatus: 'PASS',
    knownAnswerTestCases: TEST,
    reviewer: null,
    notes: 'Independent known-answer tests (no shared code) - batch #5/#6',
  });
  added++;
}
if (added) {
  c.count = arr.length;
  fs.writeFileSync(FILE, JSON.stringify(c, null, 1));
}
console.log('qa contracts added:', added, '| total:', arr.length);
