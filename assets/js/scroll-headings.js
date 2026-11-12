/*
  Scroll motion for headings.

  Adds the motion kit's documented opt-in attributes to the page headings so
  they rise line-by-line as they scroll into view:

      <h1|h2 data-8b-motion="rise" data-8b-split="lines">

  Must load BEFORE motion.js (defer order) so the kit finds the attributes when
  it initialises. The marquee's own title is deliberately excluded.

  On a language switch main.js re-writes every [data-i18n] element with
  innerHTML. That would leave the kit's cached original text behind (and restore
  the previous language on the next resize), so the split is dropped for the
  current page when the language changes; the headings stay plain and readable.
*/
(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  const headings = () =>
    [...document.querySelectorAll("main h1, main h2")].filter((el) => !el.closest(".mq"));

  const live =
    !reduce.matches &&
    (root.hasAttribute("data-8b-live") || CSS.supports("animation-timeline: view()"));

  if (live) {
    headings().forEach((el) => {
      if (el.hasAttribute("data-8b-motion") || el.hasAttribute("data-8b-split")) return;
      el.setAttribute("data-8b-motion", "rise");
      el.setAttribute("data-8b-split", "lines");
    });
  }

  // Capture phase: runs before main.js's own delegated language handler.
  document.addEventListener(
    "click",
    (event) => {
      if (!event.target.closest("[data-lang]")) return;
      headings().forEach((el) => {
        el.removeAttribute("data-8b-split");
        el.removeAttribute("data-8b-motion");
      });
    },
    true
  );
})();
