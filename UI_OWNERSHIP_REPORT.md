# UI Ownership Report (auto-generated)

This report helps answer: "Where is the truth for this UI piece?"
Generated on: Thu Feb 26 08:48:03 CET 2026

## A) Key DOM anchors
## B) Selector hits (where these are defined/overridden)

### uiFitViewport
./css/debug_overlay.css:8:body[data-debug="1"] #uiFitViewport { outline: 2px solid #ffd166; outline-offset: -2px; }
./index.html:29:  <div id="uiFitViewport">
./CHATGPT_DIAGNOSTIC_REPORT.md:76:  const vp = document.getElementById("uiFitViewport");
./CHATGPT_DIAGNOSTIC_REPORT.md:102:    const vp  = document.getElementById("uiFitViewport");
./js/ui/ui_fit.js:3: * - `#uiFitViewport` is responsible for viewport clipping + horizontal centering.
./js/ui/ui_fit.js:45:  const viewport = document.getElementById("uiFitViewport");
./css/style.css:6008:#uiFitViewport{
./css/style.css:6237:#uiFitViewport {

### uiFit
./CHATGPT_DIAGNOSTIC_REPORT.md:76:  const vp = document.getElementById("uiFitViewport");
./CHATGPT_DIAGNOSTIC_REPORT.md:77:  const fit = document.getElementById("uiFit");
./CHATGPT_DIAGNOSTIC_REPORT.md:102:    const vp  = document.getElementById("uiFitViewport");
./CHATGPT_DIAGNOSTIC_REPORT.md:103:    const fit = document.getElementById("uiFit");
./index.html:29:  <div id="uiFitViewport">
./index.html:30:    <div id="uiFit">
./js/ui/ui_fit.js:3: * - `#uiFitViewport` is responsible for viewport clipping + horizontal centering.
./js/ui/ui_fit.js:4: * - `#uiFit` is responsible for transform-based scaling only.
./js/ui/ui_fit.js:45:  const viewport = document.getElementById("uiFitViewport");
./js/ui/ui_fit.js:46:  const fit = document.getElementById("uiFit");
./css/debug_overlay.css:8:body[data-debug="1"] #uiFitViewport { outline: 2px solid #ffd166; outline-offset: -2px; }
./css/debug_overlay.css:9:body[data-debug="1"] #uiFit        { outline: 2px solid #06d6a0; outline-offset: -2px; }
./css/style.css:6008:#uiFitViewport{
./css/style.css:6016:#uiFit{
./css/style.css:6237:#uiFitViewport {
./css/style.css:6246:#uiFit {

### #appShell
./css/style.css:4118:#appShell,
./css/style.css:5804:#appShell,
./css/debug_overlay.css:11:body[data-debug="1"] #appShell { outline: 2px solid #00d9ff; outline-offset: -2px; }

### #appBody
./css/style.css:4127:#appBody,
./css/style.css:4155:  #appBody,
./css/style.css:4161:  #appBody,
./css/style.css:5821:#appBody,
./css/style.css:6208:#appBody {
./css/style.css:6213:#appBody {
./css/debug_overlay.css:12:body[data-debug="1"] #appBody  { outline: 2px solid #8ecae6; outline-offset: -2px; }

### #appHeader
./css/debug_overlay.css:14:body[data-debug="1"] #appHeader { outline: 2px solid #ff006e; outline-offset: -2px; }
./css/overrides.css:6:   - Prefer scoping to an area: #appHeader, #swingMetricsRow, #sidePanel, #mainPanel, etc.
./css/overrides.css:11:   header#appHeader .topbar-profile.compact { min-width: 0 !important; }
./css/style.css:4124:#appHeader{
./css/style.css:5814:#appHeader,

### #mainPanel
./CHATGPT_DIAGNOSTIC_REPORT.md:258:#mainPanel .gc-card,
./CHATGPT_DIAGNOSTIC_REPORT.md:259:#mainPanel [class*="challenge"],
./CHATGPT_DIAGNOSTIC_REPORT.md:260:#mainPanel [class*="leaderboard"] {
./CHATGPT_DIAGNOSTIC_REPORT.md:265:#mainPanel .gc-card::before,
./CHATGPT_DIAGNOSTIC_REPORT.md:266:#mainPanel .gc-card::after,
./css/swing_metrics.css:467:#mainPanel .powerCard__controls .gc-swingControl {
./css/swing_metrics.css:473:#mainPanel .powerCard__controls #swingMetricsRow {
./css/swing_metrics.css:480:#mainPanel .powerCard__controls #swingMetricsRow > [data-widget] {
./css/swing_metrics.css:484:#mainPanel #swingMetricsRow .metricCard {
./css/debug_overlay.css:15:body[data-debug="1"] #mainPanel { outline: 2px solid #fb5607; outline-offset: -2px; }
./css/overrides.css:6:   - Prefer scoping to an area: #appHeader, #swingMetricsRow, #sidePanel, #mainPanel, etc.
./css/style.css:4135:#mainPanel,
./css/style.css:5837:#mainPanel,
./css/style.css:5851:#mainPanel > .powerCard,
./css/style.css:5914:#mainPanel .gc-controls__row--buttons.gc-controls__row--primary,
./css/style.css:5915:#mainPanel .gc-swingControl {
./css/style.css:5920:#mainPanel .gc-swingControl {
./css/style.css:5925:#mainPanel .gc-field {
./css/style.css:5932:#mainPanel .gc-field__canvas {
./css/style.css:5937:#mainPanel #swingMetricsRow,
./css/style.css:5938:#mainPanel #swingMetricsRow > [data-widget] {
./css/style.css:5943:#mainPanel #uiRoot {
./css/style.css:5966:#mainPanel > *,
./css/style.css:5973:#mainPanel > *:first-child,
./css/style.css:6160:#mainPanel {
./css/style.css:6172:#mainPanel .dailyChallenge,
./css/style.css:6173:#mainPanel .leaderboard,
./css/style.css:6174:#mainPanel .dailyChallengeCard,
./css/style.css:6175:#mainPanel .leaderboardCard,
./css/style.css:6176:#mainPanel .sideCard,
./css/style.css:6177:#mainPanel .rightCard,
./css/style.css:6178:#mainPanel .gc-card,
./css/style.css:6179:#mainPanel .gc-sideCard,
./css/style.css:6180:#mainPanel .panelCard,
./css/style.css:6181:#mainPanel [class*="challenge"],
./css/style.css:6182:#mainPanel [class*="leaderboard"] {
./css/style.css:6188:#mainPanel .dailyChallenge::before,
./css/style.css:6189:#mainPanel .leaderboard::before,
./css/style.css:6190:#mainPanel .dailyChallengeCard::before,
./css/style.css:6191:#mainPanel .leaderboardCard::before,
./css/style.css:6192:#mainPanel .sideCard::before,
./css/style.css:6193:#mainPanel .rightCard::before,
./css/style.css:6194:#mainPanel .gc-card::before,
./css/style.css:6195:#mainPanel .gc-sideCard::before,
./css/style.css:6196:#mainPanel .panelCard::before,
./css/style.css:6197:#mainPanel .dailyChallenge::after,
./css/style.css:6198:#mainPanel .leaderboard::after,
./css/style.css:6199:#mainPanel .dailyChallengeCard::after,
./css/style.css:6200:#mainPanel .leaderboardCard::after,
./css/style.css:6201:#mainPanel .sideCard::after,
./css/style.css:6202:#mainPanel .rightCard::after,
./css/style.css:6203:#mainPanel .gc-card::after,
./css/style.css:6204:#mainPanel .gc-sideCard::after,
./css/style.css:6205:#mainPanel .panelCard::after {
./css/style.css:6221:#mainPanel,
./css/style.css:6222:main#mainPanel.mainPanel.gc-main {

### #sidePanel
./CHATGPT_DIAGNOSTIC_REPORT.md:139:Search for `sidePanel`, `getElementById("sidePanel")`, `querySelector("#sidePanel")` in `js`, `src`, `index.html`:
./CHATGPT_DIAGNOSTIC_REPORT.md:141:- No runtime `js/ts` direct lookup of `#sidePanel`.
./CHATGPT_DIAGNOSTIC_REPORT.md:149:## 4) CSS Rules for `#sidePanel / .sidePanel / .gc-sidepanel`
./CHATGPT_DIAGNOSTIC_REPORT.md:163:#sidePanel,
./CHATGPT_DIAGNOSTIC_REPORT.md:171:#sidePanel,
./CHATGPT_DIAGNOSTIC_REPORT.md:191:#sidePanel .gc-card,
./CHATGPT_DIAGNOSTIC_REPORT.md:192:#sidePanel .gc-sidecard {
./CHATGPT_DIAGNOSTIC_REPORT.md:293:2. Side panel visuals come mostly from `.gc-card` + `.gc-sidecard` + `.drivix-card` (background/shadow/radius), not from `#sidePanel` itself.
./css/debug_overlay.css:16:body[data-debug="1"] #sidePanel { outline: 2px solid #8338ec; outline-offset: -2px; }
./css/style.css:4139:#sidePanel,
./css/style.css:5947:#sidePanel,
./css/style.css:5968:#sidePanel > *,
./css/style.css:5978:#sidePanel .gc-card,
./css/style.css:5979:#sidePanel .gc-sidecard {
./css/style.css:6219:#sidePanel,
./css/style.css:6220:aside#sidePanel.sidePanel.gc-sidepanel,
./css/overrides.css:6:   - Prefer scoping to an area: #appHeader, #swingMetricsRow, #sidePanel, #mainPanel, etc.

### #swingMetricsRow
./src/ui/dev/LayoutOverlay.jsx:12:  { label: "SWING METRICS ROW", selector: "#swingMetricsRow, .swing-metrics-row" },
./js/debug/attack_angle_layer_debug.js:12:body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack{ outline: 2px solid rgba(255,0,0,.70) !important; outline-offset: -2px; }
./js/debug/attack_angle_layer_debug.js:13:body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack .swing-metric__title{ outline: 2px solid rgba(255,140,0,.70) !important; }
./js/debug/attack_angle_layer_debug.js:14:body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack .swing-metric__body{ outline: 2px solid rgba(0,255,0,.65) !important; }
./js/debug/attack_angle_layer_debug.js:15:body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack .swing-metric__footer{ outline: 2px solid rgba(0,160,255,.70) !important; }
./js/debug/attack_angle_layer_debug.js:29:body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack,
./js/debug/attack_angle_layer_debug.js:30:body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack .swing-metric__body,
./js/debug/attack_angle_layer_debug.js:37:body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack::before{
./js/debug/attack_angle_layer_debug.js:49:body.__AA_DEBUG__ #swingMetricsRow .swing-metric--attack .swing-metric__body::before{
./js/debug/attack_angle_layer_debug.js:104:      card: rect(document.querySelector("#swingMetricsRow .swing-metric--attack")),
./js/debug/attack_angle_layer_debug.js:105:      body: rect(document.querySelector("#swingMetricsRow .swing-metric--attack .swing-metric__body")),
./js/app.js:644:  const tempoEl = document.querySelector('#swingMetricsRow [data-widget="tempo"] .metricCard__body');
./js/app.js:645:  const pathEl = document.querySelector('#swingMetricsRow [data-widget="path"] .metricCard__body');
./js/app.js:646:  const attackEl = document.querySelector('#swingMetricsRow [data-widget="attack"] .metricCard__body');
./js/app.js:2554:    const root = document.querySelector('#swingMetricsRow [data-widget="tempo"]');
./js/app.js:2746:        el.closest?.("#swingMetricsRow")
./js/app.js:2807:    const bg2 = document.querySelector("#swingMetricsRow");
./js/app.js:2822:    mark(bg2, "#118ab2", "#swingMetricsRow (grid)");
./js/flight_aviatorlike.js:119:            el.closest?.("#swingMetricsRow")
./js/flight_aviatorlike.js:159:          const pathCell = topEl.closest?.(".swing-metric--path") || topEl.closest?.("#swingMetricsRow");
./css/tube.css:1:#swingMetricsRow .tubeView {
./css/tube.css:11:#swingMetricsRow #swingTempoControl {
./css/tube.css:43:#swingMetricsRow .tubeView--vertical .tubeV {
./css/tube.css:52:#swingMetricsRow .tubeV__tube {
./css/tube.css:67:#swingMetricsRow .tubeV__fill {
./css/tube.css:84:#swingMetricsRow .tubeV__runner {
./css/tube.css:106:#swingMetricsRow .tubeV__runner::after {
./css/tube.css:121:#swingMetricsRow .tubeView.is-hold .tubeV__runner {
./css/tube.css:125:#swingMetricsRow .tubeView.is-hold .tubeV__runner::after {
./css/tube.css:129:#swingMetricsRow .tubeView.is-idle .tubeV__fill {
./css/tube.css:133:#swingMetricsRow .tubeV__scale {
./css/tube.css:142:#swingMetricsRow .tubeV__label {
./css/tube.css:148:#swingMetricsRow .tubeV__tick {
./css/tube.css:155:#swingMetricsRow .tubeV__tick--major {
./css/tube.css:160:#swingMetricsRow .tubeView--arc .tubeArc {
./css/tube.css:171:#swingMetricsRow .tubeArc__stage {
./css/tube.css:178:#swingMetricsRow .tubeArc__svg {
./css/tube.css:185:#swingMetricsRow .tubeArc__outer,
./css/tube.css:186:#swingMetricsRow .tubeArc__inner {
./css/tube.css:192:#swingMetricsRow .tubeArc__outer {
./css/tube.css:199:#swingMetricsRow .tubeArc__inner {
./css/tube.css:205:#swingMetricsRow .tubeArc__runner {
./css/tube.css:224:#swingMetricsRow .tubeView.is-hold .tubeArc__runner {
./css/tube.css:228:#swingMetricsRow .tubeArc__scale {
./css/tube.css:238:#swingMetricsRow .tubeArc__scaleLabel {
./css/tube.css:243:#swingMetricsRow .tubeArc__tick {
./css/tube.css:250:#swingMetricsRow .tubeArc__tick--major {
./css/swing_metrics.css:19:#swingMetricsRow {
./css/swing_metrics.css:52:#swingMetricsRow::before,
./css/swing_metrics.css:53:#swingMetricsRow::after {
./css/swing_metrics.css:62:#swingMetricsRow::before {
./css/swing_metrics.css:66:#swingMetricsRow::after {
./css/swing_metrics.css:70:#swingMetricsRow,
./css/swing_metrics.css:71:#swingMetricsRow * {
./css/swing_metrics.css:75:#swingMetricsRow > [data-widget] {
./css/swing_metrics.css:84:#swingMetricsRow > [data-widget="tempo"],
./css/swing_metrics.css:85:#swingMetricsRow > [data-widget="attack"],
./css/swing_metrics.css:86:#swingMetricsRow .metricCard--tempo[data-widget="tempo"],
./css/swing_metrics.css:87:#swingMetricsRow .metricCard--attack[data-widget="attack"] {
./css/swing_metrics.css:92:#swingMetricsRow > [data-widget="path"] {
./css/swing_metrics.css:96:#swingMetricsRow > [data-widget="attack"],
./css/swing_metrics.css:97:#swingMetricsRow .metricCard--attack[data-widget="attack"] {
./css/swing_metrics.css:101:#swingMetricsRow > [data-widget="path"],
./css/swing_metrics.css:102:#swingMetricsRow .metricCard--path[data-widget="path"] {
./css/swing_metrics.css:106:#swingMetricsRow > [data-widget="tempo"],
./css/swing_metrics.css:107:#swingMetricsRow .metricCard--tempo[data-widget="tempo"] {
./css/swing_metrics.css:111:#swingMetricsRow > [data-widget="path"]::before,
./css/swing_metrics.css:112:#swingMetricsRow > [data-widget="tempo"]::before {
./css/swing_metrics.css:123:#swingMetricsRow .metricCard {
./css/swing_metrics.css:132:#swingMetricsRow .metricCard::before,
./css/swing_metrics.css:133:#swingMetricsRow .metricCard::after {
./css/swing_metrics.css:137:#swingMetricsRow .metricCard__body {
./css/swing_metrics.css:143:#swingMetricsRow .metricCard--tempo .metricCard__body,
./css/swing_metrics.css:144:#swingMetricsRow .metricCard--attack .metricCard__body {
./css/swing_metrics.css:148:#swingMetricsRow .metricCard--path .metricCard__body {
./css/swing_metrics.css:155:#swingMetricsRow .metricCard--tempo #swingTempoControl {
./css/swing_metrics.css:160:#swingMetricsRow .metricCard--tempo #tempoMount,
./css/swing_metrics.css:161:#swingMetricsRow .metricCard--tempo #swingTempoControl,
./css/swing_metrics.css:162:#swingMetricsRow .metricCard--attack #attackMount,
./css/swing_metrics.css:163:#swingMetricsRow .metricCard--attack #attackAngle,
./css/swing_metrics.css:164:#swingMetricsRow .metricCard--attack .tubeArc {
./css/swing_metrics.css:168:#swingMetricsRow .metricCard--tempo #tempoValueLabel {
./css/swing_metrics.css:173:#swingMetricsRow .metricCard--tempo #swingTempoPct {
./css/swing_metrics.css:184:#swingMetricsRow .metricCard.metricCard--path {
./css/swing_metrics.css:191:#swingMetricsRow .metricCard.metricCard--path::before {
./css/swing_metrics.css:195:#swingMetricsRow .metricCard.metricCard--path::after {
./css/swing_metrics.css:199:#swingMetricsRow .metricCard.metricCard--path > * {
./css/swing_metrics.css:204:#swingMetricsRow .metricCard.metricCard--path .metricCard__body {
./css/swing_metrics.css:210:#swingMetricsRow .metricCard.metricCard--path .metricCard__title {
./css/swing_metrics.css:219:#swingMetricsRow .metricCard.metricCard--path .metricCard__title::before,
./css/swing_metrics.css:220:#swingMetricsRow .metricCard.metricCard--path .metricCard__title::after {
./css/swing_metrics.css:236:#swingMetricsRow .metricCard.metricCard--path .metricCard__title::before {
./css/swing_metrics.css:241:#swingMetricsRow .metricCard.metricCard--path .metricCard__title::after {
./css/swing_metrics.css:246:#swingMetricsRow .metricCard.metricCard--path .metricCard__body.is-pixi-path .is-legacyPathLayer {
./css/swing_metrics.css:250:#swingMetricsRow .metricCard.metricCard--path #pathPixi,
./css/swing_metrics.css:251:#swingMetricsRow .metricCard.metricCard--path #pathPixi.metricStage--pixi {
./css/swing_metrics.css:261:#swingMetricsRow .metricCard.metricCard--path #pathPixi canvas,
./css/swing_metrics.css:262:#swingMetricsRow .metricCard.metricCard--path #pathPixi.metricStage--pixi canvas {
./css/swing_metrics.css:271:#swingMetricsRow .metricCard.metricCard--path #pathPixi:not(:has(canvas))::before {
./css/swing_metrics.css:303:#swingMetricsRow .metricCard--attack {
./css/swing_metrics.css:308:#swingMetricsRow .metricCard--attack .metricCard__body {
./css/swing_metrics.css:315:#swingMetricsRow .metricCard--attack #attackAngle {
./css/swing_metrics.css:323:#swingMetricsRow .metricCard--attack .tubeArc {
./css/swing_metrics.css:327:#swingMetricsRow .metricCard--attack .tubeArc__stage {
./css/swing_metrics.css:332:#swingMetricsRow .metricCard--attack .tubeArc__svg {
./css/swing_metrics.css:339:#swingMetricsRow .metricCard--attack .tubeArc__outer,
./css/swing_metrics.css:340:#swingMetricsRow .metricCard--attack .aa-arcTrack--outer {
./css/swing_metrics.css:348:#swingMetricsRow .metricCard--attack .tubeArc__inner,
./css/swing_metrics.css:349:#swingMetricsRow .metricCard--attack .aa-arcTrack--inner,
./css/swing_metrics.css:350:#swingMetricsRow .metricCard--attack [data-aa-arc="1"] {
./css/swing_metrics.css:358:#swingMetricsRow .metricCard--attack #attackAngleRunner,
./css/swing_metrics.css:359:#swingMetricsRow .metricCard--attack .tubeArc__runner {
./css/swing_metrics.css:367:#swingMetricsRow #attackAngle.is-perfect #attackAngleRunner {
./css/swing_metrics.css:371:#swingMetricsRow #attackAngle.is-perfect .tubeArc__inner,
./css/swing_metrics.css:372:#swingMetricsRow #attackAngle.is-perfect .aa-arcTrack--inner {
./css/swing_metrics.css:388:#swingMetricsRow .metricCard--attack .metricCard__hint {
./css/swing_metrics.css:396:  #swingMetricsRow {
./css/swing_metrics.css:413:  #swingMetricsRow {
./css/swing_metrics.css:424:  #swingMetricsRow > [data-widget="path"]::before,
./css/swing_metrics.css:425:  #swingMetricsRow > [data-widget="tempo"]::before {
./css/swing_metrics.css:429:  #swingMetricsRow > [data-widget] + [data-widget] {
./css/swing_metrics.css:435:  #swingMetricsRow > [data-widget="path"] {
./css/swing_metrics.css:441:  #swingMetricsRow #attackAngle #attackAngleRunner {
./css/swing_metrics.css:447:#swingMetricsRow .metricCard--attack #attackAngle{
./css/swing_metrics.css:451:#swingMetricsRow .metricCard--attack .tubeArc,
./css/swing_metrics.css:452:#swingMetricsRow .metricCard--attack .tubeView--arc,
./css/swing_metrics.css:453:#swingMetricsRow .metricCard--attack .tubeArc__stage{
./css/swing_metrics.css:457:#swingMetricsRow .metricCard--attack .tubeArc__svg{
./css/swing_metrics.css:473:#mainPanel .powerCard__controls #swingMetricsRow {
./css/swing_metrics.css:480:#mainPanel .powerCard__controls #swingMetricsRow > [data-widget] {
./css/swing_metrics.css:484:#mainPanel #swingMetricsRow .metricCard {
./css/swing_metrics.css:493:#swingMetricsRow{
./css/swing_metrics.css:498:#swingMetricsRow .metricCard{
./css/swing_metrics.css:502:#swingMetricsRow .metricCard__title{
./css/metric_card.css:1:#swingMetricsRow .metricCard {
./css/metric_card.css:16:#swingMetricsRow > [data-widget="tempo"],
./css/metric_card.css:17:#swingMetricsRow > [data-widget="attack"] {
./css/metric_card.css:21:#swingMetricsRow > [data-widget="path"] {
./css/metric_card.css:25:#swingMetricsRow > [data-widget] {
./css/metric_card.css:30:body[data-ui-phase="hold"] #swingMetricsRow > [data-widget="tempo"] {
./css/metric_card.css:35:body[data-ui-phase="hold"] #swingMetricsRow > [data-widget="path"] {
./css/metric_card.css:39:body[data-ui-phase="hold"] #swingMetricsRow > [data-widget="attack"] {
./css/metric_card.css:43:body[data-ui-phase="flight"] #swingMetricsRow > [data-widget="path"] {
./css/metric_card.css:48:body[data-ui-phase="flight"] #swingMetricsRow > [data-widget="tempo"] {
./css/metric_card.css:52:body[data-ui-phase="flight"] #swingMetricsRow > [data-widget="attack"] {
./css/metric_card.css:56:body[data-ui-phase="idle"] #swingMetricsRow > [data-widget],
./css/metric_card.css:57:body[data-ui-phase="end"] #swingMetricsRow > [data-widget] {
./css/metric_card.css:62:#swingMetricsRow .metricCard::before {
./css/metric_card.css:71:#swingMetricsRow .metricCard__title {
./css/metric_card.css:81:#swingMetricsRow .metricCard__body {
./css/metric_card.css:95:#swingMetricsRow .metricCard__footer {
./css/metric_card.css:105:#swingMetricsRow .metricCard__value {
./css/metric_card.css:112:#swingMetricsRow .metricCard__hint {
./css/metric_card.css:119:#swingMetricsRow .metricWidgetHost {
./css/style.css:1545:#swingMetricsRow{
./css/style.css:1569:#swingMetricsRow > *{
./css/style.css:1628:#swingMetricsRow,
./css/style.css:1629:#swingMetricsRow *{
./css/style.css:1638:#swingMetricsRow > *{
./css/style.css:1643:#swingMetricsRow > .swing-metric--path{
./css/style.css:2008:  #swingMetricsRow{
./css/style.css:2035:  #swingMetricsRow{
./css/style.css:2041:  #swingMetricsRow > .swing-metric--path{
./css/style.css:2306:#swingMetricsRow .swing-metric--attack{
./css/style.css:2311:#swingMetricsRow .swing-metric--attack .attack-meter,
./css/style.css:2312:#swingMetricsRow .swing-metric--attack .attack-angle__pill,
./css/style.css:2313:#swingMetricsRow .swing-metric--attack .attack-angle__tube,
./css/style.css:2314:#swingMetricsRow .swing-metric--attack .attack-angle__legacy,
./css/style.css:2315:#swingMetricsRow .swing-metric--attack .attack-angle__vertical,
./css/style.css:2316:#swingMetricsRow .swing-metric--attack .attack-angle__capsule{
./css/style.css:2323:#swingMetricsRow .swing-metric--attack .attack-angle__meter{
./css/style.css:2330:#swingMetricsRow .swing-metric--attack .attack-angle__track{
./css/style.css:2337:#swingMetricsRow .swing-metric--attack .attack-driver,
./css/style.css:2338:#swingMetricsRow .swing-metric--attack .attack-angle__runner,
./css/style.css:2339:#swingMetricsRow .swing-metric--attack svg{
./css/style.css:2509:#swingMetricsRow.is-impact .alignment-ring__runner{
./css/style.css:2516:#swingMetricsRow.is-impact .alignment-ring__sweet{
./css/style.css:2522:#swingMetricsRow.is-impact .tempo-meter__fill{
./css/style.css:2527:#swingMetricsRow.is-impact .tempo-meter__runner{
./css/style.css:2536:#swingMetricsRow.is-impact .attack-driver{
./css/style.css:2539:#swingMetricsRow.is-impact .attack-driver__head{
./css/style.css:2544:#swingMetricsRow.is-impact .attack-angle__runner{
./css/style.css:3504:#swingMetricsRow .alignment-ring__svg{ max-width: 220px; }
./css/style.css:3505:#swingMetricsRow .swing-tempo-vertical{ max-width: var(--tempo-w); }
./css/style.css:3506:#swingMetricsRow .attack-angle__meter{ max-width: var(--attack-size); }
./css/style.css:3507:#swingMetricsRow .attack-angle__track{ max-width: var(--attack-size); }
./css/style.css:3514:#swingMetricsRow .swing-metric__title{
./css/style.css:3521:#swingMetricsRow .swing-metric__body{
./css/style.css:3527:#swingMetricsRow .swing-metric__body > *{
./css/style.css:3535:#swingMetricsRow .swing-metric--path .alignment-ring::before{
./css/style.css:3542:#swingMetricsRow .alignment-ring__base{
./css/style.css:3549:#swingMetricsRow .alignment-ring__sweet{
./css/style.css:3557:#swingMetricsRow .alignment-ring__runner{
./css/style.css:3565:#swingMetricsRow .align-target-tick{
./css/style.css:3575:#swingMetricsRow .swing-metric--tempo .tempo-meter__tube{
./css/style.css:3587:#swingMetricsRow .swing-metric--tempo #swingTempoFill{
./css/style.css:3609:#swingMetricsRow .swing-metric--tempo #swingTempoRunner{
./css/style.css:3616:#swingMetricsRow .swing-metric--tempo.is-idle #swingTempoControl:not(.is-ready) #swingTempoFill{
./css/style.css:3621:#swingMetricsRow .swing-metric--tempo.is-idle #swingTempoRunner{
./css/style.css:3626:#swingMetricsRow .swing-metric--tempo .swing-metric__value,
./css/style.css:3627:#swingMetricsRow .swing-metric--tempo #tempoValueLabel{
./css/style.css:3740:#swingMetricsRow > .swing-metric{
./css/style.css:3774:#swingMetricsRow .swing-metric--attack .attack-angle__track{
./css/style.css:3787:#swingMetricsRow .swing-metric--attack .attack-impact-line{
./css/style.css:3793:#swingMetricsRow .swing-metric--attack .attack-driver{
./css/style.css:3800:#swingMetricsRow .swing-metric--attack .attack-driver__head{
./css/style.css:3806:#swingMetricsRow .swing-metric--attack .attack-driver__shaft{
./css/style.css:3812:#swingMetricsRow .swing-metric--attack .attack-angle__runner{
./css/style.css:3820:#swingMetricsRow .swing-metric--attack .swing-metric__value,
./css/style.css:3821:#swingMetricsRow .swing-metric--attack #attackAngleValueLabel{
./css/style.css:4071:#swingMetricsRow .swing-metric--attack .swing-metric__body::before,
./css/style.css:4072:#swingMetricsRow .swing-metric--attack .swing-metric__body::after {
./css/style.css:4080:#swingMetricsRow .swing-metric--attack .attack-angle__track,
./css/style.css:4081:#swingMetricsRow .swing-metric--attack .attack-angle__plane::before,
./css/style.css:4082:#swingMetricsRow .swing-metric--attack .attack-angle__plane::after,
./css/style.css:4083:#swingMetricsRow .swing-metric--attack .attack-angle::before,
./css/style.css:4084:#swingMetricsRow .swing-metric--attack .attack-angle::after {
./css/style.css:4093:#swingMetricsRow .swing-metric--attack .attack-angle__svg { position: relative; z-index: 2; }
./css/style.css:4094:#swingMetricsRow .swing-metric--attack #attackAngleRunner { position: relative; z-index: 3; }
./css/style.css:4209:#swingMetricsRow{
./css/style.css:4787:#swingMetricsRow,
./css/style.css:4794:#swingMetricsRow .swing-metric,
./css/style.css:4802:#swingMetricsRow .swing-metric__title,
./css/style.css:4812:#swingMetricsRow .swing-metric__body,
./css/style.css:4822:#swingMetricsRow .swing-metric__footer,
./css/style.css:4834:#swingMetricsRow .swing-metric--path .swing-metric__footer,
./css/style.css:4840:#swingMetricsRow .swing-metric__title,
./css/style.css:4841:#swingMetricsRow .swing-metric__footer,
./css/style.css:4919:#swingMetricsRow .swing-metric--tempo #swingTempoFill{
./css/style.css:4930:#swingMetricsRow .swing-metric--tempo #swingTempoTube{
./css/style.css:4935:#swingMetricsRow .swing-metric--tempo #swingTempoRunner{
./css/style.css:4955:#swingMetricsRow .swing-metric--tempo #swingTempoControl.is-hold #swingTempoRunner{
./css/style.css:4966:#swingMetricsRow .tempo-meter__runner{
./css/style.css:4984:#swingMetricsRow .tempo-meter__fill{
./css/style.css:4990:#swingMetricsRow .swing-metric--tempo #tempoValueLabel{
./css/style.css:5001:#swingMetricsRow .swing-metric--tempo #tempoValueLabel > :first-child{
./css/style.css:5010:#swingMetricsRow .swing-metric--tempo #swingTempoPct{
./css/style.css:5021:#swingMetricsRow .swing-metric--attack .swing-metric__body{
./css/style.css:5029:#swingMetricsRow .swing-metric--attack .aa-meter{
./css/style.css:5041:#swingMetricsRow .swing-metric--attack .aa-meter__stage{
./css/style.css:5050:#swingMetricsRow .swing-metric--attack .aa-arcSvg{
./css/style.css:5063:#swingMetricsRow .swing-metric--attack .aa-arcTrack,
./css/style.css:5064:#swingMetricsRow .swing-metric--attack .aa-arcTrack.aa-arc{
./css/style.css:5073:#swingMetricsRow .swing-metric--attack .aa-arcInner{
./css/style.css:5082:#swingMetricsRow .swing-metric--attack .aa-centerDot{
./css/style.css:5094:#swingMetricsRow .swing-metric--attack #attackAngleRunner,
./css/style.css:5095:#swingMetricsRow .swing-metric--attack #attackAngleRunner.aa-runner{
./css/style.css:5106:#swingMetricsRow .swing-metric--attack #attackAngleRunner::before,
./css/style.css:5107:#swingMetricsRow .swing-metric--attack #attackAngleRunner::after{
./css/style.css:5115:#swingMetricsRow .swing-metric--attack .aa-meter__scale{
./css/style.css:5125:#swingMetricsRow .swing-metric--attack .aa-scale__label{
./css/style.css:5132:#swingMetricsRow .swing-metric--attack .aa-scale__tick{
./css/style.css:5140:#swingMetricsRow .swing-metric--attack .aa-scale__tick--major{
./css/style.css:5146:#swingMetricsRow .swing-metric--attack #attackAngleReadout{
./css/style.css:5152:#swingMetricsRow .swing-metric--attack .swing-metric__hint{
./css/style.css:5160:#swingMetricsRow .swing-metric--attack .attack-angle__plane,
./css/style.css:5161:#swingMetricsRow .swing-metric--attack .attack-angle__svg,
./css/style.css:5162:#swingMetricsRow .swing-metric--attack .aa-ring,
./css/style.css:5163:#swingMetricsRow .swing-metric--attack .aa-cross,
./css/style.css:5164:#swingMetricsRow .swing-metric--attack .aa-arrow,
./css/style.css:5165:#swingMetricsRow .swing-metric--attack .aa-glint,
./css/style.css:5166:#swingMetricsRow .swing-metric--attack .aa-driver{
./css/style.css:5175:#swingMetricsRow .swing-metric--attack .swing-metric__body{
./css/style.css:5182:#swingMetricsRow .swing-metric--attack #attackAngle,
./css/style.css:5183:#swingMetricsRow .swing-metric--attack #attackAnglePlane,
./css/style.css:5184:#swingMetricsRow .swing-metric--attack .attack-angle,
./css/style.css:5185:#swingMetricsRow .swing-metric--attack .attack-angle__plane{
./css/style.css:5193:#swingMetricsRow .swing-metric--attack .swing-metric__footer{
./css/style.css:5199:#swingMetricsRow .swing-metric--attack #attackAngleValueLabel{
./css/style.css:5208:#swingMetricsRow .swing-metric--attack .swing-metric__body{
./css/style.css:5214:#swingMetricsRow .swing-metric--attack #attackAngle,
./css/style.css:5215:#swingMetricsRow .swing-metric--attack #attackAnglePlane,
./css/style.css:5216:#swingMetricsRow .swing-metric--attack .attack-angle,
./css/style.css:5217:#swingMetricsRow .swing-metric--attack .attack-angle__plane{
./css/style.css:5233:#swingMetricsRow .swing-metric--attack svg{
./css/style.css:5240:#swingMetricsRow .swing-metric--attack .swing-metric__footer{
./css/style.css:5250:#swingMetricsRow .swing-metric--attack #attackAngleReadout,
./css/style.css:5251:#swingMetricsRow .swing-metric--attack .attack-angle__value,
./css/style.css:5252:#swingMetricsRow .swing-metric--attack .attack-angle__readout,
./css/style.css:5253:#swingMetricsRow .swing-metric--attack .attack-angle__deg,
./css/style.css:5254:#swingMetricsRow .swing-metric--attack .swing-metric__value{
./css/style.css:5261:#swingMetricsRow .swing-metric--attack .attack-angle__unit,
./css/style.css:5262:#swingMetricsRow .swing-metric--attack .swing-metric__unit{
./css/style.css:5272:#swingMetricsRow .swing-metric--attack .attack-angle__unit,
./css/style.css:5273:#swingMetricsRow .swing-metric--attack .swing-metric__unit,
./css/style.css:5274:#swingMetricsRow .swing-metric--attack .attack-angle__label,
./css/style.css:5275:#swingMetricsRow .swing-metric--attack .swing-metric__hint{
./css/style.css:5280:#swingMetricsRow .swing-metric--attack .attack-angle__value,
./css/style.css:5281:#swingMetricsRow .swing-metric--attack .attack-angle__readout,
./css/style.css:5282:#swingMetricsRow .swing-metric--attack .swing-metric__value{
./css/style.css:5291:#swingMetricsRow .swing-metric--attack .swing-metric__body{
./css/style.css:5300:#swingMetricsRow .swing-metric--attack .swing-metric__value,
./css/style.css:5301:#swingMetricsRow .swing-metric--attack .attack-angle__value,
./css/style.css:5302:#swingMetricsRow .swing-metric--attack .attack-angle__readout{
./css/style.css:5309:#swingMetricsRow .swing-metric--attack .attack-angle__unit,
./css/style.css:5310:#swingMetricsRow .swing-metric--attack .swing-metric__unit{
./css/style.css:5319:#swingMetricsRow .swing-metric--attack .swing-metric__body{
./css/style.css:5327:#swingMetricsRow .swing-metric--attack #attackAngle.aa-meter{
./css/style.css:5334:#swingMetricsRow .swing-metric--attack #attackAngle.aa-meter svg{
./css/style.css:5341:#swingMetricsRow .swing-metric--attack #attackAngleRunner{
./css/style.css:5362:#swingMetricsRow{
./css/style.css:5367:#swingMetricsRow .swing-metric--attack{
./css/style.css:5373:#swingMetricsRow .swing-metric--attack .swing-metric__body{
./css/style.css:5382:#swingMetricsRow .swing-metric--attack #attackAngle{
./css/style.css:5394:#swingMetricsRow .swing-metric--attack #attackAngle svg{
./css/style.css:5403:#swingMetricsRow .swing-metric--attack #attackAngle :is(.aa-scale, .aa-scaleV, .aa-ticks, .aa-tickScale, .attack-scale){
./css/style.css:5416:#swingMetricsRow .swing-metric--attack #attackAngle :is(.aa-scale, .aa-scaleV, .aa-ticks, .aa-tickScale, .attack-scale) :is(.aa-label, .aa-scale__label, .label, span){
./css/style.css:5423:#swingMetricsRow .swing-metric--attack #attackAngle :is(.aa-scale, .aa-scaleV, .aa-ticks, .aa-tickScale, .attack-scale) :is(.aa-tick, .tick, i, em, b){
./css/style.css:5432:#swingMetricsRow .swing-metric--attack #attackAngle :is(.aa-scale, .aa-scaleV, .aa-ticks, .aa-tickScale, .attack-scale){
./css/style.css:5442:#swingMetricsRow .swing-metric--attack #attackAngle{
./css/style.css:5448:#swingMetricsRow .swing-metric--attack #attackAngle .aa-meter__scale{
./css/style.css:5470:#swingMetricsRow .swing-metric--attack #attackAngle .aa-meter__scale .aa-scale__label{
./css/style.css:5477:#swingMetricsRow .swing-metric--attack #attackAngle .aa-meter__scale .aa-scale__tick{
./css/style.css:5482:#swingMetricsRow *,
./css/style.css:5514:#swingMetricsRow .swing-metric--attack .swing-metric__body{
./css/style.css:5589:#swingMetricsRow .swing-metric--attack .aa-degrees,
./css/style.css:5590:#swingMetricsRow .swing-metric--attack .degrees,
./css/style.css:5591:#swingMetricsRow .swing-metric--attack [data-aa-degrees]{
./css/style.css:5635:#swingMetricsRow #attackAngle .aa-arcSvg path{
./css/style.css:5640:#swingMetricsRow #attackAngle .aa-arcSvg path.aa-arcTrack{
./css/style.css:5645:#swingMetricsRow #attackAngle .aa-arcSvg path.aa-arcTrack--outer{
./css/style.css:5656:#swingMetricsRow #attackAngle .aa-arcSvg path.aa-arcTrack--inner,
./css/style.css:5657:#swingMetricsRow #attackAngle .aa-arcSvg path[data-aa-arc="1"]{
./css/style.css:5668:#swingMetricsRow #attackAngle .aa-arcSvg path.aa-arcTrack--cut{
./css/style.css:5679:#swingMetricsRow #attackAngle .aa-arcSvg{
./css/style.css:5682:#swingMetricsRow #attackAngle .aa-arcSvg path.aa-arcTrack--inner{
./css/style.css:5687:#swingMetricsRow #attackAngle .aa-arcSvg path.aa-arcTrack--rim,
./css/style.css:5688:#swingMetricsRow #attackAngle .aa-arcSvg path.aa-arcTrack--hl{
./css/style.css:5695:#swingMetricsRow [data-widget]{
./css/style.css:5699:#swingMetricsRow [data-widget] .metricCard__body{
./css/style.css:5705:#swingMetricsRow #pathMount.is-pixi-path #alignmentRing{
./css/style.css:5710:#swingMetricsRow #swingTempoTube,
./css/style.css:5711:#swingMetricsRow #swingTempoFill,
./css/style.css:5712:#swingMetricsRow #swingTempoRunner,
./css/style.css:5713:#swingMetricsRow #attackAnglePlane{
./css/style.css:5720:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack){
./css/style.css:5727:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack) .aa-meter{
./css/style.css:5731:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack) .aa-meter__stage{
./css/style.css:5736:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack) .aa-arcSvg{
./css/style.css:5742:#swingMetricsRow #attackAngle .aa-arcTrack--outer{
./css/style.css:5746:#swingMetricsRow #attackAngle .aa-arcTrack--inner{
./css/style.css:5750:#swingMetricsRow #attackAngle #attackAngleRunner,
./css/style.css:5751:#swingMetricsRow #attackAngle #attackAngleRunner.aa-runner{
./css/style.css:5759:#swingMetricsRow #attackAngle.is-perfect #attackAngleRunner,
./css/style.css:5760:#swingMetricsRow #attackAngle.is-perfect #attackAngleRunner.aa-runner{
./css/style.css:5764:#swingMetricsRow #attackAngle.is-perfect .aa-arcTrack--inner{
./css/style.css:5768:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack):hover{
./css/style.css:5774:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack):hover #attackAngle .aa-arcTrack--inner{
./css/style.css:5778:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack):hover #attackAngle #attackAngleRunner,
./css/style.css:5779:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack):hover #attackAngle #attackAngleRunner.aa-runner{
./css/style.css:5784:  #swingMetricsRow #attackAngle #attackAngleRunner,
./css/style.css:5785:  #swingMetricsRow #attackAngle #attackAngleRunner.aa-runner{
./css/style.css:5895:#swingMetricsRow .metricCard--path{
./css/style.css:5899:#swingMetricsRow .metricCard--path .metricCard__footer{
./css/style.css:5910:#swingMetricsRow .metricCard--path .metricCard__body{
./css/style.css:5937:#mainPanel #swingMetricsRow,
./css/style.css:5938:#mainPanel #swingMetricsRow > [data-widget] {
./css/style.css:5984:#swingMetricsRow .metricCard {
./css/style.css:5988:#swingMetricsRow .metricCard__body {
./css/style.css:5993:#swingMetricsRow .metricCard--tempo .metricCard__body,
./css/style.css:5994:#swingMetricsRow .metricCard--attack .metricCard__body {
./css/style.css:6048:#swingMetricsRow{
./css/style.css:6128:#swingMetricsRow{
./css/ui_tokens.css:1:#swingMetricsRow {
./css/debug_overlay.css:18:body[data-debug="1"] #swingMetricsRow { outline: 2px solid #118ab2; outline-offset: -2px; }
./css/overrides.css:6:   - Prefer scoping to an area: #appHeader, #swingMetricsRow, #sidePanel, #mainPanel, etc.

### .metricCard
./js/widgets/widget_manager.js:38:      const slot = root?.querySelector?.(`[data-widget="${key}"] .metricCard__body`);
./js/app.js:644:  const tempoEl = document.querySelector('#swingMetricsRow [data-widget="tempo"] .metricCard__body');
./js/app.js:645:  const pathEl = document.querySelector('#swingMetricsRow [data-widget="path"] .metricCard__body');
./js/app.js:646:  const attackEl = document.querySelector('#swingMetricsRow [data-widget="attack"] .metricCard__body');
./js/app.js:668:  const card = document.querySelector('.metricCard.metricCard--path[data-widget="path"], .metricCard.metricCard--path');
./js/app.js:671:  const titleEls = Array.from(card.querySelectorAll(':scope > .metricCard__title'));
./js/app.js:675:    titleEl.className = "metricCard__title";
./js/app.js:683:  const bodyEls = Array.from(card.querySelectorAll(':scope > .metricCard__body'));
./js/app.js:687:    bodyEl.className = "metricCard__body";
./js/app.js:697:  const footerEls = Array.from(card.querySelectorAll(':scope > .metricCard__footer'));
./js/app.js:701:    footerEl.className = "metricCard__footer";
./js/app.js:705:    valueEl.className = "metricCard__value";
./js/app.js:709:    hintEl.className = "metricCard__hint";
./js/app.js:720:    pathPixiEls.find((el) => el.closest(".metricCard--path") === card) ||
./js/app.js:2555:    const body = root?.querySelector('.metricCard__body');
./js/app.js:2556:    const footer = root?.querySelector('.metricCard__footer');
./js/swing_path_pixi.js:238:      mountEl?.closest?.(".metricCard--path")?.querySelector?.(":scope > .metricCard__body") ||
./js/swing_path_pixi.js:239:      mountEl?.closest?.(".metricCard--path")?.querySelector?.(".metricCard__body");
./js/swing_path_pixi.js:242:      mountEl?.closest?.(".metricCard__body") ||
./css/tube.css:16:.metricCard--tempo #tempoMount,
./css/tube.css:17:.metricCard--tempo #swingTempoControl {
./css/tube.css:24:.metricCard--tempo .tubeView--vertical {
./css/tube.css:32:.metricCard--tempo .tubeView--vertical .tubeV {
./css/tube.css:39:.metricCard--tempo .tubeView--vertical .tubeV__tube {
./index.html:176:                  <div class="metricCard metricCard--tempo" data-widget="tempo">
./index.html:177:                    <div class="metricCard__title">SWING TEMPO</div>
./index.html:178:                    <div class="metricCard__body" id="tempoMount">
./index.html:181:                    <div class="metricCard__footer" id="tempoFooter">
./index.html:182:                      <div class="metricCard__hint" id="swingTempoPct">0%</div>
./index.html:186:                  <div class="metricCard metricCard--path" data-widget="path">
./index.html:187:                    <div class="metricCard__title">SWING PATH</div>
./index.html:188:                    <div class="metricCard__body" id="pathMount">
./index.html:191:                    <div class="metricCard__footer" id="pathFooter">
./index.html:192:                      <div class="metricCard__value">—</div>
./index.html:193:                      <div class="metricCard__hint">ALIGNMENT</div>
./index.html:197:                  <div class="metricCard metricCard--attack" data-widget="attack">
./index.html:198:                    <div class="metricCard__title">ATTACK ANGLE</div>
./index.html:199:                    <div class="metricCard__body" id="attackMount">
./index.html:202:                    <div class="metricCard__footer" id="attackFooter">
./index.html:203:                      <div class="metricCard__value" id="attackAngleValueLabel">
./css/style.css:5694:/* === Widget Architecture v2 (shared tube + metricCard) === */
./css/style.css:5699:#swingMetricsRow [data-widget] .metricCard__body{
./css/style.css:5720:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack){
./css/style.css:5727:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack) .aa-meter{
./css/style.css:5731:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack) .aa-meter__stage{
./css/style.css:5736:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack) .aa-arcSvg{
./css/style.css:5768:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack):hover{
./css/style.css:5774:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack):hover #attackAngle .aa-arcTrack--inner{
./css/style.css:5778:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack):hover #attackAngle #attackAngleRunner,
./css/style.css:5779:#swingMetricsRow :is(.swing-metric--attack, [data-widget="attack"], .metricCard--attack):hover #attackAngle #attackAngleRunner.aa-runner{
./css/style.css:5895:#swingMetricsRow .metricCard--path{
./css/style.css:5899:#swingMetricsRow .metricCard--path .metricCard__footer{
./css/style.css:5910:#swingMetricsRow .metricCard--path .metricCard__body{
./css/style.css:5984:#swingMetricsRow .metricCard {
./css/style.css:5988:#swingMetricsRow .metricCard__body {
./css/style.css:5993:#swingMetricsRow .metricCard--tempo .metricCard__body,
./css/style.css:5994:#swingMetricsRow .metricCard--attack .metricCard__body {
./css/debug_overlay.css:19:body[data-debug="1"] .metricCard { outline: 1px dashed rgba(255,255,255,0.35); outline-offset: -1px; }
./css/debug_overlay.css:21:body[data-debug="1"] .metricCard__title  { outline: 1px dashed rgba(255,200,0,0.55); outline-offset: -1px; }
./css/debug_overlay.css:22:body[data-debug="1"] .metricCard__body   { outline: 1px dashed rgba(0,255,200,0.45); outline-offset: -1px; }
./css/debug_overlay.css:23:body[data-debug="1"] .metricCard__footer { outline: 1px dashed rgba(120,160,255,0.45); outline-offset: -1px; }
./css/metric_card.css:1:#swingMetricsRow .metricCard {
./css/metric_card.css:62:#swingMetricsRow .metricCard::before {
./css/metric_card.css:71:#swingMetricsRow .metricCard__title {
./css/metric_card.css:81:#swingMetricsRow .metricCard__body {
./css/metric_card.css:91:.metricCard--tempo .metricCard__body {
./css/metric_card.css:95:#swingMetricsRow .metricCard__footer {
./css/metric_card.css:105:#swingMetricsRow .metricCard__value {
./css/metric_card.css:112:#swingMetricsRow .metricCard__hint {
./css/swing_metrics.css:86:#swingMetricsRow .metricCard--tempo[data-widget="tempo"],
./css/swing_metrics.css:87:#swingMetricsRow .metricCard--attack[data-widget="attack"] {
./css/swing_metrics.css:97:#swingMetricsRow .metricCard--attack[data-widget="attack"] {
./css/swing_metrics.css:102:#swingMetricsRow .metricCard--path[data-widget="path"] {
./css/swing_metrics.css:107:#swingMetricsRow .metricCard--tempo[data-widget="tempo"] {
./css/swing_metrics.css:123:#swingMetricsRow .metricCard {
./css/swing_metrics.css:132:#swingMetricsRow .metricCard::before,
./css/swing_metrics.css:133:#swingMetricsRow .metricCard::after {
./css/swing_metrics.css:137:#swingMetricsRow .metricCard__body {
./css/swing_metrics.css:143:#swingMetricsRow .metricCard--tempo .metricCard__body,
./css/swing_metrics.css:144:#swingMetricsRow .metricCard--attack .metricCard__body {
./css/swing_metrics.css:148:#swingMetricsRow .metricCard--path .metricCard__body {
./css/swing_metrics.css:155:#swingMetricsRow .metricCard--tempo #swingTempoControl {
./css/swing_metrics.css:160:#swingMetricsRow .metricCard--tempo #tempoMount,
./css/swing_metrics.css:161:#swingMetricsRow .metricCard--tempo #swingTempoControl,
./css/swing_metrics.css:162:#swingMetricsRow .metricCard--attack #attackMount,
./css/swing_metrics.css:163:#swingMetricsRow .metricCard--attack #attackAngle,
./css/swing_metrics.css:164:#swingMetricsRow .metricCard--attack .tubeArc {
./css/swing_metrics.css:168:#swingMetricsRow .metricCard--tempo #tempoValueLabel {
./css/swing_metrics.css:173:#swingMetricsRow .metricCard--tempo #swingTempoPct {
./css/swing_metrics.css:184:#swingMetricsRow .metricCard.metricCard--path {
./css/swing_metrics.css:191:#swingMetricsRow .metricCard.metricCard--path::before {
./css/swing_metrics.css:195:#swingMetricsRow .metricCard.metricCard--path::after {
./css/swing_metrics.css:199:#swingMetricsRow .metricCard.metricCard--path > * {
./css/swing_metrics.css:204:#swingMetricsRow .metricCard.metricCard--path .metricCard__body {
./css/swing_metrics.css:210:#swingMetricsRow .metricCard.metricCard--path .metricCard__title {
./css/swing_metrics.css:219:#swingMetricsRow .metricCard.metricCard--path .metricCard__title::before,
./css/swing_metrics.css:220:#swingMetricsRow .metricCard.metricCard--path .metricCard__title::after {
./css/swing_metrics.css:236:#swingMetricsRow .metricCard.metricCard--path .metricCard__title::before {
./css/swing_metrics.css:241:#swingMetricsRow .metricCard.metricCard--path .metricCard__title::after {
./css/swing_metrics.css:246:#swingMetricsRow .metricCard.metricCard--path .metricCard__body.is-pixi-path .is-legacyPathLayer {
./css/swing_metrics.css:250:#swingMetricsRow .metricCard.metricCard--path #pathPixi,
./css/swing_metrics.css:251:#swingMetricsRow .metricCard.metricCard--path #pathPixi.metricStage--pixi {
./css/swing_metrics.css:261:#swingMetricsRow .metricCard.metricCard--path #pathPixi canvas,
./css/swing_metrics.css:262:#swingMetricsRow .metricCard.metricCard--path #pathPixi.metricStage--pixi canvas {
./css/swing_metrics.css:271:#swingMetricsRow .metricCard.metricCard--path #pathPixi:not(:has(canvas))::before {
./css/swing_metrics.css:303:#swingMetricsRow .metricCard--attack {
./css/swing_metrics.css:308:#swingMetricsRow .metricCard--attack .metricCard__body {
./css/swing_metrics.css:315:#swingMetricsRow .metricCard--attack #attackAngle {
./css/swing_metrics.css:323:#swingMetricsRow .metricCard--attack .tubeArc {
./css/swing_metrics.css:327:#swingMetricsRow .metricCard--attack .tubeArc__stage {
./css/swing_metrics.css:332:#swingMetricsRow .metricCard--attack .tubeArc__svg {
./css/swing_metrics.css:339:#swingMetricsRow .metricCard--attack .tubeArc__outer,
./css/swing_metrics.css:340:#swingMetricsRow .metricCard--attack .aa-arcTrack--outer {
./css/swing_metrics.css:348:#swingMetricsRow .metricCard--attack .tubeArc__inner,
./css/swing_metrics.css:349:#swingMetricsRow .metricCard--attack .aa-arcTrack--inner,
./css/swing_metrics.css:350:#swingMetricsRow .metricCard--attack [data-aa-arc="1"] {
./css/swing_metrics.css:358:#swingMetricsRow .metricCard--attack #attackAngleRunner,
./css/swing_metrics.css:359:#swingMetricsRow .metricCard--attack .tubeArc__runner {
./css/swing_metrics.css:388:#swingMetricsRow .metricCard--attack .metricCard__hint {
./css/swing_metrics.css:447:#swingMetricsRow .metricCard--attack #attackAngle{
./css/swing_metrics.css:451:#swingMetricsRow .metricCard--attack .tubeArc,
./css/swing_metrics.css:452:#swingMetricsRow .metricCard--attack .tubeView--arc,
./css/swing_metrics.css:453:#swingMetricsRow .metricCard--attack .tubeArc__stage{
./css/swing_metrics.css:457:#swingMetricsRow .metricCard--attack .tubeArc__svg{
./css/swing_metrics.css:484:#mainPanel #swingMetricsRow .metricCard {
./css/swing_metrics.css:498:#swingMetricsRow .metricCard{
./css/swing_metrics.css:502:#swingMetricsRow .metricCard__title{

### .metricCard__title
./js/app.js:671:  const titleEls = Array.from(card.querySelectorAll(':scope > .metricCard__title'));
./js/app.js:675:    titleEl.className = "metricCard__title";
./css/debug_overlay.css:21:body[data-debug="1"] .metricCard__title  { outline: 1px dashed rgba(255,200,0,0.55); outline-offset: -1px; }
./css/swing_metrics.css:210:#swingMetricsRow .metricCard.metricCard--path .metricCard__title {
./css/swing_metrics.css:219:#swingMetricsRow .metricCard.metricCard--path .metricCard__title::before,
./css/swing_metrics.css:220:#swingMetricsRow .metricCard.metricCard--path .metricCard__title::after {
./css/swing_metrics.css:236:#swingMetricsRow .metricCard.metricCard--path .metricCard__title::before {
./css/swing_metrics.css:241:#swingMetricsRow .metricCard.metricCard--path .metricCard__title::after {
./css/swing_metrics.css:502:#swingMetricsRow .metricCard__title{
./index.html:177:                    <div class="metricCard__title">SWING TEMPO</div>
./index.html:187:                    <div class="metricCard__title">SWING PATH</div>
./index.html:198:                    <div class="metricCard__title">ATTACK ANGLE</div>
./css/metric_card.css:71:#swingMetricsRow .metricCard__title {

### .metricCard__body
./js/widgets/widget_manager.js:38:      const slot = root?.querySelector?.(`[data-widget="${key}"] .metricCard__body`);
./js/swing_path_pixi.js:238:      mountEl?.closest?.(".metricCard--path")?.querySelector?.(":scope > .metricCard__body") ||
./js/swing_path_pixi.js:239:      mountEl?.closest?.(".metricCard--path")?.querySelector?.(".metricCard__body");
./js/swing_path_pixi.js:242:      mountEl?.closest?.(".metricCard__body") ||
./index.html:178:                    <div class="metricCard__body" id="tempoMount">
./index.html:188:                    <div class="metricCard__body" id="pathMount">
./index.html:199:                    <div class="metricCard__body" id="attackMount">
./js/app.js:644:  const tempoEl = document.querySelector('#swingMetricsRow [data-widget="tempo"] .metricCard__body');
./js/app.js:645:  const pathEl = document.querySelector('#swingMetricsRow [data-widget="path"] .metricCard__body');
./js/app.js:646:  const attackEl = document.querySelector('#swingMetricsRow [data-widget="attack"] .metricCard__body');
./js/app.js:683:  const bodyEls = Array.from(card.querySelectorAll(':scope > .metricCard__body'));
./js/app.js:687:    bodyEl.className = "metricCard__body";
./js/app.js:2555:    const body = root?.querySelector('.metricCard__body');
./css/swing_metrics.css:137:#swingMetricsRow .metricCard__body {
./css/swing_metrics.css:143:#swingMetricsRow .metricCard--tempo .metricCard__body,
./css/swing_metrics.css:144:#swingMetricsRow .metricCard--attack .metricCard__body {
./css/swing_metrics.css:148:#swingMetricsRow .metricCard--path .metricCard__body {
./css/swing_metrics.css:204:#swingMetricsRow .metricCard.metricCard--path .metricCard__body {
./css/swing_metrics.css:246:#swingMetricsRow .metricCard.metricCard--path .metricCard__body.is-pixi-path .is-legacyPathLayer {
./css/swing_metrics.css:308:#swingMetricsRow .metricCard--attack .metricCard__body {
./css/metric_card.css:81:#swingMetricsRow .metricCard__body {
./css/metric_card.css:91:.metricCard--tempo .metricCard__body {
./css/style.css:5699:#swingMetricsRow [data-widget] .metricCard__body{
./css/style.css:5910:#swingMetricsRow .metricCard--path .metricCard__body{
./css/style.css:5988:#swingMetricsRow .metricCard__body {
./css/style.css:5993:#swingMetricsRow .metricCard--tempo .metricCard__body,
./css/style.css:5994:#swingMetricsRow .metricCard--attack .metricCard__body {
./css/debug_overlay.css:22:body[data-debug="1"] .metricCard__body   { outline: 1px dashed rgba(0,255,200,0.45); outline-offset: -1px; }

### .metricCard__footer
./index.html:181:                    <div class="metricCard__footer" id="tempoFooter">
./index.html:191:                    <div class="metricCard__footer" id="pathFooter">
./index.html:202:                    <div class="metricCard__footer" id="attackFooter">
./js/app.js:697:  const footerEls = Array.from(card.querySelectorAll(':scope > .metricCard__footer'));
./js/app.js:701:    footerEl.className = "metricCard__footer";
./js/app.js:2556:    const footer = root?.querySelector('.metricCard__footer');
./css/debug_overlay.css:23:body[data-debug="1"] .metricCard__footer { outline: 1px dashed rgba(120,160,255,0.45); outline-offset: -1px; }
./css/metric_card.css:95:#swingMetricsRow .metricCard__footer {
./css/style.css:5899:#swingMetricsRow .metricCard--path .metricCard__footer{

### .topbar-profile
./index.html:62:          <div class="topbar-profile compact" id="topbarProfile">
./css/overrides.css:11:   header#appHeader .topbar-profile.compact { min-width: 0 !important; }
./css/style.css:265:.topbar-profile.compact{
./css/style.css:274:.topbar-profile .tp-row{
./css/style.css:280:.topbar-profile .tp-left{
./css/style.css:286:.topbar-profile .tp-kicker{
./css/style.css:292:.topbar-profile .tp-name-row{
./css/style.css:297:.topbar-profile .tp-name{
./css/style.css:303:.topbar-profile .tp-edit{
./css/style.css:313:.topbar-profile .tp-edit:hover{ color: var(--muted); }
./css/style.css:314:.topbar-profile .tp-right{
./css/style.css:319:.topbar-profile .tp-inline{
./css/style.css:326:.topbar-profile .tp-item{
./css/style.css:331:.topbar-profile .tp-label{
./css/style.css:337:.topbar-profile .tp-val{
./css/style.css:342:.topbar-profile .tp-val.gold{
./css/style.css:345:.topbar-profile .tp-sep{
./css/style.css:350:.topbar-profile .tp-pb .tp-val{
./css/style.css:355:.topbar-profile,
./css/style.css:356:.topbar-profile.compact{
./css/style.css:379:.topbar-profile,
./css/style.css:380:.topbar-profile.compact{
./css/style.css:403:.topbar-profile::before,
./css/style.css:404:.topbar-profile::after{
./css/style.css:531:  .topbar-profile.compact{
./css/style.css:534:  .topbar-profile .tp-inline{
./css/style.css:546:  .topbar-profile .tp-row{
./css/style.css:550:  .topbar-profile .tp-right{

### .top-center
./index.html:61:        <div class="top-center">
./css/style.css:244:.top-center{
./css/style.css:255:.top-center > *{
./css/style.css:259:.top-center .player-profile,
./css/style.css:260:.top-center .profile-pill,
./css/style.css:261:.top-center .profile-line{
./css/style.css:529:  .top-center{ grid-area:center; justify-content:flex-start; }
./css/style.css:530:  .top-center > *{ max-width: 100%; }

## C) Risky properties scan (common conflict sources)
These often cause 3-day hunts:
- min-width / min-height
- transform / scale
- overflow
- position: absolute/fixed
- height: 100vh / width: 100vw

### min-width
./CHATGPT_DIAGNOSTIC_REPORT.md:165:  min-width: 0;
./css/swing_metrics.css:76:  min-width: 0;
./css/overrides.css:11:   header#appHeader .topbar-profile.compact { min-width: 0 !important; }
./css/style.css:243:.top-left{ min-width: 0; }
./css/style.css:245:  min-width: 0;
./css/style.css:269:  min-width: 0;
./css/style.css:284:  min-width: 210px;
./css/style.css:441:  min-width: 320px;
./css/style.css:532:    min-width: 100%;
./css/style.css:541:    min-width: 280px;
./css/style.css:665:  min-width: 220px;
./css/style.css:865:  min-width: 280px;
./css/style.css:987:  min-width: 360px;
./css/style.css:1382:  min-width: 140px;
./css/style.css:1570:  min-width: 0;
./css/style.css:1647:  min-width: 0;
./css/style.css:1653:  min-width: 0;
./css/style.css:2617:    min-width: 140px;
./css/style.css:3095:  min-width: 140px;
./css/style.css:4137:  min-width: 0;
./css/style.css:4141:  min-width: 0;
./css/style.css:5330:  min-width: 0 !important;
./css/style.css:5347:  min-width: 200px;           /* was visually too narrow */

### min-height
./CHATGPT_DIAGNOSTIC_REPORT.md:180:  min-height: 0;
./css/tube.css:4:  min-height: 0;
./css/tube.css:163:  min-height: 0;
./css/swing_metrics.css:37:  min-height: 220px;
./css/swing_metrics.css:149:  min-height: 300px;
./css/swing_metrics.css:256:  min-height: 0;
./css/swing_metrics.css:469:  min-height: 300px;
./css/swing_metrics.css:475:  min-height: 300px;
./css/swing_metrics.css:481:  min-height: 300px;
./css/swing_metrics.css:485:  min-height: 300px;
./css/swing_metrics.css:505:  min-height: 34px;
./css/style.css:160:  min-height: 100dvh;
./css/style.css:194:  min-height: 100vh;
./css/style.css:1559:  min-height: 220px;
./css/style.css:1728:  min-height: 260px;
./css/style.css:1740:  min-height: 260px;
./css/style.css:2020:    min-height: 180px;
./css/style.css:2045:    min-height: 100px;
./css/style.css:2933:  min-height: 38px;
./css/style.css:3376:  min-height: 34px;
./css/style.css:4120:  min-height: 100vh;
./css/style.css:4130:  min-height: 0;
./css/style.css:4149:  min-height: 170px;
./css/style.css:4180:  min-height: 260px;
./css/style.css:4193:  min-height: 170px;
./css/style.css:4229:  min-height: 100vh;
./css/style.css:4383:  min-height: 220px;
./css/style.css:4437:  min-height: 260px;
./css/style.css:4825:  min-height: 56px;
./css/style.css:4836:  min-height: 56px;
./css/style.css:4860:  min-height: 42px !important;
./css/style.css:4939:  min-height: 14px !important;
./css/style.css:4968:  min-height: 14px !important;
./css/style.css:5026:  min-height: 260px;
./css/style.css:5221:  min-height: 0 !important;
./css/style.css:5806:  min-height: 100vh;
./css/style.css:5826:  min-height: 0;
./css/style.css:5845:  min-height: 0;
./css/style.css:5854:  min-height: 0;
./css/style.css:5860:  min-height: 0;
./css/style.css:5867:  min-height: 0;
./css/style.css:5917:  min-height: 0;
./css/style.css:5927:  min-height: 0;
./css/style.css:5940:  min-height: 0;
./css/style.css:5944:  min-height: 0;
./css/style.css:5959:  min-height: 0;
./css/style.css:5985:  min-height: 0;
./css/style.css:5989:  min-height: 0;
./css/style.css:6011:  min-height: 100vh;
./css/style.css:6063:  min-height: 100vh;
./css/style.css:6075:  min-height: 100%;
./css/style.css:6112:  min-height: 0; /* allow children to flex without overflow */
./css/style.css:6117:  min-height: 0;
./css/style.css:6124:  min-height: 0;
./css/style.css:6130:  min-height: 0;
./css/style.css:6142:  min-height: 0;
./css/style.css:6151:  min-height: 0;
./css/style.css:6210:  min-height: 0; /* allow children to scroll */
./css/style.css:6223:  min-height: 0;
./css/style.css:6240:  min-height: 100vh !important;
./css/metric_card.css:5:  min-height: 300px;
./css/metric_card.css:84:  min-height: 0;
./css/metric_card.css:122:  min-height: 0;

### transform
./src/angular/app/widgets/attack-angle.component.ts:17:            <g class="aa-glint" transform="translate(96 92)">
./_archive/_backup_legacy/flight.js:71:  ballEl.style.transform = `translate3d(${tx}px, ${y}px, 0)`;
./_archive/_backup_legacy/flight.js:168:    { transform: `translate(${startTx}px, 0px)` },
./_archive/_backup_legacy/flight.js:169:    { transform: `translate(${(startTx + endTx) / 2}px, 0px)`, offset: 0.45 },
./_archive/_backup_legacy/flight.js:170:    { transform: `translate(${endTx}px, 0px)` }
./_archive/_backup_legacy/flight.js:251:    { transform: `translate(${startTx}px, 0px)` },
./_archive/_backup_legacy/flight.js:252:    { transform: `translate(${endTx}px, 0px)` }
./_archive/_backup_legacy/flight.js:336:  ballEl.style.transition = `transform ${dropMs}ms cubic-bezier(.3,.7,.1,1)`;
./_archive/_backup_legacy/flight.js:352:  ballEl.style.transition = `transform ${settleMs}ms cubic-bezier(.2,.8,.2,1)`;
./CHATGPT_DIAGNOSTIC_REPORT.md:90:  fit.style.transform = `translateX(${dx}px) scale(${scale})`;
./CHATGPT_DIAGNOSTIC_REPORT.md:118:    fit.style.transformOrigin = "top center";
./CHATGPT_DIAGNOSTIC_REPORT.md:119:    fit.style.transform = `translateZ(0) scale(${s})`;
./CHATGPT_DIAGNOSTIC_REPORT.md:294:3. UI fit currently has duplicate logic paths (legacy + stable) and duplicate listeners in `js/app.js`, which can cause competing transforms.
./package-lock.json:53:        "@babel/helper-module-transforms": "^7.28.6",
./package-lock.json:132:    "node_modules/@babel/helper-module-transforms": {
./package-lock.json:134:      "resolved": "https://registry.npmjs.org/@babel/helper-module-transforms/-/helper-module-transforms-7.28.6.tgz",
./package-lock.json:220:    "node_modules/@babel/plugin-transform-react-jsx-self": {
./package-lock.json:222:      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-self/-/plugin-transform-react-jsx-self-7.27.1.tgz",
./package-lock.json:236:    "node_modules/@babel/plugin-transform-react-jsx-source": {
./package-lock.json:238:      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-source/-/plugin-transform-react-jsx-source-7.27.1.tgz",
./package-lock.json:1158:        "@babel/plugin-transform-react-jsx-self": "^7.27.1",
./package-lock.json:1159:        "@babel/plugin-transform-react-jsx-source": "^7.27.1",
./js/widgets/shared/tube/tube_view_arc.js:109:    runnerEl.style.setProperty("transform", visualState === "hold" ? "scale(1.05)" : "none", "important");
./js/app.js:1380:  windArrowEl.style.transform = `rotate(${state.wind.dirDeg}deg)`;
./js/app.js:2857:        transform: cs.transform,
./js/attack_angle_plane.js:303:        runner.style.transform = "translate(-50%, -50%)";
./js/attack_angle_plane.js:313:        runner.style.transform = "translate(-50%, -50%)";
./js/swing_controls.js:111:  dom.head.style.transform = ""; // Remove horizontal transform
./css/tube.css:91:  transform: translateX(-50%);
./css/tube.css:92:  transform-origin: 50% 50%;
./css/tube.css:103:  transition: transform 120ms ease-out, opacity 120ms ease-out;
./css/tube.css:122:  transform: translateX(-50%) scaleY(1.07);
./css/tube.css:212:  transform: translate(-50%, -50%);
./css/tube.css:221:  transition: transform 120ms ease-out, opacity 120ms ease-out;
./css/tube.css:225:  transform: translate(-50%, -50%) scale(1.05);
./js/ui/ui_fit.js:4: * - `#uiFit` is responsible for transform-based scaling only.
./js/ui/ui_fit.js:107:  fit.style.transformOrigin = "top center";
./js/ui/ui_fit.js:108:  fit.style.transform = `translateZ(0) scale(${scale})`;
./css/style.css:289:  text-transform: uppercase;
./css/style.css:311:  transform: translateY(1px);
./css/style.css:334:  text-transform: uppercase;
./css/style.css:348:  transform: translateY(-1px);
./css/style.css:459:  text-transform: uppercase;
./css/style.css:489:  text-transform: uppercase;
./css/style.css:510:  transform: translateX(-120%);
./css/style.css:516:  to{ transform: translateX(120%); opacity: 0; }
./css/style.css:679:  transform: scale(1.3);
./css/style.css:680:  transform-origin: center;
./css/style.css:706:  text-transform: uppercase;
./css/style.css:739:  transform: translateX(-50%) translateY(6px);
./css/style.css:750:  transition: opacity 120ms ease, transform 120ms ease;
./css/style.css:760:  transform: translateX(-50%) translateY(0);
./css/style.css:812:  transition: opacity 160ms ease, transform 160ms ease;
./css/style.css:813:  transform: translateY(4px);
./css/style.css:817:  transform: translateY(0);
./css/style.css:825:  transform: rotate(45deg);
./css/style.css:885:  transform: rotate(45deg);
./css/style.css:894:  transform: rotate(225deg);
./css/style.css:947:  text-transform: uppercase;
./css/style.css:956:  text-transform: uppercase;
./css/style.css:975:  text-transform: uppercase;
./css/style.css:1128:  text-transform: uppercase;
./css/style.css:1154:  text-transform: uppercase;
./css/style.css:1251:  text-transform: uppercase;
./css/style.css:1263:  0%{ transform: scale(1); text-shadow: 0 0 0 rgba(255,255,255,0); }
./css/style.css:1264:  40%{ transform: scale(1.03); text-shadow: 0 6px 18px rgba(216,199,154,0.35); }
./css/style.css:1265:  100%{ transform: scale(1); text-shadow: 0 0 0 rgba(255,255,255,0); }
./css/style.css:1268:  from{ opacity:0; transform: translateY(4px); }
./css/style.css:1269:  to{ opacity:1; transform: translateY(0); }
./css/style.css:1284:  text-transform: uppercase;
./css/style.css:1290:  transform-origin: 50% 50%;
./css/style.css:1318:  text-transform: uppercase;
./css/style.css:1334:  transform: translateY(-1px);
./css/style.css:1341:  text-transform: uppercase;
./css/style.css:1367:  text-transform: uppercase;
./css/style.css:1415:  transform: translateY(-50%);
./css/style.css:1430:  transform: translate(-50%, -50%);
./css/style.css:1439:  text-transform: uppercase;
./css/style.css:1663:  transition: transform 220ms ease, filter 220ms ease, opacity 180ms ease;
./css/style.css:1669:  transform: scale(1.02);
./css/style.css:1681:  transform: scale(1.02);
./css/style.css:1698:  transform: scale(1);
./css/style.css:1713:  text-transform: uppercase;
./css/style.css:1784:  text-transform: uppercase;
./css/style.css:1809:  transform: none;
./css/style.css:1920:  transform: translate(-50%, -50%);
./css/style.css:1960:  0%, 100%{ opacity: 0.78; transform: translate(-50%, -50%) scale(0.995); }
./css/style.css:1961:  50%{ opacity: 0.92; transform: translate(-50%, -50%) scale(1.01); }
./css/style.css:1989:  transform: none;
./css/style.css:2079:  transform: translate(-50%, -50%);
./css/style.css:2137:  transform: translateX(-50%);
./css/style.css:2265:  transform: translateY(-50%);
./css/style.css:2281:/* Club container (no longer rotates — driver handles its own transform) */
./css/style.css:2351:  transform-origin: 50% 50%;
./css/style.css:2352:  transform: 
./css/style.css:2358:  will-change: transform;
./css/style.css:2419:  transform: translate(-50%, -50%) translateX(var(--attack-shift-px, 0px));
./css/style.css:2422:  transition: transform 60ms ease-out;
./css/style.css:2486:  transition: filter 0.12s ease, transform 0.06s ease-out;
./css/style.css:2498:  transition: box-shadow 0.12s ease, transform 60ms ease-out;
./css/style.css:2554:  0%{ transform: scale(1); transform-origin: 60px 60px; }
./css/style.css:2555:  45%{ transform: scale(1.08); transform-origin: 60px 60px; }
./css/style.css:2556:  100%{ transform: scale(1); transform-origin: 60px 60px; }
./css/style.css:2559:  0%{ transform: scale(1); filter: drop-shadow(0 2px 10px rgba(205,187,138,0.25)); }
./css/style.css:2560:  45%{ transform: scale(1.06); filter: drop-shadow(0 4px 16px rgba(205,187,138,0.45)); }
./css/style.css:2561:  100%{ transform: scale(1); filter: drop-shadow(0 2px 10px rgba(205,187,138,0.25)); }
./css/style.css:2570:  text-transform: uppercase;
./css/style.css:2584:  transform-origin: 0% 50%;
./css/style.css:2594:  0%{ transform: scale(1); opacity: 0.88; }
./css/style.css:2595:  50%{ transform: scale(1.02); opacity: 1; }
./css/style.css:2596:  100%{ transform: scale(1); opacity: 0.88; }
./css/style.css:2604:  0%{ transform: translateY(-50%) scale(0.98); opacity: 0.86; }
./css/style.css:2605:  50%{ transform: translateY(-50%) scale(1.0); opacity: 1; }
./css/style.css:2606:  100%{ transform: translateY(-50%) scale(0.98); opacity: 0.86; }
./css/style.css:2662:  text-transform: uppercase;
./css/style.css:2670:  text-transform: uppercase;
./css/style.css:2707:  text-transform: uppercase;
./css/style.css:2730:.gc-field__rough--bot{ bottom:0; transform: rotate(180deg); }
./css/style.css:2781:  transform: translateY(-50%);
./css/style.css:2820:  transform: translateY(-50%);
./css/style.css:2906:  text-transform: uppercase;
./css/style.css:2908:  transition: transform .08s ease, background .2s ease, border-color .2s ease, box-shadow .2s ease;
./css/style.css:2913:  transform: translateY(-1px);
./css/style.css:2917:  transform: scale(.98);
./css/style.css:2944:  transform: none;
./css/style.css:2951:  transform: none;
./css/style.css:2959:  transform: none;
./css/style.css:3006:  transition: background .2s ease, border-color .2s ease, transform .08s ease, box-shadow .2s ease;
./css/style.css:3010:  transform: translateY(-1px);
./css/style.css:3013:.gc-club:active{ transform: scale(.98); box-shadow: none; }
./css/style.css:3067:  transition: transform .2s ease, background .2s ease, box-shadow .2s ease;
./css/style.css:3076:  transform: translateX(18px);
./css/style.css:3211:  text-transform: uppercase;
./css/style.css:3228:  text-transform: uppercase;
./css/style.css:3308:  transform-origin: center;
./css/style.css:3309:  transition: opacity 200ms var(--ease), transform 220ms var(--ease);
./css/style.css:3316:  transform: scale(.98);
./css/style.css:3385:  text-transform: uppercase;
./css/style.css:3454:  from{ opacity:0; transform: translateY(6px); }
./css/style.css:3455:  to{ opacity:1; transform: translateY(0); }
./css/style.css:3458:  from{ opacity:0; transform: scale(.98); }
./css/style.css:3459:  to{ opacity:1; transform: scale(1); }
./css/style.css:3477:  0%{ transform: translate3d(0,0,0); }
./css/style.css:3478:  25%{ transform: translate3d(-2px, 2px, 0); }
./css/style.css:3479:  50%{ transform: translate3d(2px, -2px, 0); }
./css/style.css:3480:  75%{ transform: translate3d(-2px, 2px, 0); }
./css/style.css:3481:  100%{ transform: translate3d(0,0,0); }
./css/style.css:3906:  transform: translate(-50%,-50%);
./css/style.css:4004:  transform: translate(-50%, -50%) scale(0.96);
./css/style.css:4329:  text-transform: uppercase;
./css/style.css:4342:  text-transform: uppercase;
./css/style.css:4392:  text-transform: uppercase;
./css/style.css:4425:  text-transform: uppercase;
./css/style.css:4681:  transform: translate(-50%, -50%);
./css/style.css:4960:  0%   { transform: translateY(0) scaleY(1);    filter: brightness(1);    opacity: 0.98; }
./css/style.css:4961:  50%  { transform: translateY(0) scaleY(1.03); filter: brightness(1.06); opacity: 1; }
./css/style.css:4962:  100% { transform: translateY(0) scaleY(1);    filter: brightness(1);    opacity: 0.98; }
./css/style.css:4977:  transform: none !important;
./css/style.css:5005:  text-transform: uppercase;
./css/style.css:5054:  transform: translate(-50%, -50%);
./css/style.css:5086:  transform: translate(-50%, -50%);
./css/style.css:5419:  text-transform: none !important;
./css/style.css:5438:  transform: none !important;
./css/style.css:5460:  transform: translateX(-50%) !important;
./css/style.css:5548:/* Runner stays absolute on stage (JS sets left/top). Ensure no extra transforms from CSS. */
./css/style.css:5551:  transform: translate(-50%, -50%) !important;
./css/style.css:5564:  transform: none !important;
./css/style.css:5755:  will-change: transform, left, top, filter, opacity;
./css/style.css:6020:  transform: none !important;
./css/style.css:6250:  transform: none !important;
./css/metric_card.css:27:  transition: transform 220ms ease, filter 220ms ease, opacity 180ms ease;
./css/metric_card.css:32:  transform: scale(1.02);
./css/metric_card.css:45:  transform: scale(1.02);
./css/metric_card.css:59:  transform: none;
./css/metric_card.css:75:  text-transform: uppercase;
./css/metric_card.css:115:  text-transform: uppercase;
./css/swing_metrics.css:225:  transform: translateY(-50%);
./css/swing_metrics.css:363:  will-change: transform, left, top, filter, opacity;

### scale(

### overflow
./CHATGPT_DIAGNOSTIC_REPORT.md:83:  vp.style.overflow = "hidden";
./CHATGPT_DIAGNOSTIC_REPORT.md:108:    vp.style.overflow = "hidden";
./CHATGPT_DIAGNOSTIC_REPORT.md:182:  overflow: auto;
./CHATGPT_DIAGNOSTIC_REPORT.md:227:  overflow:hidden;
./CHATGPT_DIAGNOSTIC_REPORT.md:261:  overflow: hidden;
./js/debug/attack_angle_layer_debug.js:28:/* show overflow behavior clearly */
./js/flight_aviatorlike.js:107:            overflow: cs.overflow,
./css/tube.css:57:  overflow: hidden;
./css/tube.css:175:  overflow: visible;
./css/tube.css:182:  overflow: visible;
./js/app.js:2735:        overflow: cs.overflow
./js/app.js:2862:        overflow: cs.overflow
./js/ui/ui_fit.js:77:  viewport.style.overflowY = "auto";
./js/ui/ui_fit.js:78:  viewport.style.overflowX = "hidden";
./css/swing_metrics.css:129:  overflow: visible;
./css/swing_metrics.css:187:  overflow: visible;
./css/swing_metrics.css:206:  overflow: hidden;
./css/swing_metrics.css:336:  overflow: visible;
./css/swing_metrics.css:477:  overflow: visible;
./css/swing_metrics.css:495:  overflow: visible;              /* avoid clipping titles */
./css/swing_metrics.css:499:  overflow: visible;              /* titles must not be clipped */
./css/style.css:158:  overflow-x: hidden;
./css/style.css:234:  overflow: visible !important;
./css/style.css:262:  overflow: hidden;
./css/style.css:263:  text-overflow: ellipsis;
./css/style.css:442:  overflow: visible !important;
./css/style.css:449:  overflow: hidden;
./css/style.css:450:  overflow: visible !important;
./css/style.css:1044:  overflow:hidden;
./css/style.css:1174:  overflow: hidden;
./css/style.css:1467:  overflow: hidden;
./css/style.css:1557:  overflow: visible;
./css/style.css:1594:  overflow: visible;
./css/style.css:1635:  overflow: visible;
./css/style.css:1708:  overflow: visible;
./css/style.css:1709:  text-overflow: unset;
./css/style.css:1723:  overflow: visible;
./css/style.css:1730:  overflow: visible;
./css/style.css:2089:  overflow: visible;
./css/style.css:2252:  overflow: visible;
./css/style.css:2895:  overflow-x: visible;
./css/style.css:3217:  overflow:hidden;
./css/style.css:3432:  overflow: hidden;
./css/style.css:3853:  overflow: visible;
./css/style.css:4176:  overflow: hidden;
./css/style.css:4444:  overflow: visible !important;
./css/style.css:4450:  overflow: visible !important;
./css/style.css:4543:  overflow: visible !important;
./css/style.css:4641:  overflow: visible;
./css/style.css:4720:/* Ensure the attack widget doesn’t overflow its card */
./css/style.css:4722:  overflow: hidden;
./css/style.css:4931:  overflow: hidden !important;
./css/style.css:5057:  overflow: visible;
./css/style.css:5189:  overflow: visible !important;
./css/style.css:5229:  overflow: visible !important;
./css/style.css:5680:  overflow: visible;
./css/style.css:5796:  overflow-y: auto;
./css/style.css:5797:  overflow-x: hidden;
./css/style.css:5831:  overflow-x: hidden;
./css/style.css:5832:  overflow-y: visible;
./css/style.css:5881:  overflow: hidden;
./css/style.css:5887:  overflow: hidden;
./css/style.css:5961:  overflow: auto;
./css/style.css:5990:  overflow: hidden;
./css/style.css:5995:  overflow: visible;
./css/style.css:6004:  overflow-y: auto;
./css/style.css:6005:  overflow-x: hidden;
./css/style.css:6012:  overflow-y: auto;
./css/style.css:6013:  overflow-x: hidden;
./css/style.css:6064:  overflow-y: auto;
./css/style.css:6065:  overflow-x: hidden;
./css/style.css:6112:  min-height: 0; /* allow children to flex without overflow */
./css/style.css:6152:  overflow: hidden;
./css/style.css:6162:  overflow: hidden;
./css/style.css:6183:  overflow: hidden;
./css/style.css:6214:  overflow-x: hidden;
./css/style.css:6215:  overflow-y: visible;
./css/style.css:6224:  overflow-y: auto;
./css/style.css:6225:  overflow-x: hidden;
./css/style.css:6233:  overflow-y: auto !important;
./css/style.css:6234:  overflow-x: hidden !important;
./css/style.css:6242:  overflow-y: auto !important;
./css/style.css:6243:  overflow-x: hidden !important;
./css/metric_card.css:12:  overflow: hidden;

### position: absolute
./css/tube.css:68:  position: absolute;
./css/tube.css:85:  position: absolute;
./css/tube.css:108:  position: absolute;
./css/tube.css:206:  position: absolute;
./css/swing_metrics.css:55:  position: absolute;
./css/swing_metrics.css:114:  position: absolute;
./css/swing_metrics.css:222:  position: absolute;
./css/swing_metrics.css:252:  position: absolute;
./css/swing_metrics.css:263:  position: absolute;
./css/swing_metrics.css:273:  position: absolute;
./css/metric_card.css:64:  position: absolute;
./css/style.css:879:  position: absolute;
./css/style.css:1412:  position: absolute;
./css/style.css:1423:  position: absolute;
./css/style.css:1472:  position: absolute;
./css/style.css:1489:  position: absolute;
./css/style.css:1500:  position: absolute;
./css/style.css:1587:  position: absolute !important;
./css/style.css:1736:  position: absolute;
./css/style.css:1814:  position: absolute;
./css/style.css:1830:  position: absolute;
./css/style.css:1841:  position: absolute;
./css/style.css:1880:  position: absolute;
./css/style.css:1898:  position: absolute;
./css/style.css:1915:  position: absolute;
./css/style.css:2067:  position: absolute;
./css/style.css:2134:  position: absolute;
./css/style.css:2147:  position: absolute;
./css/style.css:2241:  position: absolute;
./css/style.css:2259:  position: absolute;
./css/style.css:2283:  position: absolute;
./css/style.css:2346:  position: absolute;
./css/style.css:2396:  position: absolute;
./css/style.css:2409:  position: absolute;
./css/style.css:3427:  position: absolute;
./css/style.css:3634:  position: absolute;
./css/style.css:3675:  position: absolute;
./css/style.css:3680:  position: absolute;
./css/style.css:3751:  position: absolute;
./css/style.css:3760:  position: absolute;
./css/style.css:3900:  position: absolute;
./css/style.css:3914:  position: absolute;
./css/style.css:4420:  position: absolute;
./css/style.css:4456:  position: absolute;
./css/style.css:4500:  position: absolute !important;
./css/style.css:4516:  position: absolute !important;
./css/style.css:4575:#attackAngleRunner { position: absolute !important; z-index: 5 !important; }
./css/style.css:4670:  position: absolute;
./css/style.css:4694:  position: absolute;
./css/style.css:5051:  position: absolute;
./css/style.css:5083:  position: absolute;
./css/style.css:5096:  position: absolute !important;
./css/style.css:5457:  position: absolute !important;
./css/style.css:5900:  position: absolute;

### position: fixed
./css/style.css:169:  position: fixed;
./css/style.css:179:  position: fixed;
./css/style.css:200:  position: fixed;
./css/style.css:798:  position: fixed;
./css/style.css:863:  position: fixed;
./css/style.css:3243:  position: fixed;
./css/style.css:3279:  position: fixed;
./css/style.css:4408:  position: fixed;
./css/style.css:4414:  position: fixed;

### height: 100vh
./css/style.css:194:  min-height: 100vh;
./css/style.css:4120:  min-height: 100vh;
./css/style.css:4229:  min-height: 100vh;
./css/style.css:5806:  min-height: 100vh;
./css/style.css:6011:  min-height: 100vh;
./css/style.css:6063:  min-height: 100vh;
./css/style.css:6240:  min-height: 100vh !important;

### width: 100vw

