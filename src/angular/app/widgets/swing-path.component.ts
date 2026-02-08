import { ChangeDetectionStrategy, Component, Input } from "@angular/core";

@Component({
  selector: "app-swing-path",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="swing-metric__title">SWING PATH</div>
    <div class="swing-metric__body">
      <div id="pathPixi" class="pixi-widget-canvas" aria-hidden="true"></div>
      <div class="alignment-ring" id="alignmentRing" aria-label="Alignment ring">
        <svg class="alignment-ring__svg" id="alignmentSvg" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="alignmentRingGradient" x1="0" y1="10" x2="0" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,0.10)"></stop>
              <stop offset="100%" stopColor="rgba(0,0,0,0.30)"></stop>
            </linearGradient>
          </defs>
          <path class="alignment-ring__base" id="alignmentBase" d=""></path>
          <path class="alignment-ring__sweet" id="alignmentSweet" d=""></path>
          <circle class="alignment-ring__ball" id="alignmentBall" cx="60" cy="102" r="3"></circle>
          <circle class="alignment-ring__runner" id="alignmentRunner" cx="60" cy="12" r="4.2"></circle>
        </svg>
        <div class="align-target-tick" aria-hidden="true"></div>
      </div>
    </div>
    <div class="swing-metric__footer">
      <div class="swing-metric__value swing-metric__value--muted"> </div>
      <div class="swing-metric__hint"> </div>
    </div>
  `,
})
export class SwingPathComponent {
  @Input({ required: true }) state: any;
}
