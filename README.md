[简体中文](README.zh-CN.md)

# ChatTree

ChatTree is a Manifest V3 Chrome extension that overlays a 320px tree-view sidebar on ChatGPT, Claude.ai, and Gemini. It helps turn one long linear AI conversation into branches, summaries, highlights, and review notes.

## Worked Example

A PhD student reads a foundational ecotoxicology paper with an AI assistant. The session becomes three interleaved activities: paper walkthrough, English vocabulary, and biology mechanism "why?" questions. ChatTree shows those as three branches off the root, so a grammar note such as "fewer vs less" can be reviewed separately from a mechanism note such as "estrogen -> vitellogenin -> egg production".

![ChatTree screenshot placeholder](docs/screenshot-placeholder.svg)

## Supported Sites

- ChatGPT: `https://chatgpt.com/*` and `https://chat.openai.com/*`
- Claude.ai: `https://claude.ai/*`
- Gemini: `https://gemini.google.com/*`

## Install

1. Install dependencies with `pnpm install`.
2. Build the extension with `pnpm build`.
3. Open Chrome and go to `chrome://extensions`.
4. Enable Developer mode.
5. Click Load unpacked and select the generated `dist/` directory.

## Configuration

1. Open the ChatTree options page.
2. Choose OpenAI or Anthropic.
3. Enter the model name and your API key.
4. Save settings.

API keys are encrypted with AES-GCM and stored in `chrome.storage.local`. ChatTree does not use `chrome.storage.sync` and does not include telemetry. Conversation trees, notes, highlights, tags, and imports are stored per conversation in IndexedDB through Dexie.

## MVP Features

- Branching tree sidebar with jump-to-message and pinned nodes.
- MutationObserver-based DOM extraction with fallback selectors for all supported sites.
- Per-site DOM adapter tests for ChatGPT and Gemini-style markup.
- IndexedDB restore flow that reloads saved tree, notes, highlights, tags, and summaries for the active conversation.
- Retroactive branch split suggestions with accept/reject controls.
- LLM-generated short titles and 3-5 sentence summaries through the user's own API key.
- Summary responses are written back to the root or selected node.
- Notes and highlights with robust text anchoring based on selected text, offsets, and nearby context.
- Notes tab grouped by message and filterable by tags such as `vocabulary`, `grammar`, and `mechanism`.
- JSON and Markdown export helpers with summaries, notes, highlights, and tags inlined.
- Import parser skeleton for ChatGPT `conversations.json` and Claude JSON exports, with topic-shift branch suggestions.
- Extension popup, options page key deletion, and simple extension icons.

## Development

```bash
pnpm install
pnpm test
pnpm build
```

## Project Structure

```text
ChatTree/
  .github/workflows/build.yml
  docs/screenshot-placeholder.svg
  manifest.json
  options.html
  package.json
  postcss.config.cjs
  tailwind.config.ts
  tsconfig.json
  vite.config.ts
  src/
    background/index.ts
    content/domParser.ts
    content/highlightRenderer.ts
    content/index.tsx
    content/selectionAnchors.ts
    options/main.tsx
    shared/crypto.ts
    shared/export.ts
    shared/import.ts
    shared/messages.ts
    shared/schema.ts
    shared/storage.ts
    sidebar/mockData.ts
    sidebar/SidebarApp.tsx
    sidebar/store.ts
    styles/tailwind.css
    types/rangy.d.ts
```

## Roadmap

- Improve LLM-assisted retroactive branch split review.
- Add semantic search via embeddings.
- Add multi-model switching.
- Port to Firefox.
- Prepare Chrome Web Store packaging.
- Add optional sync across devices.

## License

MIT. See [LICENSE](LICENSE).
