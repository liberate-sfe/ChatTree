# Chrome Web Store Listing Draft

[简体中文](#简体中文)

Use this file as the source text for the Chrome Web Store dashboard fields. Keep screenshots and privacy disclosures aligned with the actual extension behavior before each submission.

## English

### Name

ChatTree

### Short Description

Turn long AI chats into branches, summaries, highlights, and review notes.

### Single Purpose

ChatTree helps users review long conversations on ChatGPT, Claude.ai, and Gemini by adding a local tree sidebar with summaries, highlights, and notes.

### Full Description

ChatTree is a Manifest V3 Chrome extension for people who use AI assistants for serious learning and research. It overlays a collapsible 320px sidebar on ChatGPT, Claude.ai, and Gemini so one long linear chat can be reviewed as a branching conversation tree.

The first target scenario is a PhD student reading a scientific paper with an AI assistant. A single chat may contain paper walkthroughs, English vocabulary explanations, grammar notes, and repeated "why?" questions about biological mechanisms. ChatTree keeps those activities visible as separate branches so the user can return to the right explanation instead of scrolling through a long mixed thread.

Core features:

- Tree sidebar for ChatGPT, Claude.ai, and Gemini.
- Whole-conversation analysis that groups messages into meaningful activity branches.
- Jump-to-message behavior with temporary message highlighting.
- Starred and pinned nodes for quick return points.
- Local notes and highlights, including tags such as vocabulary, grammar, and mechanism.
- JSON and Markdown export for conversation trees, summaries, notes, and highlights.
- Optional OpenAI or Anthropic API key for summary and analysis generation.

Privacy-focused design:

- ChatTree stores conversation trees, notes, highlights, and tags locally in IndexedDB.
- API keys are encrypted and stored only in `chrome.storage.local`.
- ChatTree does not use `chrome.storage.sync`.
- ChatTree does not include telemetry, analytics, ads, or a developer-operated server.
- Conversation text is sent to OpenAI or Anthropic only when the user configures an API key and triggers analysis or summarization.

### Category

Productivity

### Language

English. The README and store-support documents include Simplified Chinese.

### Screenshot Plan

Replace these placeholders with real screenshots from the built extension:

1. Sidebar Tree tab on ChatGPT with three branches: Paper walkthrough, English vocabulary, Mechanism why-chain.
2. Notes tab grouped by tags such as vocabulary, grammar, and mechanism.
3. Options page showing provider selection without exposing an API key.
4. Export menu or Settings tab showing local-only data controls.

### Reviewer Test Instructions

1. Load the extension package and open one of the supported sites: `https://chatgpt.com/`, `https://claude.ai/`, or `https://gemini.google.com/`.
2. The ChatTree toggle appears on the right side of the page.
3. Open the sidebar and use the mock or detected conversation tree.
4. Select text inside a message to show the floating highlight/note toolbar.
5. Open the options page to configure an OpenAI or Anthropic key. No key is required for the local fallback branch analysis demo.
6. Use export controls to produce JSON or Markdown from local conversation data.

---

## 简体中文

### 名称

ChatTree

### 简短描述

把冗长 AI 对话整理成分支、摘要、高亮和复习笔记。

### 单一用途

ChatTree 帮助用户复习 ChatGPT、Claude.ai 和 Gemini 上的长对话：它提供本地树状侧边栏、摘要、高亮和笔记。

### 完整描述

ChatTree 是一个 Manifest V3 Chrome 扩展，面向把 AI 助手用于学习、科研和深度阅读的人。它会在 ChatGPT、Claude.ai 和 Gemini 页面右侧叠加一个可折叠的 320px 侧边栏，把一条很长的线性聊天整理成可回顾的分支树。

第一个核心场景是一位博士生和 AI 助手一起阅读科学论文。同一条对话里可能同时出现论文讲解、英语词汇解释、语法笔记，以及围绕生物机制的连续“为什么”追问。ChatTree 会把这些活动显示成不同分支，让用户不必在混杂的长聊天里反复滚动查找。

核心功能：

- 支持 ChatGPT、Claude.ai 和 Gemini 的树状侧边栏。
- 分析完整对话，把消息归并成有意义的活动分支。
- 点击节点跳转到原消息，并临时高亮。
- 支持收藏和固定节点，方便快速返回。
- 本地笔记和高亮，支持 `vocabulary`、`grammar`、`mechanism` 等标签。
- 支持把对话树、摘要、笔记和高亮导出为 JSON 或 Markdown。
- 可选配置 OpenAI 或 Anthropic API key，用于生成摘要和分析分支。

隐私设计：

- 对话树、笔记、高亮和标签存储在本机 IndexedDB。
- API key 加密后只存储在 `chrome.storage.local`。
- ChatTree 不使用 `chrome.storage.sync`。
- ChatTree 不包含遥测、分析、广告，也不使用开发者自建服务器。
- 只有当用户配置 API key 并主动触发分析或摘要时，对话文本才会发送给用户选择的 OpenAI 或 Anthropic。

### 类别

Productivity / 生产力

### 截图计划

提交前请替换为真实截图：

1. ChatGPT 页面中的 Tree 标签页，展示 Paper walkthrough、English vocabulary、Mechanism why-chain 三个分支。
2. Notes 标签页，按 vocabulary、grammar、mechanism 等标签分组。
3. Options 页面，展示 provider 选择，但不要暴露 API key。
4. 导出菜单或 Settings 标签页，展示本地数据控制。

### 审核测试说明

1. 加载扩展包，并打开 `https://chatgpt.com/`、`https://claude.ai/` 或 `https://gemini.google.com/`。
2. 页面右侧会出现 ChatTree toggle。
3. 打开侧边栏，查看 mock 或实际检测到的对话树。
4. 在消息中选中文本，会出现高亮/笔记浮动工具栏。
5. 打开 options 页面配置 OpenAI 或 Anthropic key。本地 fallback 分支分析 demo 不需要 API key。
6. 使用导出功能，把本地对话数据导出为 JSON 或 Markdown。
