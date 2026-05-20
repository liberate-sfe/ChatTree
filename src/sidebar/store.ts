import { create } from "zustand";
import { CHAT_TREE_SCHEMA_VERSION, type ConversationEnvelope, type ExtractedMessage, type Highlight, type HighlightColor, type Note, type ProviderSite, type Tag } from "../shared/schema";
import { saveConversationEnvelope } from "../shared/storage";
import { mockEnvelope } from "./mockData";

interface ChatTreeState {
  envelope: ConversationEnvelope;
  sidebarOpen: boolean;
  activeTab: "tree" | "notes" | "settings";
  selectedNodeId: string | null;
  selectedTagId: string | null;
  ingestMessages: (provider: ProviderSite, url: string, messages: ExtractedMessage[]) => void;
  toggleSidebar: () => void;
  setActiveTab: (tab: ChatTreeState["activeTab"]) => void;
  selectNode: (nodeId: string) => void;
  togglePin: (nodeId: string) => void;
  addHighlight: (highlight: Omit<Highlight, "id" | "createdAt" | "updatedAt">) => void;
  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
  addTag: (label: string) => void;
  setSelectedTag: (tagId: string | null) => void;
  persist: () => Promise<void>;
}

export const useChatTreeStore = create<ChatTreeState>((set, get) => ({
  envelope: mockEnvelope,
  sidebarOpen: true,
  activeTab: "tree",
  selectedNodeId: "root",
  selectedTagId: null,

  ingestMessages(provider, url, messages) {
    if (messages.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    const conversationId = createConversationId(provider, url);
    const rootId = `${conversationId}:root`;
    const userMessages = messages.filter((message) => message.role === "user");

    set((state) => {
      const nodes = {
        [rootId]: {
          id: rootId,
          conversationId,
          messageId: userMessages[0]?.id ?? messages[0].id,
          parentId: null,
          role: "user" as const,
          title: "Conversation",
          contentPreview: "Auto-detected conversation root. Use branch suggestions to split paper, language, and mechanism threads.",
          summaryId: null,
          childIds: userMessages.map((message) => `node:${message.id}`),
          assistantReplyIds: messages.filter((message) => message.role === "assistant").map((message) => message.id),
          isBranchPoint: false,
          branchSourceReplyId: null,
          isPinned: false,
          collapsed: false,
          ordinal: 0,
          createdAt: now,
          updatedAt: now
        },
        ...Object.fromEntries(
          userMessages.map((message, index) => [
            `node:${message.id}`,
            {
              id: `node:${message.id}`,
              conversationId,
              messageId: message.id,
              parentId: rootId,
              role: message.role,
              title: titleFromContent(message.content),
              contentPreview: message.content.slice(0, 140),
              summaryId: null,
              childIds: [],
              assistantReplyIds: messages[index + 1]?.role === "assistant" ? [messages[index + 1].id] : [],
              isBranchPoint: false,
              branchSourceReplyId: null,
              isPinned: state.envelope.nodes[`node:${message.id}`]?.isPinned ?? false,
              collapsed: false,
              ordinal: message.ordinal,
              createdAt: now,
              updatedAt: now
            }
          ])
        )
      };

      return {
        envelope: {
          ...state.envelope,
          conversation: {
            id: conversationId,
            provider,
            url,
            title: document.title || "ChatTree conversation",
            treeId: `${conversationId}:tree`,
            messageIds: messages.map((message) => message.id),
            importSource: null,
            storageBackend: "indexeddb",
            createdAt: state.envelope.conversation.id === conversationId ? state.envelope.conversation.createdAt : now,
            updatedAt: now
          },
          tree: {
            id: `${conversationId}:tree`,
            conversationId,
            rootNodeId: rootId,
            nodeIds: Object.keys(nodes),
            overviewSummaryId: state.envelope.tree.overviewSummaryId,
            createdAt: now,
            updatedAt: now,
            schemaVersion: CHAT_TREE_SCHEMA_VERSION
          },
          nodes,
          messages: Object.fromEntries(messages.map((message) => [message.id, { ...message, conversationId }])),
          highlights: filterByConversation(state.envelope.highlights, conversationId),
          notes: filterByConversation(state.envelope.notes, conversationId),
          tags: ensureDefaultTags(filterByConversation(state.envelope.tags, conversationId), conversationId),
          taggedEntities: state.envelope.taggedEntities.filter((entry) => entry.conversationId === conversationId)
        }
      };
    });
  },

  toggleSidebar() {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setActiveTab(activeTab) {
    set({ activeTab });
  },

  selectNode(selectedNodeId) {
    set({ selectedNodeId });
  },

  togglePin(nodeId) {
    set((state) => ({
      envelope: {
        ...state.envelope,
        nodes: {
          ...state.envelope.nodes,
          [nodeId]: {
            ...state.envelope.nodes[nodeId],
            isPinned: !state.envelope.nodes[nodeId].isPinned,
            updatedAt: new Date().toISOString()
          }
        }
      }
    }));
  },

  addHighlight(highlightInput) {
    const id = `highlight:${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    set((state) => ({
      envelope: {
        ...state.envelope,
        highlights: {
          ...state.envelope.highlights,
          [id]: { ...highlightInput, id, createdAt: now, updatedAt: now }
        }
      },
      activeTab: "notes"
    }));
  },

  addNote(noteInput) {
    const id = `note:${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    set((state) => ({
      envelope: {
        ...state.envelope,
        notes: {
          ...state.envelope.notes,
          [id]: { ...noteInput, id, createdAt: now, updatedAt: now }
        }
      },
      activeTab: "notes"
    }));
  },

  addTag(label) {
    const normalized = label.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    const id = `tag:${normalized.replace(/[^a-z0-9-]+/g, "-")}`;
    const now = new Date().toISOString();
    set((state) => ({
      envelope: {
        ...state.envelope,
        tags: {
          ...state.envelope.tags,
          [id]: {
            id,
            conversationId: state.envelope.conversation.id,
            label: normalized,
            color: "pink",
            createdAt: now,
            updatedAt: now
          }
        }
      },
      selectedTagId: id
    }));
  },

  setSelectedTag(selectedTagId) {
    set({ selectedTagId });
  },

  async persist() {
    await saveConversationEnvelope(get().envelope);
  }
}));

function createConversationId(provider: ProviderSite, url: string): string {
  const idFromUrl = new URL(url).pathname.split("/").filter(Boolean).at(-1);
  return `${provider}:${idFromUrl || "active"}`;
}

function titleFromContent(content: string): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  return cleaned.length <= 15 ? cleaned : `${cleaned.slice(0, 14)}…`;
}

function filterByConversation<T extends { conversationId: string }>(items: Record<string, T>, conversationId: string): Record<string, T> {
  return Object.fromEntries(Object.entries(items).filter(([, item]) => item.conversationId === conversationId));
}

function ensureDefaultTags(tags: Record<string, Tag>, conversationId: string): Record<string, Tag> {
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
