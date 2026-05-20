import { decryptString } from "../shared/crypto";
import {
  RUNTIME_MESSAGES,
  type GeneratedSummary,
  type RuntimeMessage,
  type RuntimeResponse,
  type SummarizeRequestPayload
} from "../shared/messages";
import { getSettings } from "../shared/storage";

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === RUNTIME_MESSAGES.GET_SETTINGS) {
    getSettings()
      .then((settings) => sendResponse({ ok: true, data: settings }))
      .catch((error: unknown) => sendResponse({ ok: false, error: getErrorMessage(error) }));
    return true;
  }

  if (message.type === RUNTIME_MESSAGES.SUMMARIZE) {
    summarize(message.payload)
      .then((summary) => sendResponse({ ok: true, data: summary } satisfies RuntimeResponse<GeneratedSummary>))
      .catch((error: unknown) => sendResponse({ ok: false, error: getErrorMessage(error) }));
    return true;
  }

  return false;
});

async function summarize(payload: SummarizeRequestPayload): Promise<GeneratedSummary> {
  const settings = await getSettings();
  const providerConfig = settings.providers[settings.activeProvider];
  if (!providerConfig.encryptedApiKey) {
    throw new Error("Open ChatTree options and add an API key first.");
  }

  const apiKey = await decryptString(providerConfig.encryptedApiKey);
  const prompt = buildSummaryPrompt(payload.messages.map((message) => `${message.role}: ${message.content}`).join("\n\n"));

  if (settings.activeProvider === "anthropic") {
    return summarizeWithAnthropic(apiKey, providerConfig.model, prompt);
  }

  return summarizeWithOpenAI(apiKey, providerConfig.model, prompt);
}

function buildSummaryPrompt(transcript: string): string {
  return [
    "You are summarizing a branching AI tutoring conversation for a PhD student reading a scientific paper.",
    "Return strict JSON with keys title and summary.",
    "The title must be 15 characters or fewer.",
    "The summary must be 3-5 sentences and should surface multiple themes such as paper walkthrough, English vocabulary, grammar, and mechanism why-chain when present.",
    "",
    transcript
  ].join("\n");
}

async function summarizeWithOpenAI(apiKey: string, model: string, prompt: string): Promise<GeneratedSummary> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "chattree_summary",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              summary: { type: "string" }
            },
            required: ["title", "summary"]
          }
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.output_text ?? data.output?.[0]?.content?.[0]?.text;
  const parsed = JSON.parse(String(text ?? "{}")) as Pick<GeneratedSummary, "title" | "summary">;
  return { ...parsed, provider: "openai", model };
}

async function summarizeWithAnthropic(apiKey: string, model: string, prompt: string): Promise<GeneratedSummary> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      system: "Return strict JSON with title and summary only.",
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.find((part: { type: string }) => part.type === "text")?.text;
  const parsed = JSON.parse(String(text ?? "{}")) as Pick<GeneratedSummary, "title" | "summary">;
  return { ...parsed, provider: "anthropic", model };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
