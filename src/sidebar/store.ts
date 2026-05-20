import { create } from "zustand";
import {
  applyBranchSuggestion,
  applyConversationAnalysis,
  buildEnvelopeFromMessages,
  createConversationId,
  ensureDefaultTags,
  rejectBranchSuggestion,
  titleFromContent
} from "../shared/conversation";
import type {
  ConversationEnvelope,
  ExtractedMessage,
  Highlight,
  Note,
  ProviderSite,
  Summary,
  Tag,
  TaggedEntity
} from "../shared/schema";
import type { ConversationAnalysis, GeneratedSummary } from "../shared/messages";
import { loadConversationEnvelope, saveConversationEnvelope } from "../shared/storage";
import { mockEnvelope } from "./mockData";

interface ChatTreeState {
  envelope: ConversationEnvelope;
  sidebarOpen: boolean;
  activeTab: "tree" | "notes" | "settings";
  selectedNodeId: string | null;
  selectedTagId: string | null;
  hydratedConversationId: string | null;
  hydrateConversation: (provider: ProviderSite, url: string) => Promise<void>;
  ingestMessages: (provider: ProviderSite, url: string, messages: ExtractedMessage[]) => void;
  toggleSidebar: () => void;
  setActiveTab: (tab: ChatTreeState["activeTab"]) => void;
  selectNode: (nodeId: string) => void;
  togglePin: (nodeId: string) => void;
  toggleBranchPoint: (nodeId: string) => void;
  acceptBranchSuggestion: (suggestionId: string) => void;
  rejectBranchSuggestion: (suggestionId: string) => void;
  addHighlight: (highlight: Omit<Highlight, "id" | "createdAt" | "updatedAt">, tagIds?: string[]) => void;
  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">, tagIds?: string[]) => void;
  addTag: (label: string) => void;
  tagEntity: (entity: Omit<TaggedEntity, "id" | "createdAt" | "conversationId">) => void;
  applyConversationAnalysis: (analysis: ConversationAnalysis) => void;
  applyGeneratedSummary: (summary: GeneratedSummary, nodeId: string | null, kind: Summary["kind"]) => void;
  setSelectedTag: (tagId: string | null) => void;
  persist: () => Promise<void>;
}

export const useChatTreeStore = create<ChatTreeState>((set, get) => ({
  envelope: mockEnvelope,
  sidebarOpen: true,
  activeTab: "tree",
  selectedNodeId: "root",
  selectedTagId: null,
  hydratedConversationId: null,

  async hydrateConversation(provider, url) {
    const conversationId = createConversationId(provider, url);
    const persisted = await loadConversationEnvelope(conversationId);
    if (persisted) {
      set({
        envelope: {
          ...persisted,
          tags: ensureDefaultTags(persisted.tags, conversationId)
        },
        selectedNodeId: persisted.tree.rootNodeId,
        hydratedConversationId: conversationId
      });
      return;
    }

    set({ hydratedConversationId: conversationId });
  },

  ingestMessages(provider, url, messages) {
    if (messages.length === 0) {
      return;
    }

    const conversationId = createConversationId(provider, url);
    set((state) => {
      const previous = state.envelope.conversation.id === conversationId ? state.envelope : null;
      const envelope = buildEnvelopeFromMessages(provider, url, document.title, messages, previous);
      return {
        envelope,
        selectedNodeId: previous?.tree.rootNodeId ?? envelope.tree.rootNodeId
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
    void get().persist();
  },

  toggleBranchPoint(nodeId) {
    set((state) => ({
      envelope: {
        ...state.envelope,
        nodes: {
          ...state.envelope.nodes,
          [nodeId]: {
            ...state.envelope.nodes[nodeId],
            isBranchPoint: !state.envelope.nodes[nodeId].isBranchPoint,
            updatedAt: new Date().toISOString()
          }
        }
      }
    }));
    void get().persist();
  },

  acceptBranchSuggestion(suggestionId) {
    set((state) => ({ envelope: applyBranchSuggestion(state.envelope, suggestionId) }));
    void get().persist();
  },

  rejectBranchSuggestion(suggestionId) {
    set((state) => ({ envelope: rejectBranchSuggestion(state.envelope, suggestionId) }));
    void get().persist();
  },

  addHighlight(highlightInput, tagIds = []) {
    const id = `highlight:${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    set((state) => ({
      envelope: {
        ...state.envelope,
        highlights: {
          ...state.envelope.highlights,
          [id]: { ...highlightInput, id, createdAt: now, updatedAt: now }
        },
        taggedEntities: [
          ...state.envelope.taggedEntities,
          ...tagIds.map((tagId) => makeTaggedEntity(state.envelope.conversation.id, tagId, "highlight", id, now))
        ]
      },
      activeTab: "notes"
    }));
    void get().persist();
  },

  addNote(noteInput, tagIds = []) {
    const id = `note:${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    set((state) => ({
      envelope: {
        ...state.envelope,
        notes: {
          ...state.envelope.notes,
          [id]: { ...noteInput, id, createdAt: now, updatedAt: now }
        },
        taggedEntities: [
          ...state.envelope.taggedEntities,
          ...tagIds.map((tagId) => makeTaggedEntity(state.envelope.conversation.id, tagId, "note", id, now))
        ]
      },
      activeTab: "notes"
    }));
    void get().persist();
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
          } satisfies Tag
        }
      },
      selectedTagId: id
    }));
    void get().persist();
  },

  tagEntity(entity) {
    const now = new Date().toISOString();
    set((state) => {
      const duplicate = state.envelope.taggedEntities.some(
        (entry) => entry.tagId === entity.tagId && entry.entityType === entity.entityType && entry.entityId === entity.entityId
      );
      if (duplicate) {
        return state;
      }

      return {
        envelope: {
          ...state.envelope,
          taggedEntities: [
            ...state.envelope.taggedEntities,
            makeTaggedEntity(state.envelope.conversation.id, entity.tagId, entity.entityType, entity.entityId, now)
          ]
        }
      };
    });
    void get().persist();
  },

  applyConversationAnalysis(analysis) {
    set((state) => ({
      envelope: applyConversationAnalysis(state.envelope, analysis),
      selectedNodeId: state.envelope.tree.rootNodeId,
      activeTab: "tree"
    }));
    void get().persist();
  },

  applyGeneratedSummary(summary, nodeId, kind) {
    const summaryId = `summary:${kind}:${nodeId ?? "conversation"}`;
    const now = new Date().toISOString();
    set((state) => {
      const targetNodeId = nodeId ?? state.envelope.tree.rootNodeId;
      const targetNode = state.envelope.nodes[targetNodeId];
      return {
        envelope: {
          ...state.envelope,
          summaries: {
            ...state.envelope.summaries,
            [summaryId]: {
              id: summaryId,
              conversationId: state.envelope.conversation.id,
              nodeId,
              kind,
              title: titleFromContent(summary.title),
              body: summary.summary,
              sourceMessageIds: Object.keys(state.envelope.messages),
              provider: summary.provider,
              model: summary.model,
              status: "ready",
              generatedAt: now,
              error: null
            }
          },
          tree: {
            ...state.envelope.tree,
            overviewSummaryId: kind === "overview" ? summaryId : state.envelope.tree.overviewSummaryId,
            updatedAt: now
          },
          nodes: targetNode
            ? {
                ...state.envelope.nodes,
                [targetNodeId]: {
                  ...targetNode,
                  title: titleFromContent(summary.title),
                  summaryId,
                  updatedAt: now
                }
              }
            : state.envelope.nodes
        }
      };
    });
    void get().persist();
  },

  setSelectedTag(selectedTagId) {
    set({ selectedTagId });
  },

  async persist() {
    await saveConversationEnvelope(get().envelope);
  }
}));

function makeTaggedEntity(
  conversationId: string,
  tagId: string,
  entityType: TaggedEntity["entityType"],
  entityId: string,
  createdAt: string
): TaggedEntity {
  return {
    id: `tagged:${crypto.randomUUID()}`,
    conversationId,
    tagId,
    entityType,
    entityId,
    createdAt
  };
}
