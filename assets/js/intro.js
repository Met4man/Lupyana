/* ==========================================================================
   Lupyana Polyclinic — opening ident

   The look follows the clinic's motion sample: the logo arrives on a deep navy
   stage with a teal bloom in one corner and a blue bloom in the other. A white
   loader sweeps a circle, collapses into the heart, the colour figures rise,
   the wordmark locks in, the emblem beats twice, then everything fades out on
   the finished lockup.

   The artwork is the clinic's own logo, split into six transparent PNG layers
   (assets/img/intro/, cut by tools/extract-intro-layers.mjs):

     inkIcon      the black heart + stethoscope line art
     greenIcon    the green figure
     blueIcon     the blue figure
     orangeIcon   the orange cradling hand
     greenWord    "LUPYANA"
     inkWord      "POLYCLINIC"

   Nothing here redraws the mark. The white treatment the sample uses is a CSS
   filter on those layers, applied in assets/css/intro.css.

   The overlay is decorative: it is aria-hidden, holds the page for the
   duration, then removes itself. The page content is hidden only while the
   intro is mounted, with an inline failsafe in each page head that reveals it
   if this file never runs.

   Force it with ?intro=1. Suppress it with ?intro=0.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  if (!root.classList.contains("intro-pending")) return;

  var params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch (error) {
    params = { get: function () { return null; } };
  }

  if (params.get("intro") === "0") {
    root.classList.remove("intro-pending");
    return;
  }

  var seenKey = "lupyana_intro_seen";
  try {
    if (params.get("intro") !== "1" && window.sessionStorage.getItem(seenKey)) {
      root.classList.remove("intro-pending");
      return;
    }
    window.sessionStorage.setItem(seenKey, "1");
  } catch (error) {
    /* Private mode can block storage; show the intro anyway. */
  }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Timeline, in milliseconds, counted from the moment the layer images are
     ready. The sequence lives in the CSS: the loading ring sweeps and collapses
     into the heart (0-940ms), the heart itself forms (620ms), the colour figures
     rise (840-1400ms), the wordmark locks in (1080-1620ms) and the emblem beats
     twice (1760-2400ms). */
  var HOLD = reduced ? 1400 : 2600;
  var EXIT = reduced ? 160 : 460;

  var DIR = "assets/img/intro/";

  /* Layer geometry, in the coordinate space of assets/img/logo.png. */
  var LAYERS = [
    { name: "inkIcon", x: 107, y: 55, w: 336, h: 273 },
    { name: "orangeIcon", x: 146, y: 209, w: 146, h: 79 },
    { name: "greenIcon", x: 146, y: 137, w: 79, h: 106 },
    { name: "blueIcon", x: 219, y: 137, w: 45, h: 106 },
    { name: "greenWord", x: 81, y: 338, w: 330, h: 59 },
    { name: "inkWord", x: 101, y: 409, w: 268, h: 37 }
  ];

  var overlay = document.createElement("div");
  overlay.className = "intro";
  overlay.id = "siteIntro";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = [
    '<div class="intro__stage">',
    '  <div class="intro__art">',
    '    <div class="intro__loader">',
    '      <div class="intro__ring-scale">',
    '        <svg class="intro__ring-turn" viewBox="0 0 500 500" aria-hidden="true" focusable="false">',
    '          <circle class="intro__ring-arc" cx="250" cy="250" r="190" pathLength="1000"/>',
    '        </svg>',
    '      </div>',
    '      <svg class="intro__pulse intro__pulse--a" viewBox="0 0 500 500" aria-hidden="true" focusable="false">',
    '        <circle cx="250" cy="250" r="190"/>',
    '      </svg>',
    '      <svg class="intro__pulse intro__pulse--b" viewBox="0 0 500 500" aria-hidden="true" focusable="false">',
    '        <circle cx="250" cy="250" r="190"/>',
    '      </svg>',
    '    </div>',
    '    <div class="intro__emblem">',
    '      <div class="intro__inkwrap">',
    '        <img class="intro__ink" src="' + DIR + 'inkIcon.png" alt="" draggable="false">',
    '      </div>',
    '      <img class="intro__layer intro__layer--orange" src="' + DIR + 'orangeIcon.png" alt="" draggable="false">',
    '      <img class="intro__layer intro__layer--green" src="' + DIR + 'greenIcon.png" alt="" draggable="false">',
    '      <img class="intro__layer intro__layer--blue" src="' + DIR + 'blueIcon.png" alt="" draggable="false">',
    '    </div>',
    '    <div class="intro__word">',
    '      <img class="intro__wordmark intro__wordmark--green" src="' + DIR + 'greenWord.png" alt="" draggable="false">',
    '      <img class="intro__wordmark intro__wordmark--ink" src="' + DIR + 'inkWord.png" alt="" draggable="false">',
    '    </div>',
    '  </div>',
    '</div>'
  ].join("");

  document.body.appendChild(overlay);

  var finished = false;
  function teardown() {
    root.classList.remove("intro-pending");
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.dispatchEvent(new CustomEvent("lupyana:intro-finished"));
  }

  function finish() {
    if (finished) return;
    finished = true;
    overlay.classList.add("is-leaving");
    window.setTimeout(teardown, EXIT);
  }

  /* Start as soon as the artwork is decoded, but never wait longer than 250ms
     for it: a slow or missing file must not stall the page. */
  var started = false;
  function start() {
    if (started) return;
    started = true;
    overlay.classList.add("is-ready");
    window.setTimeout(finish, HOLD);
  }

  var waiting = LAYERS.length;
  LAYERS.forEach(function (layer) {
    var img = new Image();
    function settle() {
      waiting -= 1;
      if (waiting <= 0) start();
    }
    img.onload = settle;
    img.onerror = settle;
    img.src = DIR + layer.name + ".png";
  });
  window.setTimeout(start, 250);

  // Leave immediately if the visitor navigates away or restores the page from
  // the back-forward cache mid-intro.
  window.addEventListener("pagehide", finish);
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    finished = true;
    teardown();
  });
})();
