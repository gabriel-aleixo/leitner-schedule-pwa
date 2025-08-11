# Leitner Schedule PWA

A minimal, offline-first PWA to **track the daily schedule** for a **physical 7-level Leitner box** (SRS).

- 7 levels with intervals: 1, 2, 4, 8, 16, 32, 64 days
- Tracks which levels are due on each date (including backlog)
- Lets you **Mark done** per level for a selected session date (oldest backlog first)
- Local-only storage (no accounts, no network)
- PWA installable & offline-ready
- Theme: Light / Dark / System
- First-run welcome: schedule is only created after tapping **Start new schedule**
- Reset requires confirmation

## Deploy to Netlify
1. Drag & drop this folder to Netlify (or push to a repo and connect).
2. Build command: _none_ (static site).
3. Publish directory: the project root (contains `index.html`).

> If deploying under a subpath, ensure links are root-relative or adjust paths.

## Dev
Open `index.html` in a local server (e.g., VSCode Live Server). Service worker won’t fully function from `file://` URLs.

## Files
- `index.html` – UI
- `styles.css` – theme & layout
- `app.js` – logic & storage
- `sw.js` – service worker (cache)
- `manifest.json` – PWA manifest
- `icons/` – app icons
