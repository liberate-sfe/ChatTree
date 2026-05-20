import { describe, expect, it } from "vitest";
import { applyBranchSuggestion, buildEnvelopeFromMessages, createConversationId, suggestBranchSplits } from "./conversation";
import type { ExtractedMessage } from "./schema";

describe("conversation helpers", () => {
  it("creates stable conversation IDs from supported URLs", () => {
    expect(createConversationId("chatgpt", "https://chatgpt.com/c/abc123")).toBe("chatgpt:abc123");
    expect(createConversationId("claude", "https://claude.ai/chat/xyz789")).toBe("claude:xyz789");
  });

  it("suggests branch splits for mixed paper, vocabulary, and mechanism turns", () => {
    const suggestions = suggestBranchSplits("chatgpt:paper", [
      message("m1", "user", "Help me read this paper introduction", 0),
      message("m2", "assistant", "Sure", 1),
      message("m3", "user", "What does fewer mean in English?", 2),
      message("m4", "assistant", "Vocabulary explanation", 3),
      message("m5", "user", "Why does less estrogen reduce vitellogenin?", 4)
    ]);

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].reason).toContain("paper -> vocabulary");
    expect(suggestions[1].reason).toContain("vocabulary -> mechanism");
  });

  it("accepts a mechanism suggestion as a child branch of the source node", () => {
    const messages = [
      message("m1", "user", "Explain this paper result", 0),
      message("m2", "assistant", "The claim is about estrogen", 1),
      message("m3", "user", "Why does less estrogen mean less vitellogenin?", 2)
    ];
    const envelope = buildEnvelopeFromMessages("chatgpt", "https://chatgpt.com/c/paper", "Paper", messages, null);
    const next = applyBranchSuggestion(envelope, envelope.branchSuggestions[0].id);

    expect(next.nodes["node:m3"].parentId).toBe("node:m1");
    expect(next.branchSuggestions[0].accepted).toBe(true);
  });
});

function message(id: string, role: ExtractedMessage["role"], content: string, ordinal: number): ExtractedMessage {
  return {
    id,
    conversationId: null,
    provider: "chatgpt",
    role,
    content,
    timestamp: null,
    ordinal,
    hash: id,
    domSelector: null
  };
}
