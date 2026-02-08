import { ChangeDetectionStrategy, Component, Input } from "@angular/core";

@Component({
  selector: "app-attack-angle",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="swing-metric__title">ATTACK ANGLE</div>
    <div class="swing-metric__body">
      <div class="attack-angle" id="attackAngle" aria-label="Attack angle">
        <div class="attack-angle__plane" id="attackAnglePlane">
          <svg class="attack-angle__svg" viewBox="0 0 120 120" aria-hidden="true">
            <circle class="aa-ring" cx="60" cy="60" r="44"></circle>
            <line class="aa-cross aa-cross--h" x1="16" y1="60" x2="104" y2="60"></line>
            <line class="aa-cross aa-cross--v" x1="60" y1="16" x2="60" y2="104"></line>
            <path class="aa-arrow" d="M60 10 L56 18 H64 Z"></path>
            <g class="aa-glint" transform="translate(96 92)">
              <path d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z"></path>
            </g>
            <path
              class="aa-driver"
              d="M78 26
                 C92 36, 96 52, 92 68
                 C88 82, 78 92, 66 94
                 C72 86, 78 76, 82 66
                 C86 52, 86 40, 80 30
                 C79 28, 79 27, 78 26 Z"
            ></path>
            <circle class="aa-center" cx="60" cy="60" r="4"></circle>
          </svg>
          <div id="attackAngleRunner" class="aa-ball" aria-hidden="true"></div>
        </div>
      </div>
    </div>
    <div class="swing-metric__footer">
      <div class="swing-metric__value" id="attackAngleValueLabel">
        <span id="attackAngleReadout">{{ attackDeg }}°</span>
      </div>
      <div class="swing-metric__hint"></div>
    </div>
  `,
})
export class AttackAngleComponent {
  @Input({ required: true }) state: any;

  get attackDeg(): string {
    const direct = this.state?.shot?.attackDeg;
    const fallback = this.state?.attack?.deg;
    const value = Number.isFinite(direct) ? direct : Number.isFinite(fallback) ? fallback : 0;
    return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  }
}
