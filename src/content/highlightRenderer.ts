import type { Highlight } from "../shared/schema";
import { findAnchorRange } from "./selectionAnchors";

export function injectHostStyles(): void {
  if (document.getElementById("chattree-host-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "chattree-host-styles";
  style.textContent = `
    .chattree-host-highlight {
      outline: 3px solid #0f8f7e !important;
      outline-offset: 8px !important;
      border-radius: 8px !important;
      transition: outline-color 180ms ease;
    }
    .chattree-selection-highlight {
      border-radius: 3px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    .chattree-selection-highlight[data-color='yellow'] { background: rgba(250, 204, 21, 0.45); }
    .chattree-selection-highlight[data-color='green'] { background: rgba(74, 222, 128, 0.35); }
    .chattree-selection-highlight[data-color='blue'] { background: rgba(96, 165, 250, 0.35); }
    .chattree-selection-highlight[data-color='pink'] { background: rgba(244, 114, 182, 0.35); }
  `;
  document.head.append(style);
}

export function reapplyHighlights(highlights: Highlight[], getMessageElement: (messageId: string) => HTMLElement | null): void {
  for (const highlight of highlights) {
    const messageElement = getMessageElement(highlight.messageId);
    if (!messageElement || messageElement.querySelector(`[data-chattree-highlight-id='${CSS.escape(highlight.id)}']`)) {
      continue;
    }

    const range = findAnchorRange(messageElement, highlight.selectionRange);
    if (!range) {
      continue;
    }

    const marker = document.createElement("span");
    marker.className = "chattree-selection-highlight";
    marker.dataset.color = highlight.color;
    marker.dataset.chattreeHighlightId = highlight.id;

    try {
      range.surroundContents(marker);
    } catch {
      // Complex host markup can split a selection across non-text nodes.
      marker.textContent = range.toString();
      range.deleteContents();
      range.insertNode(marker);
    }
  }
}
