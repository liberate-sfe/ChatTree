import { CHAT_TREE_SCHEMA_VERSION, type BranchSuggestion, type ChatTreeNode, type ConversationEnvelope, type ExtractedMessage, type HighlightColor, type ProviderSite, type Tag } from "./schema";

export function createConversationId(provider: ProviderSite, url: string): string {
  const parsed = new URL(url);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const idFromPath = pathParts.at(-1);
  return `${provider}:${idFromPath || "active"}`;
}

export function titleFromContent(content: string): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  return cleaned.length <= 15 ? cleaned : `${cleaned.slice(0, 12)}...`;
}

export function buildEnvelopeFromMessages(
  provider: ProviderSite,
  url: string,
  pageTitle: string,
  messages: ExtractedMessage[],
  previous: ConversationEnvelope | null
): ConversationEnvelope {
  const now = new Date().toISOString();
  const conversationId = createConversationId(provider, url);
  const rootId = `${conversationId}:root`;
  const existingForConversation = previous?.conversation.id === conversationId ? previous : null;
  const messageMap = Object.fromEntries(messages.map((message) => [message.id, { ...message, conversationId }]));
  const userMessages = messages.filter((message) => message.role === "user");
  const rootExisting = existingForConversation?.nodes[rootId];

  const nodes: Record<string, ChatTreeNode> = {
    [rootId]: {
      id: rootId,
      conversationId,
      messageId: userMessages[0]?.id ?? messages[0]?.id ?? null,
      parentId: null,
      role: "user",
      title: rootExisting?.title ?? "Conversation",
      contentPreview:
        rootExisting?.contentPreview ??
        "Conversation map. Split paper walkthrough, English learning, and mechanism why-chains into branches.",
      summaryId: rootExisting?.summaryId ?? null,
      childIds: [],
      assistantReplyIds: messages.filter((message) => message.role === "assistant").map((message) => message.id),
      isBranchPoint: false,
      branchSourceReplyId: null,
      isPinned: rootExisting?.isPinned ?? false,
      collapsed: rootExisting?.collapsed ?? false,
      ordinal: 0,
      createdAt: rootExisting?.createdAt ?? now,
      updatedAt: now
    }
  };

  for (const message of userMessages) {
    const nodeId = nodeIdForMessage(message.id);
    const existing = existingForConversation?.nodes[nodeId];
    const parentId = existing?.parentId && existingForConversation?.nodes[existing.parentId] ? existing.parentId : rootId;

    nodes[nodeId] = {
      id: nodeId,
      conversationId,
      messageId: message.id,
      parentId,
      role: message.role,
      title: existing?.title ?? titleFromContent(message.content),
      contentPreview: message.content.slice(0, 180),
      summaryId: existing?.summaryId ?? null,
      childIds: [],
      assistantReplyIds: collectAssistantReplyIds(messages, message.ordinal),
      isBranchPoint: existing?.isBranchPoint ?? false,
      branchSourceReplyId: existing?.branchSourceReplyId ?? null,
      isPinned: existing?.isPinned ?? false,
      collapsed: existing?.collapsed ?? false,
      ordinal: message.ordinal,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
  }

  for (const node of Object.values(nodes)) {
    if (node.id === rootId) {
      continue;
    }
    const parentId = node.parentId && nodes[node.parentId] ? node.parentId : rootId;
    nodes[parentId].childIds.push(node.id);
  }

  return {
    conversation: {
      id: conversationId,
      provider,
      url,
      title: pageTitle || "ChatTree conversation",
      treeId: `${conversationId}:tree`,
      messageIds: messages.map((message) => message.id),
      importSource: null,
      storageBackend: "indexeddb",
      createdAt: existingForConversation?.conversation.createdAt ?? now,
      updatedAt: now
    },
    tree: {
      id: `${conversationId}:tree`,
      conversationId,
      rootNodeId: rootId,
      nodeIds: Object.keys(nodes),
      overviewSummaryId: existingForConversation?.tree.overviewSummaryId ?? null,
      createdAt: existingForConversation?.tree.createdAt ?? now,
      updatedAt: now,
      schemaVersion: CHAT_TREE_SCHEMA_VERSION
    },
    nodes,
    summaries: existingForConversation?.summaries ?? {},
    messages: messageMap,
    highlights: existingForConversation?.highlights ?? {},
    notes: existingForConversation?.notes ?? {},
    tags: ensureDefaultTags(existingForConversation?.tags ?? {}, conversationId),
    taggedEntities: existingForConversation?.taggedEntities ?? [],
    branchSuggestions: mergeBranchSuggestions(
      existingForConversation?.branchSuggestions ?? [],
      suggestBranchSplits(conversationId, messages)
    )
  };
}

export function nodeIdForMessage(messageId: string): string {
  return `node:${messageId}`;
}

export function ensureDefaultTags(tags: Record<string, Tag>, conversationId: string): Record<string, Tag> {
  if (Object.keys(tags).length > 0) {
    return tags;
  }

  const now = new Date().toISOString();
  const defaults: Array<[string, string, HighlightColor]> = [
    ["vocabulary", "vocabulary", "yellow"],
    ["grammar", "grammar", "green"],
    ["mechanism", "mechanism", "blue"]
  ];

  return Object.fromEntries(
    defaults.map(([id, label, color]) => [
      id,
      {
        id,
        conversationId,
        label,
        color,
        createdAt: now,
        updatedAt: now
      }
    ])
  );
}

export function suggestBranchSplits(conversationId: string, messages: ExtractedMessage[]): BranchSuggestion[] {
  const userMessages = messages.filter((message) => message.role === "user");
  const suggestions: BranchSuggestion[] = [];

  for (let index = 1; index < userMessages.length; index += 1) {
    const previous = userMessages[index - 1];
    const current = userMessages[index];
    const previousTheme = inferTheme(previous.content);
    const currentTheme = inferTheme(current.content);

    if (previousTheme !== "general" && currentTheme !== "general" && previousTheme !== currentTheme) {
      suggestions.push({
        id: `${conversationId}:suggestion:${current.id}`,
        conversationId,
        sourceMessageId: previous.id,
        targetMessageId: current.id,
        reason: `Potential branch split: ${previousTheme} -> ${currentTheme}. LLM confirmation can refine this later.`,
        accepted: null,
        createdAt: new Date().toISOString()
      });
    }
  }

  return suggestions;
}

export function applyBranchSuggestion(envelope: ConversationEnvelope, suggestionId: string): ConversationEnvelope {
  const suggestion = envelope.branchSuggestions.find((item) => item.id === suggestionId);
  if (!suggestion) {
    return envelope;
  }

  const targetNodeId = nodeIdForMessage(suggestion.targetMessageId);
  const sourceNodeId = nodeIdForMessage(suggestion.sourceMessageId);
  const target = envelope.nodes[targetNodeId];
  const source = envelope.nodes[sourceNodeId];
  const rootId = envelope.tree.rootNodeId;

  if (!target || !source) {
    return envelope;
  }

  const targetTheme = inferTheme(envelope.messages[suggestion.targetMessageId]?.content ?? "");
  const nextParentId = targetTheme === "mechanism" ? sourceNodeId : rootId;
  const nodes = Object.fromEntries(
    Object.entries(envelope.nodes).map(([id, node]) => [
      id,
      {
        ...node,
        childIds: node.childIds.filter((childId) => childId !== targetNodeId)
      }
    ])
  ) as Record<string, ChatTreeNode>;

  nodes[targetNodeId] = {
    ...nodes[targetNodeId],
    parentId: nextParentId,
    isBranchPoint: true,
    branchSourceReplyId: suggestion.sourceMessageId,
    updatedAt: new Date().toISOString()
  };

  nodes[nextParentId] = {
    ...nodes[nextParentId],
    childIds: [...nodes[nextParentId].childIds, targetNodeId],
    updatedAt: new Date().toISOString()
  };

  return {
    ...envelope,
    nodes,
    branchSuggestions: envelope.branchSuggestions.map((item) =>
      item.id === suggestionId ? { ...item, accepted: true } : item
    )
  };
}

export function rejectBranchSuggestion(envelope: ConversationEnvelope, suggestionId: string): ConversationEnvelope {
  return {
    ...envelope,
    branchSuggestions: envelope.branchSuggestions.map((item) =>
      item.id === suggestionId ? { ...item, accepted: false } : item
    )
  };
}

function collectAssistantReplyIds(messages: ExtractedMessage[], userOrdinal: number): string[] {
  const replies: string[] = [];
  for (const message of messages.filter((item) => item.ordinal > userOrdinal)) {
    if (message.role === "user") {
      break;
    }
    if (message.role === "assistant") {
      replies.push(message.id);
    }
  }
  return replies;
}

function mergeBranchSuggestions(existing: BranchSuggestion[], next: BranchSuggestion[]): BranchSuggestion[] {
  const byId = new Map(existing.map((suggestion) => [suggestion.id, suggestion]));
  for (const suggestion of next) {
    if (!byId.has(suggestion.id)) {
      byId.set(suggestion.id, suggestion);
    }
  }
  return [...byId.values()];
}

function inferTheme(content: string): "paper" | "vocabulary" | "grammar" | "mechanism" | "general" {
  const normalized = content.toLowerCase();
  if (/\b(why|mechanism|pathway|cause|estrogen|vitellogenin|hormone|biological)\b/.test(normalized)) {
    return "mechanism";
  }
  if (/\b(mean|means|meaning|word|phrase|vocabulary|english|pronounce|translation)\b/.test(normalized)) {
    return "vocabulary";
  }
  if (/\b(grammar|fewer|less|tense|sentence|write|writing)\b/.test(normalized)) {
    return "grammar";
  }
  if (/\b(paper|abstract|introduction|method|methods|result|results|discussion|figure|table|section)\b/.test(normalized)) {
    return "paper";
  }
  return "general";
}
