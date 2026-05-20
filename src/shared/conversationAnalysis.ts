import type { ConversationAnalysis, ConversationTheme } from "./messages";
import type { ExtractedMessage } from "./schema";

type ThemeKind = "paper" | "english" | "mechanism" | "other";

const THEME_LABELS: Record<ThemeKind, { title: string; tagLabels: string[]; summary: string }> = {
  paper: {
    title: "Paper walk",
    tagLabels: ["paper"],
    summary: "Paper walkthrough turns where the assistant explains sections, figures, methods, or claims from the paper."
  },
  english: {
    title: "English",
    tagLabels: ["vocabulary", "grammar"],
    summary: "English learning turns for vocabulary, phrase meaning, grammar, and scientific writing review."
  },
  mechanism: {
    title: "Why-chain",
    tagLabels: ["mechanism"],
    summary: "Mechanism deep-dives where the student asks why a biological or causal claim is true."
  },
  other: {
    title: "Other",
    tagLabels: ["review"],
    summary: "Supporting turns that do not clearly belong to paper walkthrough, English learning, or mechanism reasoning."
  }
};

export function analyzeConversationLocally(conversationId: string, messages: ExtractedMessage[]): ConversationAnalysis {
  const turns = pairUserTurns(messages);
  const grouped = new Map<ThemeKind, string[]>();

  for (const turn of turns) {
    const userKind = classifyTurn(turn.user.content);
    const kind = userKind === "other" ? classifyTurn(`${turn.user.content}\n${turn.assistantText}`) : userKind;
    grouped.set(kind, [...(grouped.get(kind) ?? []), turn.user.id]);
  }

  const orderedKinds: ThemeKind[] = ["paper", "english", "mechanism", "other"];
  const themes: ConversationTheme[] = orderedKinds
    .filter((kind) => (grouped.get(kind)?.length ?? 0) > 0)
    .map((kind) => {
      const labels = THEME_LABELS[kind];
      const messageIds = grouped.get(kind) ?? [];
      return {
        id: `${conversationId}:theme:${kind}`,
        title: labels.title,
        summary: summarizeTheme(kind, messageIds, messages),
        messageIds,
        tagLabels: labels.tagLabels,
        parentThemeId: null
      };
    });

  const overviewParts = themes.map((theme) => theme.title);
  return {
    overviewTitle: titleWithinLimit(overviewParts.join(" + ") || "Conversation"),
    overviewSummary: buildOverviewSummary(themes, messages),
    themes,
    rationale:
      "Local whole-conversation analysis grouped all user turns by their role in the session before building the tree. This is a fallback when no API key is available.",
    provider: "local",
    model: "local-theme-heuristic-v1"
  };
}

export function normalizeConversationAnalysis(
  conversationId: string,
  messages: ExtractedMessage[],
  raw: unknown,
  provider: ConversationAnalysis["provider"],
  model: string
): ConversationAnalysis {
  const fallback = analyzeConversationLocally(conversationId, messages);
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const input = raw as Partial<ConversationAnalysis>;
  const messageIds = new Set(messages.map((message) => message.id));
  const themes = Array.isArray(input.themes)
    ? input.themes
        .map((theme, index) => normalizeTheme(conversationId, theme, index, messageIds))
        .filter((theme): theme is ConversationTheme => Boolean(theme && theme.messageIds.length > 0))
    : fallback.themes;

  return {
    overviewTitle: titleWithinLimit(String(input.overviewTitle || fallback.overviewTitle)),
    overviewSummary: String(input.overviewSummary || fallback.overviewSummary),
    themes: themes.length > 0 ? themes : fallback.themes,
    rationale: String(input.rationale || fallback.rationale),
    provider,
    model
  };
}

export function titleWithinLimit(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length <= 15 ? cleaned : cleaned.slice(0, 15);
}

function normalizeTheme(
  conversationId: string,
  theme: unknown,
  index: number,
  validMessageIds: Set<string>
): ConversationTheme | null {
  if (!theme || typeof theme !== "object") {
    return null;
  }

  const input = theme as Partial<ConversationTheme>;
  const messageIds = Array.isArray(input.messageIds)
    ? input.messageIds.filter((messageId): messageId is string => typeof messageId === "string" && validMessageIds.has(messageId))
    : [];

  return {
    id: String(input.id || `${conversationId}:theme:${index}`),
    title: titleWithinLimit(String(input.title || `Theme ${index + 1}`)),
    summary: String(input.summary || ""),
    messageIds,
    tagLabels: Array.isArray(input.tagLabels)
      ? input.tagLabels.filter((label): label is string => typeof label === "string").slice(0, 6)
      : [],
    parentThemeId: typeof input.parentThemeId === "string" ? input.parentThemeId : null
  };
}

function pairUserTurns(messages: ExtractedMessage[]): Array<{ user: ExtractedMessage; assistantText: string }> {
  const turns: Array<{ user: ExtractedMessage; assistantText: string }> = [];

  for (const [index, message] of messages.entries()) {
    if (message.role !== "user") {
      continue;
    }
    const assistantText: string[] = [];
    for (const next of messages.slice(index + 1)) {
      if (next.role === "user") {
        break;
      }
      if (next.role === "assistant") {
        assistantText.push(next.content);
      }
    }
    turns.push({ user: message, assistantText: assistantText.join("\n") });
  }

  return turns;
}

function classifyTurn(text: string): ThemeKind {
  const normalized = text.toLowerCase();
  if (/\b(why|mechanism|pathway|cause|causal|estrogen|vitellogenin|hormone|endocrine|receptor|biological)\b/.test(normalized)) {
    return "mechanism";
  }
  if (/\b(english|mean|means|meaning|word|phrase|vocabulary|grammar|fewer|less|tense|pronounce|translate|writing)\b/.test(normalized)) {
    return "english";
  }
  if (/\b(paper|abstract|introduction|method|methods|result|results|discussion|figure|table|section|walkthrough)\b/.test(normalized)) {
    return "paper";
  }
  return "other";
}

function summarizeTheme(kind: ThemeKind, messageIds: string[], messages: ExtractedMessage[]): string {
  const label = THEME_LABELS[kind];
  const examples = messageIds
    .map((id) => messages.find((message) => message.id === id)?.content)
    .filter((content): content is string => Boolean(content))
    .slice(0, 3)
    .map((content) => `"${content.slice(0, 70)}${content.length > 70 ? "..." : ""}"`);

  return `${label.summary} Representative prompts: ${examples.join("; ")}.`;
}

function buildOverviewSummary(themes: ConversationTheme[], messages: ExtractedMessage[]): string {
  const themeTitles = themes.map((theme) => theme.title).join(", ");
  const turnCount = messages.filter((message) => message.role === "user").length;
  if (themes.length === 0) {
    return "This conversation has not accumulated enough user turns to form a meaningful branch map yet.";
  }

  return `This conversation contains ${turnCount} user turns grouped into ${themeTitles}. The branch map is based on the full transcript, so paper-reading, English-learning, and mechanism why-chain work can be reviewed separately instead of being flattened into one timeline.`;
}
