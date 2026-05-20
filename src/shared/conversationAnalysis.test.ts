import { describe, expect, it } from "vitest";
import { analyzeConversationLocally, normalizeConversationAnalysis } from "./conversationAnalysis";
import type { ExtractedMessage } from "./schema";

describe("whole conversation analysis", () => {
  it("groups a mixed paper-reading session by activity across the full transcript", () => {
    const messages = [
      message("u1", "Help me read this paper section by section.", 0),
      assistant("a1", "We can walk through the abstract and methods.", 1),
      message("u2", "What does the phrase fewer offspring mean?", 2),
      assistant("a2", "Fewer is used for countable nouns.", 3),
      message("u3", "Why does less estrogen reduce vitellogenin?", 4),
      assistant("a3", "Because estrogen receptor signaling regulates vitellogenin.", 5)
    ];

    const analysis = analyzeConversationLocally("chatgpt:paper", messages);

    expect(analysis.themes.map((theme) => theme.title)).toEqual(["Paper walk", "English", "Why-chain"]);
    expect(analysis.overviewSummary).toContain("full transcript");
    expect(analysis.themes.find((theme) => theme.title === "English")?.messageIds).toEqual(["u2"]);
  });

  it("normalizes malformed LLM output and removes unknown message IDs", () => {
    const messages = [message("u1", "Help me read this paper.", 0)];
    const analysis = normalizeConversationAnalysis(
      "chatgpt:paper",
      messages,
      {
        overviewTitle: "A very long overview title that should be clipped",
        overviewSummary: "Summary",
        rationale: "Rationale",
        themes: [
          {
            id: "paper",
            title: "Paper walkthrough that is too long",
            summary: "Paper branch",
            messageIds: ["u1", "missing"],
            tagLabels: ["paper"],
            parentThemeId: null
          }
        ]
      },
      "openai",
      "test-model"
    );

    expect(analysis.overviewTitle).toHaveLength(15);
    expect(analysis.themes[0].messageIds).toEqual(["u1"]);
    expect(analysis.themes[0].title).toHaveLength(15);
  });
});

function message(id: string, content: string, ordinal: number): ExtractedMessage {
  return {
    id,
    conversationId: null,
    provider: "chatgpt",
    role: "user",
    content,
    timestamp: null,
    ordinal,
    hash: id,
    domSelector: null
  };
}

function assistant(id: string, content: string, ordinal: number): ExtractedMessage {
  return {
    ...message(id, content, ordinal),
    role: "assistant"
  };
}
