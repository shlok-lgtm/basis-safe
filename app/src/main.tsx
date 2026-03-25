import React from "react";
import ReactDOM from "react-dom/client";
import SafeProvider from "@safe-global/safe-apps-react-sdk";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SafeProvider>
      <App />
    </SafeProvider>
  </React.StrictMode>
);
