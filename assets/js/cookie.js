/*
  Cookie consent banner.

  A plain accept / decline notice shown on every page until the visitor makes
  a choice. The choice is stored in localStorage under `lupyana_cookie_consent`
  and the banner never comes back on its own. A "Cookie settings" button in the
  footer reopens it so the choice can be changed.

  The site loads no analytics or advertising scripts, so the stored value is
  only a recorded preference; nothing is blocked or enabled by it.

  Copy follows the active site language (EN / SW), the same way theme.js does.
*/
(() => {
  const KEY = "lupyana_cookie_consent";
  const root = document.documentElement;

  const COPY = {
    en: {
      label: "Cookie notice",
      title: "Cookies",
      text: "We use a small number of cookies and local storage to keep this site working and to remember your choices. You can accept or decline \u2014 the site works either way.",
      link: "Privacy policy",
      accept: "Accept",
      decline: "Decline",
      settings: "Cookie settings",
    },
    sw: {
      label: "Taarifa ya vidakwa",
      title: "Vidakwa",
      text: "Tunatumia vidakwa vichache na hifadhi ya ndani ili tovuti hii ifanye kazi na kukumbuka machaguo yako. Unaweza kukubali au kukataa \u2014 tovuti itafanya kazi kwa vyovyote.",
      link: "Sera ya faragha",
      accept: "Kubali",
      decline: "Kataa",
      settings: "Mipangilio ya vidakwa",
    },
  };

  const copy = () => COPY[(root.lang || "en").slice(0, 2)] || COPY.en;

  const stored = () => {
    try {
      return localStorage.getItem(KEY);
    } catch (error) {
      return null;
    }
  };

  const remember = (value) => {
    try {
      localStorage.setItem(KEY, value);
    } catch (error) {
      /* private mode / storage disabled — the banner just reappears later */
    }
  };

  let banner = null;

  const inner = (c) => `
    <div class="cookie__inner">
      <p class="cookie__text"><strong>${c.title}</strong> ${c.text} <a class="cookie__link" href="privacy.html">${c.link}</a></p>
      <div class="cookie__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-cookie-decline>${c.decline}</button>
        <button type="button" class="btn btn--primary btn--sm" data-cookie-accept>${c.accept}</button>
      </div>
    </div>`;

  function build(force) {
    if (banner || (!force && stored())) return;
    const c = copy();
    banner = document.createElement("aside");
    banner.className = "cookie";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", c.label);
    banner.setAttribute("data-cookie-banner", "");
    banner.innerHTML = inner(c);
    document.body.appendChild(banner);
  }

  function dismiss(value) {
    remember(value);
    const element = banner;
    banner = null;
    if (!element) return;
    element.classList.add("is-leaving");
    element.addEventListener("transitionend", () => element.remove(), { once: true });
    setTimeout(() => element.remove(), 400);
  }

  function relabel() {
    const c = copy();
    document.querySelectorAll("[data-cookie-open]").forEach((button) => {
      // Setting textContent always replaces the text node, which would retrigger
      // the footer MutationObserver below. Only write when the label differs.
      if (button.textContent !== c.settings) button.textContent = c.settings;
    });
    if (!banner) return;
    banner.setAttribute("aria-label", c.label);
    const text = banner.querySelector(".cookie__text");
    if (text) {
      const html = `<strong>${c.title}</strong> ${c.text} <a class="cookie__link" href="privacy.html">${c.link}</a>`;
      if (text.innerHTML !== html) text.innerHTML = html;
    }
    const accept = banner.querySelector("[data-cookie-accept]");
    if (accept && accept.textContent !== c.accept) accept.textContent = c.accept;
    const decline = banner.querySelector("[data-cookie-decline]");
    if (decline && decline.textContent !== c.decline) decline.textContent = c.decline;
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-cookie-accept]")) return dismiss("accepted");
    if (event.target.closest("[data-cookie-decline]")) return dismiss("declined");
    if (event.target.closest("[data-cookie-open]")) {
      event.preventDefault();
      build(true);
      relabel();
      const first = banner && banner.querySelector("button");
      if (first) first.focus();
    }
  });

  // Follow language switches made by main.js.
  new MutationObserver(relabel).observe(root, { attributes: true, attributeFilter: ["lang"] });

  // The footer is injected asynchronously; label its settings button when ready.
  const footer = document.getElementById("siteFooter");
  if (footer) new MutationObserver(relabel).observe(footer, { childList: true, subtree: true });

  let tries = 0;
  (function waitForFooter() {
    relabel();
    if (!document.querySelector("[data-cookie-open]") && tries++ < 40) setTimeout(waitForFooter, 50);
  })();

  function init() {
    build(false);
    relabel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.lupyanaCookies = {
    value: stored,
    open() {
      build(true);
      relabel();
    },
    reset() {
      try {
        localStorage.removeItem(KEY);
      } catch (error) {
        /* ignore */
      }
      build(true);
      relabel();
    },
  };
})();
