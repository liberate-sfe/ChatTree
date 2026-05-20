import type { ExtractedMessage, LlmProvider } from "./schema";

export const RUNTIME_MESSAGES = {
  ANALYZE_CONVERSATION: "chattree.analyzeConversation",
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

export interface ConversationTheme {
  id: string;
  title: string;
  summary: string;
  messageIds: string[];
  tagLabels: string[];
  parentThemeId: string | null;
}

export interface ConversationAnalysis {
  overviewTitle: string;
  overviewSummary: string;
  themes: ConversationTheme[];
  rationale: string;
  provider: LlmProvider | "local";
  model: string;
}

export interface AnalyzeConversationRequestPayload {
  conversationId: string;
  messages: ExtractedMessage[];
}

export interface SummarizeRuntimeMessage {
  type: typeof RUNTIME_MESSAGES.SUMMARIZE;
  payload: SummarizeRequestPayload;
}

export interface AnalyzeConversationRuntimeMessage {
  type: typeof RUNTIME_MESSAGES.ANALYZE_CONVERSATION;
  payload: AnalyzeConversationRequestPayload;
}

export interface GetSettingsRuntimeMessage {
  type: typeof RUNTIME_MESSAGES.GET_SETTINGS;
}

export type RuntimeMessage = AnalyzeConversationRuntimeMessage | SummarizeRuntimeMessage | GetSettingsRuntimeMessage;

export interface RuntimeResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
