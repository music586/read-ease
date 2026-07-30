# ReadEase

ReadEase 是一款本地运行的 Chrome 阅读模式扩展。它从新闻和博客页面提取正文，在当前网页上方创建隔离的 Shadow DOM 阅读层，并提供可保存的排版设置和网站提取规则。

## 功能

- 点击扩展图标或按 `Alt+Shift+R` 进入、退出阅读模式
- 使用 Readability 本地提取标题、作者和正文
- 保留图片、链接、引用、列表、代码块和表格
- 移除脚本、表单、事件属性和无关网页组件
- 浅色、米色和深色主题
- 调整字体、字号、字距、行距、段距、正文宽度和页面边距
- 全局排版设置，可由网站专属设置覆盖
- 手动点选正文并保存 CSS Selector 网站规则
- 高级 CSS Selector 编辑
- 用户授权后为指定网站自动进入阅读模式

正文和浏览历史不会上传，扩展也不加载远程执行代码。

## 本地开发

要求 Node.js 20 或更高版本。

```bash
npm install
npm run check
npm run check:dist
```

生产构建输出到 `dist/`。

## 在 Chrome 中加载

1. 运行 `npm run build`。
2. 打开 `chrome://extensions`。
3. 开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择本项目的 `dist/` 目录。
6. 在一篇新闻或博客文章中点击 ReadEase 图标。

阅读模式右上角的 `Aa` 打开排版面板，`×` 或 `Esc` 退出。提取失败时，原网页保持不变，可以选择“选择正文”并点击文章正文区域。

## 网站规则和自动模式

“修正此网站”会让用户在原网页上点选正文。保存后，用户规则优先于通用正文算法。

自动模式只适用于已保存规则的网站。开启“访问此网站时自动进入”时，Chrome 会请求当前域名的可选权限，例如：

```text
https://example.com/*
```

拒绝权限不会影响手动阅读。关闭自动模式会注销该域名的动态 Content Script，并移除对应站点权限。

## 验证

```bash
npm run typecheck
npm run test:run
npm run build
npm run check:dist
git diff --check
```

手动检查：

- 静态新闻页可以进入和退出，原页面内容不变
- SPA 页面 URL 变化后不会残留旧文章阅读层
- 无正文页面显示失败提示，不显示空白覆盖层
- 无效 Selector 不能保存
- 拒绝网站权限后仍能手动进入
- 自动进入后主动退出，在同一 URL 不会立即再次打开

## 项目结构

- `src/extraction/`：规则提取和 Readability 回退
- `src/sanitization/`：正文安全清洗和资源 URL 处理
- `src/domain/`：文章、排版和网站规则模型
- `src/storage/`：Chrome 本地存储适配
- `src/ui/`：Shadow DOM 阅读层和排版面板
- `src/rule-editor/`：网页元素点选和规则编辑
- `src/content/`：页面生命周期控制
- `src/background.ts`：工具栏、快捷键和可选权限管理

