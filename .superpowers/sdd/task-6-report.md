# AI 学院 Task 6 报告 — BLACK BOX / Amber 样式

## 范围

- 新增 `src/styles/academy.css`，为学院目录、主题详情、工具列表和工具详情提供独立且作用域化的视觉层。
- 新增 `src/styles/academy.test.ts`，锁定学院选择器、三列/单列断点、native details 目录、减少动态偏好和样式导入顺序。
- 在 `src/main.tsx` 中将学院样式加载在 tokens 与现有 `global.css` BLACK BOX 视觉层之后。
- 仅对 `src/pages/academy/AcademyPages.tsx` 与 `AcademyPageParts.tsx` 添加样式 class、主题章节锚点及 native `<details>` / `<summary>` 目录；未调整文案、路由或数据逻辑。
- 未修改首页、`global.css`、领域模型或其他受保护模块，未新增依赖。

## RED 证据

- 命令：`npm run test:run -- src/styles/academy.test.ts`
- 结果：4/4 预期失败；`academy.css` 尚不存在，`.academy-hero`、`.academy-stage-grid`、`.academy-topic-layout`、`.academy-tool-radar`、`.bb-btn--academy`、响应式/减少动态规则及入口导入均缺失。

## 实现

- 档案式 hero 与 brief 使用现有 `--canvas` / `--surface*` / `--text*` / `--border*` / `--accent*` / `--glow-accent` token，并延续 `.bb-btn` 约定。
- 五阶段区域使用琥珀 stage chip、清晰的阶段标题层级与主题卡；主题卡在允许动态时提供轻量浮起/发光反馈。
- Tool Radar 保持在主学习路径之后，采用更密集的网格/雷达纹理与受控扫描动画，视觉显著但层级次于推荐主题和学习阶段。
- 主题页在 `64rem` 以上使用目录、正文、成长关联三列；在 `64rem` 及以下折叠为单列，并由原生 details 控制目录展开。
- 所有新增动态均位于 `prefers-reduced-motion: no-preference`，并在 `reduce` 下显式禁用扫描和卡片/button transition。

## 验证

- `npm run test:run -- src/styles/academy.test.ts src/styles/surface-depth.test.ts src/pages/academy/AcademyPages.test.tsx`：3 files，20 tests passed（含 P1 回归测试）。
- `npm run typecheck`：通过。
- `npm run build`：内容质量、索引/schema 漂移、学院内容校验、TypeScript 与 Vite production build 全部通过。
- Prettier 已应用于本任务涉及文件。

## 已知关注点

- Vite build 保留仓库既有的大 chunk 警告（主 bundle 超过 500 kB）；本任务仅新增 CSS/类名与静态目录标记，不引入 JavaScript 依赖或新的 bundle 分割边界。
- 学院详情目录默认展开，移动端可通过原生 details 折叠；桌面端为稳定三列阅读导航保持显示。

## P1 审查修复

- 删除 `.academy-hero::after` 与 `.academy-file-brief::after` 两条伪元素规则，不再通过 CSS `content` 注入 `ACADEMY / FILE` 或 `KNOWLEDGE DOSSIER` 可见文案。
- 同步删除移动端中仅用于隐藏上述伪元素的选择器；其余 BLACK BOX / Amber 视觉规则保持不变。
- 未修改页面文案、路由、数据逻辑或学院 JSX。
- RED：`npm run test:run -- src/styles/academy.test.ts` 新增回归断言后 1/5 预期失败，直接命中 `.academy-hero::after`。
- GREEN：删除规则后同一命令 5/5 通过。
