# GS Manpower – developer handoff

Corporate website for GS Manpower Services, Chhatrapati Sambhajinagar, with a form backend and admin panel.
English and Marathi, Node.js 20+, **no npm dependencies** (only Node built-ins). Deploy guide: `docs/DEPLOY.md`.

## Run it

```bash
npm run setup      # once: writes .env (DATA_KEY, ADMIN_PASSWORD_HASH) and prints the admin password
npm run dev        # server + rebuild on every change in /src; http://localhost:4173, admin at /admin
npm start          # production-style start (no file watching)
npm run build      # build /site only
npm test           # 15 end-to-end tests (node:test), temporary data folder
```

`npm install` is not needed. If 4173 is busy (development only) the server tries the next ports and prints the address.

## Architecture

One Node process (`server/index.js`):

| Concern | Where | Notes |
|---|---|---|
| Static website | `site/` (built from `src/` by `build.js`) | Built at start-up and after every admin settings change; the build swaps in a finished folder |
| Forms API | `POST /api/enquiry`, `POST /api/application` | multipart/urlencoded/JSON; same-origin check; rate limit 5 per 10 min per IP in production |
| Validation | `server/validate.js` | Mirrors the browser; allow-listed options; resume type by magic bytes (PDF/DOC/DOCX), ≤ 5 MB |
| Spam | honeypot `company_website`, `started_at` ≥ 3 s, rate limit | Bots get a fake 200; nothing stored |
| Storage | `server/store.js` → `DATA_DIR/leads/<type>/<id>.json.enc` (+ `.resume.enc`) | AES-256-GCM per file (`server/crypto.js`), atomic writes, mode 600 |
| Retention | daily purge | enquiries 730 days, applications 365 days (env-configurable; must match the privacy notice) |
| Notifications | `server/notify.js` | Resend email, generic webhook, WhatsApp Cloud API template; **no personal data in alerts** |
| Admin | `/admin` (`server/admin/`), API `/api/admin/*` | scrypt password hash, 30-min idle session cookie (HttpOnly, SameSite=Strict, Secure in prod), `X-GSM-Admin` header required (CSRF), login rate limit, audit log without personal data |
| CMS | Admin → Website settings (`server/content.js`) | Allow-listed keys only (contact, registrations, GA4, security flag) → `DATA_DIR/content.json` merged over `src/content/site.json`; values HTML-escaped at build |
| Headers | `server/index.js` | CSP (no inline script/style), HSTS in production, nosniff, frame-ancestors none, COOP |
| Health | `GET /healthz` | Used by Render / Docker |

Production refuses to start without `DATA_KEY` and `ADMIN_PASSWORD_HASH`. Behind a proxy keep `TRUST_PROXY=1`.

## Source structure

| Path | What it is |
|---|---|
| `src/content/site.json` | Defaults for contact details, registrations, endpoints, GA4 ID, `features.security` |
| `src/layout.html` | Page shell: meta, hreflang, Open Graph image, JSON-LD, fonts, scripts |
| `src/pages/*.html`, `src/pages/mr/*.html` | English pages and their Marathi twins (same file names). First line `<!--meta {json}-->` |
| `src/partials/*.html` | Header, footer, icons, consent banner, both forms; `name.mr.html` is used on Marathi pages |
| `src/assets/css/tokens.css` | Design tokens (mirror: `src/assets/tokens.json`) |
| `src/assets/css/styles.css` | Components, mobile first (640 / 960 / 1024 px) |
| `src/assets/js/main.js` | Mobile nav, forms (English/Marathi messages, server error mapping), consent-gated GA4 |
| `src/assets/img/` | Logo marks, illustrations, `og-image.png`, home-screen icons, `site.webmanifest` |
| `scripts/` | `setup.js`, `illustrations.js`, `brand-images.js` (PNG renderer), `print-items.js` |
| `print/` | Visiting card, staff IDs, recruitment post |

Template syntax: `{{key}}` (settings are HTML-escaped; page meta is trusted), `{{> partial}}`,
`<!-- if:flag --> … <!-- endif:flag -->`. The build fails on any unfilled `{{…}}`.

## Pages

English at `/`, Marathi at `/mr/`: Home, About Us, Our Services, Industries, For Job Seekers (`careers.html`),
Contact Us, Privacy Notice, plus `404.html`. `components.html` is the component library (English only, `noindex`).
Footer language switch links each page to its twin; `hreflang` pairs are in every page head; the sitemap lists all 14.

## Design system

Source of truth: **GS Manpower Brand Guidelines v1.0 (October 2026)** (supersedes the first brief's palette and fonts).

- **Palette:** Command Navy `#14213D`, Shift Saffron `#F2A007`, Site Paper `#F6F4EF`, Steel `#5B6477`,
  Care Teal `#0E7C70` (GS Care only). Saffron is a signal: the mark's figure and one CTA per layout (`.btn-primary`,
  navy text on saffron); other solid buttons `.btn-navy`. Never saffron text on light backgrounds.
- **Type:** Archivo 800/900 (headlines, wordmark), Manrope 400–700 (body 15/24, labels 700 caps +16%), Mukta 400/600/800
  for Devanagari – it is the second font in every stack, so Marathi glyphs render in Mukta automatically. Marathi
  text is never letter-spaced and gets taller line heights (`:lang(mr)` rules at the end of `styles.css`).
- **Logo:** "G Guardian" mark. `gs-mark*.svg` are an **interim redraw**; replace with the master files when supplied
  (same names). Primary lockup in the header, reversed in the footer, no effects.
- **Illustrations:** flat brand illustrations replace photo placeholders (`scripts/illustrations.js`). See
  `docs/PHOTO_PROMPTS.md` for AI prompts, honesty rules and how to swap in photos.
- **Voice:** plain, punctual, provable; no "best/No. 1/world-class"; worker-facing pages lead in Marathi.

## Before launch – owner to supply or confirm

Most of these are edited in **Admin → Website settings** (yellow border = still a placeholder).

- [ ] Phone, WhatsApp, email, address, office hours (EN + MR)
- [ ] Registrations: Udyam/Shops & Establishment, GSTIN, EPF, ESIC, contract labour licence – **publish only what is held**
- [ ] Grievance officer name; privacy notice reviewed by a legal adviser (DPDP Act 2023)
- [ ] Promises kept on every deployment: reply in one working day, replacement in 24 hours, police verification, PF/ESIC
- [ ] GS Care nurse/technician registration checks match practice
- [ ] Native-speaker review of all Marathi pages (`src/pages/mr/`, `*.mr.html` partials) and the Hindi lines
- [ ] Master logo files; real photography (optional, see `docs/PHOTO_PROMPTS.md`)
- [ ] Company history / founders on About
- [ ] Notification channel configured and tested (`docs/DEPLOY.md` step 4)

## Security service – licence gate

All security content is inside `<!-- if:security -->`. Turn on **Show security services** in the admin panel only
after the PSARA licence is granted, and fill in the PSARA licence field.

## Known limits / next steps

- CMS edits settings, not page text. Page copy changes are made in `src/pages/` and deployed via git.
- Single-instance design: sessions and rate limits are in memory, storage is the local disk. To scale to several
  instances, move sessions to a shared store and leads to a database (the `store.js` interface is small).
- Google Fonts are loaded from Google; self-host woff2 files to remove the third-party request.
- Spam: if bots get through the honeypot, add Cloudflare Turnstile (allow its domain in the CSP).

## Accessibility

Skip link, landmarks, visible focus, 48 px targets, menu with `aria-expanded`/Escape, labelled fields with
required/optional text, errors linked by `aria-describedby`, focus to the first error, reduced-motion support,
AA contrast, `lang` attributes on mixed-language text.
