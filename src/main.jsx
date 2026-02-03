import React from "react";
import ReactDOM from "react-dom/client";
import { SwingPanel } from "./ui/SwingPanel.jsx";
import { useUIStore } from "./ui/store.js";
import "./ui/bridge.js";

function App() {
  const snapshot = useUIStore();
  return <SwingPanel snapshot={snapshot} />;
}

const rootEl = document.getElementById("uiRoot");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}
