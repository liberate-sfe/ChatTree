export const CHAT_TREE_SCHEMA_VERSION = 1;

export type ProviderSite = "chatgpt" | "claude" | "gemini";
export type MessageRole = "user" | "assistant" | "system" | "unknown";
export type SummaryKind = "node" | "overview" | "import_suggestion";
export type SummaryStatus = "pending" | "ready" | "failed";
export type StorageBackend = "indexeddb";
export type ImportSource = "chatgpt_conversations_json" | "claude_export_json";
export type LlmProvider = "openai" | "anthropic";
export type HighlightColor = "yellow" | "green" | "blue" | "pink";
export type NoteScope = "selection" | "message" | "conversation";

/**
 * Serves User Story #1 by preserving every host-page message as stable data,
 * so a student's paper, vocabulary, and mechanism turns can be reorganized
 * without losing the original ChatGPT/Claude/Gemini location.
 */
export interface ExtractedMessage {
  id: string;
  conversationId: string | null;
  provider: ProviderSite;
  role: MessageRole;
  content: string;
  timestamp: string | null;
  ordinal: number;
  hash: string;
  domSelector: string | null;
}

/**
 * Serves User Story #1 by making the reopened root node say what the session
 * became, for example "Paper + English + why-chain", instead of echoing the
 * first prompt only.
 */
export interface Summary {
  id: string;
  conversationId: string;
  nodeId: string | null;
  kind: SummaryKind;
  title: string;
  body: string;
  sourceMessageIds: string[];
  provider: LlmProvider;
  model: string;
  status: SummaryStatus;
  generatedAt: string;
  error: string | null;
}

/**
 * Serves User Story #1 by anchoring a selected vocabulary or mechanism quote
 * using exact text plus local context, so highlights survive host-page rerenders.
 */
export interface TextAnchor {
  exact: string;
  prefix: string;
  suffix: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Serves User Story #1 by letting the student mark a reusable explanation such
 * as "fewer vs less" and review it later from the Notes tab.
 */
export interface Highlight {
  id: string;
  conversationId: string;
  messageId: string;
  selectionRange: TextAnchor;
  color: HighlightColor;
  quote: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Serves User Story #1 by separating selection notes, message notes, and whole
 * conversation notes, so vocabulary review and biology reasoning can coexist.
 */
export interface Note {
  id: string;
  conversationId: string;
  messageId: string | null;
  highlightId: string | null;
  scope: NoteScope;
  selectionRange: TextAnchor | null;
  quote: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Serves User Story #1 by grouping scattered notes into review lenses such as
 * vocabulary, grammar, and mechanism.
 */
export interface Tag {
  id: string;
  conversationId: string;
  label: string;
  color: HighlightColor;
  createdAt: string;
  updatedAt: string;
}

export interface TaggedEntity {
  id: string;
  conversationId: string;
  tagId: string;
  entityType: "note" | "highlight" | "node";
  entityId: string;
  createdAt: string;
}

/**
 * Serves User Story #1 by giving each user question a place in the visible
 * tree, including retroactive branches for English-learning and why-chain turns.
 */
export interface ChatTreeNode {
  id: string;
  conversationId: string;
  messageId: string | null;
  parentId: string | null;
  role: MessageRole;
  title: string;
  contentPreview: string;
  summaryId: string | null;
  childIds: string[];
  assistantReplyIds: string[];
  isBranchPoint: boolean;
  branchSourceReplyId: string | null;
  isPinned: boolean;
  collapsed: boolean;
  ordinal: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Serves User Story #1 by keeping the root and all branches together as one
 * navigable map of the mixed paper-reading session.
 */
export interface ConversationTree {
  id: string;
  conversationId: string;
  rootNodeId: string;
  nodeIds: string[];
  overviewSummaryId: string | null;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

/**
 * Serves User Story #1 by tying a browser URL to its durable tree, summaries,
 * notes, highlights, and import metadata.
 */
export interface Conversation {
  id: string;
  provider: ProviderSite;
  url: string;
  title: string;
  treeId: string;
  messageIds: string[];
  importSource: ImportSource | null;
  storageBackend: StorageBackend;
  createdAt: string;
  updatedAt: string;
}

/**
 * Serves User Story #1 by representing LLM-assisted split suggestions, for
 * example when a vocabulary lesson should become a sibling branch.
 */
export interface BranchSuggestion {
  id: string;
  conversationId: string;
  sourceMessageId: string;
  targetMessageId: string;
  reason: string;
  accepted: boolean | null;
  createdAt: string;
}

/**
 * Serves User Story #1 by exporting/importing the complete review surface:
 * branches, summaries, vocabulary notes, mechanism notes, and tags.
 */
export interface ConversationEnvelope {
  conversation: Conversation;
  tree: ConversationTree;
  nodes: Record<string, ChatTreeNode>;
  summaries: Record<string, Summary>;
  messages: Record<string, ExtractedMessage>;
  highlights: Record<string, Highlight>;
  notes: Record<string, Note>;
  tags: Record<string, Tag>;
  taggedEntities: TaggedEntity[];
  branchSuggestions: BranchSuggestion[];
}

export interface EncryptedSecret {
  algorithm: "AES-GCM";
  version: 1;
  iv: string;
  ciphertext: string;
  createdAt: string;
}

export interface ProviderConfig {
  model: string;
  encryptedApiKey: EncryptedSecret | null;
}

export interface AppSettings {
  activeProvider: LlmProvider;
  providers: Record<LlmProvider, ProviderConfig>;
  autoSummaryTurnInterval: number;
  updatedAt: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  activeProvider: "openai",
  providers: {
    openai: {
      model: "gpt-4o-mini",
      encryptedApiKey: null
    },
    anthropic: {
      model: "claude-3-5-haiku-latest",
      encryptedApiKey: null
    }
  },
  autoSummaryTurnInterval: 8,
  updatedAt: new Date(0).toISOString()
};
