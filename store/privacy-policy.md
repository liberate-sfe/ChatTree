# ChatTree Privacy Policy

[简体中文](#chattree-隐私政策)

Last updated: 2026-05-21

This document is a publishable privacy policy draft for the ChatTree Chrome extension. Before Chrome Web Store submission, host this policy at a stable public URL and place that URL in the Developer Dashboard privacy field.

## English

### Single Purpose

ChatTree helps users review long AI assistant conversations on ChatGPT, Claude.ai, and Gemini by adding a local tree sidebar with summaries, highlights, notes, and export tools.

### Data ChatTree Handles

ChatTree may process these data types locally in the browser:

- Conversation text visible on supported AI chat pages.
- Message metadata such as detected role, message id, timestamp, and page URL-derived conversation id.
- User-created tree nodes, branch decisions, summaries, notes, highlights, highlight anchors, and tags.
- User settings, including selected LLM provider, model name, and encrypted API key.

### Local Storage

ChatTree stores conversation trees, summaries, notes, highlights, tags, and import/export state in IndexedDB on the user's device. Small settings and encrypted API keys are stored in `chrome.storage.local`.

ChatTree does not use `chrome.storage.sync`; data is not synced across devices by this extension.

### API Keys

If the user enters an OpenAI or Anthropic API key, ChatTree encrypts it with AES-GCM before writing it to `chrome.storage.local`. The key is used only by the extension background service worker to call the provider selected by the user.

The encryption key is generated locally and stored locally. This protects the key from casual local inspection, but it is not a substitute for operating-system account security.

### Third-Party Transfers

ChatTree does not run a developer-operated backend server.

When the user has configured an OpenAI or Anthropic API key and manually triggers analysis or summarization, ChatTree sends the relevant conversation text to the selected provider so that provider can generate titles, summaries, or branch suggestions. Those requests are made directly from the extension background service worker to the selected provider API endpoint.

If no API key is configured, ChatTree uses local fallback analysis and does not send conversation text to OpenAI or Anthropic.

### Telemetry, Ads, and Sale of Data

ChatTree does not include telemetry, analytics, advertising, affiliate injection, or tracking code. ChatTree does not sell user data.

### User Control and Deletion

Users can:

- Delete their API key from the options page.
- Remove local browser data for the extension from Chrome settings.
- Export conversation data as JSON or Markdown.
- Delete imported/exported files wherever they saved them.

### Chrome Web Store Limited Use

ChatTree uses user data only to provide or improve its single purpose: local conversation branching, review, note-taking, summarization, and export for supported AI chat pages. ChatTree does not use user data for advertising, credit decisions, data resale, or unrelated purposes.

### Contact

Maintainer: `liberate-sfe`

Before public submission, replace this line with a support email or public issue tracker URL.

---

# ChatTree 隐私政策

[English](#english)

最后更新：2026-05-21

本文档是 ChatTree Chrome 扩展可发布的隐私政策草稿。提交 Chrome Web Store 前，请把本政策发布到稳定的公开 URL，并在 Developer Dashboard 的隐私政策字段中填写该 URL。

## 单一用途

ChatTree 帮助用户复习 ChatGPT、Claude.ai 和 Gemini 上的长 AI 对话：它提供本地树状侧边栏、摘要、高亮、笔记和导出工具。

## ChatTree 处理的数据

ChatTree 可能在浏览器本地处理以下数据：

- 支持的 AI 聊天页面中可见的对话文本。
- 消息元数据，例如检测到的角色、消息 id、时间戳，以及从页面 URL 派生的 conversation id。
- 用户创建的树节点、分支决定、摘要、笔记、高亮、高亮锚点和标签。
- 用户设置，包括选择的 LLM provider、模型名称和加密后的 API key。

## 本地存储

ChatTree 会把对话树、摘要、笔记、高亮、标签和导入/导出状态保存在用户设备上的 IndexedDB 中。小型设置和加密后的 API key 保存在 `chrome.storage.local` 中。

ChatTree 不使用 `chrome.storage.sync`；本扩展不会跨设备同步数据。

## API Key

如果用户输入 OpenAI 或 Anthropic API key，ChatTree 会先使用 AES-GCM 加密，再写入 `chrome.storage.local`。该 key 只会被扩展的后台 service worker 用来调用用户选择的 provider。

加密密钥在本地生成并保存在本地。这可以避免普通的本地明文暴露，但不能替代操作系统账户安全。

## 第三方传输

ChatTree 不运行开发者自建后台服务器。

当用户已经配置 OpenAI 或 Anthropic API key，并主动触发分析或摘要时，ChatTree 会把相关对话文本发送给用户选择的 provider，用于生成标题、摘要或分支建议。这些请求由扩展后台 service worker 直接发往对应 provider API。

如果没有配置 API key，ChatTree 使用本地 fallback 分析，不会把对话文本发送给 OpenAI 或 Anthropic。

## 遥测、广告和数据出售

ChatTree 不包含遥测、分析、广告、联盟链接注入或跟踪代码。ChatTree 不出售用户数据。

## 用户控制与删除

用户可以：

- 在 options 页面删除 API key。
- 在 Chrome 设置中删除本扩展的本地浏览器数据。
- 把对话数据导出为 JSON 或 Markdown。
- 删除自己保存的导入/导出文件。

## Chrome Web Store Limited Use

ChatTree 只会为了实现或改进其单一用途而使用用户数据：在支持的 AI 聊天页面上进行本地对话分支、复习、笔记、摘要和导出。ChatTree 不会把用户数据用于广告、信用决策、数据转售或无关用途。

## 联系方式

维护者：`liberate-sfe`

公开提交前，请把这一行替换为支持邮箱或公开 issue tracker URL。
