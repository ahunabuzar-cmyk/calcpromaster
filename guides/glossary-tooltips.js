/* CalcProMaster — glossary tooltips for standalone guide pages.
   Auto-wraps the first occurrence of each glossary term in the article
   body with an <abbr> and shows the definition on hover/focus.
   Same term data as js/advanced-features.js GLOSSARY (keep in sync). */
(function () {
  'use strict';
  var TERMS = {
    'APR': 'Annual Percentage Rate - the yearly cost of a loan including fees',
    'EMI': 'Equated Monthly Installment - fixed payment amount made by a borrower',
    'Compound Interest': 'Interest calculated on initial principal and accumulated interest',
    'Simple Interest': 'Interest calculated only on the principal amount',
    'Amortization': 'Process of paying off debt with regular payments over time',
    'Principal': 'The original amount of money borrowed or invested',
    'NPV': 'Net Present Value - difference between present value of cash inflows and outflows',
    'IRR': 'Internal Rate of Return - discount rate that makes NPV equal to zero',
    'ROI': 'Return on Investment - measure of profitability relative to cost',
    'BMR': 'Basal Metabolic Rate - calories burned at rest',
    'BMI': 'Body Mass Index - weight-to-height ratio indicator',
    'TDEE': 'Total Daily Energy Expenditure - total calories burned per day',
    'VO2 Max': 'Maximum oxygen consumption during intense exercise',
    'BSA': 'Body Surface Area - calculated surface area of human body',
    'LTV': 'Loan-to-Value ratio - loan amount divided by property value',
    'DTI': 'Debt-to-Income ratio - monthly debt payments divided by gross income',
    'YTM': 'Yield to Maturity - total return anticipated on a bond if held to maturity',
    'Cap Rate': 'Capitalization Rate - net operating income divided by property value',
    'CAGR': 'Compound Annual Growth Rate - mean annual growth rate over a period',
    'Standard Deviation': 'Measure of data dispersion from the mean',
    'Variance': 'Average of squared differences from the mean',
    'Median': 'Middle value in a sorted dataset',
    'Percentile': 'Value below which a percentage of observations fall',
    'GCD': 'Greatest Common Divisor - largest integer dividing both numbers',
    'LCM': 'Least Common Multiple - smallest integer divisible by both numbers',
    'Determinant': 'Scalar value computed from a square matrix',
    'Logarithm': 'Inverse function of exponentiation',
    'Factorial': 'Product of all positive integers up to n (n!)',
    'Permutation': 'Arrangement of objects in a specific order',
    'Combination': 'Selection of objects without regard to order',
    'Modulo': 'Remainder after division of one number by another',
    'Complex Number': 'Number with real and imaginary parts (a + bi)',
    'Quadratic Equation': 'Equation of form ax² + bx + c = 0',
    'Discriminant': 'b² - 4ac in quadratic formula, determines root nature',
    "Heron's Formula": 'Area = √(s(s-a)(s-b)(s-c)) for triangle with sides a,b,c',
    'Pythagorean Theorem': 'a² + b² = c² for right triangle with hypotenuse c'
  };

  var names = Object.keys(TERMS).sort(function (a, b) { return b.length - a.length; });
  var reCache = {};
  function reFor(name) {
    if (!reCache[name]) {
      var esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      reCache[name] = new RegExp('\\b' + esc + '\\b', 'i');
    }
    return reCache[name];
  }

  var main = document.querySelector('main') || document.body;
  var wrapped = {};
  var walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      var p = n.parentNode;
      if (p.closest && p.closest('h1, h2, h3, script, style, abbr, .gloss')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  var nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(function (node) {
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (wrapped[name]) continue;
      var m = reFor(name).exec(node.nodeValue);
      if (!m) continue;
      var frag = document.createDocumentFragment();
      frag.appendChild(document.createTextNode(node.nodeValue.slice(0, m.index)));
      var abbr = document.createElement('abbr');
      abbr.className = 'gloss';
      abbr.setAttribute('data-glossary', name);
      abbr.setAttribute('tabindex', '0');
      abbr.textContent = m[0];
      frag.appendChild(abbr);
      frag.appendChild(document.createTextNode(node.nodeValue.slice(m.index + m[0].length)));
      node.parentNode.replaceChild(frag, node);
      wrapped[name] = true;
      break;
    }
  });

  var tip = document.createElement('div');
  tip.id = 'glossary-tip';
  tip.setAttribute('role', 'tooltip');
  tip.style.cssText = 'position:fixed;z-index:9999;background:#1e293b;color:#f8fafc;border-radius:8px;padding:10px 12px;max-width:300px;font-size:13px;line-height:1.5;box-shadow:0 10px 30px rgba(2,6,23,.35);pointer-events:none;opacity:0;transition:opacity .15s;left:-9999px';
  document.body.appendChild(tip);

  function show(el) {
    var def = TERMS[el.getAttribute('data-glossary')];
    if (!def) return;
    tip.textContent = def;
    tip.style.opacity = '1';
    var r = el.getBoundingClientRect();
    var tr = tip.getBoundingClientRect();
    var left = r.left + r.width / 2 - tr.width / 2;
    var top = r.top - tr.height - 8;
    if (left < 8) left = 8;
    if (left + tr.width > window.innerWidth - 8) left = window.innerWidth - tr.width - 8;
    if (top < 8) top = r.bottom + 8;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function hide() { tip.style.opacity = '0'; }

  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest ? e.target.closest('.gloss') : null;
    if (el) show(el);
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest && e.target.closest('.gloss')) hide();
  });
  document.addEventListener('focusin', function (e) {
    if (e.target.classList && e.target.classList.contains('gloss')) show(e.target);
  });
  document.addEventListener('focusout', hide);
  window.addEventListener('scroll', hide, { passive: true });

  var st = document.createElement('style');
  st.textContent = '.gloss{border-bottom:1px dotted #4f46e5;cursor:help;text-decoration:none}' +
    '.gloss:hover,.gloss:focus{color:#4f46e5;outline:none}';
  document.head.appendChild(st);
})();
