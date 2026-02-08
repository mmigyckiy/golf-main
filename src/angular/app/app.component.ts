import { ChangeDetectionStrategy, Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { GameBridgeService } from "./game-bridge.service";
import { SwingMetricsRowComponent } from "./swing-metrics-row.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, SwingMetricsRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="state$ | async as state; else waiting">
      <app-swing-metrics-row [state]="state"></app-swing-metrics-row>
    </ng-container>
    <ng-template #waiting>
      <div style="padding: 10px 12px; font-size: 12px; opacity: 0.75;">
        UI mounted — waiting for game state…
      </div>
    </ng-template>
  `,
})
export class AppComponent {
  readonly state$ = this.bridge.state$;

  constructor(private readonly bridge: GameBridgeService) {
    console.log("[ANGULAR] AppComponent mounted");
  }
}
