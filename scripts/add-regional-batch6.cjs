#!/usr/bin/env node
// Regional batch #6 — 10 new genuine take-home / income-tax tools for large,
// under-served search markets the site did not yet cover:
//   brazil, mexico, vietnam, indonesia, thailand, colombia, chile, peru, poland, romania
// Every rate is taken from PwC Worldwide Tax Summaries, national revenue
// authorities (Receita Federal, SAT, GDT, DGT, DJP, SII, SUNAT, ARCA, KAS) and
// the 2026 statutory tables. All expected outputs are hand-verified.
// Runs BOTH parts, idempotent:
//   1. tool blocks  -> js/data/regional.js (before the closing "];")
//   2. SEO entries  -> js/seo-content.js (before the first existing entry)
// ESCAPING SAFETY: NO literal "$" followed by a digit, NO literal backslash and
// NO apostrophes in the content strings.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const B = String.fromCharCode(92);
const Q39 = String.fromCharCode(39);

// ============================ 1. TOOLS ============================
const TOOLS = [
  {
    id: 'brazil-take-home-salary',
    name: 'Brazil Take-Home Salary Calculator',
    desc: 'Free Brazil net salary calculator: INSS at 7.5% to 14% on the 2026 table and IRRF after the simplified deduction, every step shown.',
    kw: 'brazil take home salary calculator, salario liquido brasil, inss irrf calculator',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (BRL)', type: 'number', def: 8000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var inss = Math.min(s, 1621) * 0.075
        + Math.min(Math.max(s - 1621, 0), 1281.84) * 0.09
        + Math.min(Math.max(s - 2902.84, 0), 1451.43) * 0.12
        + Math.min(Math.max(s - 4354.27, 0), 4121.28) * 0.14;
      var base = s - inss;
      var tax = base <= 2428.80 ? 0
        : base <= 2826.65 ? base * 0.075 - 182.16
        : base <= 3751.05 ? base * 0.15 - 394.16
        : base <= 4664.68 ? base * 0.225 - 675.49
        : base * 0.275 - 908.73;
      tax = Math.max(0, tax);
      var net = s - inss - tax;
      return {
        result: 'Take-home: BRL ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax, inss, net], ['IRRF', 'INSS', 'Take-home']),
        extra: 'INSS: BRL ' + inss.toFixed(0) + ' | IRRF: BRL ' + tax.toFixed(0) + ' | Taxable base: BRL ' + base.toFixed(0) + ' | 2026 INSS table (cap BRL 988.09)'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var inss = Math.min(s, 1621) * 0.075 + Math.min(Math.max(s - 1621, 0), 1281.84) * 0.09 + Math.min(Math.max(s - 2902.84, 0), 1451.43) * 0.12 + Math.min(Math.max(s - 4354.27, 0), 4121.28) * 0.14;
      var base = s - inss;
      var tax = Math.max(0, base <= 2428.80 ? 0 : base <= 2826.65 ? base * 0.075 - 182.16 : base <= 3751.05 ? base * 0.15 - 394.16 : base <= 4664.68 ? base * 0.225 - 675.49 : base * 0.275 - 908.73);
      return [
        'Step 1: INSS is progressive on the contribution salary - 7.5% up to BRL 1,621, 9% to 2,902.84, 12% to 4,354.27, 14% to 8,475.55 = BRL ' + inss.toFixed(0),
        'Step 2: The INSS contribution is capped at BRL 988.09 a month at the top bracket',
        'Step 3: IRRF base = gross less INSS = BRL ' + base.toFixed(0),
        'Step 4: IRRF table = 0% to BRL 2,428.80, 7.5% to 2,826.65, 15% to 3,751.05, 22.5% to 4,664.68, 27.5% above, each with a deductible amount',
        'Step 5: IRRF = BRL ' + tax.toFixed(0) + ' a month (the simplified deduction of BRL 607.20 a month is not modelled here)',
        'Step 6: Take-home = gross less INSS and IRRF'
      ];
    }
  },
  {
    id: 'mexico-isr-salary',
    name: 'Mexico ISR Salary Calculator',
    desc: 'Free Mexico ISR calculator: the 2026 Article 96 monthly withholding table with fixed quota and marginal rate, every step shown.',
    kw: 'mexico isr calculator, calculadora isr 2026, impuesto sobre la renta nomina',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (MXN)', type: 'number', def: 25000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var T = [[0.01, 844.59, 0, 0.0192], [844.60, 7168.51, 16.22, 0.064], [7168.52, 12598.02, 420.95, 0.1088], [12598.03, 14644.64, 1011.68, 0.16], [14644.65, 17533.64, 1339.14, 0.1792], [17533.65, 35362.83, 1856.84, 0.2136], [35362.84, 55736.68, 5665.16, 0.2352], [55736.69, 106410.50, 10457.09, 0.30], [106410.51, 141880.66, 25659.23, 0.32], [141880.67, 425641.99, 37009.69, 0.34], [425642.00, 1000000000000, 133488.54, 0.35]];
      var row = T[0];
      for (var i = 0; i < T.length; i++) { if (s >= T[i][0] && s <= T[i][1]) { row = T[i]; break; } }
      var tax = row[2] + (s - row[0]) * row[3];
      var net = s - tax;
      return {
        result: 'ISR: MXN ' + tax.toFixed(0) + '/mo',
        chart: Charts.donut([tax, net], ['ISR withheld', 'Net after ISR']),
        extra: 'ISR: MXN ' + tax.toFixed(0) + '/mo | Net after ISR: MXN ' + net.toFixed(0) + '/mo | Marginal rate: ' + (row[3] * 100).toFixed(2) + '% | 2026 Art 96 monthly table'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var T = [[0.01, 844.59, 0, 0.0192], [844.60, 7168.51, 16.22, 0.064], [7168.52, 12598.02, 420.95, 0.1088], [12598.03, 14644.64, 1011.68, 0.16], [14644.65, 17533.64, 1339.14, 0.1792], [17533.65, 35362.83, 1856.84, 0.2136], [35362.84, 55736.68, 5665.16, 0.2352], [55736.69, 106410.50, 10457.09, 0.30], [106410.51, 141880.66, 25659.23, 0.32], [141880.67, 425641.99, 37009.69, 0.34], [425642.00, 1000000000000, 133488.54, 0.35]];
      var row = T[0];
      for (var i = 0; i < T.length; i++) { if (s >= T[i][0] && s <= T[i][1]) { row = T[i]; break; } }
      var tax = row[2] + (s - row[0]) * row[3];
      return [
        'Step 1: Start from monthly taxable income = gross less authorised deductions (mainly the IMSS employee share)',
        'Step 2: Find the bracket. For MXN ' + s + ' the lower limit is MXN ' + row[0] + ' at a marginal rate of ' + (row[3] * 100).toFixed(2) + '%',
        'Step 3: Excess over the lower limit = MXN ' + (s - row[0]).toFixed(2),
        'Step 4: Tax on the excess = MXN ' + ((s - row[0]) * row[3]).toFixed(2),
        'Step 5: Add the fixed quota of MXN ' + row[2] + ' = ISR of MXN ' + tax.toFixed(2) + ' a month before the employment subsidy',
        'Step 6: The 2026 table was inflation-adjusted, so the same nominal salary falls in a more favourable bracket than in 2025'
      ];
    }
  },
  {
    id: 'vietnam-take-home-salary',
    name: 'Vietnam Take-Home Salary Calculator',
    desc: 'Free Vietnam net salary calculator: PIT on the five 2026 bands after 10.5% compulsory insurance and family deductions, every step shown.',
    kw: 'vietnam take home salary calculator, vietnam pit calculator, net salary vietnam insurance',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (VND)', type: 'number', def: 30000000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var ins = Math.min(s, 46800000) * 0.105;
      var taxable = Math.max(0, s - ins - 15500000);
      var tax = Math.min(taxable, 10000000) * 0.05
        + Math.min(Math.max(taxable - 10000000, 0), 20000000) * 0.10
        + Math.min(Math.max(taxable - 30000000, 0), 30000000) * 0.20
        + Math.min(Math.max(taxable - 60000000, 0), 40000000) * 0.30
        + Math.max(taxable - 100000000, 0) * 0.35;
      var net = s - ins - tax;
      return {
        result: 'Take-home: VND ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax, ins, net], ['PIT', 'Insurance (10.5%)', 'Take-home']),
        extra: 'Insurance: VND ' + ins.toFixed(0) + ' | PIT: VND ' + tax.toFixed(0) + ' | Taxable after deductions: VND ' + taxable.toFixed(0) + ' | Law 109/2025 five bands'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var ins = Math.min(s, 46800000) * 0.105;
      var taxable = Math.max(0, s - ins - 15500000);
      var tax = Math.min(taxable, 10000000) * 0.05 + Math.min(Math.max(taxable - 10000000, 0), 20000000) * 0.10 + Math.min(Math.max(taxable - 30000000, 0), 30000000) * 0.20 + Math.min(Math.max(taxable - 60000000, 0), 40000000) * 0.30 + Math.max(taxable - 100000000, 0) * 0.35;
      return [
        'Step 1: Compulsory insurance = 10.5% of salary (8% social, 1.5% health, 1% unemployment) = VND ' + ins.toFixed(0),
        'Step 2: Insurance is capped at 20 times the base salary, so it stops rising on very high pay',
        'Step 3: Personal deduction = VND 15,500,000 a month (VND 186m a year); each dependent adds VND 6,200,000 a month',
        'Step 4: Taxable income = gross less insurance less the personal deduction = VND ' + taxable.toFixed(0),
        'Step 5: 2026 bands = 5% to VND 10m, 10% to 30m, 20% to 60m, 30% to 100m, 35% above (monthly taxable income)',
        'Step 6: Take-home = gross less insurance and PIT'
      ];
    }
  },
  {
    id: 'indonesia-take-home-salary',
    name: 'Indonesia Take-Home Salary Calculator',
    desc: 'Free Indonesia net salary calculator: PPh 21 on the progressive bands after BPJS Kesehatan, JHT and JP deductions, every step shown.',
    kw: 'indonesia take home salary calculator, kalkulator pph 21, gaji bersih bpjs',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (IDR)', type: 'number', def: 10000000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var jht = s * 0.02;
      var jp = Math.min(s, 10547400) * 0.01;
      var kes = Math.min(s, 12000000) * 0.01;
      var bpjs = jht + jp + kes;
      var annual = s * 12;
      var biaya = Math.min(s * 0.05, 500000) * 12;
      var taxable = Math.max(0, annual - biaya - (jht + jp) * 12 - 54000000);
      var tax = Math.min(taxable, 60000000) * 0.05
        + Math.min(Math.max(taxable - 60000000, 0), 190000000) * 0.15
        + Math.min(Math.max(taxable - 250000000, 0), 250000000) * 0.25
        + Math.min(Math.max(taxable - 500000000, 0), 4500000000) * 0.30
        + Math.max(taxable - 5000000000, 0) * 0.35;
      var net = s - bpjs - tax / 12;
      return {
        result: 'Take-home: IDR ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, bpjs, net], ['PPh 21', 'BPJS', 'Take-home']),
        extra: 'BPJS: IDR ' + bpjs.toFixed(0) + ' | PPh 21: IDR ' + tax.toFixed(0) + '/yr | Taxable after PTKP: IDR ' + taxable.toFixed(0) + '/yr | JHT 2%, JP 1%, Kesehatan 1%'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var jht = s * 0.02;
      var jp = Math.min(s, 10547400) * 0.01;
      var kes = Math.min(s, 12000000) * 0.01;
      var bpjs = jht + jp + kes;
      var annual = s * 12;
      var biaya = Math.min(s * 0.05, 500000) * 12;
      var taxable = Math.max(0, annual - biaya - (jht + jp) * 12 - 54000000);
      var tax = Math.min(taxable, 60000000) * 0.05 + Math.min(Math.max(taxable - 60000000, 0), 190000000) * 0.15 + Math.min(Math.max(taxable - 250000000, 0), 250000000) * 0.25 + Math.min(Math.max(taxable - 500000000, 0), 4500000000) * 0.30 + Math.max(taxable - 5000000000, 0) * 0.35;
      return [
        'Step 1: BPJS employee share = JHT 2% + JP 1% (capped at IDR 10,547,400) + Kesehatan 1% (capped at IDR 12,000,000) = IDR ' + bpjs.toFixed(0),
        'Step 2: Occupational allowance (biaya jabatan) = 5% of gross, capped at IDR 500,000 a month = IDR ' + (biaya / 12).toFixed(0),
        'Step 3: Annualise and subtract the JHT and JP contributions (these are deductible; Kesehatan is not)',
        'Step 4: Subtract PTKP of IDR 54,000,000 a year for a single taxpayer',
        'Step 5: Taxable income = IDR ' + taxable.toFixed(0) + ' a year; PPh 21 bands = 5% to 60m, 15% to 250m, 25% to 500m, 30% to 5bn, 35% above',
        'Step 6: Take-home = gross less BPJS and the monthly PPh 21'
      ];
    }
  },
  {
    id: 'thailand-take-home-salary',
    name: 'Thailand Take-Home Salary Calculator',
    desc: 'Free Thailand net salary calculator: PIT on the 0% to 35% bands after the 50% expense deduction, personal allowance and 5% social security, every step shown.',
    kw: 'thailand take home salary calculator, thai income tax calculator, net salary thailand social security',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (THB)', type: 'number', def: 40000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var sso = Math.min(s * 0.05, 875);
      var annual = s * 12;
      var expense = Math.min(annual * 0.5, 100000);
      var taxable = Math.max(0, annual - expense - 60000 - sso * 12);
      var tax = Math.min(taxable, 150000) * 0
        + Math.min(Math.max(taxable - 150000, 0), 150000) * 0.05
        + Math.min(Math.max(taxable - 300000, 0), 200000) * 0.10
        + Math.min(Math.max(taxable - 500000, 0), 250000) * 0.15
        + Math.min(Math.max(taxable - 750000, 0), 250000) * 0.20
        + Math.min(Math.max(taxable - 1000000, 0), 2000000) * 0.25
        + Math.min(Math.max(taxable - 3000000, 0), 2000000) * 0.30
        + Math.max(taxable - 5000000, 0) * 0.35;
      var net = s - sso - tax / 12;
      return {
        result: 'Take-home: THB ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, sso, net], ['PIT', 'Social security', 'Take-home']),
        extra: 'Social security: THB ' + sso.toFixed(0) + ' | PIT: THB ' + tax.toFixed(0) + '/yr | Taxable after allowances: THB ' + taxable.toFixed(0) + '/yr | 2026 wage base to THB 17,500'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var sso = Math.min(s * 0.05, 875);
      var annual = s * 12;
      var expense = Math.min(annual * 0.5, 100000);
      var taxable = Math.max(0, annual - expense - 60000 - sso * 12);
      var tax = Math.min(taxable, 150000) * 0 + Math.min(Math.max(taxable - 150000, 0), 150000) * 0.05 + Math.min(Math.max(taxable - 300000, 0), 200000) * 0.10 + Math.min(Math.max(taxable - 500000, 0), 250000) * 0.15 + Math.min(Math.max(taxable - 750000, 0), 250000) * 0.20 + Math.min(Math.max(taxable - 1000000, 0), 2000000) * 0.25 + Math.min(Math.max(taxable - 3000000, 0), 2000000) * 0.30 + Math.max(taxable - 5000000, 0) * 0.35;
      return [
        'Step 1: Social security = 5% of monthly wage, capped at THB 875 on a wage base of THB 17,500 (2026) = THB ' + sso.toFixed(0),
        'Step 2: Standard expense deduction = 50% of annual income, capped at THB 100,000',
        'Step 3: Personal allowance = THB 60,000 a year; the social security paid is also deductible',
        'Step 4: Taxable income = annual income less expense, allowance and social security = THB ' + taxable.toFixed(0),
        'Step 5: PIT bands = 0% to THB 150,000, 5% to 300,000, 10% to 500,000, 15% to 750,000, 20% to 1m, 25% to 3m, 30% to 5m, 35% above',
        'Step 6: Take-home = gross less social security and monthly PIT'
      ];
    }
  },
  {
    id: 'colombia-take-home-salary',
    name: 'Colombia Take-Home Salary Calculator',
    desc: 'Free Colombia net salary calculator: withholding on the Article 383 UVT table after 8% health and pension contributions and the 25% exempt income, every step shown.',
    kw: 'colombia take home salary calculator, retencion en la fuente salarios, salario neto colombia',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (COP)', type: 'number', def: 12000000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var uvt = 52374;
      var aportes = s * 0.08;
      var base = Math.max(0, (s - aportes) * 0.75);
      var uvts = base / uvt;
      var ret = uvts <= 95 ? 0
        : uvts <= 150 ? (uvts - 95) * 0.19
        : uvts <= 360 ? (uvts - 150) * 0.28 + 10.45
        : uvts <= 640 ? (uvts - 360) * 0.33 + 69.25
        : uvts <= 945 ? (uvts - 640) * 0.35 + 161.65
        : uvts <= 2300 ? (uvts - 945) * 0.37 + 268.4
        : (uvts - 2300) * 0.39 + 769.75;
      var tax = ret * uvt;
      var net = s - aportes - tax;
      return {
        result: 'Take-home: COP ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax, aportes, net], ['Withholding', 'Health + pension', 'Take-home']),
        extra: 'Health + pension: COP ' + aportes.toFixed(0) + ' | Withholding: COP ' + tax.toFixed(0) + ' | Base: ' + uvts.toFixed(2) + ' UVT (UVT 2026 = COP 52,374) | Art 383 table'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var uvt = 52374;
      var aportes = s * 0.08;
      var base = Math.max(0, (s - aportes) * 0.75);
      var uvts = base / uvt;
      var ret = uvts <= 95 ? 0 : uvts <= 150 ? (uvts - 95) * 0.19 : uvts <= 360 ? (uvts - 150) * 0.28 + 10.45 : uvts <= 640 ? (uvts - 360) * 0.33 + 69.25 : uvts <= 945 ? (uvts - 640) * 0.35 + 161.65 : uvts <= 2300 ? (uvts - 945) * 0.37 + 268.4 : (uvts - 2300) * 0.39 + 769.75;
      return [
        'Step 1: Mandatory contributions = 4% health + 4% pension = 8% of salary = COP ' + aportes.toFixed(0),
        'Step 2: The first 95 UVT of the remaining base is exempt; UVT 2026 = COP 52,374',
        'Step 3: Apply the 25% exempt income (renta exenta) to the remainder, subject to the 40% overall cap',
        'Step 4: Depurated base = COP ' + base.toFixed(0) + ' = ' + uvts.toFixed(2) + ' UVT',
        'Step 5: Article 383 marginal table = 0% to 95 UVT, then 19% to 150, 28% to 360, 33% to 640, 35% to 945, 37% to 2,300, 39% above',
        'Step 6: Withholding = COP ' + (ret * uvt).toFixed(0) + '; take-home = gross less contributions and withholding'
      ];
    }
  },
  {
    id: 'chile-take-home-salary',
    name: 'Chile Take-Home Salary Calculator',
    desc: 'Free Chile net salary calculator: unique second-category tax after 10% AFP, 7% health and 0.6% unemployment insurance, every step shown.',
    kw: 'chile take home salary calculator, impuesto unico segunda categoria, sueldo liquido chile',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (CLP)', type: 'number', def: 1500000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var utm = 71506;
      var afp = s * 0.10;
      var salud = s * 0.07;
      var ces = s * 0.006;
      var base = s - afp - salud - ces;
      var bu = base / utm;
      var tax = bu <= 13.5 ? 0
        : bu <= 30 ? bu * 0.04 - 0.54
        : bu <= 50 ? bu * 0.08 - 1.74
        : bu <= 70 ? bu * 0.135 - 4.49
        : bu <= 90 ? bu * 0.23 - 11.14
        : bu <= 120 ? bu * 0.304 - 17.8
        : bu <= 150 ? bu * 0.35 - 23.32
        : bu * 0.40 - 30.82;
      tax = Math.max(0, tax * utm);
      var net = s - afp - salud - ces - tax;
      return {
        result: 'Take-home: CLP ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax, afp + salud + ces, net], ['Income tax', 'AFP + health + cesantia', 'Take-home']),
        extra: 'AFP: CLP ' + afp.toFixed(0) + ' | Health: CLP ' + salud.toFixed(0) + ' | Cesantia: CLP ' + ces.toFixed(0) + ' | Tax: CLP ' + tax.toFixed(0) + ' | UTM 2026 = CLP 71,506'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var utm = 71506;
      var afp = s * 0.10;
      var salud = s * 0.07;
      var ces = s * 0.006;
      var base = s - afp - salud - ces;
      var bu = base / utm;
      var tax = Math.max(0, (bu <= 13.5 ? 0 : bu <= 30 ? bu * 0.04 - 0.54 : bu <= 50 ? bu * 0.08 - 1.74 : bu <= 70 ? bu * 0.135 - 4.49 : bu <= 90 ? bu * 0.23 - 11.14 : bu <= 120 ? bu * 0.304 - 17.8 : bu <= 150 ? bu * 0.35 - 23.32 : bu * 0.40 - 30.82) * utm);
      return [
        'Step 1: AFP pension = 10% of gross = CLP ' + afp.toFixed(0),
        'Step 2: Health = 7% (Fonasa or the minimum for an Isapre plan) = CLP ' + salud.toFixed(0),
        'Step 3: Unemployment insurance = 0.6% on a permanent contract = CLP ' + ces.toFixed(0),
        'Step 4: Taxable base = gross less AFP, health and cesantia = CLP ' + base.toFixed(0) + ' = ' + bu.toFixed(2) + ' UTM',
        'Step 5: Unique second-category table = exempt to 13.5 UTM, then 4% to 30, 8% to 50, 13.5% to 70, 23% to 90, 30.4% to 120, 35% to 150, 40% above',
        'Step 6: Income tax = CLP ' + tax.toFixed(0) + '; take-home = gross less the three contributions and tax'
      ];
    }
  },
  {
    id: 'peru-take-home-salary',
    name: 'Peru Take-Home Salary Calculator',
    desc: 'Free Peru net salary calculator: fifth-category income tax on the 8% to 30% scale after 7 UIT and 13% ONP, every step shown.',
    kw: 'peru take home salary calculator, renta quinta categoria calculadora, sueldo neto peru onp',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (PEN)', type: 'number', def: 5000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var uit = 5350;
      var onp = s * 0.13;
      var annual = s * 12;
      var taxable = Math.max(0, annual - 7 * uit);
      var tu = taxable / uit;
      var tax = (Math.min(tu, 5) * 0.08
        + Math.min(Math.max(tu - 5, 0), 15) * 0.14
        + Math.min(Math.max(tu - 20, 0), 15) * 0.17
        + Math.min(Math.max(tu - 35, 0), 10) * 0.20
        + Math.max(tu - 45, 0) * 0.30) * uit;
      var net = s - onp - tax / 12;
      return {
        result: 'Take-home: PEN ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, onp, net], ['Income tax', 'ONP (13%)', 'Take-home']),
        extra: 'ONP: PEN ' + onp.toFixed(0) + ' | Income tax: PEN ' + tax.toFixed(0) + '/yr | Taxable after 7 UIT: PEN ' + taxable.toFixed(0) + '/yr | UIT 2026 = PEN 5,350'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var uit = 5350;
      var onp = s * 0.13;
      var annual = s * 12;
      var taxable = Math.max(0, annual - 7 * uit);
      var tu = taxable / uit;
      var tax = (Math.min(tu, 5) * 0.08 + Math.min(Math.max(tu - 5, 0), 15) * 0.14 + Math.min(Math.max(tu - 20, 0), 15) * 0.17 + Math.min(Math.max(tu - 35, 0), 10) * 0.20 + Math.max(tu - 45, 0) * 0.30) * uit;
      return [
        'Step 1: ONP pension = 13% of gross (the alternative is an AFP, which varies) = PEN ' + onp.toFixed(0),
        'Step 2: Annualise the salary and subtract 7 UIT, the flat exemption for work income = PEN ' + (7 * uit),
        'Step 3: Taxable income = PEN ' + taxable.toFixed(0) + ' a year = ' + tu.toFixed(2) + ' UIT',
        'Step 4: Fifth-category scale = 8% to 5 UIT, 14% to 20, 17% to 35, 20% to 45, 30% above',
        'Step 5: Annual tax = PEN ' + tax.toFixed(0) + ' (PEN ' + (tax / 12).toFixed(0) + ' a month, withheld progressively by the employer)',
        'Step 6: Take-home = gross less ONP and the monthly income tax'
      ];
    }
  },
  {
    id: 'poland-take-home-salary',
    name: 'Poland Take-Home Salary Calculator',
    desc: 'Free Poland net salary calculator: PIT at 12% and 32% after 13.71% ZUS and the 9% health contribution, every step shown.',
    kw: 'poland take home salary calculator, kalkulator wynagrodzen, net salary poland zus pit',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (PLN)', type: 'number', def: 8000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var zus = s * 0.1371;
      var health = (s - zus) * 0.09;
      var pit = Math.max(0, (s - zus - 300) * 0.12 - 300);
      var net = s - zus - health - pit;
      return {
        result: 'Take-home: PLN ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([pit, zus + health, net], ['PIT', 'ZUS + health', 'Take-home']),
        extra: 'ZUS: PLN ' + zus.toFixed(0) + ' | Health: PLN ' + health.toFixed(0) + ' | PIT: PLN ' + pit.toFixed(0) + ' | 12% band up to PLN 120,000 a year'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var zus = s * 0.1371;
      var health = (s - zus) * 0.09;
      var pit = Math.max(0, (s - zus - 300) * 0.12 - 300);
      return [
        'Step 1: ZUS employee contributions = 13.71% of gross (9.76% pension, 1.5% disability, 2.45% sickness) = PLN ' + zus.toFixed(0),
        'Step 2: Health contribution = 9% of the gross less ZUS = PLN ' + health.toFixed(0),
        'Step 3: The health contribution is no longer deductible from PIT since 2022',
        'Step 4: Taxable base = gross less ZUS less the PLN 300 monthly tax-reducing amount, applied at 12%',
        'Step 5: PIT = PLN ' + pit.toFixed(0) + ' (the 32% rate only starts above PLN 120,000 of annual taxable income)',
        'Step 6: Take-home = gross less ZUS, health and PIT'
      ];
    }
  },
  {
    id: 'romania-take-home-salary',
    name: 'Romania Take-Home Salary Calculator',
    desc: 'Free Romania net salary calculator: 25% CAS, 10% CASS and 10% income tax, every step shown.',
    kw: 'romania take home salary calculator, calculator salariu net, cas cass impozit',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (RON)', type: 'number', def: 8000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var cas = s * 0.25;
      var cass = s * 0.10;
      var tax = (s - cas - cass) * 0.10;
      var net = s - cas - cass - tax;
      return {
        result: 'Take-home: RON ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax, cas + cass, net], ['Income tax', 'CAS + CASS', 'Take-home']),
        extra: 'CAS: RON ' + cas.toFixed(0) + ' | CASS: RON ' + cass.toFixed(0) + ' | Income tax: RON ' + tax.toFixed(0) + ' | Combined employee rate 42.5%'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var cas = s * 0.25;
      var cass = s * 0.10;
      var tax = (s - cas - cass) * 0.10;
      return [
        'Step 1: CAS (social insurance) = 25% of gross = RON ' + cas.toFixed(0),
        'Step 2: CASS (health insurance) = 10% of gross = RON ' + cass.toFixed(0),
        'Step 3: The two contributions total 35% and are deducted before income tax',
        'Step 4: Taxable base = gross less CAS and CASS = RON ' + (s - cas - cass).toFixed(0),
        'Step 5: Income tax = 10% of the taxable base = RON ' + tax.toFixed(0),
        'Step 6: Take-home = gross less CAS, CASS and income tax; the employer adds CAM of 2.25% on top'
      ];
    }
  }
];

// ---- tool block serializer (matches the family style in regional.js) ----
function q(s) { return "'" + s + "'"; }
function toolSource(t) {
  const L = [];
  L.push('  {');
  L.push('    id: ' + q(t.id) + ',');
  L.push('    name: ' + q(t.name) + ',');
  L.push('    desc: ' + q(t.desc) + ',');
  L.push('    kw: ' + q(t.kw) + ',');
  L.push('    inputs: [');
  L.push('      ' + t.inputs.map(function (inp) {
    let s = "{ id: '" + inp.id + "', label: '" + inp.label + "', type: '" + inp.type + "'";
    if (inp.type === 'number') s += ', def: ' + inp.def + ' }';
    else s += ', options: [' + inp.options.map(q).join(', ') + "], def: '" + inp.def + "' }";
    return s;
  }).join(',\r\n      '));
  L.push('    ],');
  L.push('    calc: ' + t.calc.toString() + ',');
  L.push('    steps: ' + t.steps.toString());
  L.push('  }');
  return L.join('\r\n');
}

const TFILE = path.join(ROOT, 'js', 'data', 'regional.js');
let tsrc = fs.readFileSync(TFILE, 'utf8');
const missingTools = TOOLS.filter(function (t) { return !tsrc.includes("'" + t.id + "'"); });
if (missingTools.length) {
  const block = ',\r\n' + missingTools.map(toolSource).join(',\r\n') + '\n';
  const cut = tsrc.lastIndexOf('];');
  tsrc = tsrc.slice(0, cut) + block + tsrc.slice(cut);
  fs.writeFileSync(TFILE, tsrc);
}
console.log('tool blocks inserted:', missingTools.length, 'of', TOOLS.length);

// ---- tools self-check ----
const sb2 = { window: {}, Charts: { donut: function () { return {}; }, bar: function () { return {}; }, gauge: function () { return {}; } }, console: { log: function () {}, warn: function () {}, error: function () {} } };
vm.createContext(sb2);
vm.runInContext(tsrc, sb2);
const REG = sb2.window.REGIONAL_TOOLS;
const EXPECTED = [
  ['brazil-take-home-salary', { salary: 8000 }, 'Take-home: BRL 6041/mo'],
  ['mexico-isr-salary', { salary: 25000 }, 'ISR: MXN 3452/mo'],
  ['vietnam-take-home-salary', { salary: 30000000 }, 'Take-home: VND 26215000/mo'],
  ['indonesia-take-home-salary', { salary: 10000000 }, 'Take-home: IDR 9365000/mo'],
  ['thailand-take-home-salary', { salary: 40000 }, 'Take-home: THB 38421/mo'],
  ['colombia-take-home-salary', { salary: 12000000 }, 'Take-home: COP 10374000/mo'],
  ['chile-take-home-salary', { salary: 1500000 }, 'Take-home: CLP 1225173/mo'],
  ['peru-take-home-salary', { salary: 5000 }, 'Take-home: PEN 4200/mo'],
  ['poland-take-home-salary', { salary: 8000 }, 'Take-home: PLN 5790/mo'],
  ['romania-take-home-salary', { salary: 8000 }, 'Take-home: RON 4680/mo']
];
const badTools = [];
for (const [id, values, expect] of EXPECTED) {
  const t = REG.find(function (x) { return x.id === id; });
  if (!t) { badTools.push('missing tool ' + id); continue; }
  const v = {};
  t.inputs.forEach(function (inp) { v[inp.id] = values[inp.id] !== undefined ? values[inp.id] : inp.def; });
  const out = t.calc(v);
  if (out.result !== expect) badTools.push(id + ' result ' + out.result + ' expected ' + expect);
  if ((out.result + ' ' + out.extra).includes('NaN')) badTools.push(id + ' NaN');
  const st = t.steps(v).join(' ');
  if (st.includes('NaN')) badTools.push(id + ' steps NaN');
  if (!out.chart) badTools.push(id + ' no chart');
}
console.log('tool self-check:', badTools.length ? badTools.join('; ') : 'PASS (10 tools, exact expected values)');

// ============================ 2. SEO ENTRIES ============================
const GUIDES = '<h2>From Our Guides Library</h2><ul>' +
  '<li><a href="/guides/tax-salary/">how salary tax is calculated</a></li>' +
  '<li><a href="/guides/salary/">salary structures explained</a></li>' +
  '<li><a href="/guides/currency-conversion/">currency conversion, fees included</a></li>' +
  '</ul>';

const ENTRIES = [
  {
    id: 'brazil-take-home-salary',
    title: 'Brazil Net Salary Calculator: INSS & IRRF',
    metaDesc: 'Calculate Brazilian take-home pay instantly — INSS on the 2026 table, IRRF after the deductible amounts and the BRL 988.09 contribution cap, itemised.',
    lsi: ['brazil take home salary calculator', 'salario liquido brasil', 'inss irrf calculator'],
    aeoH2: '<h2>What does the Brazil Take-Home Salary Calculator do?</h2><p>It turns a gross Brazilian monthly salary into net pay by applying the progressive INSS contribution on the 2026 table and the IRRF withholding table after its deductible amounts.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> net pay with INSS and IRRF itemised.</li><li><strong>Method:</strong> the 2026 INSS and IRRF tables, evaluated in your browser.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A BRL 8,000 monthly salary nets about <strong>BRL 6,041</strong> after INSS of BRL 922 and IRRF of BRL 1,038. INSS is capped at BRL 988.09 a month, so the contribution stops rising once salary passes the ceiling.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>A Brazilian payslip has two deductions: INSS social security and IRRF income tax. INSS is progressive across four bands and capped, so high earners pay the same maximum each month. IRRF is charged on gross minus INSS using a table of marginal rates and deductible amounts. Because the INSS reduces the IRRF base, the order of calculation matters — a bigger INSS means a smaller IRRF.</p><h2>The rules it applies</h2><ul><li><strong>INSS 2026:</strong> 7.5% up to BRL 1,621, 9% to BRL 2,902.84, 12% to BRL 4,354.27, 14% to BRL 8,475.55, with the monthly contribution capped at BRL 988.09.</li><li><strong>IRRF table:</strong> 0% to BRL 2,428.80, 7.5% to 2,826.65, 15% to 3,751.05, 22.5% to 4,664.68, 27.5% above, each with a deductible amount.</li><li><strong>Simplified deduction:</strong> an alternative to itemised deductions, worth BRL 607.20 a month, not modelled here.</li><li><strong>Not modelled:</strong> dependants, alimony, and the FGTS paid by the employer (it never reduces your pay).</li></ul><h2>Worked example with real numbers</h2><p>Gross BRL 8,000: INSS = 7.5% of 1,621 (121.58) + 9% of 1,281.84 (115.37) + 12% of 1,451.43 (174.17) + 14% of 3,645.73 (510.40) = <strong>BRL 922</strong>. IRRF base = 8,000 - 922 = BRL 7,078, which falls in the 27.5% band: 7,078 x 27.5% - 908.73 = <strong>BRL 1,038</strong>. <strong>Take-home = BRL 6,041 a month</strong>.</p><h2>Reading the result</h2><p>The donut splits the income tax from the social contribution, because only the IRRF is a tax — INSS buys your pension and social benefits. Note that the marginal rate of 27.5% applies only to the slice of income above the threshold, not to the whole salary, which is why the effective rate is far lower. Self-employed workers use a different INSS base, and the simplified deduction can reduce the IRRF further, so compare the two IRRF methods before filing your annual return.</p>' + GUIDES,
    faqs: [
      ['How is the Brazil take-home salary calculated?', 'Gross salary minus the progressive INSS contribution on the 2026 table (7.5% to 14%, capped at BRL 988.09 a month), then IRRF on the remaining base using the 0%, 7.5%, 15%, 22.5% and 27.5% bands with their deductible amounts. The steps panel lists each layer.'],
      ['What do I need to use the Brazil Take-Home Salary Calculator?', 'Only your gross monthly salary. The 2026 INSS bands, the contribution cap and the IRRF table are all built in.'],
      ['What does the result from the Brazil Take-Home Salary Calculator show?', 'Monthly take-home with INSS and IRRF itemised, plus a donut chart of how the gross divides and the taxable base.'],
      ['Is INSS capped in Brazil?', 'Yes. The employee contribution tops out at BRL 988.09 a month once the contribution salary reaches BRL 8,475.55, so the deduction stays flat on higher salaries.'],
      ['Is the Brazil Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser and works offline after the first load.']
    ]
  },
  {
    id: 'mexico-isr-salary',
    title: 'Mexico ISR Calculator 2026: Salary Tax Table',
    metaDesc: 'Calculate Mexican ISR withholding instantly — the 2026 Article 96 monthly table with its fixed quota and marginal rate, applied step by step.',
    lsi: ['mexico isr calculator', 'calculadora isr 2026', 'impuesto sobre la renta nomina'],
    aeoH2: '<h2>What does the Mexico ISR Salary Calculator do?</h2><p>It computes the monthly ISR withholding on a salary using the 2026 Article 96 table, which pairs each bracket with a fixed quota and a marginal rate on the excess.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> monthly ISR withheld and net pay after ISR.</li><li><strong>Method:</strong> the 2026 Art 96 monthly table published in the SAT Anexo 8.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>On MXN 25,000 of monthly taxable income, ISR is about <strong>MXN 3,452</strong>. The income falls in the 21.36% bracket, so tax = the fixed quota of MXN 1,856.84 plus 21.36% of the MXN 7,466.35 excess.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Mexican ISR withholding is not a simple percentage. Each bracket has a lower limit, a fixed quota, and a marginal rate applied only to the excess above that limit. You find your bracket, subtract its lower limit, multiply the excess by the marginal rate, then add the fixed quota. In 2026 the SAT inflation-adjusted every limit and quota for the first time since 2022, so the same nominal salary now falls in a more favourable bracket than in 2025.</p><h2>The rules it applies</h2><ul><li><strong>Art 96 monthly table:</strong> 1.92% on the first MXN 844.59 rising to 35% above MXN 425,642, each with a fixed quota.</li><li><strong>Base:</strong> monthly taxable income, which is gross less authorised deductions — mainly the IMSS employee share.</li><li><strong>Employment subsidy:</strong> a separate table that can reduce withholding for low earners, not modelled here.</li><li><strong>Not modelled:</strong> IMSS and Infonavit deductions themselves, and the annual adjustment under Article 97.</li></ul><h2>Worked example with real numbers</h2><p>Taxable income MXN 25,000. It falls in the MXN 17,533.65 to 35,362.83 bracket at 21.36%. Excess = 25,000 - 17,533.65 = MXN 7,466.35. Tax on the excess = 7,466.35 x 21.36% = MXN 1,594.81. Add the fixed quota of MXN 1,856.84 = <strong>ISR MXN 3,451.65 a month</strong>, leaving MXN 21,548 before other deductions.</p><h2>Reading the result</h2><p>This is ISR before the employment subsidy, so a low earner may actually be withheld less than shown. The marginal rate is not your average rate — most of your income is taxed at the lower brackets and only the top slice hits the marginal rate. If you are paid fortnightly, the SAT publishes a separate fortnightly table, and using the monthly table on a fortnightly payroll gives a different and wrong answer. The 2026 adjustment reduced withholding for most salaried workers without changing any rate.</p>' + GUIDES,
    faqs: [
      ['How is the Mexico ISR withholding calculated?', 'Find your monthly taxable income in the Art 96 table, subtract the bracket lower limit, multiply the excess by the marginal rate, then add the bracket fixed quota. The steps panel shows each part.'],
      ['What do I need to use the Mexico ISR Salary Calculator?', 'Just your gross monthly salary. The full 2026 Art 96 monthly table with quotas and rates is built in.'],
      ['What does the result from the Mexico ISR Salary Calculator show?', 'The monthly ISR withheld, your marginal rate, and net pay after ISR, with a donut chart of the split.'],
      ['Did Mexican income tax rates change for 2026?', 'No. The marginal rates are unchanged; the SAT inflation-adjusted the bracket limits and fixed quotas by 13.21%, which lowers withholding for most workers.'],
      ['Is the Mexico ISR Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser.']
    ]
  },
  {
    id: 'vietnam-take-home-salary',
    title: 'Vietnam Net Salary Calculator: PIT & Insurance',
    metaDesc: 'Calculate Vietnamese take-home pay instantly — PIT on the five 2026 bands after 10.5% compulsory insurance and the VND 15.5m personal deduction, itemised.',
    lsi: ['vietnam take home salary calculator', 'vietnam pit calculator', 'net salary vietnam insurance'],
    aeoH2: '<h2>What does the Vietnam Take-Home Salary Calculator do?</h2><p>It converts a gross Vietnamese monthly salary into net pay by deducting compulsory insurance at 10.5%, the VND 15.5m personal deduction, and PIT on the five-bracket schedule introduced by Law 109/2025.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> net pay with insurance and PIT itemised.</li><li><strong>Method:</strong> the 2026 PIT Law bands and the 10.5% insurance rate.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A VND 30,000,000 monthly salary nets about <strong>VND 26,215,000</strong> after insurance of VND 3,150,000 and PIT of VND 635,000. Insurance cuts the taxable base to VND 11,350,000 after the VND 15.5m personal deduction.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Vietnam overhauled personal income tax from 1 January 2026. The old seven brackets became five, and the personal deduction jumped from VND 11m to VND 15.5m a month, with the dependent deduction rising to VND 6.2m. Compulsory insurance of 10.5% is deducted first and is itself tax-deductible, so the reform lifts the income level at which tax starts at all.</p><h2>The rules it applies</h2><ul><li><strong>Compulsory insurance:</strong> 10.5% of salary (8% social, 1.5% health, 1% unemployment), capped at 20 times the base salary.</li><li><strong>Personal deduction:</strong> VND 15.5m a month; each registered dependent adds VND 6.2m a month.</li><li><strong>PIT bands 2026:</strong> 5% to VND 10m of monthly taxable income, 10% to 30m, 20% to 60m, 30% to 100m, 35% above.</li><li><strong>Not modelled:</strong> dependents, charitable contributions, and the new education and healthcare deductions pending implementing guidance.</li></ul><h2>Worked example with real numbers</h2><p>Gross VND 30,000,000: insurance = 10.5% = VND 3,150,000. Taxable income = 30,000,000 - 3,150,000 - 15,500,000 = VND 11,350,000. PIT = 5% of the first 10m (500,000) + 10% of the remaining 1.35m (135,000) = <strong>VND 635,000 a month</strong>. <strong>Take-home = VND 26,215,000 a month</strong>.</p><h2>Reading the result</h2><p>The donut separates PIT from insurance, because only PIT is a tax — the insurance funds your pension and health cover. With the 2026 deductions, a single person earning up to roughly VND 17m a month pays no PIT at all; with one dependent the entry point rises to about VND 24m, and with two to about VND 31m. High-tech and digital talent may qualify for a five-year PIT exemption on salary under the new law, subject to certification.</p>' + GUIDES,
    faqs: [
      ['How is the Vietnam take-home salary calculated?', 'Gross salary minus compulsory insurance at 10.5%, minus the VND 15.5m monthly personal deduction, then PIT on the five 2026 bands (5%, 10%, 20%, 30%, 35%). The steps panel shows each layer.'],
      ['What do I need to use the Vietnam Take-Home Salary Calculator?', 'Only your gross monthly salary. The 10.5% insurance rate, the personal deduction and the 2026 bands are all built in.'],
      ['What does the result from the Vietnam Take-Home Salary Calculator show?', 'Monthly take-home with insurance and PIT itemised, plus a donut chart of how the gross divides.'],
      ['What changed in Vietnam personal income tax for 2026?', 'Law 109/2025 cut the brackets from seven to five, raised the personal deduction to VND 15.5m a month and the dependent deduction to VND 6.2m, and added a five-year PIT exemption for qualifying high-tech talent.'],
      ['Is the Vietnam Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser.']
    ]
  },
  {
    id: 'indonesia-take-home-salary',
    title: 'Indonesia Take-Home Pay Calculator: PPh 21',
    metaDesc: 'Calculate Indonesian take-home pay instantly — PPh 21 on the progressive bands after BPJS Kesehatan, JHT and JP deductions and the PTKP, itemised.',
    lsi: ['indonesia take home salary calculator', 'kalkulator pph 21', 'gaji bersih bpjs'],
    aeoH2: '<h2>What does the Indonesia Take-Home Salary Calculator do?</h2><p>It converts a gross Indonesian monthly salary into net pay by deducting the BPJS employee contributions (JHT, JP and Kesehatan), the occupational allowance, the PTKP threshold, and PPh 21 on the progressive bands.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> net pay with BPJS and PPh 21 itemised.</li><li><strong>Method:</strong> the progressive PPh 21 bands and the current BPJS rates.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>An IDR 10,000,000 monthly salary nets about <strong>IDR 9,365,000</strong> after BPJS of IDR 400,000 and PPh 21 of about IDR 235,000 a month. The annual PPh 21 is roughly IDR 2,820,000 once PTKP and the deductible contributions are applied.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>An Indonesian payslip separates the BPJS social funds from income tax, and the tax is computed on an annual base, not monthly. First the BPJS employee share is deducted: JHT at 2%, JP at 1% and Kesehatan at 1%. The JHT and JP contributions are deductible for PPh 21, but Kesehatan is not. Then the occupational allowance of 5% (capped) and the PTKP threshold are subtracted before the progressive rates apply.</p><h2>The rules it applies</h2><ul><li><strong>BPJS:</strong> JHT 2% of salary, JP 1% capped at an IDR 10,547,400 base, Kesehatan 1% capped at an IDR 12,000,000 base.</li><li><strong>Occupational allowance:</strong> 5% of gross, capped at IDR 500,000 a month.</li><li><strong>PTKP:</strong> IDR 54,000,000 a year for a single taxpayer.</li><li><strong>PPh 21 bands:</strong> 5% to IDR 60m, 15% to 250m, 25% to 500m, 30% to 5bn, 35% above.</li><li><strong>Not modelled:</strong> dependents (which raise PTKP), the TER monthly method, and zakat or religious contributions.</li></ul><h2>Worked example with real numbers</h2><p>Gross IDR 10,000,000 a month = IDR 120,000,000 a year. BPJS = JHT 200,000 + JP 100,000 + Kesehatan 100,000 = IDR 400,000 a month. Annual base = 120,000,000 - 6,000,000 (occupational allowance) - 3,600,000 (deductible JHT + JP) - 54,000,000 (PTKP) = IDR 56,400,000. PPh 21 = 5% = <strong>IDR 2,820,000 a year, about IDR 235,000 a month</strong>. <strong>Take-home = IDR 9,365,000 a month</strong>.</p><h2>Reading the result</h2><p>The donut splits PPh 21 from the BPJS contributions, because the BPJS funds are your retirement and health benefits, not lost income. Note that only JHT and JP reduce the tax base; Kesehatan does not, which is a common source of confusion. If you have dependents, your PTKP rises and your PPh 21 falls. Employers also pay their own larger BPJS share, which never appears on your payslip.</p>' + GUIDES,
    faqs: [
      ['How is the Indonesia take-home salary calculated?', 'Gross salary minus BPJS (JHT 2%, JP 1%, Kesehatan 1%), then annual PPh 21 on income after the 5% occupational allowance, the deductible JHT and JP contributions and the IDR 54m PTKP. The steps panel shows each layer.'],
      ['What do I need to use the Indonesia Take-Home Salary Calculator?', 'Only your gross monthly salary. The BPJS rates, the caps, the occupational allowance and the PTKP are all built in.'],
      ['What does the result from the Indonesia Take-Home Salary Calculator show?', 'Monthly take-home with BPJS and PPh 21 itemised, plus a donut chart of how the gross divides.'],
      ['Which BPJS contributions reduce Indonesian income tax?', 'JHT (2%) and JP (1%) are deductible for PPh 21; Kesehatan (1%) is not. That is why the taxable base is lower than gross minus all BPJS.'],
      ['Is the Indonesia Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser.']
    ]
  },
  {
    id: 'thailand-take-home-salary',
    title: 'Thailand Net Salary Calculator: PIT & SSO',
    metaDesc: 'Calculate Thai take-home pay instantly — PIT on the 0% to 35% bands after the 50% expense deduction, personal allowance and 5% social security, itemised.',
    lsi: ['thailand take home salary calculator', 'thai income tax calculator', 'net salary thailand social security'],
    aeoH2: '<h2>What does the Thailand Take-Home Salary Calculator do?</h2><p>It converts a gross Thai monthly salary into net pay by deducting social security at 5%, the standard 50% expense deduction, the personal allowance, and PIT on the progressive bands.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> net pay with social security and PIT itemised.</li><li><strong>Method:</strong> the 2026 social security wage base and the Thai PIT bands.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A THB 40,000 monthly salary nets about <strong>THB 38,421</strong> after social security of THB 875 and PIT of about THB 704 a month. The 50% expense deduction and THB 60,000 personal allowance cut the taxable base to THB 309,500 a year.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Thai personal income tax is charged on annual income after a generous set of deductions. The standard expense deduction takes 50% of income up to THB 100,000, then a THB 60,000 personal allowance and the social security paid are subtracted. Only then does the progressive scale apply. Social security itself is a flat 5% of wage, capped, and it is also deductible — a rare case where a payroll tax reduces the tax base.</p><h2>The rules it applies</h2><ul><li><strong>Social security:</strong> 5% of monthly wage, capped at THB 875, on a wage base up to THB 17,500 (2026).</li><li><strong>Expense deduction:</strong> 50% of annual income, capped at THB 100,000.</li><li><strong>Personal allowance:</strong> THB 60,000 a year.</li><li><strong>PIT bands:</strong> 0% to THB 150,000, 5% to 300,000, 10% to 500,000, 15% to 750,000, 20% to 1m, 25% to 3m, 30% to 5m, 35% above.</li><li><strong>Not modelled:</strong> spouse, child and insurance allowances, and the THB 190,000 combined allowance cap.</li></ul><h2>Worked example with real numbers</h2><p>Gross THB 40,000 a month = THB 480,000 a year. Social security = 5% capped at THB 875 a month = THB 10,500 a year. Expense deduction = 50% of 480,000 = THB 240,000, but capped at THB 100,000. Taxable income = 480,000 - 100,000 - 60,000 - 10,500 = THB 309,500. PIT = 0% on the first 150,000 + 5% of the next 150,000 (7,500) + 10% of the remaining 9,500 (950) = <strong>THB 8,450 a year, about THB 704 a month</strong>. <strong>Take-home = THB 38,421 a month</strong>.</p><h2>Reading the result</h2><p>The donut separates PIT from social security, because social security funds your healthcare and pension. The expense deduction is the single biggest reason Thai income tax is low for middle earners — it removes up to THB 100,000 before the personal allowance even applies. With a spouse, children or life insurance, the allowances rise and the PIT falls further, so use this as the standard single-filer estimate and add your own allowances before filing.</p>' + GUIDES,
    faqs: [
      ['How is the Thailand take-home salary calculated?', 'Gross salary minus social security at 5% (capped at THB 875 a month), then annual PIT on income after the 50% expense deduction, the THB 60,000 personal allowance and the social security paid. The steps panel shows each layer.'],
      ['What do I need to use the Thailand Take-Home Salary Calculator?', 'Only your gross monthly salary. The 5% social security rate, the 2026 wage base and the PIT bands are all built in.'],
      ['What does the result from the Thailand Take-Home Salary Calculator show?', 'Monthly take-home with social security and PIT itemised, plus a donut chart of how the gross divides.'],
      ['What is the Thai social security wage ceiling in 2026?', 'The wage base rose to THB 17,500 a month, so the maximum employee contribution is THB 875 a month at 5%.'],
      ['Is the Thailand Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser.']
    ]
  },
  {
    id: 'colombia-take-home-salary',
    title: 'Colombia Net Salary Calculator: Withholding',
    metaDesc: 'Calculate Colombian take-home pay instantly — salary withholding on the Article 383 UVT table after 8% health and pension and the 25% exempt income, itemised.',
    lsi: ['colombia take home salary calculator', 'retencion en la fuente salarios', 'salario neto colombia'],
    aeoH2: '<h2>What does the Colombia Take-Home Salary Calculator do?</h2><p>It converts a gross Colombian monthly salary into net pay by deducting the 8% health and pension contributions and the salary withholding computed on the Article 383 UVT table after the 25% exempt income.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> net pay with contributions and withholding itemised.</li><li><strong>Method:</strong> the Article 383 marginal table and UVT 2026.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A COP 12,000,000 monthly salary nets about <strong>COP 10,374,000</strong> after health and pension of COP 960,000 and withholding of about COP 666,000. The depurated base is 158.09 UVT, which falls in the 28% marginal band.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Colombian salary withholding is calculated on a depurated base, not on gross pay. First the mandatory 8% health and pension contribution is deducted. Then the first 95 UVT of the remainder is exempt, and the 25% exempt income is applied subject to an overall 40% cap. Only then does the Article 383 marginal table apply. Because the exempt threshold is fixed in UVT, it rises each year with the UVT value.</p><h2>The rules it applies</h2><ul><li><strong>Health and pension:</strong> 4% health plus 4% pension = 8% of salary.</li><li><strong>Exempt income:</strong> the first 95 UVT is exempt, then 25% of the remainder, subject to the 40% overall cap.</li><li><strong>UVT 2026:</strong> COP 52,374.</li><li><strong>Article 383 table:</strong> 0% to 95 UVT, then 19% to 150, 28% to 360, 33% to 640, 35% to 945, 37% to 2,300, 39% above.</li><li><strong>Not modelled:</strong> the solidarity fund contribution for higher earners, dependents, and mortgage interest deductions.</li></ul><h2>Worked example with real numbers</h2><p>Gross COP 12,000,000: health and pension = 8% = COP 960,000. Remainder = COP 11,040,000. After the 25% exempt income, the depurated base = COP 8,280,000 = 158.09 UVT. That falls in the 28% band: withholding = 10.45 + 28% of the 8.09 UVT above 150 = 12.71 UVT = <strong>COP 666,000 a month</strong>. <strong>Take-home = COP 10,374,000 a month</strong>.</p><h2>Reading the result</h2><p>The donut shows that the contributions are separate from the withholding — the 8% funds your health and pension, while only the withholding is a tax. The marginal table means your effective rate is well below your marginal rate. Because the exempt threshold is denominated in UVT, it automatically keeps pace with inflation each January, so a raise does not necessarily push you into a higher real bracket.</p>' + GUIDES,
    faqs: [
      ['How is the Colombia take-home salary calculated?', 'Gross salary minus the 8% health and pension contribution, then withholding on the depurated base (after the 95 UVT exemption and the 25% exempt income) using the Article 383 marginal table. The steps panel shows each layer.'],
      ['What do I need to use the Colombia Take-Home Salary Calculator?', 'Only your gross monthly salary. The 8% contribution rate, the UVT 2026 value and the Article 383 table are all built in.'],
      ['What does the result from the Colombia Take-Home Salary Calculator show?', 'Monthly take-home with health and pension and withholding itemised, plus a donut chart of how the gross divides and the base in UVT.'],
      ['What is the UVT value for Colombia in 2026?', 'COP 52,374, set by Resolution 238 of 15 December 2025. It fixes the exempt threshold and the whole withholding table.'],
      ['Is the Colombia Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser.']
    ]
  },
  {
    id: 'chile-take-home-salary',
    title: 'Chile Net Salary Calculator: Second Category Tax',
    metaDesc: 'Calculate Chilean take-home pay instantly — unique second-category tax after 10% AFP, 7% health and 0.6% unemployment insurance, itemised.',
    lsi: ['chile take home salary calculator', 'impuesto unico segunda categoria', 'sueldo liquido chile'],
    aeoH2: '<h2>What does the Chile Take-Home Salary Calculator do?</h2><p>It converts a gross Chilean monthly salary into net pay by deducting the AFP pension at 10%, health at 7%, unemployment insurance at 0.6%, and the unique second-category tax computed in UTM.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> net pay with each deduction itemised.</li><li><strong>Method:</strong> the SII unique second-category table and UTM 2026.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A CLP 1,500,000 monthly salary nets about <strong>CLP 1,225,173</strong> after AFP of CLP 150,000, health of CLP 105,000, cesantia of CLP 9,000 and income tax of about CLP 10,827. The taxable base is 17.29 UTM.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>A Chilean payslip has three statutory deductions before income tax: the AFP pension, health cover, and unemployment insurance. The income tax — the unique second-category tax — is then calculated on the remaining base, expressed in UTM. Because the table is defined in UTM rather than pesos, the brackets adjust automatically each month as the UTM value changes, so the tax stays fair against inflation without legislation.</p><h2>The rules it applies</h2><ul><li><strong>AFP pension:</strong> 10% of gross for the mandatory contribution (the commission varies by provider and is not modelled).</li><li><strong>Health:</strong> 7% for Fonasa, or the minimum for an Isapre plan.</li><li><strong>Unemployment insurance:</strong> 0.6% for a permanent contract.</li><li><strong>Second-category tax:</strong> exempt to 13.5 UTM, then 4% to 30, 8% to 50, 13.5% to 70, 23% to 90, 30.4% to 120, 35% to 150, 40% above.</li><li><strong>Not modelled:</strong> the AFP commission, the higher-rate health plan, and the annual global complementary tax.</li></ul><h2>Worked example with real numbers</h2><p>Gross CLP 1,500,000: AFP = 10% = CLP 150,000. Health = 7% = CLP 105,000. Cesantia = 0.6% = CLP 9,000. Taxable base = 1,500,000 - 150,000 - 105,000 - 9,000 = CLP 1,236,000 = 17.29 UTM (UTM 2026 = CLP 71,506). Tax = 17.29 x 4% - 0.54 = 0.1516 UTM = <strong>CLP 10,827 a month</strong>. <strong>Take-home = CLP 1,225,173 a month</strong>.</p><h2>Reading the result</h2><p>The donut separates the income tax from the three contributions, because only the tax is lost — the AFP is your pension, health funds your medical cover, and cesantia protects you if you lose your job. Note that the AFP commission and the voluntary additional savings are not included, so your actual net may be slightly lower. The second-category tax is withheld monthly by the employer, but the annual global complementary tax reconciles all your income at year end.</p>' + GUIDES,
    faqs: [
      ['How is the Chile take-home salary calculated?', 'Gross salary minus AFP at 10%, health at 7% and unemployment insurance at 0.6%, then the unique second-category tax on the remaining base expressed in UTM. The steps panel shows each layer.'],
      ['What do I need to use the Chile Take-Home Salary Calculator?', 'Only your gross monthly salary. The 10% AFP, 7% health, 0.6% cesantia and the UTM 2026 value are all built in.'],
      ['What does the result from the Chile Take-Home Salary Calculator show?', 'Monthly take-home with AFP, health, cesantia and income tax itemised, plus a donut chart of the split and the taxable base in UTM.'],
      ['Why is Chilean income tax calculated in UTM?', 'The second-category table is defined in UTM (a monthly tax unit indexed to inflation), so the brackets adjust automatically as the UTM value changes, keeping the tax fair without new legislation.'],
      ['Is the Chile Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser.']
    ]
  },
  {
    id: 'peru-take-home-salary',
    title: 'Peru Net Salary Calculator: Fifth Category Tax',
    metaDesc: 'Calculate Peruvian take-home pay instantly — fifth-category income tax on the 8% to 30% scale after the 7 UIT exemption and 13% ONP, itemised.',
    lsi: ['peru take home salary calculator', 'renta quinta categoria calculadora', 'sueldo neto peru onp'],
    aeoH2: '<h2>What does the Peru Take-Home Salary Calculator do?</h2><p>It converts a gross Peruvian monthly salary into net pay by deducting ONP pension at 13%, the flat 7 UIT work-income exemption, and fifth-category income tax on the progressive scale.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> net pay with ONP and income tax itemised.</li><li><strong>Method:</strong> the fifth-category scale and UIT 2026.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A PEN 5,000 monthly salary nets about <strong>PEN 4,200</strong> after ONP of PEN 650 and income tax of about PEN 150 a month. The 7 UIT exemption (PEN 37,450) removes most of the annual income from tax.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Peruvian fifth-category tax is charged on annual work income after a flat exemption of 7 UIT. The remaining amount is converted into UIT units and run through the progressive scale. Separately, the ONP pension takes 13% of gross, or you may belong to an AFP instead. The employer withholds the income tax progressively through the year, projecting your annual income, so your monthly deduction can change as your salary does.</p><h2>The rules it applies</h2><ul><li><strong>ONP pension:</strong> 13% of gross (an AFP contribution varies by provider).</li><li><strong>Exemption:</strong> 7 UIT of annual work income, with UIT 2026 = PEN 5,350, so PEN 37,450 is exempt.</li><li><strong>Fifth-category scale:</strong> 8% to 5 UIT, 14% to 20, 17% to 35, 20% to 45, 30% above.</li><li><strong>Not modelled:</strong> the up-to-3 UIT additional deduction for verified expenses, and the AFP instead of ONP.</li><li><strong>Not modelled:</strong> the employer EsSalud contribution, which is paid on top and never reduces your pay.</li></ul><h2>Worked example with real numbers</h2><p>Gross PEN 5,000 a month = PEN 60,000 a year. ONP = 13% = PEN 650 a month. Taxable income = 60,000 - 37,450 = PEN 22,550 = 4.21 UIT. Tax = 4.21 x 8% = 0.337 UIT = <strong>PEN 1,804 a year, about PEN 150 a month</strong>. <strong>Take-home = PEN 4,200 a month</strong>.</p><h2>Reading the result</h2><p>The donut separates the income tax from ONP, because ONP is your pension contribution rather than a tax. The 7 UIT exemption is generous, so many middle earners pay little or no fifth-category tax. If you are on an AFP instead of ONP, the pension line will differ. You can also deduct up to 3 UIT of verified expenses (rent, medical, professional fees), which lowers the tax further — add those before filing.</p>' + GUIDES,
    faqs: [
      ['How is the Peru take-home salary calculated?', 'Gross salary minus ONP at 13%, then fifth-category income tax on annual income after the 7 UIT exemption, using the 8%, 14%, 17%, 20% and 30% scale. The steps panel shows each layer.'],
      ['What do I need to use the Peru Take-Home Salary Calculator?', 'Only your gross monthly salary. The 13% ONP rate, the 7 UIT exemption and the UIT 2026 value are all built in.'],
      ['What does the result from the Peru Take-Home Salary Calculator show?', 'Monthly take-home with ONP and income tax itemised, plus a donut chart of how the gross divides and the taxable base in UIT.'],
      ['What is the UIT value in Peru for 2026?', 'PEN 5,350. It fixes the 7 UIT exemption (PEN 37,450) and every band of the fifth-category scale.'],
      ['Is the Peru Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser.']
    ]
  },
  {
    id: 'poland-take-home-salary',
    title: 'Poland Net Salary Calculator: PIT & ZUS',
    metaDesc: 'Calculate Polish take-home pay instantly — PIT at 12% and 32% after the 13.71% ZUS contributions and the 9% health contribution, itemised.',
    lsi: ['poland take home salary calculator', 'kalkulator wynagrodzen', 'net salary poland zus pit'],
    aeoH2: '<h2>What does the Poland Take-Home Salary Calculator do?</h2><p>It converts a gross Polish monthly salary into net pay by deducting the 13.71% ZUS employee contributions, the 9% health contribution, and PIT at 12% on the taxable base.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> net pay with ZUS, health and PIT itemised.</li><li><strong>Method:</strong> the 2026 ZUS rates and the 12%/32% PIT bands.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A PLN 8,000 monthly salary nets about <strong>PLN 5,790</strong> after ZUS of PLN 1,097, health of PLN 621 and PIT of PLN 492. The combined employee burden is about 27.6%.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>A Polish payslip layers three deductions: ZUS social contributions, a health contribution, and PIT. ZUS is a flat 13.71% of gross, split across pension, disability and sickness. The health contribution is 9% of gross less ZUS and, since 2022, is no longer deductible from income tax — a change that reduced net pay for most workers. PIT is then 12% of the base after ZUS and the tax-reducing amount.</p><h2>The rules it applies</h2><ul><li><strong>ZUS employee:</strong> 13.71% of gross (9.76% pension, 1.5% disability, 2.45% sickness).</li><li><strong>Health:</strong> 9% of gross less ZUS.</li><li><strong>PIT:</strong> 12% up to PLN 120,000 of annual taxable income, 32% above.</li><li><strong>Tax-reducing amount:</strong> PLN 300 a month, modelled as a credit against the 12% tax.</li><li><strong>Not modelled:</strong> the pension and disability contribution cap, the PPK voluntary pension, and the annual tax-free amount for young workers.</li></ul><h2>Worked example with real numbers</h2><p>Gross PLN 8,000: ZUS = 13.71% = PLN 1,097. Health = 9% of (8,000 - 1,097) = PLN 621. Taxable base = 8,000 - 1,097 = PLN 6,903. PIT = 12% of 6,903 less the PLN 300 credit = 828 - 300 = <strong>PLN 492</strong>. <strong>Take-home = PLN 5,790 a month</strong>.</p><h2>Reading the result</h2><p>The donut separates PIT from the contributions, because ZUS and health fund your pension and healthcare. Because the health contribution is no longer deductible, the effective burden is higher than before 2022 even though the PIT rates did not change. The 32% PIT band only applies above PLN 120,000 of annual taxable income, and the pension and disability contributions are capped annually, so very high earners see a slightly lower effective ZUS rate later in the year.</p>' + GUIDES,
    faqs: [
      ['How is the Poland take-home salary calculated?', 'Gross salary minus ZUS at 13.71%, minus the 9% health contribution on the gross less ZUS, then PIT at 12% on the base after ZUS and the PLN 300 tax-reducing amount. The steps panel shows each layer.'],
      ['What do I need to use the Poland Take-Home Salary Calculator?', 'Only your gross monthly salary. The 13.71% ZUS rate, the 9% health rate and the 12%/32% PIT bands are all built in.'],
      ['What does the result from the Poland Take-Home Salary Calculator show?', 'Monthly take-home with ZUS, health and PIT itemised, plus a donut chart of how the gross divides.'],
      ['Is the Polish health contribution tax-deductible?', 'No. Since 2022 the 9% health contribution is no longer deducted from income tax, which is why Polish net pay fell even though the PIT rates stayed the same.'],
      ['Is the Poland Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser.']
    ]
  },
  {
    id: 'romania-take-home-salary',
    title: 'Romania Net Salary Calculator: CAS & CASS',
    metaDesc: 'Calculate Romanian take-home pay instantly — 25% CAS, 10% CASS and the 10% income tax, itemised step by step.',
    lsi: ['romania take home salary calculator', 'calculator salariu net', 'cas cass impozit'],
    aeoH2: '<h2>What does the Romania Take-Home Salary Calculator do?</h2><p>It converts a gross Romanian monthly salary into net pay by deducting CAS social insurance at 25%, CASS health insurance at 10%, and income tax at 10% on the remaining base.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> net pay with CAS, CASS and income tax itemised.</li><li><strong>Method:</strong> the 2026 Romanian contribution and tax rates.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A RON 8,000 monthly salary nets about <strong>RON 4,680</strong> after CAS of RON 2,000, CASS of RON 800 and income tax of RON 520. The combined employee burden is 41.5% of gross.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Romania has one of the simplest payroll structures in Europe: a flat 25% social insurance contribution, a flat 10% health contribution, and a flat 10% income tax on what remains. There are no progressive bands and no complex allowances for a standard employee. The employer adds CAM of 2.25% on top, which does not reduce your pay.</p><h2>The rules it applies</h2><ul><li><strong>CAS:</strong> 25% of gross for social insurance (pensions).</li><li><strong>CASS:</strong> 10% of gross for health insurance.</li><li><strong>Income tax:</strong> 10% of the base after CAS and CASS.</li><li><strong>CAM:</strong> 2.25% paid by the employer on top, never deducted from your pay.</li><li><strong>Not modelled:</strong> the personal deduction for low earners, meal vouchers, and the construction and IT sector exemptions.</li></ul><h2>Worked example with real numbers</h2><p>Gross RON 8,000: CAS = 25% = RON 2,000. CASS = 10% = RON 800. Taxable base = 8,000 - 2,000 - 800 = RON 5,200. Income tax = 10% = <strong>RON 520</strong>. <strong>Take-home = RON 4,680 a month</strong>, a total employee burden of 41.5%.</p><h2>Reading the result</h2><p>The donut separates the income tax from the two contributions, because CAS and CASS fund your pension and healthcare. Romania taxes labour heavily on the employee side, but the employer CAM is low by regional standards, which is why employers prefer it. Low earners may qualify for a personal deduction that reduces the taxable base, and workers in construction, IT and agriculture enjoy contribution exemptions, so check your sector before relying on the standard figure. Because the rates are flat rather than progressive, a pay rise is taxed at the same 41.5% rate across the whole salary, so the marginal cost of an increase is predictable.</p>' + GUIDES,
    faqs: [
      ['How is the Romania take-home salary calculated?', 'Gross salary minus CAS at 25%, minus CASS at 10%, then income tax at 10% on the remaining base. The steps panel shows each layer.'],
      ['What do I need to use the Romania Take-Home Salary Calculator?', 'Only your gross monthly salary. The 25% CAS, 10% CASS and 10% income tax rates are all built in.'],
      ['What does the result from the Romania Take-Home Salary Calculator show?', 'Monthly take-home with CAS, CASS and income tax itemised, plus a donut chart of how the gross divides.'],
      ['What is the total employee tax rate in Romania?', '35% in contributions (25% CAS plus 10% CASS) and 10% income tax on the remainder, which works out at about 41.5% of gross for a standard employee.'],
      ['Is the Romania Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser.']
    ]
  }
];

// Insert SEO entries into js/seo-content.js (only missing ids)
const SFILE = path.join(ROOT, 'js', 'seo-content.js');
let ssrc = fs.readFileSync(SFILE, 'utf8');
function esc(s) { return s.split('"').join(B + '"'); }
function seoEntry(e) {
  const faqs = e.faqs.map(function (f) { return '{"q":' + JSON.stringify(f[0]) + ',"a":' + JSON.stringify(f[1]) + '}'; }).join(',');
  return '  ' + Q39 + e.id + Q39 + ': {' +
    '"title":' + JSON.stringify(e.title) +
    ',"metaDesc":' + JSON.stringify(e.metaDesc) +
    ',"canonicalPath":"/regional/' + e.id + '"' +
    ',"cat":"regional","catName":"Regional"' +
    ',"lsi":' + JSON.stringify(e.lsi) +
    ',"aeo":' + JSON.stringify(e.aeoH2 + e.aeoQuick) +
    ',"desc":"' + esc(e.desc) + '"' +
    ',"faqs":[' + faqs + ']},';
}
let addedSeo = 0;
const missingSeo = ENTRIES.filter(function (e) { return !ssrc.includes(Q39 + e.id + Q39 + ':'); });
if (missingSeo.length) {
  const anchor = '\n  ' + Q39;
  const first = ssrc.indexOf(anchor);
  if (first < 0) { console.error('seo-content.js: anchor not found'); process.exit(1); }
  const block = missingSeo.map(seoEntry).join('\n');
  ssrc = ssrc.slice(0, first + 1) + block + ssrc.slice(first);
  fs.writeFileSync(SFILE, ssrc);
  addedSeo = missingSeo.length;
}
console.log('seo entries inserted:', addedSeo, 'of', ENTRIES.length);

// ---- SEO self-check ----
const sandbox = { window: {}, console: { log: function () {}, warn: function () {}, error: function () {} } };
vm.createContext(sandbox);
vm.runInContext(ssrc, sandbox);
const TS = sandbox.window.TOOL_SEO;
const bad = [];
for (const e of ENTRIES) {
  const m = TS[e.id];
  if (!m) { bad.push('missing ' + e.id); continue; }
  if (m.title.length > 60) bad.push('title ' + e.id + ' ' + m.title.length);
  if (m.metaDesc.length < 90 || m.metaDesc.length > 160) bad.push('meta ' + e.id + ' ' + m.metaDesc.length);
  const qs = m.faqs.map(function (f) { return f.q; });
  if (!qs.some(function (q) { return /^How is the /.test(q); })) bad.push('metric ' + e.id);
  if (!qs.some(function (q) { return /^What do I need to use /.test(q); })) bad.push('inputs ' + e.id);
  if (!qs.some(function (q) { return /^What does the result from /.test(q); })) bad.push('result ' + e.id);
  const words = (m.aeo + ' ' + m.desc + ' ' + m.faqs.map(function (f) { return f.q + ' ' + f.a; }).join(' ')).split(/\s+/).length;
  if (words <= 500) bad.push('words ' + e.id + ' ' + words);
}
if (bad.length) {
  console.error('SEO self-check FAILED:\n  ' + bad.join('\n  '));
  process.exit(1);
}
console.log('seo self-check: PASS (titles, metaDesc, FAQ patterns, word counts)');

console.log('regional.js tools now:', REG.length);
console.log('DONE batch #6 — next: node scripts/sync-counts.cjs && node scripts/split-seo.cjs');
