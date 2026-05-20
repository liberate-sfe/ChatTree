import type { BranchSuggestion, ExtractedMessage, ImportSource, ProviderSite } from "./schema";

export interface ImportedConversation {
  id: string;
  title: string;
  provider: ProviderSite;
  source: ImportSource;
  messages: ExtractedMessage[];
}

export function detectImportSource(payload: unknown): ImportSource | null {
  if (Array.isArray(payload) && payload.some((item) => item && typeof item === "object" && "mapping" in item)) {
    return "chatgpt_conversations_json";
  }

  if (
    Array.isArray(payload) &&
    payload.some((item) => item && typeof item === "object" && ("chat_messages" in item || "messages" in item))
  ) {
    return "claude_export_json";
  }

  return null;
}

export function parseImportedConversations(payload: unknown): ImportedConversation[] {
  const source = detectImportSource(payload);
  if (!source || !Array.isArray(payload)) {
    return [];
  }

  if (source === "chatgpt_conversations_json") {
    return payload.map((rawConversation, index) => {
      const conversation = rawConversation as any;
      const messages = Object.values(conversation.mapping ?? {})
        .map((entry: any, ordinal) => {
          const message = entry?.message;
          const parts = message?.content?.parts ?? [];
          const content = parts.filter((part: unknown) => typeof part === "string").join("\n").trim();
          return {
            id: message?.id ?? `chatgpt-import-${index}-${ordinal}`,
            conversationId: conversation.id ?? `chatgpt-import-${index}`,
            provider: "chatgpt" as const,
            role: normalizeImportedRole(message?.author?.role),
            content,
            timestamp: message?.create_time ? new Date(message.create_time * 1000).toISOString() : null,
            ordinal,
            hash: String(message?.id ?? ordinal),
            domSelector: null
          };
        })
        .filter((message) => message.content.length > 0);

      return {
        id: conversation.id ?? `chatgpt-import-${index}`,
        title: conversation.title ?? "Imported ChatGPT conversation",
        provider: "chatgpt" as const,
        source,
        messages
      };
    });
  }

  return payload.map((rawConversation, index) => {
    const conversation = rawConversation as any;
    const rawMessages = conversation.chat_messages ?? conversation.messages ?? [];
    const messages = rawMessages
      .map((message: any, ordinal: number) => ({
        id: message.uuid ?? message.id ?? `claude-import-${index}-${ordinal}`,
        conversationId: conversation.uuid ?? conversation.id ?? `claude-import-${index}`,
        provider: "claude" as const,
        role: normalizeImportedRole(message.sender ?? message.role),
        content: String(message.text ?? message.content?.[0]?.text ?? message.content ?? "").trim(),
        timestamp: message.created_at ?? message.createdAt ?? null,
        ordinal,
        hash: String(message.uuid ?? message.id ?? ordinal),
        domSelector: null
      }))
      .filter((message: ExtractedMessage) => message.content.length > 0);

    return {
      id: conversation.uuid ?? conversation.id ?? `claude-import-${index}`,
      title: conversation.name ?? conversation.title ?? "Imported Claude conversation",
      provider: "claude" as const,
      source,
      messages
    };
  });
}

export function suggestBranchSplits(conversationId: string, messages: ExtractedMessage[]): BranchSuggestion[] {
  const suggestions: BranchSuggestion[] = [];

  for (let index = 2; index < messages.length; index += 1) {
    const previous = messages[index - 2];
    const current = messages[index];
    if (previous.role !== "user" || current.role !== "user") {
      continue;
    }

    const score = topicShiftScore(previous.content, current.content);
    if (score > 0.72) {
      suggestions.push({
        id: `${conversationId}:suggestion:${current.id}`,
        conversationId,
        sourceMessageId: previous.id,
        targetMessageId: current.id,
        reason: "Heuristic topic shift detected; send to the LLM for confirmation before applying.",
        accepted: null,
        createdAt: new Date().toISOString()
      });
    }
  }

  return suggestions;
}

function normalizeImportedRole(role: unknown): ExtractedMessage["role"] {
  if (role === "user" || role === "human") {
    return "user";
  }
  if (role === "assistant" || role === "bot") {
    return "assistant";
  }
  if (role === "system") {
    return "system";
  }
  return "unknown";
}

function topicShiftScore(left: string, right: string): number {
  const leftWords = new Set(tokenize(left));
  const rightWords = new Set(tokenize(right));
  if (leftWords.size === 0 || rightWords.size === 0) {
    return 0;
  }

  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;
  return 1 - overlap / union;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}
