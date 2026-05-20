import type { ExtractedMessage, MessageRole, ProviderSite } from "../shared/schema";

interface SiteSelectorConfig {
  provider: ProviderSite;
  messageSelectors: string[];
  userHints: string[];
  assistantHints: string[];
}

const SITE_CONFIGS: Record<ProviderSite, SiteSelectorConfig> = {
  chatgpt: {
    provider: "chatgpt",
    messageSelectors: [
      "[data-message-id]",
      "[data-testid^='conversation-turn']",
      "article[data-testid*='conversation']",
      "main article"
    ],
    userHints: ["[data-message-author-role='user']", "[data-testid*='user']", ".whitespace-pre-wrap"],
    assistantHints: ["[data-message-author-role='assistant']", "[data-testid*='assistant']", ".markdown"]
  },
  claude: {
    provider: "claude",
    messageSelectors: [
      "[data-testid='user-message']",
      "[data-testid='assistant-message']",
      "[data-is-streaming]",
      "main [class*='message']"
    ],
    userHints: ["[data-testid='user-message']", "[aria-label*='Human']", "[class*='user']"],
    assistantHints: ["[data-testid='assistant-message']", "[aria-label*='Claude']", "[class*='assistant']"]
  },
  gemini: {
    provider: "gemini",
    messageSelectors: [
      "user-query",
      "model-response",
      "[data-test-id*='user']",
      "[data-test-id*='response']",
      "main [class*='query']",
      "main [class*='response']"
    ],
    userHints: ["user-query", "[data-test-id*='user']", "[class*='user']"],
    assistantHints: ["model-response", "[data-test-id*='response']", "[class*='model']"]
  }
};

export function detectProvider(hostname = window.location.hostname): ProviderSite | null {
  if (hostname === "chatgpt.com" || hostname === "chat.openai.com") {
    return "chatgpt";
  }
  if (hostname === "claude.ai") {
    return "claude";
  }
  if (hostname === "gemini.google.com") {
    return "gemini";
  }
  return null;
}

export function extractMessages(provider: ProviderSite): ExtractedMessage[] {
  const config = SITE_CONFIGS[provider];
  const elements = uniqueElements(config.messageSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]));

  return elements
    .map((element, ordinal) => normalizeMessageElement(config, element as HTMLElement, ordinal))
    .filter((message): message is ExtractedMessage => Boolean(message && message.content.length > 0));
}

export function observeConversation(provider: ProviderSite, onChange: (messages: ExtractedMessage[]) => void): MutationObserver {
  let timeoutId = 0;
  const emit = () => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => onChange(extractMessages(provider)), 250);
  };

  const observer = new MutationObserver(emit);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  emit();
  return observer;
}

export function scrollToHostMessage(messageId: string): void {
  const element = document.querySelector<HTMLElement>(`[data-chattree-message-id='${CSS.escape(messageId)}']`);
  if (!element) {
    return;
  }

  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.classList.add("chattree-host-highlight");
  window.setTimeout(() => element.classList.remove("chattree-host-highlight"), 1800);
}

export function findMessageElement(messageId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-chattree-message-id='${CSS.escape(messageId)}']`);
}

function normalizeMessageElement(
  config: SiteSelectorConfig,
  element: HTMLElement,
  ordinal: number
): ExtractedMessage | null {
  const content = (element.innerText || element.textContent || "").trim();
  if (!content) {
    return null;
  }

  const explicitId = element.dataset.messageId || element.getAttribute("data-message-id");
  const id = explicitId || `${config.provider}:${ordinal}:${stableHash(content)}`;
  element.dataset.chattreeMessageId = id;

  return {
    id,
    conversationId: null,
    provider: config.provider,
    role: inferRole(config, element, ordinal),
    content,
    timestamp: inferTimestamp(element),
    ordinal,
    hash: stableHash(content),
    domSelector: `[data-chattree-message-id='${id}']`
  };
}

function inferRole(config: SiteSelectorConfig, element: HTMLElement, ordinal: number): MessageRole {
  const role = element.dataset.messageAuthorRole || element.getAttribute("data-message-author-role");
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }

  if (matchesAny(element, config.userHints)) {
    return "user";
  }
  if (matchesAny(element, config.assistantHints)) {
    return "assistant";
  }

  // Last fallback: most hosted chats alternate user then assistant.
  return ordinal % 2 === 0 ? "user" : "assistant";
}

function inferTimestamp(element: HTMLElement): string | null {
  const timeElement = element.querySelector("time");
  const datetime = timeElement?.getAttribute("datetime");
  if (datetime) {
    return datetime;
  }

  const timestamp = element.getAttribute("data-created-at") || element.dataset.timestamp;
  return timestamp ?? null;
}

function matchesAny(element: HTMLElement, selectors: string[]): boolean {
  return selectors.some((selector) => {
    try {
      return element.matches(selector) || Boolean(element.querySelector(selector));
    } catch {
      return false;
    }
  });
}

function uniqueElements(elements: Element[]): Element[] {
  const seen = new Set<Element>();
  return elements.filter((element) => {
    if (seen.has(element) || element.closest("#chattree-root")) {
      return false;
    }
    seen.add(element);
    return true;
  });
}

function stableHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
