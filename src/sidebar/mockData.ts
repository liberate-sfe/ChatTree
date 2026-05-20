import {
  CHAT_TREE_SCHEMA_VERSION,
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
} from "../shared/schema";

const now = new Date().toISOString();
const conversationId = "mock-paper-reading";

const messages: Record<string, ExtractedMessage> = {
  root: {
    id: "root",
    conversationId,
    provider: "chatgpt",
    role: "user",
    content: "Help me read this foundational ecotoxicology paper.",
    timestamp: now,
    ordinal: 0,
    hash: "root",
    domSelector: null
  },
  paper: {
    id: "paper",
    conversationId,
    provider: "chatgpt",
    role: "user",
    content: "Can you walk me through the introduction and methods?",
    timestamp: now,
    ordinal: 1,
    hash: "paper",
    domSelector: null
  },
  vocab: {
    id: "vocab",
    conversationId,
    provider: "chatgpt",
    role: "user",
    content: "What is the difference between fewer and less in this sentence?",
    timestamp: now,
    ordinal: 2,
    hash: "vocab",
    domSelector: null
  },
  mechanism: {
    id: "mechanism",
    conversationId,
    provider: "chatgpt",
    role: "user",
    content: "Why does less estrogen mean less vitellogenin?",
    timestamp: now,
    ordinal: 3,
    hash: "mechanism",
    domSelector: null
  }
};

const nodes: Record<string, ChatTreeNode> = {
  root: makeNode("root", null, "Paper + English", "Paper walkthrough + English vocabulary + biology mechanism Q&A", [
    "paper",
    "vocab",
    "mechanism"
  ]),
  paper: makeNode("paper", "root", "Paper walkthru", "Section-by-section explanation of the paper.", []),
  vocab: makeNode("vocab", "root", "English vocab", "Vocabulary and grammar tips collected from the tutoring session.", []),
  mechanism: makeNode("mechanism", "root", "Why-chain", "Mechanism deep-dive about estrogen, vitellogenin, and reproduction.", [])
};

const summaries: Record<string, Summary> = {
  overview: {
    id: "overview",
    conversationId,
    nodeId: "root",
    kind: "overview",
    title: "Paper+English",
    body:
      "This conversation became a paper walkthrough, English vocabulary review, and biology mechanism Q&A. The student is reading an ecotoxicology paper while collecting grammar explanations and why-chain reasoning. Key return points are grouped as branches rather than one long thread.",
    sourceMessageIds: Object.keys(messages),
    provider: "openai",
    model: "mock",
    status: "ready",
    generatedAt: now,
    error: null
  }
};

const highlights: Record<string, Highlight> = {
  h1: {
    id: "h1",
    conversationId,
    messageId: "vocab",
    selectionRange: {
      exact: "Use fewer with countable nouns and less with uncountable quantities.",
      prefix: "Grammar tip: ",
      suffix: " In scientific writing",
      startOffset: 13,
      endOffset: 80
    },
    color: "yellow",
    quote: "Use fewer with countable nouns and less with uncountable quantities.",
    createdAt: now,
    updatedAt: now
  }
};

const notes: Record<string, Note> = {
  n1: {
    id: "n1",
    conversationId,
    messageId: "vocab",
    highlightId: "h1",
    scope: "selection",
    selectionRange: highlights.h1.selectionRange,
    quote: highlights.h1.quote,
    body: "Review before writing the results section.",
    createdAt: now,
    updatedAt: now
  },
  n2: {
    id: "n2",
    conversationId,
    messageId: "mechanism",
    highlightId: null,
    scope: "message",
    selectionRange: null,
    quote: null,
    body: "Turn this into a diagram: estrogen -> vitellogenin -> egg production.",
    createdAt: now,
    updatedAt: now
  }
};

const tags: Record<string, Tag> = {
  vocabulary: makeTag("vocabulary", "vocabulary", "yellow"),
  grammar: makeTag("grammar", "grammar", "green"),
  mechanism: makeTag("mechanism", "mechanism", "blue")
};

const taggedEntities: TaggedEntity[] = [
  makeTaggedEntity("te1", "vocabulary", "highlight", "h1"),
  makeTaggedEntity("te2", "grammar", "note", "n1"),
  makeTaggedEntity("te3", "mechanism", "note", "n2"),
  makeTaggedEntity("te4", "mechanism", "node", "mechanism")
];

const tree: ConversationTree = {
  id: "mock-tree",
  conversationId,
  rootNodeId: "root",
  nodeIds: Object.keys(nodes),
  overviewSummaryId: "overview",
  createdAt: now,
  updatedAt: now,
  schemaVersion: CHAT_TREE_SCHEMA_VERSION
};

const conversation: Conversation = {
  id: conversationId,
  provider: "chatgpt",
  url: "https://chatgpt.com/c/mock-paper-reading",
  title: "Reading an ecotoxicology paper",
  treeId: tree.id,
  messageIds: Object.keys(messages),
  importSource: null,
  storageBackend: "indexeddb",
  createdAt: now,
  updatedAt: now
};

export const mockEnvelope: ConversationEnvelope = {
  conversation,
  tree,
  nodes,
  summaries,
  messages,
  highlights,
  notes,
  tags,
  taggedEntities,
  branchSuggestions: [
    {
      id: "s1",
      conversationId,
      sourceMessageId: "paper",
      targetMessageId: "vocab",
      reason: "This user turn shifts from paper walkthrough to English learning.",
      accepted: null,
      createdAt: now
    }
  ]
};

function makeNode(id: string, parentId: string | null, title: string, contentPreview: string, childIds: string[]): ChatTreeNode {
  return {
    id,
    conversationId,
    messageId: id,
    parentId,
    role: "user",
    title,
    contentPreview,
    summaryId: id === "root" ? "overview" : null,
    childIds,
    assistantReplyIds: [],
    isBranchPoint: id !== "root",
    branchSourceReplyId: null,
    isPinned: id === "vocab",
    collapsed: false,
    ordinal: Object.keys(messages).indexOf(id),
    createdAt: now,
    updatedAt: now
  };
}

function makeTag(id: string, label: string, color: Tag["color"]): Tag {
  return {
    id,
    conversationId,
    label,
    color,
    createdAt: now,
    updatedAt: now
  };
}

function makeTaggedEntity(
  id: string,
  tagId: string,
  entityType: TaggedEntity["entityType"],
  entityId: string
): TaggedEntity {
  return {
    id,
    conversationId,
    tagId,
    entityType,
    entityId,
    createdAt: now
  };
}
