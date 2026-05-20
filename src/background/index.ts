import { decryptString } from "../shared/crypto";
import { analyzeConversationLocally, normalizeConversationAnalysis } from "../shared/conversationAnalysis";
import {
  RUNTIME_MESSAGES,
  type AnalyzeConversationRequestPayload,
  type ConversationAnalysis,
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

  if (message.type === RUNTIME_MESSAGES.ANALYZE_CONVERSATION) {
    analyzeConversation(message.payload)
      .then((analysis) => sendResponse({ ok: true, data: analysis } satisfies RuntimeResponse<ConversationAnalysis>))
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

async function analyzeConversation(payload: AnalyzeConversationRequestPayload): Promise<ConversationAnalysis> {
  const settings = await getSettings();
  const providerConfig = settings.providers[settings.activeProvider];
  if (!providerConfig.encryptedApiKey) {
    return analyzeConversationLocally(payload.conversationId, payload.messages);
  }

  const apiKey = await decryptString(providerConfig.encryptedApiKey);
  const prompt = buildAnalysisPrompt(payload);

  if (settings.activeProvider === "anthropic") {
    const raw = await jsonWithAnthropic(apiKey, providerConfig.model, prompt);
    return normalizeConversationAnalysis(payload.conversationId, payload.messages, raw, "anthropic", providerConfig.model);
  }

  const raw = await jsonWithOpenAI(apiKey, providerConfig.model, prompt, conversationAnalysisJsonSchema());
  return normalizeConversationAnalysis(payload.conversationId, payload.messages, raw, "openai", providerConfig.model);
}

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

function buildAnalysisPrompt(payload: AnalyzeConversationRequestPayload): string {
  const transcript = payload.messages
    .map((message) => `[${message.id}] ${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  return [
    "Analyze the entire AI tutoring conversation as a conversation cartographer, not as a line-by-line formatter.",
    "The target user is a PhD student reading a scientific paper while also learning English and asking biological mechanism questions.",
    "Find the real activities and branches across the full transcript. Do not merely create one node per message.",
    "Return strict JSON with overviewTitle, overviewSummary, themes, and rationale.",
    "Each theme must represent a coherent branch such as paper walkthrough, English vocabulary/grammar, or mechanism why-chain.",
    "For each theme, include title (<= 15 chars), summary, messageIds for user turns in that branch, tagLabels, and parentThemeId when one theme is a child of another.",
    "Use only message IDs that appear in the transcript.",
    "",
    transcript
  ].join("\n");
}

async function summarizeWithOpenAI(apiKey: string, model: string, prompt: string): Promise<GeneratedSummary> {
  const parsed = await jsonWithOpenAI(apiKey, model, prompt, {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      summary: { type: "string" }
    },
    required: ["title", "summary"]
  }) as Pick<GeneratedSummary, "title" | "summary">;
  return { ...parsed, provider: "openai", model };
}

async function jsonWithOpenAI(apiKey: string, model: string, prompt: string, schema: object): Promise<unknown> {
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
          name: "chattree_json",
          schema
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.output_text ?? data.output?.[0]?.content?.[0]?.text;
  return JSON.parse(String(text ?? "{}"));
}

async function summarizeWithAnthropic(apiKey: string, model: string, prompt: string): Promise<GeneratedSummary> {
  const parsed = await jsonWithAnthropic(apiKey, model, prompt) as Pick<GeneratedSummary, "title" | "summary">;
  return { ...parsed, provider: "anthropic", model };
}

async function jsonWithAnthropic(apiKey: string, model: string, prompt: string): Promise<unknown> {
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
      system: "Return strict JSON only. Do not include Markdown fences or explanatory prose.",
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.find((part: { type: string }) => part.type === "text")?.text;
  return JSON.parse(String(text ?? "{}"));
}

function conversationAnalysisJsonSchema(): object {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      overviewTitle: { type: "string" },
      overviewSummary: { type: "string" },
      rationale: { type: "string" },
      themes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
            messageIds: { type: "array", items: { type: "string" } },
            tagLabels: { type: "array", items: { type: "string" } },
            parentThemeId: { type: ["string", "null"] }
          },
          required: ["id", "title", "summary", "messageIds", "tagLabels", "parentThemeId"]
        }
      }
    },
    required: ["overviewTitle", "overviewSummary", "themes", "rationale"]
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
