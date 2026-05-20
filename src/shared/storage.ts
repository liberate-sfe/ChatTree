import Dexie, { type Table } from "dexie";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type BranchSuggestion,
  type ChatTreeNode,
  type Conversation,
  type ConversationEnvelope,
  type ConversationTree,
  type ExtractedMessage,
  type Highlight,
  type Note,
  type Summary,
  type Tag,
  type TaggedEntity
} from "./schema";

export const CHAT_TREE_SETTINGS_KEY = "chattree.settings";

class ChatTreeDatabase extends Dexie {
  conversations!: Table<Conversation, string>;
  trees!: Table<ConversationTree, string>;
  nodes!: Table<ChatTreeNode, string>;
  summaries!: Table<Summary, string>;
  messages!: Table<ExtractedMessage, string>;
  highlights!: Table<Highlight, string>;
  notes!: Table<Note, string>;
  tags!: Table<Tag, string>;
  taggedEntities!: Table<TaggedEntity, string>;
  branchSuggestions!: Table<BranchSuggestion, string>;

  constructor() {
    super("ChatTreeDB");
    this.version(1).stores({
      conversations: "id, provider, updatedAt",
      trees: "id, conversationId, updatedAt",
      nodes: "id, conversationId, parentId, messageId",
      summaries: "id, conversationId, nodeId, kind, status",
      messages: "id, conversationId, provider, ordinal",
      highlights: "id, conversationId, messageId, createdAt",
      notes: "id, conversationId, messageId, highlightId, scope, createdAt",
      tags: "id, conversationId, label",
      taggedEntities: "id, conversationId, tagId, entityType, entityId",
      branchSuggestions: "id, conversationId, sourceMessageId, accepted"
    });
  }
}

export const db = new ChatTreeDatabase();

export async function getSettings(): Promise<AppSettings> {
  const stored = await chrome.storage.local.get(CHAT_TREE_SETTINGS_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(stored[CHAT_TREE_SETTINGS_KEY] as Partial<AppSettings> | undefined)
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await chrome.storage.local.set({
    [CHAT_TREE_SETTINGS_KEY]: { ...settings, updatedAt: new Date().toISOString() }
  });
}

export async function saveConversationEnvelope(envelope: ConversationEnvelope): Promise<StorageBackendResult> {
  const nextEnvelope = {
    ...envelope,
    conversation: { ...envelope.conversation, updatedAt: new Date().toISOString() },
    tree: { ...envelope.tree, updatedAt: new Date().toISOString() }
  };

  await db.transaction(
    "rw",
    [
      db.conversations,
      db.trees,
      db.nodes,
      db.summaries,
      db.messages,
      db.highlights,
      db.notes,
      db.tags,
      db.taggedEntities,
      db.branchSuggestions
    ],
    async () => {
      await db.conversations.put({ ...nextEnvelope.conversation, storageBackend: "indexeddb" });
      await db.trees.put(nextEnvelope.tree);
      await db.nodes.bulkPut(Object.values(nextEnvelope.nodes));
      await db.summaries.bulkPut(Object.values(nextEnvelope.summaries));
      await db.messages.bulkPut(Object.values(nextEnvelope.messages));
      await db.highlights.bulkPut(Object.values(nextEnvelope.highlights));
      await db.notes.bulkPut(Object.values(nextEnvelope.notes));
      await db.tags.bulkPut(Object.values(nextEnvelope.tags));
      await db.taggedEntities.bulkPut(nextEnvelope.taggedEntities);
      await db.branchSuggestions.bulkPut(nextEnvelope.branchSuggestions);
    }
  );

  return { backend: "indexeddb" };
}

export async function loadConversationEnvelope(conversationId: string): Promise<ConversationEnvelope | null> {
  const conversation = await db.conversations.get(conversationId);
  if (!conversation) {
    return null;
  }

  const [tree, nodes, summaries, messages, highlights, notes, tags, taggedEntities, branchSuggestions] = await Promise.all([
    db.trees.where("conversationId").equals(conversationId).first(),
    db.nodes.where("conversationId").equals(conversationId).toArray(),
    db.summaries.where("conversationId").equals(conversationId).toArray(),
    db.messages.where("conversationId").equals(conversationId).toArray(),
    db.highlights.where("conversationId").equals(conversationId).toArray(),
    db.notes.where("conversationId").equals(conversationId).toArray(),
    db.tags.where("conversationId").equals(conversationId).toArray(),
    db.taggedEntities.where("conversationId").equals(conversationId).toArray(),
    db.branchSuggestions.where("conversationId").equals(conversationId).toArray()
  ]);

  if (!tree) {
    return null;
  }

  return {
    conversation,
    tree,
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    summaries: Object.fromEntries(summaries.map((summary) => [summary.id, summary])),
    messages: Object.fromEntries(messages.map((message) => [message.id, message])),
    highlights: Object.fromEntries(highlights.map((highlight) => [highlight.id, highlight])),
    notes: Object.fromEntries(notes.map((note) => [note.id, note])),
    tags: Object.fromEntries(tags.map((tag) => [tag.id, tag])),
    taggedEntities,
    branchSuggestions
  };
}

export interface StorageBackendResult {
  backend: "indexeddb";
}
