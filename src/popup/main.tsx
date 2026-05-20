import React from "react";
import { createRoot } from "react-dom/client";
import { ExternalLink, Settings } from "lucide-react";
import "../styles/tailwind.css";

function PopupApp() {
  return (
    <main className="w-72 bg-chattree-panel p-4 text-sm text-chattree-ink">
      <h1 className="text-base font-semibold">ChatTree</h1>
      <p className="mt-2 leading-5 text-chattree-muted">
        Open ChatGPT, Claude.ai, or Gemini to use the conversation tree sidebar.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md bg-chattree-accent px-3 py-2 text-xs font-semibold text-white"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          <Settings size={14} />
          Options
        </button>
        <a
          className="inline-flex items-center gap-1 rounded-md border border-chattree-line bg-white px-3 py-2 text-xs font-semibold"
          href="https://github.com/liberate-sfe/ChatTree"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={14} />
          GitHub
        </a>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
