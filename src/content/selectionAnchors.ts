import rangy from "rangy";
import type { TextAnchor } from "../shared/schema";

try {
  rangy.init();
} catch {
  // Rangy can throw if a host page initializes selection APIs oddly.
}

export function createTextAnchor(container: HTMLElement, range: Range): TextAnchor {
  const containerText = getVisibleText(container);
  const exact = range.toString();
  const fallbackStart = containerText.indexOf(exact);
  const startOffset = getTextOffset(container, range.startContainer, range.startOffset, fallbackStart);
  const endOffset = Math.max(startOffset + exact.length, getTextOffset(container, range.endContainer, range.endOffset, startOffset + exact.length));

  return {
    exact,
    prefix: containerText.slice(Math.max(0, startOffset - 48), startOffset),
    suffix: containerText.slice(endOffset, endOffset + 48),
    startOffset,
    endOffset
  };
}

export function findAnchorRange(container: HTMLElement, anchor: TextAnchor): Range | null {
  const text = getVisibleText(container);
  const start = findBestAnchorStart(text, anchor);

  if (start === -1) {
    return null;
  }

  return rangeFromOffsets(container, start, start + anchor.exact.length);
}

export function getCurrentSelectionRange(): Range | null {
  const selection = rangy.getSelection?.() ?? window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.toString().trim().length === 0) {
    return null;
  }
  return selection.getRangeAt(0);
}

function getVisibleText(container: HTMLElement): string {
  // textContent matches the text-node walker used to rebuild DOM ranges.
  return container.textContent || "";
}

function findBestAnchorStart(text: string, anchor: TextAnchor): number {
  const candidates: number[] = [];
  let cursor = text.indexOf(anchor.exact);
  while (cursor !== -1) {
    candidates.push(cursor);
    cursor = text.indexOf(anchor.exact, cursor + anchor.exact.length);
  }

  if (candidates.length === 0) {
    const contextualNeedle = `${anchor.prefix}${anchor.exact}${anchor.suffix}`;
    const contextualStart = text.indexOf(contextualNeedle);
    return contextualStart === -1 ? -1 : contextualStart + anchor.prefix.length;
  }

  return candidates
    .map((start) => ({
      start,
      score:
        Math.abs(start - anchor.startOffset) +
        (text.slice(Math.max(0, start - anchor.prefix.length), start) === anchor.prefix ? -50 : 0) +
        (text.slice(start + anchor.exact.length, start + anchor.exact.length + anchor.suffix.length) === anchor.suffix ? -50 : 0)
    }))
    .sort((left, right) => left.score - right.score)[0].start;
}

function getTextOffset(container: HTMLElement, node: Node, offset: number, fallback: number): number {
  let total = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    if (current === node) {
      return total + offset;
    }
    total += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }

  return Math.max(0, fallback);
}

function rangeFromOffsets(container: HTMLElement, startOffset: number, endOffset: number): Range | null {
  const range = document.createRange();
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let total = 0;
  let startSet = false;
  let current = walker.nextNode();

  while (current) {
    const textLength = current.textContent?.length ?? 0;
    const nextTotal = total + textLength;

    if (!startSet && startOffset >= total && startOffset <= nextTotal) {
      range.setStart(current, Math.max(0, startOffset - total));
      startSet = true;
    }

    if (startSet && endOffset >= total && endOffset <= nextTotal) {
      range.setEnd(current, Math.max(0, endOffset - total));
      return range;
    }

    total = nextTotal;
    current = walker.nextNode();
  }

  if (startSet) {
    range.setEnd(container, container.childNodes.length);
    return range;
  }

  return null;
}
