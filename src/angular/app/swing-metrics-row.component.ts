import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { SwingTempoComponent } from "./widgets/swing-tempo.component";
import { SwingPathComponent } from "./widgets/swing-path.component";
import { AttackAngleComponent } from "./widgets/attack-angle.component";

@Component({
  selector: "app-swing-metrics-row",
  standalone: true,
  imports: [SwingTempoComponent, SwingPathComponent, AttackAngleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="swing-metrics-row" id="swingMetricsRow">
      <app-attack-angle
        class="swing-metric swing-metric--attack"
        [state]="state"
      ></app-attack-angle>
      <app-swing-path
        class="swing-metric swing-metric--path"
        [state]="state"
      ></app-swing-path>
      <app-swing-tempo
        class="swing-metric swing-metric--tempo"
        [state]="state"
      ></app-swing-tempo>
    </div>
  `,
})
export class SwingMetricsRowComponent {
  @Input({ required: true }) state: any;
}
