/* public/js/flipbook.js — drives every [data-flipbook] on the page.
   Page turns are a true corner-curl: the bottom corner lifts first, the page folds along a
   diagonal line, and the folded flap shows the back of the sheet with curl shading. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var px = function (n) { return n.toFixed(1) + 'px'; };

  /* ---------- Curl geometry (pure maths, page-local coords: x from the spine, y from the top) ----------
     The bottom-outer corner starts at (W,H) and travels to (-W,H), lifting as it goes.
     The fold line is the perpendicular bisector of start and current corner position.
     Corner side of the fold = flap (back of the sheet, reflected). Spine side = flat part. */
  function clipPoly(poly, side) {
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length], fa = side(a), fb = side(b);
      if (fa >= 0) out.push(a);
      if ((fa >= 0) !== (fb >= 0)) { var t = fa / (fa - fb); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
    }
    return out;
  }
  function geometry(W, H, q) {
    var lift = .3 * W * Math.sin(Math.PI * q);                 // how far the corner rises
    var cx = W * (1 - 2 * q), cy = H - lift;                   // current corner position
    var dx = cx - W, dy = cy - H, len = Math.hypot(dx, dy);
    var nx = dx / len, ny = dy / len;                          // unit normal, points to the spine side
    var mx = (W + cx) / 2, my = (H + cy) / 2;                  // a point on the fold line
    var f = function (p) { return (p[0] - mx) * nx + (p[1] - my) * ny; };
    var rect = [[0, 0], [W, 0], [W, H], [0, H]];
    var flat = clipPoly(rect, f);
    var flapSheet = clipPoly(rect, function (p) { return -f(p); });
    var flap = flapSheet.map(function (p) { var k = 2 * f(p); return [p[0] - k * nx, p[1] - k * ny]; });
    // back-face element (laid out like the left page) -> screen: reflect(mirror(u))
    var l00 = 1 - 2 * nx * nx, l01 = -2 * nx * ny, l11 = 1 - 2 * ny * ny;
    var tn = 2 * (mx * nx + my * ny);
    var m = [-l00, -l01, l01, l11, l00 * W + tn * nx, l01 * W + tn * ny];
    return { flat: flat, flap: flap, matrix: m, mx: mx, my: my, nx: nx, ny: ny };
  }
  var poly = function (pts) { return 'polygon(' + pts.map(function (p) { return px(p[0]) + ' ' + px(p[1]); }).join(',') + ')'; };

  /* ---------- Sound: paper swish + soft "ka", all synthesised (no files) ---------- */
  var Sound = (function () {
    var ctx = null, on = true, unlocked = false;
    try { on = localStorage.getItem('lit-flip-sound') !== 'off'; } catch (e) {}
    function ac() {
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      ctx = ctx || new A();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function unlock() { unlocked = true; ac(); }
    ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) {
      document.addEventListener(ev, unlock, { once: true, capture: true });
    });
    function burst(c, t, dur, freq, q, vol) {
      var n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      var s = c.createBufferSource(); s.buffer = b;
      var f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      var g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
    }
    function thump(c, t, vol) {
      var o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(55, t + .09);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .11);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + .12);
    }
    // paper rustle: noisy whoosh that sweeps up then down, with a few crisp crackles
    function swish(c, t, dur, vol) {
      var n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) {
        var x = i / n, env = Math.sin(Math.PI * Math.pow(x, .75));
        var crackle = Math.random() < .012 ? (Math.random() * 2 - 1) * 2.2 : 0;
        d[i] = ((Math.random() * 2 - 1) * .55 + crackle) * env;
      }
      var s = c.createBufferSource(); s.buffer = b;
      var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
      var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = .6;
      bp.frequency.setValueAtTime(1500, t);
      bp.frequency.exponentialRampToValueAtTime(4800, t + dur * .45);
      bp.frequency.exponentialRampToValueAtTime(2200, t + dur);
      var g = c.createGain(); g.gain.value = vol;
      s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(c.destination); s.start(t);
    }
    return {
      get on() { return on; },
      set: function (v) { on = v; try { localStorage.setItem('lit-flip-sound', v ? 'on' : 'off'); } catch (e) {} },
      prime: function () { ac(); },
      play: function (kind, dur) {
        if (!on || !unlocked) return;      // browsers block audio until the visitor has interacted
        var c = ac(); if (!c) return;
        var go = function () {
          var t = c.currentTime;
          if (kind === 'turn') { burst(c, t, .06, 2300, .8, .55); thump(c, t, .28); swish(c, t + .02, dur || .8, .6); }
          else { burst(c, t, .09, 1400, .7, .4); thump(c, t, .22); }
        };
        if (c.state === 'running') go(); else c.resume().then(function () { if (c.state === 'running') go(); });
      }
    };
  })();

  var BACK = '<div class="flip-cover flip-backcover"><span class="flip-cover-mark">LIT</span><strong>Made with<br>LIT Tech</strong><small>INNOVATE · BUILD · GROW</small></div>';

  /* ---------- One flipbook ---------- */
  function init(root) {
    var spread = root.querySelector('.flipbook-spread');
    var left = root.querySelector('[data-flip-left]');
    var right = root.querySelector('[data-flip-right]');
    var seam = spread.querySelector('.flipbook-seam');
    var prevBtn = root.querySelector('[data-flip-prev]');
    var nextBtn = root.querySelector('[data-flip-next]');
    var status = root.querySelector('[data-flip-status]');
    var rail = root.querySelector('[data-flip-rail]');
    var soundBtn = root.querySelector('[data-flip-sound]');
    var fsBtn = root.querySelector('[data-flip-fullscreen]');
    var hero = root.closest('.digital-album-hero');

    // pages: your sources, then (unless data-back-cover="false") a LIT back cover so the book closes
    var pages = Array.prototype.map.call(root.querySelectorAll('.flip-source'), function (el) { return { el: el }; });
    var realCount = pages.length;
    if (realCount && root.getAttribute('data-back-cover') !== 'false') {
      if (pages.length % 2 === 0) pages.push({ html: '<div class="flip-blank"></div>' });
      pages.push({ html: BACK });
    }
    var P = pages.length;
    var S = Math.floor(P / 2) + 1;                       // spread s shows pages (2s-1, 2s)
    var cur = 0, busy = false, travelling = false, drag = null, visible = true, hover = false;

    var stage = document.createElement('div');
    stage.className = 'flip-stage';
    spread.insertBefore(stage, left);
    stage.appendChild(left); stage.appendChild(right); if (seam) stage.appendChild(seam);

    var vp = document.createElement('div');
    vp.className = 'flipbook-viewport';
    spread.parentNode.insertBefore(vp, spread);
    vp.appendChild(spread);
    if (prevBtn) vp.appendChild(prevBtn);
    if (nextBtn) vp.appendChild(nextBtn);

    function div(c) { var d = document.createElement('div'); d.className = c; return d; }
    function node(i) {
      var d = div('flip-face'), pg = pages[i];
      if (pg && pg.el) {
        Array.prototype.forEach.call(pg.el.childNodes, function (n) { d.appendChild(n.cloneNode(true)); });
        if (pg.el.querySelector('img')) { var b = document.createElement('span'); b.className = 'flip-brand'; b.textContent = 'LIT Tech'; d.appendChild(b); }
      } else if (pg) d.innerHTML = pg.html;
      return d;
    }
    function paint(el, i) { el.replaceChildren(node(i)); }

    // Closed (cover / back cover alone) = 50% of the hero; open spread = 80%. Sizes live in the CSS.
    function place(sp) {
      var pos = sp === 0 ? 'start' : (2 * sp >= P ? 'end' : 'mid');
      spread.dataset.pos = pos;
      if (hero) hero.classList.toggle('is-book-open', pos === 'mid');
    }

    /* The turning sheet: flat part (front), flap (back, reflected), plus two shading strips */
    function makeLeaf(frontIdx, backIdx) {
      var l = div('flip-leaf'), cast = div('flip-cast'), castStrip = div('flip-strip flip-strip-cast');
      var flat = div('flip-leaf-front'), flap = div('flip-flap'), clip = div('flip-flap-clip');
      var back = div('flip-leaf-back'), shine = div('flip-strip flip-strip-flap');
      cast.appendChild(castStrip);
      flat.appendChild(node(frontIdx));
      back.appendChild(node(backIdx));
      clip.appendChild(back); clip.appendChild(shine); flap.appendChild(clip);
      l.appendChild(cast); l.appendChild(flat); l.appendChild(flap);
      stage.appendChild(l);
      return { el: l, cast: cast, castStrip: castStrip, flat: flat, flap: flap, clip: clip, back: back, shine: shine };
    }
    function render(L, q) {
      var W = right.offsetWidth, H = right.offsetHeight;
      if (!W) return;
      q = clamp(q, 0, 1);
      if (q < .002) {
        L.flat.style.visibility = 'visible'; L.flat.style.clipPath = 'none';
        L.flap.style.display = 'none'; L.cast.style.display = 'none'; return;
      }
      var g = geometry(W, H, q);
      L.flap.style.display = ''; L.cast.style.display = '';
      if (g.flat.length < 3) { L.flat.style.visibility = 'hidden'; }
      else { L.flat.style.visibility = 'visible'; L.flat.style.clipPath = poly(g.flat); }
      L.clip.style.clipPath = poly(g.flap);
      L.back.style.transform = 'matrix(' + g.matrix.map(function (v) { return v.toFixed(5); }).join(',') + ')';

      var phi = Math.atan2(g.ny, g.nx), len = 2 * (W + H), mid = Math.sin(Math.PI * q);
      var base = 'translate(' + px(g.mx) + ',' + px(g.my) + ') rotate(' + phi + 'rad) ';
      var sw = .3 * W, cw = .22 * W;
      L.shine.style.width = px(sw); L.shine.style.height = px(len);
      L.shine.style.transform = base + 'translate(0,' + px(-len / 2) + ')';
      L.castStrip.style.width = px(cw); L.castStrip.style.height = px(len);
      L.castStrip.style.transform = base + 'translate(' + px(-cw) + ',' + px(-len / 2) + ')';
      L.castStrip.style.opacity = Math.min(1, mid * 1.8).toFixed(3);
    }

    /* Start a page turn. Returns a controller shared by click, drag and autoplay. */
    function begin(dir, ms) {
      var s = cur, t = s + dir;
      if (busy || t < 0 || t >= S) return null;
      busy = true;
      var L, cancelFix, commitFix;
      if (dir > 0) {
        L = makeLeaf(2 * s, 2 * s + 1);
        paint(right, 2 * s + 2); right.classList.toggle('is-empty', 2 * t >= P);
        cancelFix = function () { paint(right, 2 * s); right.classList.remove('is-empty'); };
        commitFix = function () { paint(left, 2 * t - 1); left.classList.remove('is-empty'); };
      } else {                                   // backward = the same curl played in reverse
        L = makeLeaf(2 * s - 2, 2 * s - 1);
        paint(left, 2 * t - 1); left.classList.toggle('is-empty', t === 0);
        cancelFix = function () { paint(left, 2 * s - 1); left.classList.remove('is-empty'); };
        commitFix = function () { paint(right, 2 * t); right.classList.remove('is-empty'); };
      }
      place(t);
      Sound.play('turn', ((ms || 850) / 1000) * .9);

      var c = { p: 0, dir: dir };
      c.set = function (v) {
        c.p = v;
        render(L, dir > 0 ? v : 1 - v);
        stage.style.setProperty('--shade', Math.sin(Math.PI * v).toFixed(3));
      };
      function animate(to, d) {
        return new Promise(function (res) {
          var from = c.p, t0 = performance.now(), dur = reduceMotion ? 0 : d * Math.abs(to - from);
          if (dur <= 0) { c.set(to); return res(); }
          (function f(now) {
            var k = clamp((now - t0) / dur, 0, 1);
            c.set(from + (to - from) * ease(k));
            if (k < 1) requestAnimationFrame(f); else res();
          })(t0);
        });
      }
      c.finish = function (commit, d) {
        return animate(commit ? 1 : 0, d || 850).then(function () {
          L.el.remove();
          if (commit) { cur = t; commitFix(); Sound.play('land'); }
          else { cancelFix(); place(s); }
          stage.style.setProperty('--shade', 0);
          busy = false; update(commit);
        });
      };
      c.set(0);
      return c;
    }
    function turn(dir, ms) {
      var c = begin(dir, ms);
      return c ? c.finish(true, ms).then(function () { return true; }) : Promise.resolve(false);
    }
    function goTo(target) {
      if (travelling || busy) return Promise.resolve();
      target = clamp(target, 0, S - 1); travelling = true;
      function step() {
        if (cur === target) { travelling = false; return Promise.resolve(); }
        var ms = Math.abs(target - cur) > 1 ? 380 : 850;
        return turn(target > cur ? 1 : -1, ms).then(function (ok) { if (ok) return step(); travelling = false; });
      }
      return step();
    }

    /* ---------- UI state ---------- */
    function update(scrollRail) {
      if (prevBtn) prevBtn.disabled = cur === 0;
      if (nextBtn) nextBtn.disabled = cur >= S - 1;
      if (status) {
        var a = 2 * cur, b = 2 * cur + 1;
        status.textContent = cur === 0 ? 'Cover' : (cur === S - 1 && 2 * cur >= P ? 'Back cover'
          : (b <= realCount ? 'Pages ' + pad(a) + '–' + pad(b) : (a <= realCount ? 'Page ' + pad(a) : 'Back cover')));
      }
      if (rail) {
        Array.prototype.forEach.call(rail.children, function (el, i) {
          var on = i === 2 * cur - 1 || i === 2 * cur;
          el.classList.toggle('is-active', on);
          if (on) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current');
          if (on && scrollRail && i === 2 * cur) {
            rail.scrollTo({ left: el.offsetLeft - rail.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' });
          }
        });
      }
    }

    paint(left, -1); paint(right, 0);
    left.classList.add('is-empty'); right.classList.toggle('is-empty', P < 1);
    place(0);
    if (status) status.setAttribute('aria-live', 'polite');
    if (P < 2) {
      root.classList.add('is-single');
      if (prevBtn) prevBtn.hidden = true; if (nextBtn) nextBtn.hidden = true; if (rail) rail.hidden = true;
    }
    if (rail && realCount > 1) {
      pages.slice(0, realCount).forEach(function (pg, i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'flip-rail-item';
        b.setAttribute('aria-label', 'Go to page ' + (i + 1));
        var img = pg.el.querySelector('img');
        if (img) { var im = document.createElement('img'); im.src = img.src; im.alt = ''; im.loading = 'lazy'; b.appendChild(im); }
        else b.textContent = pad(i + 1);
        b.addEventListener('click', function () { Sound.prime(); goTo(Math.ceil(i / 2)); });
        rail.appendChild(b);
      });
    }
    update(false);

    /* ---------- Autoplay (hero): flips through, closes, waits a minute, flips again ---------- */
    var autoAttr = root.getAttribute('data-autoplay');
    var autoOn = autoAttr !== null ? autoAttr !== 'false' : !!hero;
    if (reduceMotion || P < 2) autoOn = false;
    var STEP = +root.getAttribute('data-autoplay-interval') || 3600;
    var REST = +root.getAttribute('data-autoplay-restart') || 60000;
    var timer = null;
    function schedule(ms) { clearTimeout(timer); if (autoOn) timer = setTimeout(tick, ms); }
    function tick() {
      if (!autoOn) return;
      if (!visible || document.hidden || busy || travelling || drag || hover) return schedule(1500);
      if (cur < S - 1) turn(1).then(function () { schedule(cur >= S - 1 ? REST : STEP); });
      else goTo(0).then(function () { schedule(STEP); });          // rewind, then start flipping again
    }
    function userActed() { schedule(REST); }                         // any interaction = wait a minute
    root.addEventListener('pointerdown', userActed);
    root.addEventListener('mouseenter', function () { hover = true; });
    root.addEventListener('mouseleave', function () { hover = false; });
    schedule(2500);

    /* ---------- Buttons ---------- */
    if (prevBtn) prevBtn.addEventListener('click', function () { Sound.prime(); turn(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { Sound.prime(); turn(1); });
    if (soundBtn) {
      var paintSound = function () {
        var on = Sound.on, ic = soundBtn.querySelector('i'), tx = soundBtn.querySelector('span');
        soundBtn.setAttribute('aria-pressed', String(on));
        if (ic) ic.className = 'bi ' + (on ? 'bi-volume-up-fill' : 'bi-volume-mute-fill');
        if (tx) tx.textContent = on ? 'Sound on' : 'Sound off';
      };
      soundBtn.addEventListener('click', function () { Sound.set(!Sound.on); paintSound(); Sound.prime(); });
      paintSound();
    }
    if (fsBtn) {
      if (!root.requestFullscreen) fsBtn.hidden = true;
      else fsBtn.addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen();
      });
    }

    /* ---------- Click or drag a page to turn it ---------- */
    stage.addEventListener('pointerdown', function (e) {
      if (busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var pg = e.target.closest('.flip-page');
      if (!pg || pg.classList.contains('is-empty')) return;
      Sound.prime();
      drag = { x: e.clientX, side: pg === right ? 1 : -1, c: null, w: right.getBoundingClientRect().width,
               last: e.clientX, lastT: e.timeStamp, v: 0 };
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dt = e.timeStamp - drag.lastT;
      if (dt > 0) drag.v = .7 * drag.v + .3 * ((e.clientX - drag.last) / dt);
      drag.last = e.clientX; drag.lastT = e.timeStamp;
      if (!drag.c) {
        if (Math.abs(dx) < 6) return;
        if ((drag.side > 0 && dx > 0) || (drag.side < 0 && dx < 0)) return;
        drag.c = begin(drag.side, 700);
        if (!drag.c) { drag = null; return; }
      }
      drag.c.set(clamp(Math.abs(dx) / (drag.w * 1.7), 0, 1));       // corner follows the finger
    });
    function release(e, cancelled) {
      if (!drag) return;
      var d = drag; drag = null;
      if (!d.c) { if (!cancelled) turn(d.side); return; }
      var flung = d.v * d.side < -.45, held = d.v * d.side > .45;
      d.c.finish(!cancelled && !held && (d.c.p > .4 || flung), 600);
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', function (e) { release(e, true); });

    /* ---------- Keyboard + visibility ---------- */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: .3 }).observe(root);
    }
    document.addEventListener('keydown', function (e) {
      if (!visible || e.altKey || e.ctrlKey || e.metaKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      var k = e.key;
      if (k === 'ArrowRight') { Sound.prime(); turn(1); userActed(); }
      else if (k === 'ArrowLeft') { Sound.prime(); turn(-1); userActed(); }
      else if (k === 'Home') { goTo(0); userActed(); }
      else if (k === 'End') { goTo(S - 1); userActed(); }
    });

    root.flipbook = { next: function () { return turn(1); }, prev: function () { return turn(-1); }, goTo: goTo };
  }

  window.LitFlipbook = { geometry: geometry };
  function boot() { document.querySelectorAll('[data-flipbook]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();