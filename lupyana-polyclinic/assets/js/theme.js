/*
  Light / dark theme toggle.

  Every page always starts in the light theme. Nothing is remembered between
  page loads: the inline gate in <head> hard-sets light before first paint and
  clears any older saved choice, so the site can never open dark.

  This file only handles the header button for the page that is open:

    - clicking [data-theme-toggle] switches this page to dark or back to light
    - the button's icon, label and aria-pressed follow the current theme
    - the label follows the active site language (EN / SW)

  The header is injected asynchronously by main.js, so the button is found by
  event delegation and the header is watched for re-renders.
*/
(() => {
  const root = document.documentElement;

  const LABELS = {
    en: { dark: "Switch to dark theme", light: "Switch to light theme" },
    sw: { dark: "Badilisha hadi mandhari nyeusi", light: "Badilisha hadi mandhari nyeupe" },
  };

  const current = () => (root.getAttribute("data-theme") === "dark" ? "dark" : "light");

  const labels = () => LABELS[(root.lang || "en").slice(0, 2)] || LABELS.en;

  function sync() {
    const theme = current();
    const copy = labels();
    const next = theme === "dark" ? copy.light : copy.dark;

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-label", next);
      button.setAttribute("title", next);
      button.setAttribute("aria-pressed", String(theme === "dark"));
      const use = button.querySelector("use");
      if (use) use.setAttribute("href", theme === "dark" ? "#i-sun" : "#i-moon");
    });

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#071312" : "#0b5d5a");
  }

  function set(theme) {
    root.setAttribute("data-theme", theme);
    sync();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-toggle]");
    if (!button) return;
    set(current() === "dark" ? "light" : "dark");
  });

  // Update the label when main.js switches the site language.
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["lang"] });

  // Keep syncing until the async header exists, then watch it for re-renders.
  const header = document.getElementById("siteHeader");
  if (header) new MutationObserver(sync).observe(header, { childList: true, subtree: true });

  let tries = 0;
  (function waitForButton() {
    sync();
    if (!document.querySelector("[data-theme-toggle]") && tries++ < 40) setTimeout(waitForButton, 50);
  })();
})();
