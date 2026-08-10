// Advanced calculation helpers + SVG chart rendering
const AdvancedCalc = (function () {
  function generateAmortization(principal, annualRate, years, currency) {
    const r = annualRate / 100 / 12;
    const n = years * 12;
    const emi = r > 0 ? principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : principal / n;
    let bal = principal;
    const schedule = [];
    for (let i = 1; i <= n; i++) {
      const interest = bal * r;
      const payment = emi - interest;
      bal -= payment;
      schedule.push({ month: i, payment: emi, interest, principal: payment, balance: Math.max(0, bal) });
    }
    const totalPayment = emi * n;
    const totalInterest = totalPayment - principal;
    return { emi, schedule, totalPayment, totalInterest, principal };
  }

  function compoundSteps(principal, rate, years, freq) {
    const n = freq || 12;
    const r = rate / 100;
    const steps = [];
    for (let y = 0; y <= years; y++) {
      const amount = principal * Math.pow(1 + r / n, n * y);
      steps.push({ year: y, amount, interest: amount - principal });
    }
    const final = principal * Math.pow(1 + r / n, n * years);
    return { final, interest: final - principal, steps };
  }

  function bmiSteps(weight, heightCm) {
    // Guard: zero/negative height (or non-finite) would produce Infinity/NaN.
    const h = heightCm / 100;
    if (!Number.isFinite(h) || h <= 0) {
      return { bmi: '0.0', category: 'Invalid input (height must be > 0)' };
    }
    const bmi = weight / (h * h);
    if (!Number.isFinite(bmi)) {
      return { bmi: '0.0', category: 'Invalid input' };
    }
    let cat = 'Normal';
    if (bmi < 18.5) cat = 'Underweight';
    else if (bmi >= 25 && bmi < 30) cat = 'Overweight';
    else if (bmi >= 30) cat = 'Obese';
    return { bmi: bmi.toFixed(1), category: cat };
  }

  function pctSteps(part, whole) {
    // Guard: division by zero must never surface as "Infinity%" in the UI.
    if (whole === 0 || !Number.isFinite(whole)) {
      return { percent: '—', decimal: '—' };
    }
    return { percent: (part / whole * 100).toFixed(2), decimal: (part / whole).toFixed(4) };
  }

  function taxSteps(income, rate, deductions) {
    const taxable = Math.max(0, income - deductions);
    const tax = taxable * (rate / 100);
    return { taxableIncome: taxable, tax, netIncome: income - tax };
  }

  function tipSteps(bill, tipPct, people) {
    const tip = bill * (tipPct / 100);
    const total = bill + tip;
    const perPerson = total / (people || 1);
    return { tip, total, perPerson };
  }

  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
  function lcm(a, b) { return (a * b) / gcd(a, b); }
  function primeFactors(n) {
    const factors = [];
    for (let i = 2; i * i <= n; i++) { while (n % i === 0) { factors.push(i); n /= i; } }
    if (n > 1) factors.push(n);
    return factors;
  }

  function stats(arr) {
    const n = arr.length;
    const sum = arr.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const sorted = [...arr].sort((a, b) => a - b);
    const median = n % 2 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    return { n, sum, mean, median, min: sorted[0], max: sorted[n - 1], stdDev: Math.sqrt(variance), variance };
  }

  function irr(cashflows, guess) {
    guess = guess || 0.1;
    let rate = guess;
    for (let iter = 0; iter < 100; iter++) {
      let npv = 0, dnpv = 0;
      for (let t = 0; t < cashflows.length; t++) {
        npv += cashflows[t] / Math.pow(1 + rate, t);
        dnpv -= t * cashflows[t] / Math.pow(1 + rate, t + 1);
      }
      if (Math.abs(npv) < 1e-7) return rate;
      if (dnpv === 0) break;
      rate -= npv / dnpv;
    }
    return rate;
  }

  function blackScholes(S, K, T, r, sigma, type) {
    const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    if (type === 'call') return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
    return K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1);
  }

  function normCdf(x) {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
  }
  function erf(x) {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return x >= 0 ? y : -y;
  }

  return { generateAmortization, compoundSteps, bmiSteps, pctSteps, taxSteps, tipSteps, gcd, lcm, primeFactors, stats, irr, blackScholes };
})();

const Charts = (function () {
  function bar(data, labels, opts) {
    opts = opts || {};
    // Non-finite guard: NaN/Infinity from an upstream calc become 0 so the
    // rect height is always a valid finite pixel value.
    data = data.map(v => Number.isFinite(v) ? v : 0);
    const w = opts.width || 400, h = opts.height || 200, pad = 30;
    // Negative-safe baseline: span includes 0 so NPV/IRR/timezone negatives
    // render below a zero line (red) instead of an invalid negative rect height.
    const max = Math.max(...data, 0.001);
    const min = Math.min(...data, 0);
    const range = (max - min) || 1;
    const zeroY = h - pad - ((0 - min) / range) * (h - pad * 2);
    const bw = (w - pad * 2) / data.length * 0.7;
    const gap = (w - pad * 2) / data.length * 0.3;
    let bars = '';
    data.forEach((v, i) => {
      const bh = Math.abs(v / range) * (h - pad * 2);
      const x = pad + i * (bw + gap);
      const y = v >= 0 ? zeroY - bh : zeroY;
      const fill = v < 0 ? '#ef4444' : (opts.color || '#4f7cff');
      bars += `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(bh, 0.5)}" fill="${fill}" rx="4" role="img" aria-label="${labels[i]}: ${v.toFixed(2)}"><title>${labels[i]}: ${v.toFixed(2)}</title><desc>Bar chart value for ${labels[i]}: ${v.toFixed(2)}</desc></rect>`;
      bars += `<text x="${x + bw / 2}" y="${h - pad + 15}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${labels[i]}</text>`;
    });
    return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Bar chart comparing ${labels.join(', ')}"><title>${opts.title || 'Bar chart'}</title><desc>${opts.desc || 'Bar chart showing values: ' + data.map((v,i)=>labels[i]+': '+v.toFixed(2)).join(', ')}</desc>${bars}</svg>`;
  }

  function donut(data, labels, opts) {
    opts = opts || {};
    const r = 80, cx = 100, cy = 100, sw = 30;
    const total = data.reduce((a, b) => a + b, 0) || 1;
    const colors = opts.colors || ['#4f7cff', '#2dd4bf', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    let angle = -Math.PI / 2;
    let arcs = '';
    data.forEach((v, i) => {
      const frac = v / total;
      const end = angle + frac * Math.PI * 2;
      const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
      const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
      const large = frac > 0.5 ? 1 : 0;
      arcs += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}" stroke="${colors[i % colors.length]}" stroke-width="${sw}" fill="none" stroke-linecap="round" role="img" aria-label="${labels[i]}: ${v.toFixed(2)}"><title>${labels[i]}: ${v.toFixed(2)}</title><desc>Donut chart segment for ${labels[i]}: ${v.toFixed(2)}</desc></path>`;
      angle = end;
    });
    const legend = labels.map((l, i) => `<div class="chart-legend-item"><span style="background:${colors[i % colors.length]}"></span>${l}: ${data[i].toFixed(2)}</div>`).join('');
    return `<svg viewBox="0 0 200 200" class="chart" role="img" aria-label="Donut chart comparing ${labels.join(', ')}"><title>${opts.title || 'Donut chart'}</title><desc>${opts.desc || 'Donut chart showing proportion: ' + data.map((v,i)=>labels[i]+': '+v.toFixed(2)).join(', ')}</desc>${arcs}<text x="100" y="105" text-anchor="middle" font-size="20" font-weight="bold" fill="var(--text)">${opts.center || ''}</text></svg><div class="chart-legend">${legend}</div>`;
  }

  function line(data, labels, opts) {
    opts = opts || {};
    const w = 400, h = 200, pad = 30;
    const max = Math.max(...data, 0.001);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
      const x = pad + (i / (data.length - 1 || 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    }).join(' ');
    const dots = data.map((v, i) => {
      const x = pad + (i / (data.length - 1 || 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `<circle cx="${x}" cy="${y}" r="3" fill="${opts.color || '#4f7cff'}" role="img" aria-label="${labels[i]||''}: ${v.toFixed(2)}"><title>${labels[i] || ''}: ${v.toFixed(2)}</title><desc>Data point ${i+1}: ${v.toFixed(2)}</desc></circle>`;
    }).join('');
    var chartTitle = opts.title || 'Line chart';
    var chartLabel = labels.length > 0 ? 'of ' + labels.join(', ') : '';
    var chartDesc = opts.desc || 'Trend: ' + data.map(function(v,i) { return (labels[i]||'Point '+(i+1)) + ': ' + v.toFixed(2); }).join(', ');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart" role="img" aria-label="Line chart ' + chartLabel + '"><title>' + chartTitle + '</title><desc>' + chartDesc + '</desc><polyline points="' + pts + '" fill="none" stroke="' + (opts.color || '#4f7cff') + '" stroke-width="2"/>' + dots + '</svg>';
  }

  function gauge(value, max, opts) {
    opts = opts || {};
    const cx = 100, cy = 100, r = 80;
    const frac = Math.min(value / max, 1);
    const angle = -Math.PI + frac * Math.PI;
    const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
    const x0 = cx + r * Math.cos(-Math.PI), y0 = cy + r * Math.sin(-Math.PI);
    const large = frac > 0.5 ? 1 : 0;
    const color = opts.color || '#4f7cff';
    const label = opts.title || 'Gauge';
    return `<svg viewBox="0 0 200 200" class="chart" role="img" aria-label="${label}: ${value.toFixed(1)} out of ${max}">
      <title>${label}: ${value.toFixed(1)} / ${max}</title>
      <desc>${opts.desc || 'Gauge showing '+value.toFixed(1)+' out of '+max}</desc>
      <path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x} ${y}" stroke="#e2e8f0" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x} ${y}" stroke="${color}" stroke-width="12" fill="none" stroke-linecap="round"/>
      <text x="100" y="120" text-anchor="middle" font-size="28" font-weight="bold" fill="var(--text)">${value.toFixed(1)}</text>
    </svg>`;
  }

  // Multi-scenario overlay chart — renders N series on one master SVG
  function overlay(series, labels, opts) {
    opts = opts || {};
    const w = opts.width || 400, h = opts.height || 200, pad = 30;
    const all = [].concat.apply([], series.map(function (s) { return s.data || []; }));
    if (!all.length) return '';
    const max = Math.max.apply(null, all.concat([0.001]));
    const min = Math.min.apply(null, all.concat([0]));
    const range = (max - min) || 1;
    const colors = opts.colors || ['#4f7cff', '#2dd4bf', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const n = Math.max(labels.length, Math.max.apply(null, series.map(function (s) { return s.data.length; })), 2);
    let paths = '', dots = '', legend = '';
    series.forEach(function (s, si) {
      const color = s.color || colors[si % colors.length];
      const pts = s.data.map(function (v, i) {
        const x = pad + (i / (n - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      paths += '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>';
      s.data.forEach(function (v, i) {
        const x = pad + (i / (n - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        dots += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5" fill="' + color + '" class="chart-dot" role="img" aria-label="' + s.name + ': ' + v.toFixed(2) + '"><title>' + s.name + ': ' + v.toFixed(2) + '</title><desc>Data point ' + (i+1) + ' for ' + s.name + ': ' + v.toFixed(2) + '</desc></circle>';
      });
      legend += '<div class="chart-legend-item"><span style="background:' + color + '"></span>' + s.name + '</div>';
    });
    let xlabels = '';
    labels.forEach(function (l, i) {
      const x = pad + (i / (labels.length - 1 || 1)) * (w - pad * 2);
      xlabels += '<text x="' + x.toFixed(1) + '" y="' + (h - pad + 15) + '" text-anchor="middle" font-size="10" fill="var(--text-muted)">' + l + '</text>';
    });
    var chartTitle = opts.title || 'Scenario comparison';
    var chartDesc = opts.desc || 'Overlay comparison of ' + series.map(function(s) { return s.name; }).join(', ');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart" role="img" aria-label="' + chartTitle + '"><title>' + chartTitle + '</title><desc>' + chartDesc + '</desc>' + paths + dots + xlabels + '</svg><div class="chart-legend">' + legend + '</div>';
  }

  return { bar, donut, line, gauge, overlay };
})();
if (typeof window !== 'undefined') { window.AdvancedCalc = AdvancedCalc; window.Charts = Charts; }
