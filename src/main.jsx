import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
// Bundled Thai font for professional offline/privacy-preserving UI (no Google Fonts)
import "@fontsource/noto-sans-thai-looped";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
