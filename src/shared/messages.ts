import type { ExtractedMessage, LlmProvider } from "./schema";

export const RUNTIME_MESSAGES = {
  SUMMARIZE: "chattree.summarize",
  GET_SETTINGS: "chattree.getSettings"
} as const;

export interface SummarizeRequestPayload {
  conversationId: string;
  nodeId: string | null;
  kind: "node" | "overview" | "import_suggestion";
  messages: ExtractedMessage[];
}

export interface GeneratedSummary {
  title: string;
  summary: string;
  provider: LlmProvider;
  model: string;
}

export interface SummarizeRuntimeMessage {
  type: typeof RUNTIME_MESSAGES.SUMMARIZE;
  payload: SummarizeRequestPayload;
}

export interface GetSettingsRuntimeMessage {
  type: typeof RUNTIME_MESSAGES.GET_SETTINGS;
}

export type RuntimeMessage = SummarizeRuntimeMessage | GetSettingsRuntimeMessage;

export interface RuntimeResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
