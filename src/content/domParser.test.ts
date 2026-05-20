import { describe, expect, it } from "vitest";
import { extractMessagesFromRoot } from "./domParser";

describe("DOM parser adapters", () => {
  it("extracts ChatGPT role, ID, and content from data-message-id markup", () => {
    const root = document.createElement("main");
    root.innerHTML = `
      <article data-message-id="u1" data-message-author-role="user"><div class="whitespace-pre-wrap">What does fewer mean?</div></article>
      <article data-message-id="a1" data-message-author-role="assistant"><div class="markdown">Use fewer with countable nouns.</div></article>
    `;

    const messages = extractMessagesFromRoot("chatgpt", root);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ id: "u1", role: "user", content: "What does fewer mean?" });
    expect(messages[1]).toMatchObject({ id: "a1", role: "assistant", content: "Use fewer with countable nouns." });
  });

  it("extracts Gemini custom elements", () => {
    const root = document.createElement("main");
    root.innerHTML = `
      <user-query>Explain the methods section.</user-query>
      <model-response>The methods describe exposure conditions.</model-response>
    `;

    const messages = extractMessagesFromRoot("gemini", root);

    expect(messages.map((message) => message.role)).toEqual(["user", "assistant"]);
  });
});
