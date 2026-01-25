# Drivix – Aviator-Like Flight

Drivix is a premium long-drive experience with a single-canvas “aviator-like” flight renderer and a minimal HUD focused on power (X) and distance.

## Run locally
- Open `index.html` directly in a browser, or
- Serve the folder with a simple static server (e.g. `python3 -m http.server 8000`) and open `http://localhost:8000`.

## Renderer
- Current renderer: `js/flight_aviatorlike.js` (global `initFlightAviatorLike`).
- Game loop & UI: `js/app.js`.
- Styling: `css/style.css`.

## Deployment (short note)
- Host the static files on any static host (S3 + CloudFront, Netlify, etc.).
- Upload `index.html`, `css/`, and `js/` (plus `_backup_legacy/` only if you want the archived legacy files).
