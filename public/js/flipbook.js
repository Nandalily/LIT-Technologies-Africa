/* public/js/flipbook.js — drives every [data-flipbook] on the page.
   Works with the existing markup: .flip-source pages, [data-flip-left/right/prev/next/status/rail]. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var pad = function (n) { return String(n).padStart(2, '0'); };

  /* ---------- Sound: synthesised "ka" (no audio file needed) ---------- */
  var Sound = (function () {
    var ctx = null, on = true;
    try { on = localStorage.getItem('lit-flip-sound') !== 'off'; } catch (e) {}
    function ac() {
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      ctx = ctx || new A();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function noise(c, t, dur, freq, q, vol) {
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
    return {
      get on() { return on; },
      set: function (v) { on = v; try { localStorage.setItem('lit-flip-sound', v ? 'on' : 'off'); } catch (e) {} },
      prime: function () { ac(); },            // must run inside a real click/tap
      play: function (kind) {
        if (!on) return;
        var c = ac(); if (!c) return;
        var t = c.currentTime;
        if (kind === 'ka') { noise(c, t, .07, 2300, .8, .9); thump(c, t, .45); }   // page lifts
        else { noise(c, t, .09, 1400, .7, .35); thump(c, t, .25); }                // page lands
      }
    };
  })();

  /* ---------- One flipbook ---------- */
  function init(root) {
    var sources = Array.prototype.slice.call(root.querySelectorAll('.flip-source'));
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

    var P = sources.length;                 // pages: 0 = cover, then photos
    var S = Math.floor(P / 2) + 1;          // spreads: s shows pages (2s-1, 2s)
    var cur = 0, busy = false, travelling = false;

    // A stage wraps the pages so the whole book can slide to centre the cover / last page
    var stage = document.createElement('div');
    stage.className = 'flip-stage';
    spread.insertBefore(stage, left);
    stage.appendChild(left); stage.appendChild(right); if (seam) stage.appendChild(seam);

    function node(i) {
      var d = document.createElement('div'); d.className = 'flip-face';
      var src = sources[i];
      if (src) {
        Array.prototype.forEach.call(src.childNodes, function (n) { d.appendChild(n.cloneNode(true)); });
        if (src.querySelector('img')) {
          var b = document.createElement('span'); b.className = 'flip-brand'; b.textContent = 'LIT Tech'; d.appendChild(b);
        }
      }
      return d;
    }
    function paint(el, i) { el.replaceChildren(node(i)); }
    function place(sp) { stage.dataset.pos = sp === 0 ? 'start' : (2 * sp >= P ? 'end' : 'mid'); }

    function makeLeaf(front, back) {
      var l = document.createElement('div'); l.className = 'flip-leaf';
      var f = document.createElement('div'), b = document.createElement('div');
      f.className = 'flip-leaf-front'; b.className = 'flip-leaf-back';
      f.appendChild(node(front)); b.appendChild(node(back));
      l.appendChild(f); l.appendChild(b); stage.appendChild(l);
      return l;
    }

    /* Start a page turn. Returns a controller the drag handler and the click handler share. */
    function begin(dir) {
      var s = cur, t = s + dir;
      if (busy || t < 0 || t >= S) return null;
      busy = true;
      var leaf, cancelFix, commitFix;
      if (dir > 0) {
        leaf = makeLeaf(2 * s, 2 * s + 1);
        paint(right, 2 * s + 2); right.classList.toggle('is-empty', 2 * t >= P);
        cancelFix = function () { paint(right, 2 * s); right.classList.remove('is-empty'); };
        commitFix = function () { paint(left, 2 * t - 1); left.classList.remove('is-empty'); };
      } else {
        leaf = makeLeaf(2 * s - 2, 2 * s - 1);
        paint(left, 2 * t - 1); left.classList.toggle('is-empty', t === 0);
        cancelFix = function () { paint(left, 2 * s - 1); left.classList.remove('is-empty'); };
        commitFix = function () { paint(right, 2 * t); right.classList.remove('is-empty'); };
      }
      place(t);
      Sound.play('ka');

      var c = { p: 0, dir: dir };
      c.set = function (v) {
        c.p = v;
        leaf.style.transform = 'rotateY(' + (dir > 0 ? -180 * v : -180 * (1 - v)) + 'deg)';
        stage.style.setProperty('--shade', Math.sin(Math.PI * v).toFixed(3));
      };
      function animate(to, ms) {
        return new Promise(function (res) {
          var from = c.p, t0 = performance.now(), d = reduceMotion ? 0 : ms * Math.abs(to - from);
          if (d <= 0) { c.set(to); return res(); }
          (function f(now) {
            var k = clamp((now - t0) / d, 0, 1);
            c.set(from + (to - from) * ease(k));
            if (k < 1) requestAnimationFrame(f); else res();
          })(t0);
        });
      }
      c.finish = function (commit, ms) {
        return animate(commit ? 1 : 0, ms || 850).then(function () {
          leaf.remove();
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
      var c = begin(dir);
      return c ? c.finish(true, ms).then(function () { return true; }) : Promise.resolve(false);
    }
    function goTo(target) {
      if (travelling || busy) return;
      target = clamp(target, 0, S - 1); travelling = true;
      (function step() {
        if (cur === target) { travelling = false; return; }
        var dist = Math.abs(target - cur);
        turn(target > cur ? 1 : -1, dist > 1 ? 380 : 850).then(function (ok) {
          if (ok) step(); else travelling = false;
        });
      })();
    }

    /* ---------- UI state ---------- */
    function update(scrollRail) {
      if (prevBtn) prevBtn.disabled = cur === 0;
      if (nextBtn) nextBtn.disabled = cur >= S - 1;
      if (status) {
        var a = 2 * cur, b = 2 * cur + 1;
        status.textContent = cur === 0 ? 'Cover' : (b <= P ? 'Pages ' + pad(a) + '–' + pad(b) : 'Page ' + pad(a));
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

    // initial paint
    paint(left, -1 + 2 * cur); paint(right, 2 * cur);
    left.classList.toggle('is-empty', cur === 0);
    right.classList.toggle('is-empty', 2 * cur >= P);
    place(cur);
    if (status) status.setAttribute('aria-live', 'polite');

    if (P < 2) {                             // cover only: nothing to turn
      root.classList.add('is-single');
      if (prevBtn) prevBtn.hidden = true; if (nextBtn) nextBtn.hidden = true; if (rail) rail.hidden = true;
    }

    // rail thumbnails
    if (rail && P > 1) {
      sources.forEach(function (src, i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'flip-rail-item';
        b.setAttribute('aria-label', 'Go to page ' + (i + 1));
        var img = src.querySelector('img');
        if (img) { var im = document.createElement('img'); im.src = img.src; im.alt = ''; im.loading = 'lazy'; b.appendChild(im); }
        else b.textContent = pad(i + 1);
        b.addEventListener('click', function () { Sound.prime(); goTo(Math.ceil(i / 2)); });
        rail.appendChild(b);
      });
    }
    update(false);

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

    /* ---------- Click or drag a page corner to turn it ---------- */
    var drag = null;
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
      var dx = e.clientX - drag.x;
      var dt = e.timeStamp - drag.lastT;
      if (dt > 0) drag.v = .7 * drag.v + .3 * ((e.clientX - drag.last) / dt);
      drag.last = e.clientX; drag.lastT = e.timeStamp;
      if (!drag.c) {
        if (Math.abs(dx) < 6) return;
        if ((drag.side > 0 && dx > 0) || (drag.side < 0 && dx < 0)) return;   // wrong way
        drag.c = begin(drag.side);
        if (!drag.c) { drag = null; return; }
      }
      drag.c.set(clamp(Math.abs(dx) / (drag.w * 1.1), 0, 1));
    });
    function release(e, cancelled) {
      if (!drag) return;
      var d = drag; drag = null;
      if (!d.c) { if (!cancelled) turn(d.side); return; }                       // plain click
      var flung = d.v * d.side < -.45, held = d.v * d.side > .45;
      d.c.finish(!cancelled && !held && (d.c.p > .4 || flung), 600);
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', function (e) { release(e, true); });

    /* ---------- Keyboard (only while the book is on screen) ---------- */
    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: .3 }).observe(root);
    }
    document.addEventListener('keydown', function (e) {
      if (!visible || e.altKey || e.ctrlKey || e.metaKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      if (e.key === 'ArrowRight') { Sound.prime(); turn(1); }
      else if (e.key === 'ArrowLeft') { Sound.prime(); turn(-1); }
      else if (e.key === 'Home') goTo(0);
      else if (e.key === 'End') goTo(S - 1);
    });

    root.flipbook = { next: function () { return turn(1); }, prev: function () { return turn(-1); }, goTo: goTo };
  }

  function boot() { document.querySelectorAll('[data-flipbook]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();