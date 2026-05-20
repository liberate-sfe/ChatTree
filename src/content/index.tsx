import React from "react";
import { createRoot } from "react-dom/client";
import { SidebarApp } from "../sidebar/SidebarApp";
import inlineStyles from "../styles/tailwind.css?inline";
import { detectProvider, findMessageElement, observeConversation, scrollToHostMessage } from "./domParser";
import { injectHostStyles, reapplyHighlights } from "./highlightRenderer";
import { useChatTreeStore } from "../sidebar/store";

const provider = detectProvider();

if (provider) {
  injectHostStyles();

  const host = document.createElement("div");
  host.id = "chattree-root";
  document.documentElement.append(host);

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = inlineStyles;
  shadow.append(style);

  const mount = document.createElement("div");
  shadow.append(mount);

  let observer: MutationObserver | null = null;
  void useChatTreeStore.getState().hydrateConversation(provider, window.location.href).finally(() => {
    reapplyHighlights(Object.values(useChatTreeStore.getState().envelope.highlights), findMessageElement);
    observer = observeConversation(provider, (messages) => {
      useChatTreeStore.getState().ingestMessages(provider, window.location.href, messages);
      reapplyHighlights(Object.values(useChatTreeStore.getState().envelope.highlights), findMessageElement);
    });
  });

  window.addEventListener("beforeunload", () => observer?.disconnect());

  createRoot(mount).render(
    <React.StrictMode>
      <SidebarApp
        provider={provider}
        onJumpToMessage={scrollToHostMessage}
        getMessageElement={findMessageElement}
      />
    </React.StrictMode>
  );
}
