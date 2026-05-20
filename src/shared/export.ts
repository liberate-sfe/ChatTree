import type { ConversationEnvelope } from "./schema";

export function exportTreeAsJson(envelope: ConversationEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}

export function exportTreeAsMarkdown(envelope: ConversationEnvelope): string {
  const lines: string[] = [
    `# ${envelope.conversation.title || "ChatTree Export"}`,
    "",
    `- Provider: ${envelope.conversation.provider}`,
    `- Source URL: ${envelope.conversation.url}`,
    `- Exported: ${new Date().toISOString()}`,
    ""
  ];

  const overview = envelope.tree.overviewSummaryId
    ? envelope.summaries[envelope.tree.overviewSummaryId]
    : null;

  if (overview) {
    lines.push("## Overview", "", overview.body, "");
  }

  function writeNode(nodeId: string, depth: number): void {
    const node = envelope.nodes[nodeId];
    if (!node) {
      return;
    }

    const summary = node.summaryId ? envelope.summaries[node.summaryId] : null;
    const marker = `${"  ".repeat(depth)}-`;
    lines.push(`${marker} **${node.title}**`);
    if (summary?.body) {
      lines.push(`${"  ".repeat(depth + 1)}${summary.body}`);
    } else if (node.contentPreview) {
      lines.push(`${"  ".repeat(depth + 1)}${node.contentPreview}`);
    }

    for (const childId of node.childIds) {
      writeNode(childId, depth + 1);
    }
  }

  writeNode(envelope.tree.rootNodeId, 0);

  const highlights = Object.values(envelope.highlights);
  const notes = Object.values(envelope.notes);
  if (highlights.length > 0 || notes.length > 0) {
    lines.push("", "## Notes and Highlights", "");
  }

  for (const highlight of highlights) {
    const tagLabels = getTagLabels(envelope, "highlight", highlight.id);
    lines.push(
      `### Highlight - ${highlight.color}`,
      "",
      `> ${highlight.quote}`,
      "",
      `- Message: ${highlight.messageId}`,
      `- Created: ${highlight.createdAt}`,
      tagLabels.length > 0 ? `- Tags: ${tagLabels.join(", ")}` : "",
      ""
    );
  }

  for (const note of notes) {
    const tagLabels = getTagLabels(envelope, "note", note.id);
    lines.push(`### Note - ${note.scope}`, "");
    if (note.quote) {
      lines.push(`> ${note.quote}`, "");
    }
    lines.push(
      note.body,
      "",
      `- Created: ${note.createdAt}`,
      tagLabels.length > 0 ? `- Tags: ${tagLabels.join(", ")}` : "",
      ""
    );
  }

  return `${lines.join("\n")}\n`;
}

function getTagLabels(
  envelope: ConversationEnvelope,
  entityType: "note" | "highlight" | "node",
  entityId: string
): string[] {
  return envelope.taggedEntities
    .filter((entry) => entry.entityType === entityType && entry.entityId === entityId)
    .map((entry) => envelope.tags[entry.tagId]?.label)
    .filter((label): label is string => Boolean(label));
}
