# Chrome Web Store Release Checklist

[简体中文](#中文)

This checklist turns the current local extension into a Chrome Web Store submission package.

## English

### 1. Build and Package

```bash
pnpm install
pnpm test
pnpm package:chrome
```

The upload artifact is generated at:

```text
release/chattree-chrome-v0.1.0.zip
```

### 2. Local Review

- Load `dist/` from `chrome://extensions` with Developer mode enabled.
- Test the right-side toggle and sidebar on:
  - `https://chatgpt.com/`
  - `https://claude.ai/`
  - `https://gemini.google.com/`
- Verify Tree, Notes, and Settings tabs.
- Verify text selection shows the floating toolbar.
- Verify JSON or Markdown export.
- Verify options page key save/delete behavior.
- Confirm no API key appears in screenshots or logs.

### 3. Store Assets

Prepare these before submission:

- 128x128 icon from `public/icons/icon-128.png`.
- At least one screenshot that shows the sidebar on a supported site.
- Optional screenshots for Notes and Options.
- Store description from `store/chrome-web-store-listing.md`.
- Privacy policy hosted at a stable public URL using `store/privacy-policy.md`.
- Permission justifications from `store/permission-justification.md`.

### 4. Developer Dashboard

1. Open the Chrome Developer Dashboard.
2. Add a new item.
3. Upload `release/chattree-chrome-v0.1.0.zip`.
4. Fill Store Listing, Privacy, Distribution, and Test Instructions.
5. Use deferred publishing for first review if you want to inspect approval status before public release.

### 5. Pre-Submit Checks

- The package contains only built extension files, not `src/`, `.git/`, or `node_modules/`.
- The manifest is Manifest V3.
- Permissions are narrow and match visible features.
- The privacy policy matches real behavior.
- The listing does not imply unsupported sync, Firefox support, embeddings, or Chrome Web Store packaging features not yet implemented.

---

## 中文

这个清单把当前本地扩展整理成可提交 Chrome Web Store 的插件包。

### 1. 构建和打包

```bash
pnpm install
pnpm test
pnpm package:chrome
```

生成的上传文件位置：

```text
release/chattree-chrome-v0.1.0.zip
```

### 2. 本地检查

- 在 `chrome://extensions` 打开开发者模式，并加载 `dist/`。
- 在以下网站测试右侧 toggle 和侧边栏：
  - `https://chatgpt.com/`
  - `https://claude.ai/`
  - `https://gemini.google.com/`
- 检查 Tree、Notes 和 Settings 三个标签页。
- 检查选中文本后是否出现浮动工具栏。
- 检查 JSON 或 Markdown 导出。
- 检查 options 页面保存/删除 key 的行为。
- 确认截图和日志中没有暴露 API key。

### 3. 商店素材

提交前准备：

- `public/icons/icon-128.png` 作为 128x128 图标。
- 至少一张展示支持网站上侧边栏的截图。
- 可选：Notes 和 Options 截图。
- 使用 `store/chrome-web-store-listing.md` 中的商店描述。
- 把 `store/privacy-policy.md` 发布到稳定公开 URL 后填写到隐私政策字段。
- 使用 `store/permission-justification.md` 中的权限说明。

### 4. Developer Dashboard

1. 打开 Chrome Developer Dashboard。
2. 新增 item。
3. 上传 `release/chattree-chrome-v0.1.0.zip`。
4. 填写 Store Listing、Privacy、Distribution 和 Test Instructions。
5. 第一次审核可选择 deferred publishing，便于通过审核后再手动公开发布。

### 5. 提交前检查

- zip 里只有构建后的扩展文件，不包含 `src/`、`.git/` 或 `node_modules/`。
- manifest 是 Manifest V3。
- 权限范围足够窄，并且和可见功能一致。
- 隐私政策和真实行为一致。
- 商店描述不要暗示尚未实现的同步、Firefox、embeddings 或其它未来功能。
