import { Injectable, NgZone } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

type Bridge = {
  getState?: () => any;
  subscribe?: (cb: () => void) => () => void;
};

@Injectable({ providedIn: "root" })
export class GameBridgeService {
  private readonly stateSubject = new BehaviorSubject<any | null>(null);
  readonly state$: Observable<any | null> = this.stateSubject.asObservable();

  constructor(private readonly zone: NgZone) {
    const bridge = (window as unknown as { __DRIVIX_UI__?: Bridge }).__DRIVIX_UI__;
    console.log("[UI] bridge present?", !!bridge);
    console.log("[UI] first state", bridge?.getState?.());
    if (!bridge?.getState || !bridge?.subscribe) {
      console.warn("[Drivix UI] window.__DRIVIX_UI__ bridge missing.");
      return;
    }

    const emit = () => {
      const next = bridge.getState ? bridge.getState() : null;
      this.zone.run(() => this.stateSubject.next(next));
    };

    emit();
    bridge.subscribe(() => emit());
  }
}
