# Lupyana Polyclinic — website

A static, multi-page website for **Lupyana Polyclinic** in Vwawa, Mbozi, Songwe,
Tanzania. Semantic HTML, one CSS design system, and a small amount of vanilla
JavaScript. There is no build step, no framework, and no runtime dependency.

Live domain: **https://lupyanapolyclinic.co.tz** (canonical origin, no `www`).

All editable copy lives in **`content.json`**. `assets/js/content-data.js` is a
generated mirror of the same data so the site also works when opened directly
from disk (`file://`). The two files must stay in sync.

---

## 1. What the site does

- Publishes the clinic's real details, services, departments, facilities,
  opening hours, location and contact routes.
- Keeps **one** WhatsApp entry point site-wide: the header button. Every other
  contact action is a phone call, directions, or the enquiry form.
- Sends appointment enquiries by email through a Google Apps Script web app to
  the clinic mailbox configured in `tools/apps-script/Code.gs`, then redirects to
  `thank-you.html` so submissions can be measured.
- Falls back to WhatsApp when no email endpoint is configured, so the form never
  claims a request was received when it was not.
- Shows an English/Swahili switch in the header and mobile menu, remembers the
  choice in `localStorage`, and updates `<html lang>`.
- Has a light/dark theme with a teal cookie-consent banner and a dotted texture
  in both themes. Every page load starts in **light**, whatever the device is
  set to and whatever was chosen before; the header toggle switches the page in
  front of you to dark, and that choice is deliberately not carried over to the
  next page or the next visit.
- Hides Team and gallery content until real, consented names and approved photos
  exist. No stock or invented people are shown.

---

## 2. Sitemap

| Page | File | Purpose |
|---|---|---|
| Home | `index.html` | Hero, quick info, services, About teaser, contact, emergency, CTA |
| About | `about.html` | Background, mission, values, key facts, facilities, contact panel |
| Medical Services | `services.html` | Services grid, departments, laboratory/diagnostics, facilities, hours |
| Contact & Location | `contact.html` | Phone, WhatsApp, email, address, hours, map |
| Appointment Enquiry | `appointment.html` | Validated form, consent, honeypot, local rate limit |
| Privacy & Terms | `privacy.html` | How the site handles enquiries, plus terms of use |
| Thank you | `thank-you.html` | Post-submit confirmation, `noindex, nofollow` |
| 404 | `404.html` | Not-found page with recovery links |

`_paused/team.html` is kept for later but is **not published or linked**. Move it
back to the root only when staff profiles have written consent.

---

## 3. Components

Rendered by `assets/js/main.js`:

- `Header` — brand, primary nav (Home, About, Services, Contact, Book / Enquire),
  language switch, Call, the single WhatsApp button, menu button
- `MobileNav` — full-screen menu, large tap targets, contact actions, language switch
- `MobileActionBar` — sticky Call / Directions bar
- `Footer` — clinic summary, quick links, contact details, hours, legal links
- `Hero`, `QuickInfoStrip`, `SectionHeader`
- `ServiceCard`, `GalleryCard`, `MiniCard`
- `StaffCard` + `StaffDialog` — consent-gated; unused while `staff` is empty
- `ContactBlock`, `MapBlock`, `EmergencyBox`, `CTABand`
- `EnquiryForm` — fields, notice, consent, honeypot, status states
- `Toast` — explains that a contact detail is awaiting approval
- `Breadcrumbs`

### Opening ident

`assets/css/intro.css` and `assets/js/intro.js` mount a centred brand animation
that follows the clinic's motion sample (`Lupyana.mp4`): a deep navy stage
(`#141b30`) with a teal bloom in the bottom-right corner and a quieter blue
bloom in the top-left, the real logo artwork rendered white.

The artwork is not redrawn: `assets/img/logo.png` is split into six transparent
layers (`assets/img/intro/`), and the white treatment is a CSS filter on those
layers. The layers are plain images positioned as percentages of a 380 × 409
box, so the lockup and its motion are identical at every screen size. The loader
is an HTML square centred on the heart, and every rotation and scale happens on
an HTML box rather than an SVG child — which keeps the loop centred correctly on
mobile browsers. It plays on the first page a visitor opens in a browser
session, then stays out of the way on internal navigation. It is intentionally
not added to `thank-you.html` or `404.html`.

The sequence (times from the moment the layer images decode):

1. **Loader** — a white arc sweeps a full turn (820ms), rotating -20° to 120°,
   then collapses into the heart (640ms, 300ms).
2. **Heart** — the ink line art forms from the loader's centre (620ms, 520ms),
   scaling up from 88%.
3. **Figures** — the orange hand and the green and blue figures rise 18px into
   place in quick succession (840ms, 910ms, 980ms; 420ms each).
4. **Wordmark** — "LUPYANA POLYCLINIC" locks in from the left (1080ms, 540ms).
5. **Two beats** — the emblem pulses twice (1760ms, 640ms), with a faint ring
   leaving the heart on each beat (1780ms and 2080ms, 460ms).

The last animation finishes at 2540ms and the completed lockup — identical to
the static logo — is held until 2600ms. Exit is a 460ms fade with a slight
upward drift, so worst-case teardown is about 3.4s after the page starts.

- `?intro=1` replays it; `?intro=0` suppresses it.
- The overlay is `aria-hidden` and removes itself when it finishes.
- Under `prefers-reduced-motion: reduce` the loader and pulses are not shown at
  all; the finished lockup is displayed still for 1400ms, then the overlay is
  removed without animation.
- An inline gate in each page head hides the page for the duration and has a
  3.6-second failsafe, so a missing script can never leave the page blank.
- Session key: `lupyana_intro_seen`. A `lupyana:intro-finished` event fires when
  the overlay leaves, for future analytics.

### Photography

The two editorial photos (`womens-health.jpg` on the home page,
`home-healthcare.jpg` on About) share the same `.about-photo` 16:10 frame, so
they render at an identical size at every breakpoint. Both:

- fade in the first time they enter the viewport (700ms opacity, 480ms rise),
  driven by an `IntersectionObserver` in `setupPhotoFade()`;
- zoom to 1.02 with a deeper shadow on hover, only on precise pointers;
- stay visible without JavaScript, because the hidden state is gated on
  `@media (scripting: enabled)`;
- print at full opacity even if they were never scrolled into view;
- drop the motion under `prefers-reduced-motion: reduce`.

### Contact details

The public email address is intentionally withheld until the clinic confirms it
in writing. `clinic.email` and `enquiryEmail` are empty strings, contact rows
carry `data-email-row` and `syncEmailRows()` hides them, and the footer email
item is only rendered when an address exists. Filling `clinic.email` back in
restores every row automatically. Phone and WhatsApp remain the contact routes.


---

## 4. Design tokens

Tokens live in `assets/css/styles.css` under `:root`.

### Colour

| Token | Value | Use |
|---|---|---|
| `--c-primary` | `#0B5D5A` | Buttons, links, icons, focus rings |
| `--c-primary-700` | `#074643` | Button hover, strong text |
| `--c-primary-800` | `#063634` | Top bar, footer |
| `--c-primary-200` | `#B9DCD7` | Soft borders |
| `--c-primary-100` | `#DCEFEC` | Tints |
| `--c-primary-50` | `#F0F8F6` | Section and card tints |
| `--c-secondary` | `#123B5D` | Reserved secondary blue |
| `--c-text` | `#0F2A2A` | Body and headings |
| `--c-muted` | `#4B6363` | Secondary text (AA on white and surface) |
| `--c-border` | `#D6E4E1` | Hairlines |
| `--c-border-strong` | `#B9D0CC` | Input borders |
| `--c-surface` | `#F5F9F8` | Alternating bands |
| `--c-surface-2` | `#EAF3F1` | Chips, soft fills |
| `--c-success` | `#1F7A4D` | Success status |
| `--c-danger` | `#B3261E` | Errors |

Buttons are green and pill-shaped throughout. The warm accent tokens are kept
only for legacy surfaces such as the noscript notice; there are no amber or
yellow controls.

To apply the clinic's brand colours, change these variables only. Keep body text
at 4.5:1 contrast or better.

### Type

Two families, both from Google Fonts with system fallbacks:

- **Bricolage Grotesque** — SemiBold 600 / Bold 700. H1–H3, service titles,
  section headings and the Lupyana wordmark (`--font-display`).
- **Onest** — Regular 400 / Medium 500 / SemiBold 600. Body copy, navigation,
  labels, buttons, forms and captions (`--font-sans`).

| Token | Size | Use |
|---|---|---|
| `--fs-display` | `clamp(2.35rem, 1.45rem + 4vw, 4.15rem)` | H1 |
| `--fs-h2` | `clamp(1.8rem, 1.25rem + 2.2vw, 2.7rem)` | Section headings |
| `--fs-h3` | `clamp(1.12rem, 1rem + 0.45vw, 1.35rem)` | Card headings |
| `--fs-lead` | `clamp(1.05rem, 0.98rem + 0.4vw, 1.22rem)` | Lead paragraphs |
| `--fs-body` | `1.0625rem` | Body |
| `--fs-sm` | `0.9375rem` | Supporting text |
| `--fs-xs` | `0.8125rem` | Captions, labels |

### Spacing, radius, shadow

- Spacing: `0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6rem`
  (`--space-1` … `--space-24`)
- Radius: `12px` small, `18px` medium, `26px` large, `34px` extra large, `999px` pill
- Shadow: `--shadow-sm`, `--shadow-md`, `--shadow-lg` (soft teal-tinted)
- Container: `1180px`; gutters `clamp(1rem, 3vw, 2rem)`; header `74px` desktop /
  `66px` mobile; mobile action bar `66px`

---

## 5. Setup and run

No installation is required.

```bash
cd lupyana-polyclinic
npm run serve
# open http://localhost:4173
```

The preview server binds to all interfaces (`0.0.0.0:4173`) and prints one URL
per local IPv4 address. To check the site on a phone, put the phone on the same
Wi-Fi and open the printed `http://<lan-ip>:4173` address, for example
`http://192.168.1.6:4173`.

- Set `PORT` to change the port and `HOST` to bind a single interface
  (`HOST=127.0.0.1 npm run serve`).
- On Windows the first launch usually raises a Defender Firewall prompt for
  Node.js. If the phone cannot connect, allow Node.js on **Private** networks,
  or add an inbound rule for TCP 4173 from an elevated PowerShell:
  `New-NetFirewallRule -DisplayName "Lupyana preview" -Direction Inbound -Protocol TCP -LocalPort 4173 -Action Allow`.
- The phone and the computer must be on the same network, and the network must
  not have client isolation enabled (common on guest Wi-Fi).

Equivalent options:

```bash
npx serve .
# or
python -m http.server 4173
```

> Opening `index.html` directly from disk also works because
> `assets/js/content-data.js` mirrors `content.json`. For the live site, always
> serve over HTTP so `content.json` is the single source of truth.

### Editing content

1. Edit **`content.json`** (clinic details, services, staff, photos, EN/SW strings).
2. Run **`npm run sync`** to regenerate `assets/js/content-data.js` and fill any
   missing Swahili string with a marked `[SW: …]` value.
3. Refresh the browser.

### Deploying

Upload the site files to any static host (Netlify, Vercel, Cloudflare Pages,
GitHub Pages, cPanel, S3). Leave the `tools/` folder, `README.md`, `CREDITS.md`
and `_paused/` out of the upload — they are development material, not part of the
published site.

- Point the domain at the host and keep `https://lupyanapolyclinic.co.tz` as the
  only canonical origin. Do not add `www` unless you also redirect it.
- Configure the host to serve `404.html` for unknown paths.
- `site.baseUrl` in `content.json` is already the live origin; canonical and
  `og:url` tags are absolute in every page.
- OG/Twitter images are absolute URLs to `assets/img/og-image.png` (1200×630).
- Deploy the enquiry endpoint (section 6) and paste the `/exec` URL into both
  content files.

### After launch

1. Submit `https://lupyanapolyclinic.co.tz/sitemap.xml` in **Google Search
   Console** for the clinic's property. `robots.txt` already points at it and
   disallows `/404.html` and `/thank-you.html`.
2. Use the Search Console URL Inspection tool on the home page and request
   indexing. Repeat for About and Services if they are not picked up.
3. Ask a fluent Swahili speaker to review the `sw` strings before treating them
   as final.

---

## 6. Enquiry form — Google Apps Script

The appointment form posts to a Google Apps Script web app that emails each
enquiry to the clinic mailbox. Full click-by-click instructions are in
[`tools/apps-script/README.md`](tools/apps-script/README.md).

Summary:

1. In the clinic's Google account, create a project at <https://script.google.com>
   and paste [`tools/apps-script/Code.gs`](tools/apps-script/Code.gs).
2. Deploy as a **Web app**: execute as **Me**, access **Anyone**.
3. Authorise the script, copy the `/exec` URL, and paste it into **both**:
   - `content.json` → `site.enquiryEndpoint`
   - `assets/js/content-data.js` → `site.enquiryEndpoint`
4. Send a test enquiry. The clinic receives the email and the visitor lands on
   `thank-you.html`.

Until the endpoint is set, the form opens WhatsApp with the answers already
filled in and tells the visitor to press send there. This is the safe fallback,
not a fake success state.

The Apps Script POST uses `Content-Type: text/plain;charset=utf-8` because a
JSON content type triggers a CORS preflight that Apps Script rejects. The script
returns JSON; the site treats an opaque response as delivered.

Payload shape:

```json
{
  "fullName": "…",
  "phone": "…",
  "preferredDate": "YYYY-MM-DD",
  "preferredTime": "HH:MM",
  "service": "service-1",
  "serviceLabel": "…",
  "message": "…",
  "consent": true,
  "language": "en",
  "page": "https://…/appointment.html"
}
```

Client-side protections: required fields, a consent checkbox, a hidden
`company` honeypot, a 2-minute `localStorage` rate limit, and a date that cannot
be in the past. Server-side protections in `Code.gs`: validation, a 60-second
per-phone throttle, length limits, and HTML escaping before the email is built.
Neither side replaces the other.

If the clinic ever wants phone/WhatsApp only, set `site.enquiryMode` to
`"phone"`. The form is replaced by a call/WhatsApp panel.

### Staff and photos

`staff` and `photos` are intentionally `[]`. Profiles render only when an item
has `approved: true`, and Team stays unpublished until each person gives written
consent. Do not add stock photos of people; use only clinic-approved images.

### Swahili

Every UI string has an `en` and `sw` value. `npm run sync` fills missing Swahili
keys with a marked `[SW: …]` placeholder. Do not machine-translate medical or
service content as final. A fluent speaker should review the copy.

---

## 7. Form, privacy and safety notes

- The form never asks for medical history, diagnosis, prescriptions or patient
  records. A notice above it says so.
- Consent is required before submission.
- Success copy is **“Thank you. The clinic will contact you using the details
  provided.”** The visitor is then redirected to `thank-you.html`.
- With no endpoint configured, the form hands the enquiry to WhatsApp and says
  so plainly. It never pretends an email was sent.
- The site sets no analytics, tracking pixels or advertising cookies. The cookie
  banner records the visitor's choice in `localStorage`.
- `privacy.html` is written from the site's actual behaviour: what the form
  collects, that Google Apps Script delivers it to the clinic's Gmail mailbox,
  how long it is kept, and how to ask for correction or deletion. It is not a
  substitute for the clinic's patient-records policy, and legal review is still
  advisable.

---

## 8. SEO and accessibility

- Unique `<title>`, meta description, canonical and Open Graph/Twitter tags on
  every published page.
- `MedicalClinic` JSON-LD on the home page, with `WebPage`/`AboutPage`/
  `ContactPage` schema on the other pages.
- `sitemap.xml` with EN/SW alternates and an entry for About; `robots.txt` with
  a live `Sitemap:` line and disallows for `404.html` and `thank-you.html`.
- Semantic landmarks, skip link, visible focus states, 44px+ tap targets,
  labelled form fields, `aria-live` status messages, keyboard-operable menu and
  dialog, and reduced-motion support.
- Team and gallery sections stay hidden until approved content exists, so the
  site never shows unconsented people or photos.
- The visible duplicate WhatsApp button was removed; the header button is the
  single WhatsApp entry point on every page.

---

## 9. Figma handoff

### Frames (per page)

Create three frames for each published page:

- **Desktop 1440** — 1180px container, 24px gutters, sticky 74px header
- **Tablet 768** — 2-column card grids, mobile action bar visible, 66px header
- **Mobile 390** — single column, stacked hero actions, 66px bottom bar

Pages: Home, About, Services, Contact, Appointment, Privacy, Thank you, 404.

### Components to create

`Header/Default`, `Header/Scrolled`, `Nav/Link/Default`, `Nav/Link/Active`,
`LanguageSwitcher`, `Button/Primary`, `Button/Ghost`, `Button/OutlineWhite`,
`Button/Small`, `Hero`, `QuickInfoCard`, `SectionHeader`, `ServiceCard`,
`StaffCard`, `StaffDialog`, `GalleryCard`, `MiniCard`, `ContactRow`, `MapBlock`,
`EmergencyBox`, `CTABand`, `Form/Field`, `Form/Select`, `Form/Textarea`,
`Form/Checkbox`, `Form/Status/Success`, `Form/Status/Error`, `Form/Status/Info`,
`Footer`, `MobileActionBar`, `CookieBanner`.

### Figma variables to recreate

- Colour: `primary`, `primary-700`, `primary-800`, `primary-200`, `primary-100`,
  `primary-50`, `secondary`, `text`, `muted`, `border`, `border-strong`,
  `surface`, `surface-2`, `success`, `danger`
- Radius: `sm 12`, `md 18`, `lg 26`, `xl 34`, `pill 999`
- Spacing: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`
- Shadow: `sm`, `md`, `lg`
- Type: `display`, `h2`, `h3`, `lead`, `body`, `sm`, `xs`
- Font families: `Bricolage Grotesque` (600 / 700 — headings and wordmark),
  `Onest` (400 / 500 / 600 — body and UI)
- Layout: `container 1180`, `gutter 24`, `header 74`, `mobile-header 66`,
  `bottom-bar 66`

### Prototype notes

- Language switch updates all strings and the `<html lang>` attribute.
- Mobile menu opens as a full-screen overlay with focus trapping and Escape to close.
- Form states: default, field error, consent error, sending, success, error,
  not-configured, rate-limited, WhatsApp fallback.
- Cookie banner appears on first visit and is dismissed with **Accept** or
  **Decline**.

---

## 10. Still waiting on the clinic

- [ ] Confirm the public email address so `clinic.email` / `enquiryEmail` can be
      filled in again (currently withheld, so the email rows stay hidden).
- [ ] Deploy `tools/apps-script/Code.gs` and paste the `/exec` URL into both
      content files.
- [ ] Submit `sitemap.xml` in Google Search Console.
- [ ] Written consent for staff names, titles, bios and photos before Team is
      published (the paused page is in `_paused/team.html`).
- [ ] Clinic-approved facility photos before the gallery sections are shown.
- [ ] Fluent Swahili review of the `sw` copy.
- [ ] Clinic legal adviser review of `privacy.html`.

---

## 11. Known limits

- This is a static site, not a CMS. A non-technical editor changes
  `content.json`; `npm run sync` keeps the offline fallback current.
- The enquiry form sends email only after `enquiryEndpoint` is configured.
  Until then it deliberately hands off to WhatsApp.
- The map appears only when `clinic.mapLink` holds a Google Maps embed URL.
- Swahili uses one dictionary and a `?lang=sw` query parameter (persisted in
  `localStorage`) rather than separate `/sw/` routes. `sitemap.xml` declares the
  alternates.
- No stock photos of people are used. Staff and gallery arrays stay empty until
  consented or approved content exists.
- Google Fonts is the only third-party request. Self-host **Bricolage
  Grotesque** and **Onest** if the clinic needs a fully offline build.
- The footer no longer carries a template credit. The MIT notice for the 8B
  Pipit design base is kept in `CREDITS.md`, which must ship with the deployed
  source.

---

## 12. Credits

Full licence texts and reuse notes are in **`CREDITS.md`**.

- Design base: **Pipit** speech-therapist template by **8B** — MIT licence. No
  photographs from the template are used.
- Icons: Lucide-style line icons, recreated inline (ISC licence).
- Typefaces: **Bricolage Grotesque** and **Onest** — SIL Open Font License.
- Logo: supplied by Lupyana Polyclinic; not part of the template licence.
