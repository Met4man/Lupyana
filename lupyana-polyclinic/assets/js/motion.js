/*
  Scroll Motion Kit — JavaScript
  Extracted and generalised from the 8B "Burrow" template (MIT licence, https://8b.com/templates/burrow/).
  No libraries. Load with: <script src="motion.js" defer></script>
  For zero flash, ALSO paste the 1-line gate (see README) inline in <head>.
*/

/* ---------- 0. GATE: motion only if allowed + supported ---------- */
if (matchMedia('(prefers-reduced-motion: no-preference)').matches && CSS.supports('animation-timeline: view()')) {
  document.documentElement.setAttribute('data-8b-live', '');
}

/* ---------- 1. CORE KIT: measuring, numbering, realigning ---------- */
(() => {
  const live = document.documentElement.hasAttribute('data-8b-live');
  const measures = new Set();
  let queued = false;
  const run = fn => { try { fn(); } catch (e) { console.error('[motion-kit] measure failed', e); } };
  const remeasure = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; measures.forEach(run); realign(); });
  };
  // Restart scroll-linked animations after layout changes so their ranges recompute
  const realign = () => document.getAnimations().forEach(a => {
    if (a.timeline && a.timeline !== document.timeline && a.playState === 'running') { a.pause(); a.play(); }
  });

  window.motionKit = {
    live,
    // Absolute page position/size of an element (ignores transforms)
    box(el) {
      if (!(el instanceof HTMLElement)) { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; }
      let x = 0, y = 0, n = el;
      while (n) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    },
    set(el, vars) { for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, String(v)); },
    // Register a function that re-runs on resize/font load/page load
    measure(fn) { if (!live) return; measures.add(fn); run(fn); },
    // Wrap a scene so one failing scene never breaks the page
    scene(id, fn) {
      if (!live) return;
      try { fn(); } catch (e) { console.error(`[motion-kit] scene ${id} failed`, e); }
    }
  };

  if (!live) { window.motionReady = Promise.resolve(); return; }

  // Auto-number children: <ul data-8b-items=":scope > li"> → each gets --i and --n
  const number = () => document.querySelectorAll('[data-8b-items]').forEach(group => {
    let items;
    try { items = [...group.querySelectorAll(group.getAttribute('data-8b-items'))]; } catch { return; }
    items.forEach((it, i) => { it.style.setProperty('--i', i); it.style.setProperty('--n', items.length); });
  });
  number();
  measures.add(number);
  requestAnimationFrame(realign);
  new ResizeObserver(remeasure).observe(document.body);
  document.fonts?.ready.then(remeasure);
  addEventListener('load', remeasure);
  window.motionReady = (document.fonts?.ready ?? Promise.resolve()).then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
})();

/* ---------- 2. SMOOTH WHEEL SCROLL (desktop mouse only) ----------
   Eases the wheel so scrolling feels "buttery". Call motionKit.wheel.stop() / .start()
   if you open a full-screen menu or modal. Delete this block if you don't want it. */
(() => {
  const kit = window.motionKit;
  if (!kit.live || !matchMedia('(pointer: fine)').matches) return;
  let target = scrollY, current = scrollY, last = 0, running = false, paused = false;
  const inner = (node, dy) => {          // let nested scrollable boxes scroll normally
    for (; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      if (!/(auto|scroll)/.test(getComputedStyle(node).overflowY) || node.scrollHeight <= node.clientHeight) continue;
      if (dy > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 1 : node.scrollTop > 0) return true;
    }
    return false;
  };
  const step = now => {
    current += (target - current) * (1 - Math.exp(-5.3 * Math.min(.05, (now - last) / 1000)));   // 5.3 = smoothness (lower = floatier)
    last = now;
    if (Math.abs(target - current) < .5) current = target;
    scrollTo({ top: current, behavior: 'instant' });
    if (current !== target) requestAnimationFrame(step); else running = false;
  };
  addEventListener('wheel', e => {
    if (paused || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || inner(e.target, e.deltaY)) return;
    e.preventDefault();
    if (!running) target = current = scrollY;
    const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1;
    target = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, target + e.deltaY * unit * .95));
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); }
  }, { passive: false });
  kit.wheel = { stop() { paused = true; }, start() { paused = false; } };
})();

/* ---------- 3. REVEAL: adds .is-in when [data-8b-motion] elements enter the viewport ---------- */
(() => {
  const kit = window.motionKit;
  if (!kit.live) return;
  const at = el => {
    const m = /^(\d{1,3}(?:\.\d+)?)%$/.exec((el.getAttribute('data-8b-enter') || '').trim());
    return m && +m[1] <= 100 ? m[1] / 100 : .88;          // default: trigger when top is 88% down the screen
  };
  let pending = [...document.querySelectorAll('[data-8b-motion]')].map(el => ({ el, y: 0, at: at(el) }));
  let queued = false;
  const check = () => {
    queued = false;
    pending = pending.filter(p => {
      if (p.y > scrollY + innerHeight * p.at) return true;
      p.el.classList.add('is-in');
      return false;
    });
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(check); } };
  kit.measure(() => { pending.forEach(p => { p.y = kit.box(p.el).y; }); queue(); });
  addEventListener('scroll', queue, { passive: true });
})();

/* ---------- 4. TEXT SPLITTER: data-8b-split="lines" | "words" | "chars" ----------
   "lines" is what the RISE effect needs (each visual line gets masked + staggered). */
(() => {
  const kit = window.motionKit;
  if (!kit.live) return;
  const sheet = new CSSStyleSheet();
  sheet.replaceSync('.line{display:block;overflow:clip;padding-block:.12em;margin-block:-.12em}.line:not(:last-child){margin-bottom:0}.line+.line{margin-top:-.24em}.line+.line>.line__in{text-indent:0}:where(h1,h2,h3,h4,h5,h6,p,div,blockquote,figcaption,dd,dt):where([data-8b-split="lines"]:has(>.line)){display:flow-root}.line__in{display:block}.kit-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}');
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  const sources = new WeakMap(), widths = new WeakMap();
  const graphemes = typeof Intl.Segmenter === 'function'
    ? t => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)].map(p => p.segment)
    : t => [...t];
  const span = (cls, text) => { const e = document.createElement('span'); e.className = cls; if (text != null) e.textContent = text; return e; };
  const split = el => {
    const mode = el.getAttribute('data-8b-split');
    if (sources.has(el)) el.innerHTML = sources.get(el); else sources.set(el, el.innerHTML);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    let index = 0;
    for (const node of texts) {
      const frag = document.createDocumentFragment();
      for (const piece of node.data.split(/(\s+)/)) {
        if (!piece) continue;
        if (/^\s+$/.test(piece)) { frag.append(piece); continue; }
        const word = span('w');
        if (mode === 'chars') {
          word.setAttribute('aria-hidden', 'true');
          for (const ch of graphemes(piece)) { const c = span('c', ch); c.style.setProperty('--i', index++); word.append(c); }
        } else {
          word.textContent = piece;
          if (mode === 'words') word.style.setProperty('--i', index++);
        }
        frag.append(word);
      }
      node.replaceWith(frag);
    }
    if (mode === 'chars') el.append(span('kit-sr', el.textContent.replace(/\s+/g, ' ').trim()));
    if (mode === 'lines') {
      const lines = [];
      let top = null;
      for (const child of [...el.childNodes]) {
        const probe = child.nodeType === 1 ? child : null;
        const at = probe ? probe.getBoundingClientRect().top : top;
        if (probe && (top === null || Math.abs(at - top) > 2)) { lines.push([]); top = at; }
        if (!lines.length) lines.push([]);
        lines.at(-1).push(child);
      }
      lines.forEach((nodes, i) => {
        const line = span('line'), inner = span('line__in');
        line.style.setProperty('--i', i);
        nodes[0].before(line);
        inner.append(...nodes);
        line.append(inner);
      });
      index = lines.length;
      widths.set(el, el.clientWidth);
    }
    el.style.setProperty('--n', index);
  };
  const pending = [];
  let busy = false;
  const drain = () => {
    if (busy) return;
    const el = pending.shift();
    if (!el) return;
    busy = true;
    setTimeout(() => { try { split(el); } catch (e) { console.error('[motion-kit] split failed', e); } busy = false; drain(); }, 0);
  };
  const near = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    near.unobserve(en.target);
    pending.push(en.target);
    drain();
  }), { rootMargin: '100% 0px 100% 0px' });
  (document.fonts?.ready ?? Promise.resolve()).then(() => document.querySelectorAll('[data-8b-split]').forEach(el => near.observe(el)));
  // Re-split line-based text when its width changes (resize / rotate)
  kit.measure(() => document.querySelectorAll('[data-8b-split="lines"]').forEach(el => {
    if (sources.has(el) && widths.get(el) !== el.clientWidth) { pending.push(el); drain(); }
  }));
})();

/* ---------- 5. BATTERY SAVER: pause looping animations that are off-screen ---------- */
(() => {
  if (!window.motionKit.live) return;
  const watch = new IntersectionObserver(es => es.forEach(e => e.target.toggleAttribute('data-8b-off', !e.isIntersecting)));
  const watched = new WeakSet();
  const scan = () => document.getAnimations().forEach(a => {
    const el = a.effect?.target;
    if (!el || watched.has(el) || a.effect.getTiming().iterations !== Infinity || a.timeline !== document.timeline) return;
    watched.add(el);
    watch.observe(el);
  });
  scan();
  addEventListener('load', scan);
  document.addEventListener('animationstart', scan, true);
})();

/* ---------- 6. kit.track: run a function with 0→1 progress as an element scrolls ---------- */
(() => {
  const kit = window.motionKit;
  kit.track = () => {};
  if (!kit.live) return;
  const named = { top: 0, center: .5, bottom: 1 };
  const point = t => t.trim().split(/\s+/).map(w => named[w] ?? parseFloat(w) / 100);
  kit.track = (el, start, end, fn) => {
    const [s0, v0] = point(start), [s1, v1] = point(end);
    let queued = false;
    const run = () => {
      queued = false;
      const b = el.getBoundingClientRect(), vh = innerHeight;
      const d0 = b.top + b.height * s0 - vh * v0, d1 = b.top + b.height * s1 - vh * v1;
      fn(d1 === d0 ? (d0 <= 0 ? 1 : 0) : Math.min(1, Math.max(0, -d0 / (d1 - d0))));
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(run); } }, { passive: true });
    kit.measure(run);
  };
})();

/* =====================================================================
   SCENE SCRIPTS — measure layout and feed numbers to the CSS scenes
   ===================================================================== */

/* DEAL: how far each card must travel to start stacked at the row's centre */
motionKit.scene('deal', () => {
  const rows = document.querySelectorAll('[data-8b-deal]');
  if (!rows.length) return;
  motionKit.measure(() => rows.forEach(row => {
    const r = motionKit.box(row);
    [...row.children].forEach((el, i) => {
      const p = motionKit.box(el);
      motionKit.set(el, {
        '--i': i,
        '--deal-x': `${r.w / 2 - (p.x - r.x + p.w / 2)}px`,
        '--deal-y': `${r.h / 2 - (p.y - r.y + p.h / 2) + 30}px`
      });
    });
  }));
});

/* HSCROLL: how far the track must travel; optional fan/wave tilt on cards (add data-8b-wave to the section) */
motionKit.scene('hscroll', () => {
  document.querySelectorAll('[data-8b-hscroll]').forEach(section => {
    const track = section.querySelector('[data-hs-track]');
    if (!track) return;
    const cards = [...track.children];
    const wavy = section.hasAttribute('data-8b-wave');
    let distance = 0, top = 0, centres = [];
    const wave = () => {
      if (!wavy) return;
      const shift = Math.min(distance, Math.max(0, scrollY - top));
      const width = innerWidth;
      cards.forEach((card, i) => {
        const raw = Math.min(1.4, Math.max(-1.4, (centres[i] - shift - width / 2) / width));
        const d = Math.sign(raw) * Math.max(0, Math.abs(raw) - .1);
        motionKit.set(card, { translate: `0px ${120 * d * d}px`, rotate: `${10 * d}deg` });
      });
    };
    motionKit.measure(() => {
      distance = Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
      motionKit.set(section, { '--hs-distance': `${distance}px` });
      top = motionKit.box(section).y;
      centres = cards.map(c => { const b = motionKit.box(c); return b.x + b.w / 2; });
      wave();
    });
    if (wavy) motionKit.track(section, 'top bottom', 'bottom top', wave);
  });
});

/* ARCH-IN: half the panel width = a perfect semicircle top */
motionKit.scene('arch-in', () => {
  const panels = document.querySelectorAll('[data-8b-motion~="arch-in"]');
  if (!panels.length) return;
  motionKit.measure(() => panels.forEach(p => motionKit.set(p, { '--arch-half': `${p.offsetWidth / 2}px` })));
});
