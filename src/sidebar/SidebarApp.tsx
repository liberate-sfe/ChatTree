import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  FileJson,
  GitBranch,
  Highlighter,
  MessageSquarePlus,
  NotebookTabs,
  Pin,
  PinOff,
  Settings,
  Sparkles,
  Star,
  Tags,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChatTreeNode, HighlightColor, Note, ProviderSite } from "../shared/schema";
import { RUNTIME_MESSAGES, type RuntimeResponse, type GeneratedSummary } from "../shared/messages";
import { exportTreeAsJson, exportTreeAsMarkdown } from "../shared/export";
import { createTextAnchor, getCurrentSelectionRange } from "../content/selectionAnchors";
import { reapplyHighlights } from "../content/highlightRenderer";
import { useChatTreeStore } from "./store";

interface SidebarAppProps {
  provider: ProviderSite;
  onJumpToMessage: (messageId: string) => void;
  getMessageElement: (messageId: string) => HTMLElement | null;
}

export function SidebarApp({ provider, onJumpToMessage, getMessageElement }: SidebarAppProps) {
  const sidebarOpen = useChatTreeStore((state) => state.sidebarOpen);
  const toggleSidebar = useChatTreeStore((state) => state.toggleSidebar);
  const activeTab = useChatTreeStore((state) => state.activeTab);
  const setActiveTab = useChatTreeStore((state) => state.setActiveTab);

  return (
    <>
      <button
        type="button"
        aria-label={sidebarOpen ? "Collapse ChatTree" : "Expand ChatTree"}
        className="fixed right-0 top-1/2 z-[2147483647] flex h-11 w-8 -translate-y-1/2 items-center justify-center rounded-l-md border border-chattree-line bg-chattree-panel text-chattree-ink shadow-chattree"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <aside
        className={[
          "fixed right-0 top-0 z-[2147483646] h-screen w-[320px] border-l border-chattree-line bg-chattree-panel text-chattree-ink shadow-chattree transition-transform",
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        ].join(" ")}
      >
        <header className="flex h-14 items-center justify-between border-b border-chattree-line px-3">
          <div>
            <div className="text-sm font-semibold">ChatTree</div>
            <div className="text-[11px] uppercase tracking-normal text-chattree-muted">{provider}</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Conversation notes"
              className="grid h-8 w-8 place-items-center rounded-md text-chattree-muted hover:bg-white hover:text-chattree-ink"
              onClick={() => setActiveTab("notes")}
            >
              <NotebookTabs size={17} />
            </button>
            <ManualSummaryButton />
          </div>
        </header>

        <nav className="grid grid-cols-3 border-b border-chattree-line text-sm">
          <TabButton active={activeTab === "tree"} icon={<BookOpen size={15} />} label="Tree" onClick={() => setActiveTab("tree")} />
          <TabButton active={activeTab === "notes"} icon={<FileText size={15} />} label="Notes" onClick={() => setActiveTab("notes")} />
          <TabButton active={activeTab === "settings"} icon={<Settings size={15} />} label="Settings" onClick={() => setActiveTab("settings")} />
        </nav>

        {activeTab === "tree" && <TreeTab onJumpToMessage={onJumpToMessage} />}
        {activeTab === "notes" && <NotesTab onJumpToMessage={onJumpToMessage} />}
        {activeTab === "settings" && <SettingsTab />}
      </aside>

      <SelectionToolbar getMessageElement={getMessageElement} />
    </>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: JSX.Element; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={[
        "flex h-10 items-center justify-center gap-1.5 border-b-2 text-xs",
        active ? "border-chattree-accent text-chattree-accent" : "border-transparent text-chattree-muted hover:bg-white"
      ].join(" ")}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TreeTab({ onJumpToMessage }: { onJumpToMessage: (messageId: string) => void }) {
  const envelope = useChatTreeStore((state) => state.envelope);
  const root = envelope.nodes[envelope.tree.rootNodeId];
  const overview = envelope.tree.overviewSummaryId ? envelope.summaries[envelope.tree.overviewSummaryId] : null;
  const pinnedNodes = Object.values(envelope.nodes).filter((node) => node.isPinned);

  return (
    <div className="chattree-scrollbar h-[calc(100vh-96px)] overflow-y-auto px-3 py-3">
      <section className="mb-3 rounded-md border border-chattree-line bg-white p-3">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-chattree-muted">
          <Sparkles size={14} />
          <span>Overview</span>
        </div>
        <p className="text-sm leading-5">{overview?.body ?? root?.contentPreview}</p>
      </section>

      {pinnedNodes.length > 0 && (
        <section className="mb-3">
          <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-chattree-muted">
            <Star size={13} />
            <span>Pinned</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pinnedNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className="rounded-md border border-chattree-line bg-white px-2 py-1 text-xs"
                onClick={() => node.messageId && onJumpToMessage(node.messageId)}
              >
                {node.title}
              </button>
            ))}
          </div>
        </section>
      )}

      <BranchSuggestions />

      {root && <TreeNodeView node={root} depth={0} onJumpToMessage={onJumpToMessage} />}
    </div>
  );
}

function TreeNodeView({
  node,
  depth,
  onJumpToMessage
}: {
  node: ChatTreeNode;
  depth: number;
  onJumpToMessage: (messageId: string) => void;
}) {
  const envelope = useChatTreeStore((state) => state.envelope);
  const selectNode = useChatTreeStore((state) => state.selectNode);
  const selectedNodeId = useChatTreeStore((state) => state.selectedNodeId);
  const togglePin = useChatTreeStore((state) => state.togglePin);
  const toggleBranchPoint = useChatTreeStore((state) => state.toggleBranchPoint);
  const addNote = useChatTreeStore((state) => state.addNote);
  const childNodes = node.childIds.map((childId) => envelope.nodes[childId]).filter(Boolean);

  const addMessageNote = () => {
    const body = window.prompt("Add a message note");
    if (!body?.trim()) {
      return;
    }
    addNote({
      conversationId: node.conversationId,
      messageId: node.messageId,
      highlightId: null,
      scope: "message",
      selectionRange: null,
      quote: node.contentPreview,
      body: body.trim()
    });
  };

  return (
    <div className="relative" style={{ paddingLeft: depth * 14 }}>
      {depth > 0 && <div className="absolute left-1 top-0 h-full border-l border-dashed border-chattree-line" />}
      <div
        className={[
          "mb-2 rounded-md border bg-white p-2",
          selectedNodeId === node.id ? "border-chattree-accent" : "border-chattree-line"
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            title={node.contentPreview}
            onClick={() => {
              selectNode(node.id);
              if (node.messageId) {
                onJumpToMessage(node.messageId);
              }
            }}
          >
            <div className="truncate text-sm font-semibold">{node.title}</div>
            <div className="line-clamp-2 text-xs leading-4 text-chattree-muted">{node.contentPreview}</div>
          </button>
          <div className="flex shrink-0 gap-1">
            <button type="button" aria-label="Add message note" className="grid h-7 w-7 place-items-center rounded-md hover:bg-chattree-panel" onClick={addMessageNote}>
              <MessageSquarePlus size={14} />
            </button>
            <button
              type="button"
              aria-label="Mark branch point"
              className={[
                "grid h-7 w-7 place-items-center rounded-md hover:bg-chattree-panel",
                node.isBranchPoint ? "text-chattree-branch" : ""
              ].join(" ")}
              onClick={() => toggleBranchPoint(node.id)}
            >
              <GitBranch size={14} />
            </button>
            <button type="button" aria-label="Pin node" className="grid h-7 w-7 place-items-center rounded-md hover:bg-chattree-panel" onClick={() => togglePin(node.id)}>
              {node.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
          </div>
        </div>
      </div>
      {childNodes.map((child) => (
        <TreeNodeView key={child.id} node={child} depth={depth + 1} onJumpToMessage={onJumpToMessage} />
      ))}
    </div>
  );
}

function BranchSuggestions() {
  const envelope = useChatTreeStore((state) => state.envelope);
  const acceptBranchSuggestion = useChatTreeStore((state) => state.acceptBranchSuggestion);
  const rejectBranchSuggestion = useChatTreeStore((state) => state.rejectBranchSuggestion);
  const suggestions = envelope.branchSuggestions.filter((suggestion) => suggestion.accepted === null).slice(0, 4);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section className="mb-3 rounded-md border border-chattree-line bg-white p-2">
      <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-chattree-muted">
        <GitBranch size={13} />
        <span>Split Suggestions</span>
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <article key={suggestion.id} className="rounded-md bg-chattree-panel p-2 text-xs leading-4">
            <p className="mb-2">{suggestion.reason}</p>
            <div className="flex gap-1">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-chattree-accent px-2 py-1 font-semibold text-white"
                onClick={() => acceptBranchSuggestion(suggestion.id)}
              >
                <Check size={12} />
                Accept
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-chattree-line px-2 py-1 font-semibold"
                onClick={() => rejectBranchSuggestion(suggestion.id)}
              >
                <X size={12} />
                Reject
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function NotesTab({ onJumpToMessage }: { onJumpToMessage: (messageId: string) => void }) {
  const envelope = useChatTreeStore((state) => state.envelope);
  const selectedTagId = useChatTreeStore((state) => state.selectedTagId);
  const setSelectedTag = useChatTreeStore((state) => state.setSelectedTag);
  const addNote = useChatTreeStore((state) => state.addNote);
  const addTag = useChatTreeStore((state) => state.addTag);
  const tagEntity = useChatTreeStore((state) => state.tagEntity);
  const tags = Object.values(envelope.tags);

  const notesAndHighlights = useMemo(() => {
    const taggedIds = new Set(
      selectedTagId
        ? envelope.taggedEntities.filter((entry) => entry.tagId === selectedTagId).map((entry) => `${entry.entityType}:${entry.entityId}`)
        : []
    );

    const notes = Object.values(envelope.notes)
      .filter((note) => !selectedTagId || taggedIds.has(`note:${note.id}`))
      .map((note) => ({ type: "note" as const, messageId: note.messageId, quote: note.quote, body: note.body, createdAt: note.createdAt, id: note.id }));

    const highlights = Object.values(envelope.highlights)
      .filter((highlight) => !selectedTagId || taggedIds.has(`highlight:${highlight.id}`))
      .map((highlight) => ({
        type: "highlight" as const,
        messageId: highlight.messageId,
        quote: highlight.quote,
        body: `${highlight.color} highlight`,
        createdAt: highlight.createdAt,
        id: highlight.id
      }));

    return [...notes, ...highlights].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [envelope, selectedTagId]);

  const groups = notesAndHighlights.reduce<Record<string, typeof notesAndHighlights>>((accumulator, item) => {
    const key = item.messageId ?? "conversation";
    accumulator[key] = [...(accumulator[key] ?? []), item];
    return accumulator;
  }, {});

  const addConversationNote = () => {
    const body = window.prompt("Add a conversation note");
    if (!body?.trim()) {
      return;
    }
    addNote({
      conversationId: envelope.conversation.id,
      messageId: null,
      highlightId: null,
      scope: "conversation",
      selectionRange: null,
      quote: null,
      body: body.trim()
    });
  };

  const addReviewTag = () => {
    const label = window.prompt("New review tag, e.g. vocabulary, grammar, mechanism");
    if (label) {
      addTag(label);
    }
  };

  return (
    <div className="chattree-scrollbar h-[calc(100vh-96px)] overflow-y-auto px-3 py-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Review Notes</div>
        <button type="button" className="grid h-8 w-8 place-items-center rounded-md border border-chattree-line bg-white" onClick={addConversationNote} aria-label="Add conversation note">
          <NotebookTabs size={15} />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          className={tagButtonClass(selectedTagId === null)}
          onClick={() => setSelectedTag(null)}
        >
          all
        </button>
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={tagButtonClass(selectedTagId === tag.id)}
            onClick={() => setSelectedTag(tag.id)}
          >
            {tag.label}
          </button>
        ))}
        <button type="button" className={tagButtonClass(false)} onClick={addReviewTag}>
          + tag
        </button>
      </div>

      {Object.entries(groups).map(([messageId, items]) => (
        <section key={messageId} className="mb-3 rounded-md border border-chattree-line bg-white p-2">
          <button
            type="button"
            className="mb-2 text-left text-xs font-semibold text-chattree-muted"
            onClick={() => messageId !== "conversation" && onJumpToMessage(messageId)}
          >
            {messageId === "conversation" ? "Conversation notes" : envelope.messages[messageId]?.content.slice(0, 54) || messageId}
          </button>
          <div className="space-y-2">
            {items.map((item) => (
              <article key={`${item.type}:${item.id}`} className="rounded-md bg-chattree-panel p-2 text-xs leading-4">
                {item.quote && <blockquote className="mb-1 border-l-2 border-chattree-accent pl-2 text-chattree-muted">{item.quote}</blockquote>}
                <div>{item.body}</div>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <Tags size={12} className="text-chattree-muted" />
                  {getTagLabels(envelope, item.type, item.id).map((label) => (
                    <span key={label} className="rounded-sm bg-white px-1.5 py-0.5 text-[10px] text-chattree-muted">
                      {label}
                    </span>
                  ))}
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className="rounded-sm border border-chattree-line bg-white px-1.5 py-0.5 text-[10px]"
                      onClick={() => tagEntity({ tagId: tag.id, entityType: item.type, entityId: item.id })}
                    >
                      +{tag.label}
                    </button>
                  ))}
                </div>
                <time className="mt-1 block text-[10px] text-chattree-muted">{new Date(item.createdAt).toLocaleString()}</time>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SettingsTab() {
  const persist = useChatTreeStore((state) => state.persist);
  const envelope = useChatTreeStore((state) => state.envelope);
  const copyExport = async (format: "json" | "markdown") => {
    const text = format === "json" ? exportTreeAsJson(envelope) : exportTreeAsMarkdown(envelope);
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-3 px-3 py-3 text-sm">
      <section className="rounded-md border border-chattree-line bg-white p-3">
        <div className="font-semibold">API keys</div>
        <p className="mt-1 text-xs leading-4 text-chattree-muted">
          Configure OpenAI or Anthropic in the extension options page. Keys are encrypted and stored only in chrome.storage.local.
        </p>
        <button type="button" className="mt-3 rounded-md bg-chattree-accent px-3 py-2 text-xs font-semibold text-white" onClick={() => chrome.runtime.openOptionsPage()}>
          Open Options
        </button>
      </section>
      <section className="rounded-md border border-chattree-line bg-white p-3">
        <div className="font-semibold">Persistence</div>
        <p className="mt-1 text-xs leading-4 text-chattree-muted">Tree, notes, highlights, tags, and imports are saved per conversation in IndexedDB.</p>
        <button type="button" className="mt-3 rounded-md border border-chattree-line px-3 py-2 text-xs font-semibold" onClick={() => void persist()}>
          Save Now
        </button>
      </section>
      <section className="rounded-md border border-chattree-line bg-white p-3">
        <div className="font-semibold">Export</div>
        <p className="mt-1 text-xs leading-4 text-chattree-muted">Copy the current tree, summaries, notes, highlights, and tags.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" className="inline-flex items-center gap-1 rounded-md border border-chattree-line px-3 py-2 text-xs font-semibold" onClick={() => void copyExport("json")}>
            <FileJson size={14} />
            JSON
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-md border border-chattree-line px-3 py-2 text-xs font-semibold" onClick={() => void copyExport("markdown")}>
            <FileText size={14} />
            Markdown
          </button>
        </div>
      </section>
    </div>
  );
}

function ManualSummaryButton() {
  const envelope = useChatTreeStore((state) => state.envelope);
  const applyGeneratedSummary = useChatTreeStore((state) => state.applyGeneratedSummary);
  const [busy, setBusy] = useState(false);

  const requestSummary = async () => {
    setBusy(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: RUNTIME_MESSAGES.SUMMARIZE,
        payload: {
          conversationId: envelope.conversation.id,
          nodeId: envelope.tree.rootNodeId,
          kind: "overview",
          messages: Object.values(envelope.messages)
        }
      }) as RuntimeResponse<GeneratedSummary>;
      if (!response.ok) {
        window.alert(response.error ?? "Summary failed");
      } else if (response.data) {
        applyGeneratedSummary(response.data, envelope.tree.rootNodeId, "overview");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      aria-label="Generate summary"
      className="grid h-8 w-8 place-items-center rounded-md text-chattree-muted hover:bg-white hover:text-chattree-ink disabled:opacity-50"
      disabled={busy}
      onClick={() => void requestSummary()}
    >
      <Sparkles size={17} />
    </button>
  );
}

function SelectionToolbar({ getMessageElement }: { getMessageElement: (messageId: string) => HTMLElement | null }) {
  const envelope = useChatTreeStore((state) => state.envelope);
  const selectedTagId = useChatTreeStore((state) => state.selectedTagId);
  const addHighlight = useChatTreeStore((state) => state.addHighlight);
  const addNote = useChatTreeStore((state) => state.addNote);
  const [selectionState, setSelectionState] = useState<{ rect: DOMRect; messageId: string; range: Range; quote: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    const updateSelection = () => {
      const range = getCurrentSelectionRange();
      if (!range) {
        setSelectionState(null);
        return;
      }

      const messageElement = findClosestMessageElement(range.commonAncestorContainer);
      if (!messageElement?.dataset.chattreeMessageId) {
        setSelectionState(null);
        return;
      }

      setSelectionState({
        rect: range.getBoundingClientRect(),
        messageId: messageElement.dataset.chattreeMessageId,
        range,
        quote: range.toString()
      });
    };

    document.addEventListener("selectionchange", updateSelection);
    return () => document.removeEventListener("selectionchange", updateSelection);
  }, []);

  if (!selectionState) {
    return null;
  }

  const top = Math.max(12, selectionState.rect.top - 48);
  const left = Math.min(window.innerWidth - 288, Math.max(12, selectionState.rect.left));

  const createHighlight = (color: HighlightColor) => {
    const messageElement = getMessageElement(selectionState.messageId);
    if (!messageElement) {
      return;
    }
    addHighlight({
      conversationId: envelope.conversation.id,
      messageId: selectionState.messageId,
      selectionRange: createTextAnchor(messageElement, selectionState.range),
      color,
      quote: selectionState.quote
    }, selectedTagId ? [selectedTagId] : []);
    window.setTimeout(() => reapplyHighlights(Object.values(useChatTreeStore.getState().envelope.highlights), getMessageElement), 0);
  };

  const createSelectionNote = () => {
    const messageElement = getMessageElement(selectionState.messageId);
    if (!messageElement || !noteDraft.trim()) {
      return;
    }
    addNote({
      conversationId: envelope.conversation.id,
      messageId: selectionState.messageId,
      highlightId: null,
      scope: "selection",
      selectionRange: createTextAnchor(messageElement, selectionState.range),
      quote: selectionState.quote,
      body: noteDraft.trim()
    }, selectedTagId ? [selectedTagId] : []);
    setNoteDraft("");
  };

  const copyQuote = async () => {
    await navigator.clipboard.writeText(`${selectionState.quote}\n\nSource: ${window.location.href}#${selectionState.messageId}`);
  };

  return (
    <div
      className="fixed z-[2147483647] w-[276px] rounded-md border border-chattree-line bg-white p-2 text-chattree-ink shadow-chattree"
      style={{ top, left }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-semibold text-chattree-muted">
          <Highlighter size={14} />
          <span>Selection</span>
        </div>
        <button type="button" className="grid h-7 w-7 place-items-center rounded-md hover:bg-chattree-panel" aria-label="Copy quote" onClick={() => void copyQuote()}>
          <Copy size={14} />
        </button>
      </div>
      <div className="mb-2 flex gap-1">
        {(["yellow", "green", "blue", "pink"] as HighlightColor[]).map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Highlight ${color}`}
            className="h-7 flex-1 rounded-md border border-chattree-line"
            style={{ background: colorToCss(color) }}
            onClick={() => createHighlight(color)}
          />
        ))}
      </div>
      <div className="flex gap-1">
        <input
          className="min-w-0 flex-1 rounded-md border border-chattree-line px-2 text-xs outline-none focus:border-chattree-accent"
          value={noteDraft}
          placeholder="Add note"
          onChange={(event) => setNoteDraft(event.target.value)}
        />
        <button type="button" className="rounded-md bg-chattree-accent px-2 text-xs font-semibold text-white" onClick={createSelectionNote}>
          Add
        </button>
      </div>
    </div>
  );
}

function findClosestMessageElement(node: Node): HTMLElement | null {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return element?.closest<HTMLElement>("[data-chattree-message-id]") ?? null;
}

function colorToCss(color: HighlightColor): string {
  return {
    yellow: "rgba(250, 204, 21, 0.65)",
    green: "rgba(74, 222, 128, 0.55)",
    blue: "rgba(96, 165, 250, 0.55)",
    pink: "rgba(244, 114, 182, 0.55)"
  }[color];
}

function tagButtonClass(active: boolean): string {
  return [
    "rounded-md border px-2 py-1 text-xs",
    active ? "border-chattree-accent bg-chattree-accent text-white" : "border-chattree-line bg-white text-chattree-muted"
  ].join(" ");
}

function getTagLabels(
  envelope: ReturnType<typeof useChatTreeStore.getState>["envelope"],
  entityType: "note" | "highlight" | "node",
  entityId: string
): string[] {
  return envelope.taggedEntities
    .filter((entry) => entry.entityType === entityType && entry.entityId === entityId)
    .map((entry) => envelope.tags[entry.tagId]?.label)
    .filter((label): label is string => Boolean(label));
}
