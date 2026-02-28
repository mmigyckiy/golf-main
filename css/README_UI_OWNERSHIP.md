# UI Ownership / Where to Fix What

## Golden rule
If you don't know the owner, do not patch random selectors. First identify the DOM anchor and find the layer owner.

## Layers
- tokens: CSS variables only
- base: element defaults, typography
- layout: shell, panels, grid/flex, scroll containers
- components: reusable atoms (gc-card, gc-panel, topbar, buttons)
- widgets: widget-specific rules (#swingMetricsRow, daily-card, leaderboard-card, etc.)
- overrides: temporary hotfixes ONLY (must include WHY comment)

## Allowed selector scope
Prefer: `#appHeader ...`, `#mainPanel ...`, `#sidePanel ...`, `#swingMetricsRow ...`
Avoid: `.gc-card *`, `body *`, `#sidePanel .gc-card` unless you also include a widget class.

## Identifying widgets
Never rely on `:first-child`. Add explicit classes in HTML:
- `.daily-card`
- `.leaderboard-card`

## Process for fixes
1) Reproduce + mark the DOM anchor.
2) Decide correct layer.
3) Add a scoped rule in the correct file.
4) If emergency: add to overrides.css with WHY, then migrate later.
