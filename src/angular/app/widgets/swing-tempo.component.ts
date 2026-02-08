import { ChangeDetectionStrategy, Component, Input } from "@angular/core";

@Component({
  selector: "app-swing-tempo",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="swing-metric__title">SWING TEMPO</div>
    <div class="swing-metric__body">
      <div class="tempo-meter" id="swingTempoControl" role="button" aria-label="Swing tempo" tabindex="0">
        <div class="tempo-meter__scale" aria-hidden="true">
          <span class="tempo-meter__label" data-value="100">100</span>
          <span class="tempo-meter__tick tempo-meter__tick--major"></span>
          <span class="tempo-meter__tick"></span>
          <span class="tempo-meter__tick"></span>
          <span class="tempo-meter__tick"></span>
          <span class="tempo-meter__tick"></span>
          <span class="tempo-meter__label" data-value="50">50</span>
          <span class="tempo-meter__tick tempo-meter__tick--major"></span>
          <span class="tempo-meter__tick"></span>
          <span class="tempo-meter__tick"></span>
          <span class="tempo-meter__tick"></span>
          <span class="tempo-meter__tick"></span>
          <span class="tempo-meter__label" data-value="0">0</span>
        </div>
        <div class="tempo-meter__tube" id="swingTempoTube">
          <div
            class="tempo-meter__fill"
            id="swingTempoFill"
            aria-hidden="true"
            [style.height.%]="tempoPct"
          ></div>
          <div
            class="tempo-meter__runner"
            id="swingTempoRunner"
            aria-hidden="true"
            [style.bottom]="runnerBottom"
          ></div>
        </div>
      </div>
    </div>
    <div class="swing-metric__footer">
      <div class="swing-metric__value" id="tempoValueLabel">
        <span id="swingTempoPct">{{ tempoPct | number : "1.0-0" }}%</span>
      </div>
      <div class="swing-metric__hint">HOLD • RELEASE</div>
    </div>
  `,
})
export class SwingTempoComponent {
  @Input({ required: true }) state: any;

  get tempo01(): number {
    const direct = this.state?.shot?.tempo01;
    if (Number.isFinite(direct)) return direct;
    const fallback = this.state?.tempo?.headPos;
    return Number.isFinite(fallback) ? fallback : 0;
  }

  get tempoPct(): number {
    const v = Math.min(1, Math.max(0, Number(this.tempo01) || 0));
    return v * 100;
  }

  get runnerBottom(): string {
    return `calc(${this.tempoPct}% - 4px)`;
  }
}
