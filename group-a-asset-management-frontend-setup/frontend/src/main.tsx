//NEW APP
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./config/authConfig";

(window as any).__ASSETFLOW_BOOTSTRAPPED__ = true;

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: unknown }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontFamily: "system-ui" }}>
          <h2>App crashed</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error)}
          </pre>
          <p>Open DevTools Console for full stack trace.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = createRoot(document.getElementById("root")!);

const tree: React.ReactNode = msalInstance ? (
  <MsalProvider instance={msalInstance}>
    <App />
  </MsalProvider>
) : (
  <App />
);

root.render(<ErrorBoundary>{tree}</ErrorBoundary>);

(window as any).__ASSETFLOW_MOUNTED__ = true;
//-----------------

//OLD APP
// import { createRoot } from "react-dom/client";
// import App from "./App.tsx";
// import "./index.css";
// import { MsalProvider } from '@azure/msal-react';
// import { msalInstance } from './config/authConfig';

// createRoot(document.getElementById("root")!).render(
//   <MsalProvider instance={msalInstance}>
//     <App />
//   </MsalProvider>
// );

//INITIAL

  // import { createRoot } from "react-dom/client";
  // import App from "./App.tsx";
  // import "./index.css";

  // createRoot(document.getElementById("root")!).render(<App />);

