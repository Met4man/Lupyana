# Credits and licences

This site was built for Lupyana Polyclinic. The visual language (soft rounded
cards, pill buttons, generous spacing, calm section rhythm) is adapted from a
free template. No template copy, photography, patient stories or clinical
content is reused.

## Design base

- **Pipit — speech and language therapy template** by **8B**
  - Template page: <https://8b.com/templates/pipit/>
  - Source: <https://github.com/8bsite/speech-therapist-website-template>
  - Licence: **MIT** (code)
  - What we reused: layout patterns, spacing scale, rounded/pill component
    language and the general section structure.
  - What we did **not** reuse: all text, the speech-therapy subject matter, the
    purple brand palette, and every photograph.
  - The site footer no longer carries the “Design base: 8B (MIT)” credit. The
    MIT licence's copyright notice is kept in this file instead, together with
    the full licence text below, so this file must ship with the deployed
    source (keep it in the published folder or repository).

<details>
<summary>MIT licence notice</summary>

```text
MIT License

Copyright (c) 8B

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

</details>

## Photography

- **No photographs are included.** Every image slot is a labelled CSS
  placeholder showing its aspect ratio (16:9, 4:3, 3:2 or 1:1).
- When the clinic supplies photography, it must own the images or hold a written
  licence, and staff/patient photos need written consent before `approved` is
  set to `true` in `content.json`.
- The template's Unsplash-licensed photos were **not** copied into this project.

## Icons

- **Lucide** icon set — <https://lucide.dev>
  - Licence: **ISC**
  - The small set used here (phone, message, map pin, clock, arrow, check,
    menu, close, etc.) is recreated inline as an SVG sprite in
    `assets/js/main.js`, based on Lucide's 24×24 stroke geometry.

## Typefaces

- **Bricolage Grotesque** by Mathieu Triay — <https://fonts.google.com/specimen/Bricolage+Grotesque>
  - Licence: **SIL Open Font License 1.1**
  - Used at 600/700 for headings, service titles and the Lupyana wordmark.
- **Onest** by Dmitry Volkov / Nikita Sapozhkov — <https://fonts.google.com/specimen/Onest>
  - Licence: **SIL Open Font License 1.1**
  - Used at 400/500/600 for body text, navigation, labels, buttons and forms.
- Both are loaded from Google Fonts in each page `<head>`. For a fully offline
  build, self-host the WOFF2 files and remove the Google Fonts links; the CSS
  already falls back to the system sans-serif stack.

## Logo

- The Lupyana Polyclinic logo was supplied by the clinic and is **not** covered
  by the template licence. It is used in these files:
  - `assets/img/logo.png` — full lockup (footer)
  - `assets/img/logo-mark.png` — heart/stethoscope mark (header)
  - `assets/img/favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`
  - `assets/img/og-image.png` — 1200×630 social share card
- The clinic is responsible for confirming it owns the logo and has permission
  to publish it.

## Software

- No framework, no build step, no runtime dependency.
- Optional local tooling only: Node.js (for `tools/serve.mjs` and
  `tools/sync-content.mjs`).

## Content

- All clinic content is placeholder text owned by Lupyana Polyclinic once
  supplied. English is the source language; Swahili strings remain
  `[SW: …]` markers until a fluent speaker approves them.
- No patient records, histories, diagnoses or prescriptions appear anywhere in
  this project.
