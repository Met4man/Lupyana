/*
  Services Marquee — JS (no dependencies)
  - Repeats your pills until one group is wider than the screen
  - Clones the group once so a -50% shift loops with no jump
  - Converts speed (px/s) into an animation duration, so speed stays constant at any width/item count
  - Pauses when scrolled off-screen; rebuilds on resize; does nothing if the visitor prefers reduced motion
*/
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-marquee]').forEach(root => {
    const viewport = root.querySelector('.mq__viewport');
    const track = root.querySelector('.mq__track');
    const first = track.querySelector('.mq__group');
    if (!viewport || !track || !first) return;

    const originals = [...first.children].map(n => n.cloneNode(true));   // pristine copies of your pills

    const build = () => {
      track.querySelectorAll('.mq__group:not(:first-child)').forEach(g => g.remove());
      first.replaceChildren(...originals.map(n => n.cloneNode(true)));
      if (reduce.matches) { root.removeAttribute('data-mq-ready'); return; }

      // make one group at least as wide as the viewport
      let guard = 0;
      while (first.getBoundingClientRect().width < viewport.clientWidth && guard++ < 8) {
        originals.forEach(n => { const c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); first.append(c); });
      }

      // second identical group for the seamless loop (hidden from screen readers)
      const copy = first.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      track.append(copy);

      const speed = parseFloat(root.dataset.speed)
        || parseFloat(getComputedStyle(root).getPropertyValue('--mq-speed'))
        || 45;                                                           // px per second
      root.style.setProperty('--mq-duration', (first.getBoundingClientRect().width / speed).toFixed(2) + 's');
      root.setAttribute('data-mq-ready', '');
    };

    build();
    (document.fonts?.ready ?? Promise.resolve()).then(build);            // re-measure once web fonts load

    let t, lastW = viewport.clientWidth;
    new ResizeObserver(() => {
      if (viewport.clientWidth === lastW) return;
      lastW = viewport.clientWidth;
      clearTimeout(t); t = setTimeout(build, 150);
    }).observe(viewport);

    new IntersectionObserver(([e]) => root.toggleAttribute('data-mq-off', !e.isIntersecting)).observe(root);
    reduce.addEventListener?.('change', build);
  });
})();
