import "zone.js";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";

const params = new URLSearchParams(location.search);
if (params.get("uidebug") === "1") document.body.classList.add("uidebug");

console.log("[ANGULAR] main.ts loaded");
console.log("[ANGULAR] mount targets", {
  appRoot: document.querySelector("app-root"),
  uiRoot: document.getElementById("uiRoot"),
});

bootstrapApplication(AppComponent).catch((err) => {
  console.error("[ANGULAR] bootstrap failed", err);
});
