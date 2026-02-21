# ChatGPT-Ready Diagnostics Report

## 1) Project Snapshot (Depth <= 3)
```text
./.DS_Store
./.vscode/settings.json
./PROJECT_STRUCTURE.txt
./PROJECT_STRUCTURE_FULL.txt
./README.md
./_archive/_backup_legacy/flight.js
./_archive/_backup_legacy/flight3d.js
./_archive/_backup_legacy/flightFallback.js
./_archive/_backup_legacy/flight_fps.js
./_archive/_backup_legacy/trail.js
./css/metric_card.css
./css/style.css
./css/swing_metrics.css
./css/tube.css
./css/ui_tokens.css
./index.html
./js/app.js
./js/attack_angle_plane.js
./js/constants.js
./js/controls/tempoArc.js
./js/debug/attack_angle_layer_debug.js
./js/flight_aviatorlike.js
./js/golfMath.js
./js/logic/player_state.js
./js/logic/risk_engine.js
./js/logic/rng.js
./js/logic/shot_setup.js
./js/logic/wind.js
./js/longdrive-extras.js
./js/stats.js
./js/swing_controls.js
./js/swing_path.js
./js/swing_path_pixi.js
./js/ui/topbar.js
./js/ui_refs.js
./js/utils/math.js
./js/widgets/widget_manager.js
./package-lock.json
./package.json
./src/angular/main.ts
./src/ui/AttackAngleWidget.jsx
./src/ui/SwingPanel.jsx
./src/ui/SwingPathWidget.jsx
./src/ui/TempoWidget.jsx
./src/ui/bridge.js
./src/ui/store.js
./tsconfig.json
./vite.config.js
./vite.config.js.timestamp-1771402632711-071c68c63be728.mjs
```

## 2) UI Fit Findings (Important Conflict)

Two fit systems are active in `js/app.js`:

1. Legacy `applyUiFit()` + `initUiFitScaler()`:
- `js/app.js:2644` (`applyUiFit`)
- `js/app.js:2675` uses `translateX(...) scale(...)`
- `js/app.js:2691` resize listener to `queueFit`
- `js/app.js:2941` direct `window.addEventListener("resize", applyUiFit);`
- `js/app.js:2942` direct `window.addEventListener("DOMContentLoaded", applyUiFit);`

2. New stable fitter IIFE:
- `js/app.js:2949` `(function ensureStableUiFit(){...})`
- `js/app.js:2983` listener `DOMContentLoaded -> stableApplyUiFit`
- `js/app.js:2984` listener `resize -> stableApplyUiFit`

### Legacy applyUiFit snippet
`js/app.js:2644`
```js
function applyUiFit() {
  const vp = document.getElementById("uiFitViewport");
  const fit = document.getElementById("uiFit");
  if (!vp || !fit) return;

  vp.style.position = vp.style.position || "relative";
  vp.style.width = "100vw";
  vp.style.height = "100vh";
  vp.style.overflow = "hidden";

  const DESIGN_W = Number(fit.dataset.designW || 1440);
  const DESIGN_H = Number(fit.dataset.designH || 900);
  ...
  const scale = Math.min(1, availW / DESIGN_W, availH / DESIGN_H);
  const dx = Math.max(0, (availW - DESIGN_W * scale) / 2);
  fit.style.transform = `translateX(${dx}px) scale(${scale})`;
}
```

### Stable fitter snippet
`js/app.js:2949`
```js
(function ensureStableUiFit(){
  const DESIGN_W = 1260;
  const DESIGN_H = 467;

  function stableApplyUiFit() {
    const vp  = document.getElementById("uiFitViewport");
    const fit = document.getElementById("uiFit");
    if (!vp || !fit) return;

    vp.style.width = "100%";
    vp.style.height = "100vh";
    vp.style.overflow = "hidden";
    vp.style.display = "flex";
    vp.style.justifyContent = "center";
    vp.style.alignItems = "flex-start";

    const r = vp.getBoundingClientRect();
    const vpW = Math.max(1, Math.floor(r.width));
    const vpH = Math.max(1, Math.floor(r.height));
    const s = Math.min(vpW / DESIGN_W, vpH / DESIGN_H);

    fit.style.transformOrigin = "top center";
    fit.style.transform = `translateZ(0) scale(${s})`;
  }
  window.addEventListener("DOMContentLoaded", stableApplyUiFit);
  window.addEventListener("resize", stableApplyUiFit);
})();
```

## 3) sidePanel Findings

### Markup definition
- `index.html:211`

```html
<aside id="sidePanel" class="sidePanel gc-sidepanel" aria-label="Club Panel">
  <div class="gc-card gc-sidecard drivix-card">...</div>
  <div class="gc-card gc-sidecard drivix-card">...</div>
</aside>
```

### Direct JS/TS references to `sidePanel`
Search for `sidePanel`, `getElementById("sidePanel")`, `querySelector("#sidePanel")` in `js`, `src`, `index.html`:
- Only hit: `index.html:211`
- No runtime `js/ts` direct lookup of `#sidePanel`.

### Dev overlay reference (class-based selector)
- `src/ui/dev/LayoutOverlay.jsx:13`
```js
{ label: "SIDE PANEL", selector: "aside.gc-sidepanel" },
```

## 4) CSS Rules for `#sidePanel / .sidePanel / .gc-sidepanel`

### Container layout rules
- `css/style.css:570`
```css
.gc-sidepanel{
  display:flex;
  flex-direction:column;
  gap:16px;
}
```

- `css/style.css:4137`
```css
#sidePanel,
.sidePanel{
  min-width: 0;
}
```

- `css/style.css:5945`
```css
#sidePanel,
.sidePanel,
.gc-sidepanel,
.sideBar {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  justify-content: space-between;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  overflow: auto;
  padding-right: 6px;
  overscroll-behavior: contain;
}
```

### Side panel inner card sizing
- `css/style.css:5973`
```css
#sidePanel .gc-card,
#sidePanel .gc-sidecard {
  border-radius: clamp(18px, 2.2vw, 28px);
  padding: clamp(12px, 1.4vw, 20px);
}
```

## 5) Which Rules Control Background / Shadow / Pseudo-Overlays

Because side panel cards use `class="gc-card gc-sidecard drivix-card"`, these classes define visual surface:

### Base card skin (global glass surface)
- `css/style.css:370`
```css
.gc-topbar,
.gc-card,
.gc-panel,
.gc-power,
.gc-field,
.gc-miniCard,
.gc-sidecard,
...{
  box-shadow: var(--shadow) !important;
  background: var(--panel) !important;
  border-radius: var(--hud-radius) !important;
}
```

### Explicit `.gc-card` surface
- `css/style.css:1035`
```css
.gc-card{
  border-radius: var(--gc-radius);
  border: 1px solid var(--gc-panel-border);
  background: var(--gc-panel-bg);
  box-shadow: inset 0 1px 0 var(--gc-panel-inner), var(--gc-shadow);
  overflow:hidden;
}
```

### Drivix card surface (later in file, likely dominant)
- `css/style.css:4264`
```css
.drivix-card{
  border-radius: var(--card-r);
  border: 1px solid var(--card-border);
  background: linear-gradient(180deg, var(--card-bg-1), var(--card-bg-2));
  box-shadow: var(--card-shadow), var(--card-inner);
}
```

### Pseudo-element overlay suppression
- `css/style.css:387`
```css
.gc-card::before,
.gc-card::after,
.gc-sidecard::before,
.gc-sidecard::after,
...{
  content: none !important;
  display: none !important;
}
```

### Recent right-card clipping overrides
- `css/style.css:6163`
```css
#mainPanel .gc-card,
#mainPanel [class*="challenge"],
#mainPanel [class*="leaderboard"] {
  overflow: hidden;
  border-radius: inherit;
}

#mainPanel .gc-card::before,
#mainPanel .gc-card::after,
...{
  border-radius: inherit;
}
```

## 6) JS Direct Style Manipulation Hotspots

Counts from `rg "style\\.|setAttribute\\(|classList\\.|getBoundingClientRect" js`:

```text
119 js/app.js
 17 js/widgets/shared/tube/tube_view_arc.js
 13 js/swing_controls.js
 12 js/widgets/shared/tube/tube_view_vertical.js
 12 js/swing_path_pixi.js
 12 js/attack_angle_plane.js
  7 js/widgets/path/path_widget.js
  7 js/swing_path.js
  7 js/flight_aviatorlike.js
  4 js/longdrive-extras.js
  3 js/debug/attack_angle_layer_debug.js
```

## 7) Quick Conclusion For ChatGPT

1. Side panel is statically declared in `index.html` and styled only through CSS classes/IDs.
2. Side panel visuals come mostly from `.gc-card` + `.gc-sidecard` + `.drivix-card` (background/shadow/radius), not from `#sidePanel` itself.
3. UI fit currently has duplicate logic paths (legacy + stable) and duplicate listeners in `js/app.js`, which can cause competing transforms.
