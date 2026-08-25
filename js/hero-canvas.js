/* CalcProMaster Hero Canvas — lightweight zero-dependency particle/math-symbol animation.
 * Design goals:
 *  - Vanilla JS + <canvas> only. No Three.js, no libraries, ~2KB gzipped.
 *  - Runs on requestAnimationFrame with a delta-time loop; pauses when the tab is hidden.
 *  - Honors prefers-reduced-motion (renders a single static frame, no loop).
 *  - Mouse-reactive: symbols drift away gently near the cursor; pointer leaves -> normal drift.
 *  - Fully responsive: canvas resizes to its container with devicePixelRatio scaling.
 *  - Never touches the calculator DOM — isolated, low frequency, cheap per frame.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var SYMBOLS = ['+', '\u2212', '\u00d7', '\u00f7', '\u221a', '\u03c0', '\u2211', '=', '%', 'e', 'x\u00b2', '\u03a3', '\u221e', '\u2248'];
  // Theme-aware palettes. Dark mode: glowing neon/white on deep slate.
  // Light mode: subtle indigo/slate that stays readable on white.
  var PALETTES = {
    dark: ['rgba(129,140,248,ALPHA)', 'rgba(34,211,238,ALPHA)', 'rgba(251,191,36,ALPHA)', 'rgba(196,181,253,ALPHA)', 'rgba(52,211,153,ALPHA)'],
    light: ['rgba(99,102,241,ALPHA)', 'rgba(14,165,233,ALPHA)', 'rgba(234,88,12,ALPHA)', 'rgba(139,92,246,ALPHA)', 'rgba(5,150,105,ALPHA)']
  };
  var COLORS = PALETTES.light;
  var currentTheme = null;

  function detectTheme() {
    // Reads the body.dark-theme class used by App.toggleTheme (source of truth).
    return (document.body && document.body.classList.contains('dark-theme')) ? 'dark' : 'light';
  }
  function applyTheme() {
    var theme = detectTheme();
    if (theme === currentTheme) return;
    currentTheme = theme;
    COLORS = PALETTES[theme] || PALETTES.light;
    // Recolor existing particles (each keeps its index, colors swap instantly)
    if (ctx) drawStaticFrame();
  }

  var canvas = null;
  var ctx = null;
  var particles = [];
  var running = false;
  var reducedMotion = false;
  var rafId = 0;
  var lastT = 0;
  var frameSkip = 0;         // ~30fps cap: draw every other rAF frame (halves CPU on mobile)
  var mouse = { x: -9999, y: -9999, active: false };
  var dpr = 1;
  var displayFont = '600 ';
  var displayFontFamily = '"Segoe UI", sans-serif';
  var listenersAttached = false;
  var io = null;               // IntersectionObserver (pause when hero scrolls out of view)

  // ---- particle model ----
  function Particle(x, y) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.vx = (Math.random() - 0.5) * 0.25;
    this.vy = (Math.random() - 0.5) * 0.25;
    this.size = 14 + Math.random() * 22;         // symbol font size
    this.depth = 0.4 + Math.random() * 0.6;      // parallax factor (far = slower drift)
    this.symbol = SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
    this.alpha = 0.06 + Math.random() * 0.2;
    this.colorIdx = (Math.random() * COLORS.length) | 0;
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.003 + Math.random() * 0.006;
  }
  Particle.prototype.update = function (dt, w, h) {
    // slow organic drift with slight sine wobble
    this.wobble += this.wobbleSpeed * dt;
    this.x += this.vx * this.depth * dt;
    this.y += this.vy * this.depth * dt;
    this.x += Math.sin(this.wobble) * 0.08 * this.depth * dt;
    this.y += Math.cos(this.wobble * 0.7) * 0.06 * this.depth * dt;

    // gentle mouse repulsion (only while pointer is inside the hero)
    if (mouse.active) {
      var dx = this.x - mouse.x;
      var dy = this.y - mouse.y;
      var dist2 = dx * dx + dy * dy;
      if (dist2 < 120 * 120 && dist2 > 0.01) {
        var d = Math.sqrt(dist2);
        var force = (120 - d) / 120 * 0.6;
        this.x += (dx / d) * force * this.depth * 16;
        this.y += (dy / d) * force * this.depth * 16;
      }
    }

    // keep inside bounds with a soft margin (symbols can slightly overlap the hero edge)
    var m = 40;
    if (this.x < -m) this.x = w + m;
    if (this.x > w + m) this.x = -m;
    if (this.y < -m) this.y = h + m;
    if (this.y > h + m) this.y = -m;
  };
  Particle.prototype.draw = function () {
    var alpha = Math.min(this.alpha, 0.35);
    var color = COLORS[this.colorIdx].replace('ALPHA', alpha.toFixed(3));
    ctx.font = displayFont + this.size + 'px ' + displayFontFamily;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    // soft glow: draw twice with low alpha
    ctx.fillText(this.symbol, this.x, this.y);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'rgba(148,163,184,0.35)';
    ctx.fillText(this.symbol, this.x, this.y);
    ctx.globalAlpha = 1;
    // faint link lines to close particles (cheap, capped distance)
  };

  function linkLines() {
    // O(n^2) is fine for ~46 particles (46^2/2 = ~1k checks per frame)
    var n = particles.length;
    for (var i = 0; i < n; i++) {
      var a = particles[i];
      for (var j = i + 1; j < n; j++) {
        var b = particles[j];
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 130 * 130) {
          var alpha = (1 - Math.sqrt(d2) / 130) * 0.08;
          ctx.strokeStyle = 'rgba(99,102,241,' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  function resize() {
    if (!canvas) return;
    var parent = canvas.parentElement;
    if (!parent) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = parent.clientWidth;
    var h = parent.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // rebuild particles to fill the new area (~46 desktop, fewer on mobile)
    var count = w < 640 ? 22 : (w < 1100 ? 34 : 46);
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push(new Particle(Math.random() * w, Math.random() * h));
    }
    drawStaticFrame();
  }

  function drawStaticFrame() {
    if (!ctx || !canvas) return;
    var w = canvas.width / dpr;
    var h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < particles.length; i++) particles[i].draw();
  }

  function frame(t) {
    if (!running) return;
    // If the SPA detached our canvas (navigation away from home), stop the loop
    // instead of drawing to an invisible element.
    if (!canvas || !canvas.isConnected) { stop(); return; }
    var dt = Math.min((t - lastT) / 16.666, 2.5); // normalize to ~60fps, cap big jumps
    lastT = t;
    // ~30fps cap: the drift is slow enough that skipping every other frame is
    // visually identical, but it halves the per-second main-thread cost of the
    // loop on throttled mobile CPUs.
    frameSkip = (frameSkip + 1) % 2;
    if (frameSkip !== 0) { rafId = requestAnimationFrame(frame); return; }
    var w = canvas.width / dpr;
    var h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < particles.length; i++) {
      particles[i].update(dt, w, h);
      particles[i].draw();
    }
    linkLines();
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastT = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  // Defer the animation loop until past the critical render window. NOTE: rIC with
  // a timeout only caps the MAXIMUM delay — on a fast machine it fires as soon as
  // the CPU idles (~1s), putting the rAF loop inside the LCP/TBT window. So gate
  // it behind a HARD 5s setTimeout first; only then fall through to rIC so the
  // loop starts on the next idle (and never before ~5s). The hero looks identical
  // before particles fade in.
  function startWhenIdle() {
    if (running || reducedMotion || document.hidden) return;
    var kick = function () {
      if (running || reducedMotion || document.hidden || !canvas) return;
      start();
    };
    setTimeout(function () {
      if (running || reducedMotion || document.hidden || !canvas) return;
      if (window.requestIdleCallback) {
        requestIdleCallback(kick, { timeout: 1000 });
      } else {
        kick();
      }
    }, 5000);
  }

  // Pause the rAF loop whenever the hero scrolls out of the viewport (saves main
  // thread on long pages) and resume when it re-enters. Re-created per init because
  // the canvas element is re-created on every home render.
  function setupVisibilityPause() {
    if (!('IntersectionObserver' in window) || !canvas) return;
    if (io) io.disconnect();
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          if (!running && !reducedMotion && !document.hidden) startWhenIdle();
        } else {
          stop();
        }
      });
    }, { threshold: 0.05 });
    io.observe(canvas);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function onVisibility() {
    if (document.hidden) stop();
    else if (running === false && !reducedMotion) start();
  }

  function onMouseMove(e) {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  }
  function onMouseLeave() {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  }

  // Idempotent global listener attachment — called from BOTH the DOMContentLoaded
  // path and the SPA re-init path, so deep-links straight to a tool page (where the
  // first init finds no canvas and returns early) still get listeners on later
  // navigation home.
  function attachGlobalListeners() {
    if (listenersAttached) return;
    listenersAttached = true;
    window.addEventListener('resize', function () { resize(); }, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    // Live theme switching: recolors particles when dark-theme is toggled/removed
    document.addEventListener('themechange', function () { applyTheme(); }, { passive: true });
    // Mouse listeners on window (the canvas itself has pointer-events:none so
    // it never receives events — but we still want the reactive effect).
    // mouseleave on document fires only when the pointer actually leaves the
    // document, avoiding the flicker of mouseout firing between child elements.
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave, { passive: true });
  }

  function init() {
    attachGlobalListeners();
    canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    if (!ctx) return;

    reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Resolve the actual display font family once (canvas ctx.font cannot read CSS variables)
    try {
      var cs = getComputedStyle(document.documentElement);
      var fam = cs.getPropertyValue('--font-display').trim() || '"Segoe UI", sans-serif';
      displayFont = '600 ';
      displayFontFamily = fam;
    } catch (e) { displayFontFamily = '"Segoe UI", sans-serif'; }
    applyTheme();
    resize();
    setupVisibilityPause();
    if (!reducedMotion) startWhenIdle();
  }

  // Expose a re-init so the SPA can (re)start the animation whenever home renders.
  window.HeroCanvas = {
    init: function () {
      attachGlobalListeners();
      if (canvas) stop();
      canvas = document.getElementById('hero-canvas');
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      if (!ctx) return;
      reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;    applyTheme();
    resize();
    setupVisibilityPause();
    if (!reducedMotion) startWhenIdle();
    },
    destroy: function () {
      stop();
      if (io) { io.disconnect(); io = null; }
      canvas = null;
      ctx = null;
    }
  };

  // Init on DOM ready (idempotent)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
