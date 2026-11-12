/* ==========================================================================
   Lupyana Polyclinic — site behaviour
   No framework, no external JS. Content comes from content.json.
   ========================================================================== */
(function () {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const page = document.body.dataset.page || "home";

  let content = null;
  let lang = "en";
  let toastTimer = null;
  let revealObserver = null;

  /* ------------------------------------------------------------------------
     Small helpers
     ------------------------------------------------------------------------ */
  const escapeMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => escapeMap[c]);

  const isPlaceholder = (value) =>
    typeof value === "string" && /\[[^\[\]]+\]/.test(value);

  // Endpoint values that ship with the template must never be treated as live.
  const isConfiguredEndpoint = (value) =>
    typeof value === "string" &&
    /^https?:\/\//i.test(value) &&
    !isPlaceholder(value) &&
    !/PASTE_|REPLACE_WITH|YOUR_|EXAMPLE\.com/i.test(value);

  const pageFile = () => {
    if (page === "home") return "";
    if (page === "thankyou") return "thank-you.html";
    return `${page}.html`;
  };

  function getPath(object, path) {
    return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), object);
  }

  function t(key) {
    if (!content) return key;
    const dictionary = content[lang] || {};
    const english = content.en || {};
    return dictionary[key] != null ? dictionary[key] : english[key] != null ? english[key] : key;
  }

  function langValue(value) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    return value[lang] || value.en || "";
  }

  // Escape first, then make every [PLACEHOLDER] visibly marked.
  // A Swahili placeholder often contains English tokens inside it, so keep
  // the whole [SW: ...] string as one clearly marked token.
  function fmt(value) {
    const text = String(value == null ? "" : value);
    if (/^\[SW:\s*[\s\S]*\]$/.test(text)) {
      return `<span class="token">${esc(text)}</span>`;
    }
    return esc(text).replace(/\[([^\[\]]+)\]/g, (_, inner) => `<span class="token">[${inner}]</span>`);
  }

  function icon(name, extraClass = "") {
    return `<svg class="icon ${extraClass}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
  }

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  /* ------------------------------------------------------------------------
     Icon sprite (Lucide-style line icons, inline for zero extra requests)
     ------------------------------------------------------------------------ */
  const ICONS = {
    phone:
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>',
    whatsapp:
      '<path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35M12.05 21.79a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26C2.17 6.45 6.6 2.02 12.05 2.02c2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.9a11.82 11.82 0 0 0-3.48-8.41Z"/>',
    "map-pin":
      '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    instagram:
      '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    tiktok:
      '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    "arrow-right": '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    globe:
      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>',
    stethoscope:
      '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-3"/><circle cx="20" cy="10" r="2"/>',
    "heart-pulse":
      '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/><path d="M3 12h4l2-4 3 8 2-4h5"/>',
    baby:
      '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M9 8h.01M15 8h.01M10 11c1.2.8 2.8.8 4 0"/>',
    flask:
      '<path d="M9 3h6"/><path d="M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 22h11.6a2 2 0 0 0 1.7-3.5L14 9V3"/><path d="M7.5 15h9"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    building:
      '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3"/>',
    "shield-check":
      '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    "alert-triangle":
      '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    image:
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L7 20"/>',
    "message-circle":
      '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5Z"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    "external-link":
      '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    "arrow-up-right": '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'
  };

  function injectSprite() {
    const holder = document.createElement("div");
    holder.id = "icon-sprite";
    holder.setAttribute("aria-hidden", "true");
    holder.style.position = "absolute";
    holder.style.width = "0";
    holder.style.height = "0";
    holder.style.overflow = "hidden";
    holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${Object.entries(ICONS)
      .map(([name, paths]) => `<symbol id="i-${name}" viewBox="0 0 24 24">${paths}</symbol>`)
      .join("")}</svg>`;
    document.body.prepend(holder);
  }

  /* ------------------------------------------------------------------------
     Content loading
     ------------------------------------------------------------------------ */
  async function loadContent() {
    const local = window.__LUPYANA_CONTENT__ || window.LUPYANA_CONTENT;
    if (location.protocol === "file:" && local) {
      return local;
    }
    try {
      const response = await fetch("content.json", { cache: "no-store" });
      if (response.ok) return await response.json();
    } catch (error) {
      /* fall through to the generated local copy */
    }
    if (local) return local;
    throw new Error("content.json could not be loaded");
  }

  function pickLanguage() {
    const requested = new URLSearchParams(location.search).get("lang");
    const stored = localStorage.getItem("lupyana_lang");
    const candidate = requested || stored || (content && content.site && content.site.defaultLang) || "en";
    return candidate === "sw" ? "sw" : "en";
  }

  /* ------------------------------------------------------------------------
     Shared chrome
     ------------------------------------------------------------------------ */
  function brandHTML() {
    return `<a class="brand" href="index.html">
      <span class="brand__mark" data-logo aria-hidden="true">LP</span>
      <span class="brand__text">
        <span class="brand__name" data-bind="clinic.name">${esc(content.clinic.name)}</span>
        <span class="brand__sub" data-bind="clinic.tagline" aria-hidden="true">${esc(content.clinic.tagline)}</span>
      </span>
    </a>`;
  }

  function langHTML(extraClass = "") {
    return `<div class="lang ${extraClass}" role="group" aria-label="${esc(t("common.language"))}" data-i18n-aria="common.language">
      <button type="button" class="lang__btn" data-lang="en" aria-pressed="true">EN</button>
      <button type="button" class="lang__btn" data-lang="sw" aria-pressed="false">SW</button>
    </div>`;
  }

  function navItems() {
    return [
      ["home", "index.html", "nav.home"],
      ["about", "about.html", "nav.about"],
      ["services", "services.html", "nav.services"],
      ["contact", "contact.html", "nav.contact"],
      ["appointment", "appointment.html", "nav.appointment"]
    ];
  }

  function headerHTML() {
    const links = navItems()
      .map(
        ([key, href, label]) =>
          `<li><a class="nav__link" data-nav="${key}" href="${href}" data-i18n="${label}">${esc(
            t(label)
          )}</a></li>`
      )
      .join("");

    return `<header class="site-header" id="siteHeaderBar">
      <div class="container header__inner">
        ${brandHTML()}
        <nav class="nav" aria-label="${esc(t("common.primaryNav"))}" data-i18n-aria="common.primaryNav">
          <ul class="nav__list">${links}</ul>
        </nav>
        <div class="header__actions">
          <button class="icon-btn theme-toggle" type="button" data-theme-toggle aria-pressed="false" aria-label="Switch to dark theme" title="Switch to dark theme">${icon(
            "moon"
          )}</button>
          ${langHTML()}
          <a class="btn btn--ghost btn--sm header__call" data-link="phone" href="#">${icon(
            "phone"
          )}<span data-i18n="common.call">${esc(t("common.call"))}</span></a>
          <a class="btn btn--primary btn--sm header__wa" data-link="whatsapp" data-wa-message="contact.whatsapp.message" href="#" aria-label="${esc(
            t("common.whatsappUs")
          )}" data-i18n-aria="common.whatsappUs">${icon(
            "whatsapp",
            "icon--fill"
          )}<span data-i18n="common.whatsapp">${esc(t("common.whatsapp"))}</span></a>
          <button class="nav-toggle" id="navToggle" type="button" aria-expanded="false" aria-controls="mobileNav" aria-label="${esc(
            t("common.menu")
          )}" data-i18n-aria="common.menu">${icon("menu")}</button>
        </div>
      </div>
      <p id="langStatus" class="visually-hidden" aria-live="polite"></p>
    </header>`;
  }

  function mobileNavHTML() {
    const links = navItems()
      .map(
        ([key, href, label]) =>
          `<li><a class="mobile-nav__link" data-nav="${key}" href="${href}" data-i18n="${label}">${esc(
            t(label)
          )}${icon("chevron-right")}</a></li>`
      )
      .join("");
    return `<div class="mobile-nav" id="mobileNav" hidden>
      <div class="mobile-nav__top">
        <span class="mobile-nav__title">${esc(content.clinic.name)}</span>
        <button type="button" class="icon-btn" id="navClose" aria-label="${esc(t("common.close"))}">${icon(
      "close"
    )}</button>
      </div>
      <nav aria-label="${esc(t("common.mobileNav"))}" data-i18n-aria="common.mobileNav">
        <ul class="mobile-nav__links">
          ${links}
          <li><a class="mobile-nav__link" data-nav="privacy" href="privacy.html" data-i18n="nav.privacy">${esc(
            t("nav.privacy")
          )}${icon("chevron-right")}</a></li>
        </ul>
      </nav>
      <div class="mobile-nav__actions">
        <a class="btn btn--primary btn--block" data-link="phone" href="#">${icon(
          "phone"
        )}<span data-i18n="common.callNow">${esc(t("common.callNow"))}</span></a>
        <a class="btn btn--ghost btn--block" data-link="map" href="#">${icon(
          "map-pin"
        )}<span data-i18n="common.getDirections">${esc(t("common.getDirections"))}</span></a>
        ${langHTML()}
      </div>
      <div class="mobile-nav__meta">
        <p><strong data-i18n="common.hours">${esc(t("common.hours"))}:</strong> <span data-bind="clinic.hours">${esc(
      content.clinic.hours
    )}</span></p>
        <p><strong data-i18n="common.address">${esc(t("common.address"))}:</strong> <span data-bind="clinic.address">${esc(
      content.clinic.address
    )}</span></p>
      </div>
    </div>`;
  }

  function mobileBarHTML() {
    return `<nav class="mobile-bar" aria-label="${esc(t("common.quickActions"))}" data-i18n-aria="common.quickActions">
      <a data-link="phone" href="#">${icon("phone")}<span data-i18n="common.call">${esc(
      t("common.call")
    )}</span></a>
      <a data-link="map" href="#">${icon("map-pin")}<span data-i18n="common.directions">${esc(
      t("common.directions")
    )}</span></a>
    </nav>`;
  }

  /* The header WhatsApp button is the single WhatsApp entry point on the
     site; the floating bubble and the per-page WhatsApp buttons were removed. */

  /* Social links: only approved https links are shown; placeholders stay hidden. */
  function socialHTML() {
    const items = (content.clinic.social || []).filter(
      (item) => item && !isPlaceholder(item.url) && /^https:\/\//i.test(item.url)
    );
    if (!items.length) return "";
    const links = items
      .map(
        (item) =>
          `<li><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(
            item.label
          )} ${esc(item.handle || "")}">${icon(item.id)}<span>${esc(item.label)}</span></a></li>`
      )
      .join("");
    return `<h2 class="footer__title footer__social-title" data-i18n="footer.social">${esc(
      t("footer.social")
    )}</h2>
          <ul class="footer__social">${links}</ul>`;
  }

  function footerHTML() {
    const quick = [
      ["home", "index.html", "nav.home"],
      ["about", "about.html", "nav.about"],
      ["services", "services.html", "nav.services"],
      ["contact", "contact.html", "nav.contact"],
      ["appointment", "appointment.html", "nav.appointment"],
      ["privacy", "privacy.html", "nav.privacy"]
    ]
      .map(
        ([key, href, label]) =>
          `<li><a data-nav="${key}" href="${href}" data-i18n="${label}">${esc(t(label))}</a></li>`
      )
      .join("");

    return `<footer class="site-footer">
      <div class="container footer__grid">
        <div class="footer__brand">
          <a class="footer__logo" href="index.html">
            <img src="assets/img/logo.png" alt="${esc(content.clinic.name)}" width="132" height="132">
          </a>
          <p class="footer__about" data-bind="clinic.intro">${esc(content.clinic.intro)}</p>
        </div>
        <div>
          <h2 class="footer__title" data-i18n="footer.quickLinks">${esc(t("footer.quickLinks"))}</h2>
          <ul class="footer__links">${quick}</ul>
        </div>
        <div>
          <h2 class="footer__title" data-i18n="footer.contact">${esc(t("footer.contact"))}</h2>
          <ul class="footer__contact">
            <li>${icon("map-pin")}<span data-bind="clinic.address">${esc(content.clinic.address)}</span></li>
            <li>${icon("phone")}<a data-link="phone" href="#"><span data-bind="clinic.phone">${esc(
      content.clinic.phone
    )}</span></a></li>
            <li>${icon("whatsapp", "icon--fill")}<span data-bind="clinic.whatsapp">${esc(
      content.clinic.whatsapp
    )}</span></li>
            ${content.clinic.email
              ? `<li>${icon("mail")}<a data-link="email" href="#"><span data-bind="clinic.email">${esc(
                  content.clinic.email
                )}</span></a></li>`
              : ""}
          </ul>
          ${socialHTML()}
        </div>
        <div>
          <h2 class="footer__title" data-i18n="footer.hours">${esc(t("footer.hours"))}</h2>
          <p class="footer__hours" data-bind="clinic.hours">${esc(content.clinic.hours)}</p>
          <p class="footer__note" data-i18n="footer.privacyNote">${esc(t("footer.privacyNote"))}</p>
        </div>
      </div>
      <div class="container footer__bottom">
        <div class="footer__legal">
          <a href="privacy.html" data-i18n="nav.privacy">${esc(t("nav.privacy"))}</a>
          <button type="button" class="footer__cookie" data-cookie-open>Cookie settings</button>
        </div>
      </div>
    </footer>`;
  }

  function renderChrome() {
    const headerSlot = $("#siteHeader");
    if (headerSlot) headerSlot.innerHTML = headerHTML();
    else document.body.insertAdjacentHTML("afterbegin", `<div id="siteHeader">${headerHTML()}</div>`);

    const footerSlot = $("#siteFooter");
    if (footerSlot) footerSlot.innerHTML = footerHTML();
    else document.body.insertAdjacentHTML("beforeend", `<div id="siteFooter">${footerHTML()}</div>`);

    document.body.insertAdjacentHTML("beforeend", mobileNavHTML() + mobileBarHTML());
  }

  /* ------------------------------------------------------------------------
     Bind content + translations
     ------------------------------------------------------------------------ */
  function applyI18n() {
    $$("[data-i18n]").forEach((element) => {
      const value = t(element.dataset.i18n);
      if (value != null) element.innerHTML = fmt(value);
    });
    $$("[data-i18n-aria]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAria));
    });
  }

  function setLink(element, href, usable, toastKey = "toast.placeholder") {
    if (usable) {
      element.setAttribute("href", href);
      element.classList.remove("is-placeholder");
      element.removeAttribute("data-placeholder-link");
      element.removeAttribute("title");
      if (element.dataset.link === "map") {
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    } else {
      element.setAttribute("href", "#");
      element.classList.add("is-placeholder");
      element.dataset.placeholderLink = "true";
      element.dataset.placeholderToast = toastKey;
      element.setAttribute("title", t(toastKey));
    }
  }

  function clinicValue(key) {
    const localized = content.clinicText && content.clinicText[lang];
    if (localized && localized[key] != null) return localized[key];
    return content.clinic ? content.clinic[key] : null;
  }

  function bindingValue(path) {
    if (path.indexOf("clinic.") === 0) return clinicValue(path.slice(7));
    return getPath(content, path);
  }

  function applyBindings() {
    $$("[data-bind]").forEach((element) => {
      const value = bindingValue(element.dataset.bind);
      if (value != null) element.innerHTML = fmt(String(value));
    });

    $$('[data-link="phone"]').forEach((element) => {
      const value = content.clinic.phone;
      const usable = !isPlaceholder(value) && digits(value).length >= 6;
      const number = String(value).replace(/[^\d+]/g, "").replace(/^0/, "+255");
      setLink(element, `tel:${number}`, usable);
    });

    $$('[data-link="whatsapp"]').forEach((element) => {
      const value = content.clinic.whatsapp;
      const message = element.dataset.waMessage ? t(element.dataset.waMessage) : "";
      const number = digits(value).replace(/^0/, "255");
      const usable = !isPlaceholder(value) && number.length >= 8;
      setLink(
        element,
        `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`,
        usable
      );
    });

    $$('[data-link="email"]').forEach((element) => {
      const value = content.clinic.email;
      const usable = !isPlaceholder(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      setLink(element, `mailto:${value}`, usable);
    });

    $$('[data-link="map"]').forEach((element) => {
      const value = content.clinic.mapLink;
      const usable = !isPlaceholder(value) && /^https?:\/\//i.test(value);
      setLink(element, value, usable, "toast.map");
    });

    applyLogo();
  }

  /* The address stays out of the page until the clinic confirms it. Rows are
     marked with data-email-row and hidden here, and reappear as soon as
     clinic.email is filled in again. */
  function syncEmailRows() {
    const email = content.clinic && content.clinic.email;
    const usable = Boolean(email) && !isPlaceholder(email);
    $$("[data-email-row]").forEach((row) => {
      row.hidden = !usable;
    });
  }

  function applyLogo() {
    const logo = content.clinic.logo;
    $$("[data-logo]").forEach((mark) => {
      if (!isPlaceholder(logo) && /\.(png|jpe?g|svg|webp|avif)$/i.test(logo)) {
        mark.classList.add("brand__mark--image");
        mark.innerHTML = `<img src="${esc(logo)}" alt="" width="46" height="46">`;
      } else {
        mark.innerHTML = "LP";
        mark.setAttribute("title", logo);
      }
    });
  }

  /* ------------------------------------------------------------------------
     Dynamic content
     ------------------------------------------------------------------------ */
  function placeholderHTML(label, token, ratio) {
    return `<div class="ph ph--${ratio}" role="img" aria-label="${esc(label)}">
      <div class="ph__inner">${icon("image")}<span class="ph__label">${esc(
      label
    )}</span><span class="ph__token">${esc(token)}</span></div>
    </div>`;
  }

  function mediaHTML(src, alt, label, ratio) {
    if (!isPlaceholder(src) && /\.(png|jpe?g|webp|svg|avif)$/i.test(src)) {
      return `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
    }
    return placeholderHTML(label, src, ratio);
  }

  function serviceCard(service) {
    return `<article class="card service-card reveal">
      <span class="card__icon">${icon(service.icon || "stethoscope")}</span>
      <h3>${fmt(langValue(service.name))}</h3>
      <p>${fmt(langValue(service.desc))}</p>
      <div class="card__foot">
        <span class="chip">${fmt(langValue(service.department))}</span>
        <a class="link-arrow" href="appointment.html?service=${encodeURIComponent(service.id)}">${esc(
      t("common.enquire")
    )}${icon("arrow-right")}</a>
      </div>
    </article>`;
  }

  function renderServices(target, limit) {
    if (!target) return;
    target.innerHTML = content.services.slice(0, limit).map(serviceCard).join("");
  }

  function staffCard(person) {
    const photo = mediaHTML(
      person.photo,
      langValue(person.name),
      t("common.staffPortrait"),
      "1x1"
    );
    return `<article class="card staff-card reveal">
      <div class="staff-card__media">${photo}</div>
      <div class="staff-card__body">
        <h3>${fmt(langValue(person.name))}</h3>
        <p class="staff-card__title">${fmt(langValue(person.title))}</p>
        <p class="staff-card__field">${fmt(langValue(person.field))}</p>
        <p class="staff-card__quals"><strong>${esc(t("team.card.qualifications"))}:</strong> ${fmt(
      langValue(person.qualifications)
    )}</p>
        <button class="btn btn--ghost btn--sm" type="button" data-staff-id="${esc(
          person.id
        )}">${esc(t("common.viewProfile"))}${icon("arrow-right")}</button>
      </div>
    </article>`;
  }

  function renderStaff(target, people, limit) {
    if (!target) return;
    target.innerHTML = people.slice(0, limit).map(staffCard).join("");
  }

  function renderGallery(target, photos, limit) {
    if (!target) return;
    target.innerHTML = photos
      .slice(0, limit)
      .map(
        (photo) => `<figure class="gallery-card reveal">
          <div class="media">${mediaHTML(
            photo.src,
            langValue(photo.alt) || langValue(photo.caption),
            t("common.facilityPhoto"),
            "3x2"
          )}</div>
          <figcaption>${fmt(langValue(photo.caption))}</figcaption>
        </figure>`
      )
      .join("");
  }

  function miniCard(item) {
    return `<article class="mini-card reveal">
      <span class="mini-card__icon">${icon(item.icon || "building")}</span>
      <div><h3>${fmt(langValue(item.name))}</h3><p>${fmt(langValue(item.desc))}</p></div>
    </article>`;
  }

  function renderMiniCards(target, items) {
    if (!target) return;
    target.innerHTML = items.map(miniCard).join("");
  }

  function renderServiceOptions() {
    const select = $("#serviceSelect");
    if (!select) return;
    const current = select.value;
    const options = content.services
      .map(
        (service) =>
          `<option value="${esc(service.id)}">${esc(langValue(service.name))}</option>`
      )
      .join("");
    select.innerHTML = `<option value="">${esc(t("appointment.form.servicePlaceholder"))}</option>${options}<option value="general">${esc(
      t("appointment.form.notSure")
    )}</option>`;
    if (current) select.value = current;

    const requested = new URLSearchParams(location.search).get("service");
    if (requested && Array.from(select.options).some((option) => option.value === requested)) {
      select.value = requested;
    }
  }

  function renderLists() {
    renderServices($("#homeServices"), 4);
    renderServices($("#servicesGrid"), 6);
    renderMiniCards($("#departmentsList"), content.departments || []);
    renderMiniCards($("#facilitiesList"), content.facilities || []);

    const approvedStaff = (content.staff || []).filter((person) => person.approved === true);

    const homeTeamSection = $("#teamTeaser");
    if (homeTeamSection) {
      if (approvedStaff.length) {
        homeTeamSection.hidden = false;
        renderStaff($("#homeTeam"), approvedStaff, 4);
      } else {
        homeTeamSection.hidden = true;
      }
    }

    const teamGrid = $("#teamGrid");
    const teamNotice = $("#teamNotice");
    if (teamGrid) {
      if (approvedStaff.length) {
        teamGrid.hidden = false;
        if (teamNotice) teamNotice.hidden = true;
        renderStaff(teamGrid, approvedStaff, 20);
      } else {
        teamGrid.hidden = true;
        if (teamNotice) teamNotice.hidden = false;
      }
    }

    const approvedPhotos = (content.photos || []).filter((photo) => photo.approved === true);

    const homeGallerySection = $("#galleryTeaser");
    if (homeGallerySection) {
      if (approvedPhotos.length) {
        homeGallerySection.hidden = false;
        renderGallery($("#homeGallery"), approvedPhotos, 3);
      } else {
        homeGallerySection.hidden = true;
      }
    }

    const aboutGallery = $("#aboutGallery");
    if (aboutGallery) {
      if (approvedPhotos.length) {
        aboutGallery.hidden = false;
        renderGallery(aboutGallery, approvedPhotos, 6);
      } else {
        aboutGallery.hidden = true;
      }
    }

    renderServiceOptions();
    refreshReveals();
  }

  /* ------------------------------------------------------------------------
     Map
     ------------------------------------------------------------------------ */
  function setupMap() {
    const map = $("#mapBlock");
    if (!map) return;
    const embed = content.clinic.mapEmbed;
    const link = content.clinic.mapLink;
    const src = !isPlaceholder(embed) && /^https:\/\//i.test(embed) ? embed : link;
    const isEmbed =
      !isPlaceholder(src) && /^https:\/\/(www\.)?google\.[^/]+\/maps\/embed/i.test(src);

    if (isEmbed) {
      map.innerHTML = `<iframe src="${esc(
        src
      )}" title="${esc(t("contact.map.title"))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
    } else if (!isPlaceholder(src)) {
      map.innerHTML = `<a class="btn btn--primary" href="${esc(
        src
      )}" target="_blank" rel="noopener">${esc(t("common.directions"))}</a>`;
    } else {
      map.innerHTML = placeholderHTML(t("common.location"), "MAP", "wide");
    }
  }

  /* ------------------------------------------------------------------------
     Header scroll + navigation
     ------------------------------------------------------------------------ */
  function setupHeaderScroll() {
    const header = $(".site-header");
    if (!header) return;
    const isHome = document.body.dataset.page === "home";
    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle("is-scrolled", y > 8);
      if (isHome) header.classList.toggle("is-pinned", y > 140);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function setupNav() {
    const toggle = $("#navToggle");
    const nav = $("#mobileNav");
    const close = $("#navClose");
    if (!toggle || !nav || !close) return;

    const open = () => {
      nav.hidden = false;
      document.body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
      close.focus();
    };

    const closeNav = (returnFocus = true) => {
      nav.hidden = true;
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      if (returnFocus) toggle.focus();
    };

    toggle.addEventListener("click", open);
    close.addEventListener("click", () => closeNav());
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeNav(false);
    });

    document.addEventListener("keydown", (event) => {
      if (nav.hidden) return;
      if (event.key === "Escape") {
        closeNav();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = $$(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        nav
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function setupActiveNav() {
    $$("[data-nav]").forEach((link) => {
      if (link.dataset.nav === page) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  /* ------------------------------------------------------------------------
     Language
     ------------------------------------------------------------------------ */
  function applyLangButtons() {
    $$("[data-lang]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
    });
  }

  function updateMeta() {
    const key = `meta.${page}`;
    const title = t(`${key}.title`);
    const description = t(`${key}.desc`);
    if (title && title !== `${key}.title`) document.title = title;

    const descriptionElement = $('meta[name="description"]');
    if (descriptionElement && description) descriptionElement.setAttribute("content", description);

    const ogTitle = $('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const ogDescription = $('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute("content", description);
    const twitterTitle = $('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute("content", title);
    const twitterDescription = $('meta[name="twitter:description"]');
    if (twitterDescription) twitterDescription.setAttribute("content", description);

    const ogLocale = $('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute("content", lang === "sw" ? "sw_TZ" : "en_TZ");

    const base = content.site.baseUrl;
    if (!isPlaceholder(base) && /^https?:\/\//i.test(base)) {
      const suffix = pageFile();
      const canonical = $('link[rel="canonical"]');
      if (canonical) canonical.setAttribute("href", `${base.replace(/\/$/, "")}/${suffix}`);
      const ogUrl = $('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute("content", `${base.replace(/\/$/, "")}/${suffix}`);
    }
  }

  function updateUrl() {
    try {
      const url = new URL(location.href);
      if (lang === "en") url.searchParams.delete("lang");
      else url.searchParams.set("lang", lang);
      history.replaceState(null, "", url);
    } catch (error) {
      /* file:// or older browsers — ignore */
    }
  }

  function setLanguage(next) {
    lang = next === "sw" ? "sw" : "en";
    localStorage.setItem("lupyana_lang", lang);
    document.documentElement.lang = lang;
    applyLangButtons();
    applyI18n();
    applyBindings();
    renderLists();
    setupMap();
    updateMeta();
    updateUrl();

    const live = $("#langStatus");
    if (live) live.textContent = lang === "en" ? "Language: English" : "Lugha: Kiswahili";
  }

  function setupLanguage() {
    applyLangButtons();
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-lang]");
      if (!button) return;
      setLanguage(button.dataset.lang);
    });
  }

  /* ------------------------------------------------------------------------
     Placeholder links + toast
     ------------------------------------------------------------------------ */
  function toast(message) {
    let element = $("#toast");
    if (!element) {
      element = document.createElement("div");
      element.id = "toast";
      element.className = "toast";
      element.setAttribute("role", "status");
      element.setAttribute("aria-live", "polite");
      document.body.appendChild(element);
    }
    element.textContent = message;
    requestAnimationFrame(() => element.classList.add("is-visible"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("is-visible"), 4400);
  }

  function setupPlaceholderLinks() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a.is-placeholder");
      if (!link) return;
      event.preventDefault();
      toast(t(link.dataset.placeholderToast || "toast.placeholder"));
    });
  }

  /* ------------------------------------------------------------------------
     Staff profile dialog
     ------------------------------------------------------------------------ */
  function setupStaffDialog() {
    const dialog = $("#staffDialog");
    if (!dialog) return;

    const closeDialog = () => {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    };

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-staff-id]");
      if (trigger) {
        event.preventDefault();
        const person = (content.staff || []).find((item) => item.id === trigger.dataset.staffId);
        if (!person) return;
        const photo = mediaHTML(
          person.photo,
          langValue(person.name),
          t("common.staffPortrait"),
          "1x1"
        );
        dialog.innerHTML = `<div class="staff-dialog__inner">
          <div class="staff-dialog__top">
            <div>
              <h2 class="staff-dialog__title" id="staffDialogTitle">${fmt(langValue(person.name))}</h2>
              <p class="staff-dialog__role">${fmt(langValue(person.title))} · ${fmt(
          langValue(person.field)
        )}</p>
            </div>
            <button type="button" class="icon-btn" data-close-dialog aria-label="${esc(
              t("common.close")
            )}">${icon("close")}</button>
          </div>
          <div class="staff-dialog__media">${photo}</div>
          <div class="staff-dialog__body">
            <h3>${esc(t("team.modal.bio"))}</h3>
            <p>${fmt(langValue(person.bio))}</p>
          </div>
          <div class="staff-dialog__meta">
            <p><strong>${esc(t("team.card.qualifications"))}:</strong> ${fmt(
          langValue(person.qualifications)
        )}</p>
            <p><strong>${esc(t("team.card.field"))}:</strong> ${fmt(langValue(person.field))}</p>
          </div>
        </div>`;
        dialog.setAttribute("aria-labelledby", "staffDialogTitle");
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
        return;
      }

      if (event.target.closest("[data-close-dialog]")) closeDialog();
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog();
    });
  }

  /* ------------------------------------------------------------------------
     Appointment enquiry form
     ------------------------------------------------------------------------ */
  function todayISO() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function setFieldError(field, message) {
    if (!field) return;
    const wrapper = field.closest(".field");
    if (!wrapper) return;
    wrapper.classList.toggle("field--error", Boolean(message));
    field.setAttribute("aria-invalid", message ? "true" : "false");
    const error = wrapper.querySelector(".field__error");
    if (error) error.textContent = message || "";
  }

  function showFormStatus(type, message) {
    const status = $("#formStatus");
    if (!status) return;
    const iconName = type === "success" ? "check" : type === "error" ? "alert-triangle" : "info";
    status.className = `form__status form__status--${type} is-visible`;
    status.innerHTML = `${icon(iconName)}<span>${fmt(message)}</span>`;
    status.focus({ preventScroll: false });
  }

  function setupForm() {
    const form = $("#enquiryForm");
    if (!form) return;

    const phonePanel = $("#phoneModePanel");
    if (content.site.enquiryMode === "phone") {
      form.hidden = true;
      if (phonePanel) phonePanel.hidden = false;
      return;
    }
    form.hidden = false;
    if (phonePanel) phonePanel.hidden = true;

    const name = form.elements["name"];
    const phone = form.elements["phone"];
    const date = form.elements["date"];
    const time = form.elements["time"];
    const service = form.elements["service"];
    const message = form.elements["message"];
    const consent = form.elements["consent"];
    const honeypot = form.elements["company"];
    const submit = form.querySelector('button[type="submit"]');
    const status = $("#formStatus");
    const consentField = $("#consentField");

    if (date) date.min = todayISO();

    [name, phone, date, service, message].forEach((field) => {
      if (!field) return;
      field.addEventListener("input", () => setFieldError(field, ""));
      field.addEventListener("change", () => setFieldError(field, ""));
    });

    if (consent) {
      consent.addEventListener("change", () => {
        if (consentField) consentField.classList.remove("field--error");
        const error = $("#consentError");
        if (error) error.textContent = "";
      });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (status) status.className = "form__status";

      // Honeypot: quietly stop bots.
      if (honeypot && honeypot.value) return;

      let valid = true;

      if (!name || name.value.trim().length < 2) {
        setFieldError(name, t("appointment.form.nameError"));
        valid = false;
      }
      if (!phone || digits(phone.value).length < 7) {
        setFieldError(phone, t("appointment.form.phoneError"));
        valid = false;
      }
      if (!date || !date.value) {
        setFieldError(date, t("appointment.form.dateError"));
        valid = false;
      } else {
        const chosen = new Date(`${date.value}T00:00:00`);
        const today = new Date(`${todayISO()}T00:00:00`);
        if (Number.isNaN(chosen.getTime()) || chosen < today) {
          setFieldError(date, t("appointment.form.dateError"));
          valid = false;
        }
      }
      if (!service || !service.value) {
        setFieldError(service, t("appointment.form.serviceError"));
        valid = false;
      }
      if (!consent || !consent.checked) {
        if (consentField) consentField.classList.add("field--error");
        const error = $("#consentError");
        if (error) error.textContent = t("appointment.form.consentError");
        valid = false;
      }

      if (!valid) {
        showFormStatus("error", t("appointment.form.invalid"));
        const firstError = form.querySelector(".field--error input, .field--error select, .field--error textarea");
        if (firstError) firstError.focus();
        return;
      }

      // Simple client-side rate limit (the server must enforce its own).
      const limitMinutes = Number(content.site.formRateLimitMinutes) || 2;
      const lastSent = Number(localStorage.getItem("lupyana_enquiry_last") || 0);
      if (Date.now() - lastSent < limitMinutes * 60000) {
        showFormStatus("error", t("appointment.form.rateLimited"));
        return;
      }

      const payload = {
        fullName: name.value.trim(),
        phone: phone.value.trim(),
        preferredDate: date.value,
        preferredTime: time ? time.value : "",
        service: service.value,
        serviceLabel: service.options[service.selectedIndex]?.text || "",
        message: message ? message.value.trim() : "",
        consent: true,
        language: lang,
        page: location.href
      };

      const endpoint = content.site.enquiryEndpoint;
      const hasEndpoint = isConfiguredEndpoint(endpoint);

      // No form endpoint is configured, so the enquiry is handed to WhatsApp
      // with the answers already filled in. The visitor still presses send in
      // WhatsApp; nothing leaves the browser before that.
      if (!hasEndpoint) {
        const waNumber = digits(content.clinic.whatsapp).replace(/^0/, "255");
        const lines = [
          t("appointment.wa.intro"),
          "",
          `${t("appointment.form.name")}: ${payload.fullName}`,
          `${t("appointment.form.phone")}: ${payload.phone}`,
          `${t("appointment.form.service")}: ${payload.serviceLabel}`,
          `${t("appointment.form.date")}: ${payload.preferredDate}${
            payload.preferredTime ? ` ${payload.preferredTime}` : ""
          }`
        ];
        if (payload.message) lines.push(`${t("appointment.form.message")}: ${payload.message}`);
        const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
        window.open(waLink, "_blank", "noopener");
        showFormStatus("info", t("appointment.form.waReady"));
        return;
      }

      if (submit) {
        submit.disabled = true;
        submit.dataset.label = submit.innerHTML;
        submit.innerHTML = `${esc(t("appointment.form.sending"))}`;
      }

      // Apps Script web apps reject a JSON content type because it triggers a
      // CORS preflight. A text/plain POST is a "simple" request and is accepted.
      const isAppsScript = /^https:\/\/script\.google\.com\//i.test(endpoint);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          mode: "cors",
          redirect: "follow",
          headers: isAppsScript
            ? { "Content-Type": "text/plain;charset=utf-8", Accept: "application/json" }
            : { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload)
        });

        // An opaque response cannot be inspected, but the request did reach the
        // endpoint; treat it as delivered rather than showing a false error.
        if (!(response.type === "opaque" || response.status === 0) && !response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        localStorage.setItem("lupyana_enquiry_last", String(Date.now()));
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: "enquiry_submitted",
          enquiry_service: payload.service,
          enquiry_language: payload.language
        });
        document.dispatchEvent(
          new CustomEvent("lupyana:enquiry-submitted", { detail: payload })
        );

        form.reset();
        if (date) date.min = todayISO();
        showFormStatus("success", t("appointment.form.success"));

        // The dedicated page makes successful submissions easy to measure.
        window.setTimeout(() => window.location.assign("thank-you.html"), 700);
      } catch (error) {
        showFormStatus("error", t("appointment.form.error"));
      } finally {
        if (submit) {
          submit.disabled = false;
          if (submit.dataset.label) submit.innerHTML = submit.dataset.label;
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------------ */
  function refreshReveals() {
    const elements = $$(".reveal:not(.is-in)");
    if (!elements.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-in"));
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
    }

    elements.forEach((element) => revealObserver.observe(element));
  }

  /* ------------------------------------------------------------------------
     Photo fade-in
     Runs as soon as this file executes, not after the content fetch, so an
     above-the-fold photo never sits blank waiting for the JSON round trip.
     ------------------------------------------------------------------------ */
  function setupPhotoFade() {
    const photos = $$(".photo-fade");
    if (!photos.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      photos.forEach((photo) => photo.classList.add("is-in"));
      return;
    }

    const photoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          photoObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    photos.forEach((photo) => photoObserver.observe(photo));
  }

  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */
  async function init() {
    injectSprite();

    try {
      content = await loadContent();
    } catch (error) {
      const main = $("#main");
      if (main) {
        main.insertAdjacentHTML(
          "afterbegin",
          `<div class="container section"><div class="notice-box">${icon(
            "alert-triangle"
          )}<div><h2>Content could not be loaded</h2><p>Please serve this folder over HTTP (for example <code>npx serve .</code>) and check that <code>content.json</code> and <code>assets/js/content-data.js</code> exist.</p></div></div></div>`
        );
      }
      return;
    }

    lang = pickLanguage();
    document.documentElement.lang = lang;

    renderChrome();
    applyI18n();
    applyBindings();
    syncEmailRows();
    renderLists();
    setupMap();
    updateMeta();

    setupLanguage();
    setupNav();
    setupHeaderScroll();
    setupStaffDialog();
    setupForm();
    setupPlaceholderLinks();
    setupActiveNav();
    refreshReveals();
  }

  setupPhotoFade();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
