# Permission Justification / 权限说明

[简体中文](#中文)

Use this file when filling Chrome Web Store permission justification fields. Keep each explanation concrete and tied to visible ChatTree features.

## English

### Chrome Permission: `storage`

ChatTree uses `chrome.storage.local` for small local settings, encrypted API key records, and provider configuration. The extension does not use `chrome.storage.sync`.

### Host Permission: `https://chatgpt.com/*`

Required to inject the ChatTree sidebar into current ChatGPT pages, observe visible message DOM changes, scroll to selected messages, and attach highlight/note controls to selected text.

### Host Permission: `https://chat.openai.com/*`

Required for legacy ChatGPT conversation URLs that still resolve under `chat.openai.com`.

### Host Permission: `https://claude.ai/*`

Required to inject the ChatTree sidebar into Claude.ai, observe visible message DOM changes, scroll to selected messages, and attach highlight/note controls to selected text.

### Host Permission: `https://gemini.google.com/*`

Required to inject the ChatTree sidebar into Gemini, observe visible message DOM changes, scroll to selected messages, and attach highlight/note controls to selected text.

### Host Permission: `https://api.openai.com/*`

Required only when the user chooses OpenAI in the options page and triggers summarization or conversation analysis using their own API key. Requests are sent directly from the extension background service worker.

### Host Permission: `https://api.anthropic.com/*`

Required only when the user chooses Anthropic in the options page and triggers summarization or conversation analysis using their own API key. Requests are sent directly from the extension background service worker.

### Permissions Intentionally Not Requested

ChatTree does not request `tabs`, `history`, `identity`, `webRequest`, `cookies`, `downloads`, `scripting`, or `<all_urls>`. The extension is limited to the supported AI chat pages and the optional LLM provider APIs needed for its user-facing features.

---

## 中文

填写 Chrome Web Store 权限说明字段时可使用本文件。每条说明都要和 ChatTree 的可见功能直接对应。

### Chrome 权限：`storage`

ChatTree 使用 `chrome.storage.local` 保存小型本地设置、加密后的 API key 记录和 provider 配置。本扩展不使用 `chrome.storage.sync`。

### Host 权限：`https://chatgpt.com/*`

用于在当前 ChatGPT 页面注入 ChatTree 侧边栏、观察可见消息 DOM 的变化、跳转到指定消息，并给选中文本附加高亮/笔记控件。

### Host 权限：`https://chat.openai.com/*`

用于兼容仍然位于 `chat.openai.com` 下的旧 ChatGPT 对话 URL。

### Host 权限：`https://claude.ai/*`

用于在 Claude.ai 页面注入 ChatTree 侧边栏、观察可见消息 DOM 的变化、跳转到指定消息，并给选中文本附加高亮/笔记控件。

### Host 权限：`https://gemini.google.com/*`

用于在 Gemini 页面注入 ChatTree 侧边栏、观察可见消息 DOM 的变化、跳转到指定消息，并给选中文本附加高亮/笔记控件。

### Host 权限：`https://api.openai.com/*`

只有当用户在 options 页面选择 OpenAI，并用自己的 API key 主动触发摘要或对话分析时才需要。请求由扩展后台 service worker 直接发出。

### Host 权限：`https://api.anthropic.com/*`

只有当用户在 options 页面选择 Anthropic，并用自己的 API key 主动触发摘要或对话分析时才需要。请求由扩展后台 service worker 直接发出。

### 有意不申请的权限

ChatTree 不申请 `tabs`、`history`、`identity`、`webRequest`、`cookies`、`downloads`、`scripting` 或 `<all_urls>`。扩展范围限制在支持的 AI 聊天页面，以及用户可见功能所需的可选 LLM provider API。
