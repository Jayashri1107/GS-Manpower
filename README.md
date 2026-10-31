# GS Manpower – website, form backend and admin panel

**Right people. Right shift.** Corporate website for GS Manpower Services, Chhatrapati Sambhajinagar:
English and Marathi pages, employer enquiry and job application forms with encrypted storage, lead notifications,
and a password-protected admin panel for leads and website settings. Node.js 20+, **no npm dependencies**.

## Run on your computer

```bash
npm run setup     # once: creates .env with a data key and prints an admin password
npm run dev       # website http://localhost:4173 · admin http://localhost:4173/admin
npm test          # 15 end-to-end tests
```

If port 4173 is busy, the server moves to the next free port and prints it.

## What is where

| Path | Contents |
|---|---|
| `src/` | Website source: pages (`pages/`, Marathi in `pages/mr/`), partials, CSS, JS, images, `content/site.json` |
| `server/` | Web server, form API, encrypted storage, notifications, admin panel (`server/admin/`) |
| `build.js` | Builds `src/` into `site/` (also run automatically by the server) |
| `scripts/` | `setup.js` (secrets), `illustrations.js`, `brand-images.js`, `print-items.js` |
| `print/` | Visiting card, staff IDs and recruitment post (Brand Guidelines p.10) |
| `docs/DEPLOY.md` | **How to put the site online** (Render or Docker), domain, HTTPS, notifications |
| `docs/PHOTO_PROMPTS.md` | AI image prompts and how to swap illustrations for photos |
| `HANDOFF.md` | Developer handoff: design system, security model, decisions, open items |
| `TESTING.md` | Step-by-step manual test guide |

## Deploy

See [docs/DEPLOY.md](docs/DEPLOY.md). Short version: Render → New → Blueprint → this repo, set `DATA_KEY` and
`ADMIN_PASSWORD_HASH` from `npm run setup -- --print`, connect the domain.
