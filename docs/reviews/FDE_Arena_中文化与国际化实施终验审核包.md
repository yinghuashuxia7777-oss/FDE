# FDE Arena 中文化与国际化实施终验审核包

> 文档日期：2026-07-13
> 项目：FDE Arena
> 当前分支：`codex/fde-arena-mvp`
> 已提交基线：`a024c84a feat: add product data foundation`
> 审核性质：中文化与国际化实施后终验
> 审核目标：判断当前 UI 中文化是否可以验收，以及项目是否可以继续进入用户体验验证阶段

---

## 一、一键使用方法

将本 MD 文件直接上传给 ChatGPT，然后只发送下面这段话：

> 请作为资深 React/TypeScript 工程负责人、国际化架构审计员、无障碍审计员和本地数据兼容性审计员，对本审核包做一次独立的实施后终验。当前内容平台架构已经通过终验，不要重新设计架构，不要直接写代码。请严格核查：第一次打开是否固定为简体中文、中英文切换与持久化是否可靠、页面程序文案是否真正经过翻译边界、Content Pack 原文是否保持不变、英文界面是否泄漏中文程序文案、无障碍和回归测试是否足够。按照文末强制格式输出 `PASS`、`PASS_WITH_FIXES` 或 `FAIL`。所有问题必须给出可验证证据、实际影响和最小修复边界；不得借机重构内容平台、训练引擎或数据库。

---

## 二、审核者角色与强制边界

本次审核对象是一个已经完成内容平台、FDE 案件、本地训练闭环和用户历史兼容机制的 React 应用。本轮只允许审核表示层中文化和国际化实施。

审核时必须遵守：

1. 不得建议重新初始化项目、重写全站或替换已通过终验的内容平台。
2. 不得建议修改 Content Pack、Case Schema、Training Engine、Scoring、Mastery、Attempt 或 IndexedDB 结构来解决 UI 翻译问题。
3. 不得以未实现 CMS、后台、登录、云同步、社区或 AI 翻译作为不通过理由；这些均不在本轮范围。
4. 正式案件标题、场景、证据、选项、解析、Domain 和 Skill 名称属于 Content Pack 原文，本轮明确禁止修改。不得因此要求在 TSX 中加入案件翻译。
5. 本审核包包含关键代码摘要和已运行验证结果，但不是整个仓库的逐行 diff。如证据不足，应标记 `NOT_PROVEN` 并指明必须查看的精确文件，不得虚构通过或虚构问题。
6. 如发现问题，必须给出不会推翻当前实现的最小修复边界。
7. 不得将工作区尚未提交误写为功能实施失败；这只是交付流程风险。

---

## 三、结论判定标准

### PASS

同时满足：

- 第一次打开固定为 `zh-CN`，且没有浏览器语言自动探测。
- 中英文可实时切换、全局同步、持久化并安全回退。
- 所有核心产品页的程序 UI 文案经过统一翻译边界。
- 英文词典不含中文程序文案，Content Pack 原文保持不变。
- 不存在会丢失用户记录或改变训练、评分、Mastery 行为的回归。
- 测试、TypeScript、ESLint、Prettier 和生产构建全部通过。

### PASS_WITH_FIXES

核心实施成立，但存在不需要重构、可在当前表示层内完成的有界修复项。必须明确它是否阻断用户体验测试或只是发布前修复。

### FAIL

存在下列任一问题：

- 实际代码读取 `navigator.language` 或其他浏览器 locale 决定首次语言。
- 顶部切换器和 Settings 维护两份独立语言状态。
- 切换语言必须重新加载页面，或持久化损坏时应用无法启动。
- 正式题目、答案或解析被复制到翻译词典或 TSX 中。
- 中文化修改破坏 Attempt、Progress、Mistake、Mastery、评分或历史案件版本。
- 核心页面仍存在大量用户可见的硬编码英文程序文案，且无自动门禁。

---

## 四、项目基线与不得推翻的能力

### 4.1 技术栈

- React 19
- TypeScript 6，严格模式
- Vite 8
- React Router 7
- IndexedDB，通过 `idb` 访问
- Zod 4
- Vitest、Testing Library、fake-indexeddb
- 本地优先，固定本地用户 `local-user`
- 无后端、无账号、无运行时远程 API

### 4.2 本轮之前已存在的能力

- 独立 `content/` 目录、Content Pack、Manifest、Schema 和自动索引。
- 24 个活跃发布案件，27 个历史案件版本。
- 12 类题型、节点分支、三次作答、提示、答案揭示、后果与评分。
- Attempt、Progress、Mistake、Mastery 和 Settings 本地仓储。
- 今日训练推荐、完整作答、评分、Mastery 更新和精确版本 Debrief 闭环。
- Dashboard、Cases、Training、Debrief、Mistakes、Skills、Profile 和 Settings 页面。

### 4.3 当前工作区状态

- 当前分支为 `codex/fde-arena-mvp`。
- 已提交基线为 `a024c84a`。
- 内容平台、快速 MVP 和本轮国际化修改仍存在当前工作区。
- 本审核应以当前工作区实际代码为准，不应只审查已提交基线。

---

## 五、本轮强制要求

| 编号 | 必须满足的要求 |
|---|---|
| L1 | 第一次打开固定使用 `zh-CN`，不根据浏览器语言自动判断。 |
| L2 | 保留 `en-US`，切换后页面立即更新，无需刷新。 |
| L3 | 偏好使用结构化 JSON 写入 localStorage，坏 JSON、未知语言和 `SecurityError` 都必须安全回退。 |
| L4 | 应用只有一份语言状态，顶部切换器、训练页和 Settings 同步。 |
| L5 | 桌面、移动顶栏和沉浸式训练页都可以访问语言切换。 |
| L6 | Dashboard、Cases、Training、Debrief、Mistakes、Skills、Profile、Settings 的程序文案接入统一 `t()` 边界。 |
| L7 | 导航、按钮、筛选、状态、弹窗、加载、空状态、错误和无障碍名称同样可翻译。 |
| L8 | 正式 Content Pack 案件内容保持原文，不进入 TSX 或 UI 词典。 |
| L9 | 英文 UI 词典不得含中文程序文案。 |
| L10 | FDE、Agent、RAG、LLM、Prompt、Embedding、Vector Database、Tool Calling、Eval、Guardrails、MCP、Memory、Mastery、API、HTTP、JSON、Docker、Kubernetes、Git、SQL、CI/CD、SDK、OAuth、Webhook 和 Token 按要求保留英文。 |
| L11 | `<html lang>` 与当前语言在绘制前同步；切换器具有可识别名称、选中状态和合理语言标记。 |
| L12 | 未知语言的运行时错误不得泄漏到另一种语言的程序 UI。 |
| L13 | 自动门禁检查词典 parity、缺失 key、动态 key registry、硬编码 JSX、英文词典中文泄漏和技术词保护。 |
| L14 | 中文化不修改 Content Pack、Schema、Training、Scoring、Mastery、Attempt 或 IndexedDB 契约。 |
| L15 | 完整测试、typecheck、lint、format check 和 production build 全部通过。 |

---

## 六、已实施方案

### 6.1 目录与责任

```text
src/i18n/
├── index.ts                         # Provider、偏好、翻译、错误边界
├── zh-CN.ts                         # 简体中文词典聚合
├── en-US.ts                         # 英文词典聚合
├── translations/
│   ├── product-pages.ts             # Dashboard/Cases/Review 页
│   ├── shell-settings.ts            # Shell/Routes/Settings
│   └── training-ui.ts               # Training/题型/证据/评分
├── index.test.tsx                   # 运行时和持久化测试
└── coverage.test.ts                 # 静态翻译边界门禁
```

两份词典当前各有 502 个 key，自动测试要求 key 集合完全一致且值非空。

### 6.2 运行时数据流

```text
index.html: lang="zh-CN"
  -> App / I18nProvider
  -> readStoredLanguage()
      -> valid { language: "zh-CN" | "en-US" }
      -> malformed / blocked / unknown -> zh-CN
  -> one React language state
  -> createTranslator(language)
  -> ApplicationShell / TrainingShell / Settings / product pages
  -> useLayoutEffect updates document.lang before paint
  -> useEffect persists { language }
```

### 6.3 唯一状态来源

- `I18nProvider` 是生产应用的唯一语言状态来源。
- `ApplicationShell` 顶部控制、`TrainingShell` 控制和 `SettingsPage` radio 全部读写同一个 Context。
- Context 中的英文 developer fallback 只用于脱离 App Provider 的隔离组件/测试；生产 `App` 始终包含 `I18nProvider`。

### 6.4 程序文案与内容的边界

```text
程序文案：
nav / heading / button / filter / loading / error / status / aria
  -> t("stable.translation.key")

Content Pack 原文：
case.title / scenario / evidence.content / node.prompt /
option.label / option.explanation / debrief content /
domain.label / skill.label
  -> 保持原样渲染
```

这意味着：英文 UI 中仍可能看到中文编写的案件内容。这不是程序文案泄漏，而是本轮明确的不可变 Content Pack 边界。如未来需要双语案件，应通过新的可版本化 Content Pack 方案实现，不得在页面中硬编码翻译。

---

## 七、关键代码证据

### 7.1 固定简体中文默认值和结构化持久化

实施文件：`src/i18n/index.ts`

```ts
export const SUPPORTED_LANGUAGES = ["zh-CN", "en-US"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "zh-CN";
export const I18N_STORAGE_KEY = "fde-arena:i18n";

export function readStoredLanguage(
  storage?: Pick<Storage, "getItem">,
): Language {
  try {
    const source = storage ?? globalThis.localStorage;
    const raw = source.getItem(I18N_STORAGE_KEY);
    if (raw === null) return DEFAULT_LANGUAGE;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "language" in value &&
      isLanguage(value.language)
    ) {
      return value.language;
    }
  } catch {
    // Blocked or malformed storage cannot prevent startup.
  }
  return DEFAULT_LANGUAGE;
}

function writeStoredLanguage(language: Language): void {
  try {
    globalThis.localStorage.setItem(
      I18N_STORAGE_KEY,
      JSON.stringify({ language }),
    );
  } catch {
    // Switching remains usable when storage is unavailable.
  }
}
```

实际写入格式：

```json
{"language":"zh-CN"}
```

或：

```json
{"language":"en-US"}
```

生产代码没有使用 `navigator.language`。测试会将浏览器语言模拟为 `en-US`，并断言该 getter 从未被读取。

### 7.2 绘制前同步文档语言

实施文件：`src/i18n/index.ts`

```ts
const [language, updateLanguage] = useState<Language>(
  () => initialLanguage ?? readStoredLanguage(),
);

useLayoutEffect(() => {
  document.documentElement.lang = language;
}, [language]);

useEffect(() => {
  writeStoredLanguage(language);
}, [language]);
```

`index.html` 同时使用：

```html
<html lang="zh-CN">
```

### 7.3 翻译与运行时错误边界

实施文件：`src/i18n/index.ts`

```ts
export function createTranslator(language: Language): Translate {
  return (key, parameters = {}) => {
    const template =
      dictionaries[language][key] ?? dictionaries["en-US"][key] ?? key;
    return template.replace(/\{([^}]+)\}/g, (match, name: string) => {
      const value = parameters[name];
      return value === undefined ? match : String(value);
    });
  };
}

export function localizeUiError(
  language: Language,
  error: unknown,
  fallback: string,
): string {
  const message =
    typeof error === "string"
      ? error.trim()
      : error instanceof Error
        ? error.message.trim()
        : "";
  if (message === "") return fallback;
  const containsChinese = /[\u3400-\u9fff]/u.test(message);
  return (language === "zh-CN") === containsChinese ? message : fallback;
}
```

已知程序状态通过词典键渲染；未知 Content Pack 自定义 error ID 保留稳定 ID，不会猜测翻译。

### 7.4 全局 Provider

实施文件：`src/app/App.tsx`

```tsx
export function App({ router, repositories }: AppProps) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ProductDataProvider
          {...(repositories === undefined ? {} : { repositories })}
        >
          <RouterProvider router={router} />
        </ProductDataProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
```

### 7.5 共享语言切换器

实施文件：`src/components/layout/LanguageSwitcher.tsx`

```tsx
export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div role="group" aria-label={t("language.switcherLabel")}>
      {languageOptions.map((option) => (
        <button
          key={option.language}
          type="button"
          aria-label={t(option.labelKey)}
          aria-pressed={language === option.language}
          lang={
            language === "zh-CN" && option.language === "en-US"
              ? "en-US"
              : undefined
          }
          onClick={() => setLanguage(option.language)}
        >
          {t(compact ? option.shortLabelKey : option.labelKey)}
        </button>
      ))}
    </div>
  );
}
```

控制器安装位置：

- `src/components/layout/ApplicationShell.tsx`：桌面和移动工作区顶栏。
- `src/app/route-pages.tsx`：沉浸式 `TrainingShell` 顶栏。
- `src/pages/settings/SettingsPage.tsx`：同一 Context 的 radio 偏好设置。

### 7.6 Settings 与顶部控制实时同步

实施文件：`src/pages/settings/SettingsPage.tsx`

```tsx
const { language, setLanguage, t } = useI18n();

<input
  checked={language === "zh-CN"}
  name="interface-language"
  type="radio"
  value="zh-CN"
  onChange={() => setLanguage("zh-CN")}
/>

<input
  checked={language === "en-US"}
  name="interface-language"
  type="radio"
  value="en-US"
  onChange={() => setLanguage("en-US")}
/>
```

Settings 的成功、失败和运行状态保存翻译 key 或原始 error，在渲染时使用当前语言；切换语言后已显示的状态也会重新翻译。

### 7.7 正式案件内容保持原文

训练页仍直接使用 Content Pack 字段：

```tsx
<p className="eyebrow">{state.caseContent.title}</p>
<h1>{node.title ?? t("training.session.currentDecision")}</h1>
<p className="decision-context__prompt">{node.prompt}</p>
<CaseEvidence evidence={node.evidence} />
<AdaptiveFeedback feedback={feedback} node={node} />
```

其中 `currentDecision` 是程序 fallback，经过词典；`caseContent.title`、`node.title`、`node.prompt` 和 Evidence 内容保持题库原文。

### 7.8 无标题证据的可访问回退

实施文件：`src/components/evidence/EvidenceRenderer.tsx`

```ts
const typeLabel = t(evidenceLabelKeys[evidence.type]);
const title = evidence.title ?? t("training.evidence.untitled");
```

这避免在 Schema 允许缺失 title 时把“文本证据”同时当作 title 和 type 重复朗读。

---

## 八、页面和组件覆盖

| 范围 | 主要文件 | 中文化边界 |
|---|---|---|
| App / Routes | `src/app/App.tsx`, `src/app/route-pages.tsx` | Provider、404、路由错误、训练 Shell |
| 桌面/移动 Shell | `ApplicationShell.tsx`, `MobileNavigation.tsx` | 品牌周边文案、导航、drawer、ARIA、顶部切换 |
| Theme | `ThemeProvider.tsx` | 主题名称、选中状态和无障碍名称 |
| Dashboard | `DashboardPage.tsx` | 今日训练、指标、推荐理由、Mastery 状态 |
| Cases | `CaseLibraryPage.tsx` | 筛选、难度、题型、完成/通过状态、CTA |
| Training | `TrainingRoutePage.tsx`, `TrainingSessionPage.tsx` | 加载/恢复/保存错误、轮次、提示、完成态 |
| 题型与证据 | `QuestionRenderer.tsx`, `EvidenceRenderer.tsx`, `TrainingLayout.tsx` | 操作提示、证据类型、Diff 标签、列标题、ARIA |
| 评分与反馈 | `AdaptiveFeedback.tsx`, `ConsequenceMeter.tsx`, `TrainingProgress.tsx` | 错误类型、提示、后果、严重错误、进度 |
| Debrief | `DebriefPage.tsx` | verdict、轮次、路径、提交摘要、历史版本警告 |
| Mistakes | `MistakesPage.tsx` | 筛选、证据类型、错误分类、重练历史、不可用状态 |
| Skills | `SkillsPage.tsx` | Domain 信号、Mastery 状态、样本数、空状态 |
| Profile | `ProfilePage.tsx` | readiness、能力维度、样本、等级通过率、缺失版本警告 |
| Settings | `SettingsPage.tsx` | 语言、内容包状态、覆盖率、导入/导出、操作结果 |
| 共享状态 | `src/pages/shared.tsx`, `src/components/ui/States.tsx` | loading、error、empty、retry、no data |

当前有 22 个生产 TSX 文件直接使用 `useI18n()`，顶层 `App` 提供全局 Context。

---

## 九、自动翻译边界门禁

实施文件：`src/i18n/coverage.test.ts`

当前门禁包含 7 项：

1. `zh-CN` 与 `en-US` 的 key 完全一致，且所有值非空。
2. 生产 TSX 内所有 `t("literal.key")` 都必须存在。
3. 扫描变量名以 `Keys` 结尾的动态 registry，以及 `labelKey` 等属性中的 key。
4. 生产 TSX 不得直接含中文文案。
5. 静态检查可见 JSX 文本与 `alt`、`aria-label`、`aria-description`、`aria-valuetext`、`description`、`eyebrow`、`label`、`message`、`placeholder`、`summary`、`title` 属性的硬编码文案。
6. 英文词典不得含 CJK 文字。
7. 英文词典包含的受保护技术词，中文词典必须保留同样英文词。

核心扫描证据：

```ts
expect(Object.keys(enUS).sort()).toEqual(Object.keys(zhCN).sort());

for (const match of source.matchAll(/\bt\(\s*["']([^"']+)["']/g)) {
  const key = match[1];
  if (key !== undefined && !(key in zhCN)) missing.add(key);
}

if (
  ts.isVariableDeclaration(node) &&
  ts.isIdentifier(node.name) &&
  node.name.text.toLowerCase().endsWith("keys")
) {
  // Unwrap and validate object-literal registry values.
}

expect(filesWithChinese).toEqual([]);
expect(leakingKeys).toEqual([]);
expect(translatedTerms).toEqual([]);
```

请审核者注意：未知 Content Pack 自定义 ID 是动态数据，不应被这个静态门禁误判为必须的 UI 词典 key。

---

## 十、测试证据

### 10.1 i18n 运行时

`src/i18n/index.test.tsx` 明确覆盖：

- 浏览器语言是 `en-US` 时，首次仍渲染简体中文。
- `navigator.language` getter 不会被调用。
- `<html lang="zh-CN">` 与默认 JSON 偏好正确。
- 切换到英文后页面即时更新，重新 mount 后恢复英文。
- 坏 JSON 和不支持的 `fr-FR` 都回退到 `zh-CN`。
- `getItem` / `setItem` 抛出 `SecurityError` 时仍可切换。
- 多个 `LanguageSwitcher` 实时同步。
- 中英文运行时错误不会互相泄漏。

### 10.2 App 和 Settings 集成

- `src/app/App.test.tsx`：完整 App 首次打开显示“首页”，顶部切换后显示 `Dashboard`，并写入 `{"language":"en-US"}`。
- `src/pages/settings/SettingsPage.test.tsx`：顶部控制与 Settings radio 双向同步；已显示的操作成功信息随语言重新翻译。

### 10.3 产品页与 Content Pack 边界

- `src/pages/product-pages.test.tsx`：Dashboard 和 Cases 程序 UI 为中文，英文 Content Pack fixture 标题保持原文。
- `src/pages/slice-b-pages.test.tsx`：Skills、Mistakes、Profile 和 Debrief 的页面标题/空状态为中文。
- `src/pages/slice-b-pages.test.tsx`：已知 HTTP 证据类型和 `unsupported-action` 错误分类使用中文 UI 标签。
- `src/pages/training/TrainingSessionPage.test.tsx`：训练主流程中文程序文案与案件原文共存。
- `src/components/evidence/EvidenceRenderer.test.tsx`：无标题证据显示“未命名”，“文本证据”不重复。

### 10.4 最终完整验证

在当前工作区实际运行：

```text
npm test -- --run
  Test Files  54 passed (54)
  Tests       559 passed (559)

npm run typecheck
  PASS

npm run lint
  PASS, 0 warnings

npm run format:check
  PASS

npm run build
  content quality: 27 case versions, 15 domains, 15 skills, 0 issues
  generated content index drift: 0
  TypeScript build: PASS
  Vite production build: PASS
```

独立只读代码复审在修复 `document.lang` 首帧同步、动态 key 扫描、storage `SecurityError`、证据类型和无标题证据后，报告无剩余 P0、P1 或 P2。

---

## 十一、实施方要求矩阵

下表是实施方声明，审核者必须独立判定 `PROVEN`、`PARTIAL`、`NOT_PROVEN` 或 `FAILED`。

| 要求 | 实施方声明 | 主要证据 |
|---|---|---|
| L1 | 已满足 | `index.ts`, `index.html`, `index.test.tsx` |
| L2 | 已满足 | `LanguageSwitcher.tsx`, `App.test.tsx` |
| L3 | 已满足 | `readStoredLanguage`, `writeStoredLanguage`, SecurityError 测试 |
| L4 | 已满足 | `I18nProvider`, `SettingsPage`, 同步测试 |
| L5 | 已满足 | `ApplicationShell`, `TrainingShell` |
| L6 | 已满足 | 第八节页面矩阵，22 个 `useI18n` 生产 TSX |
| L7 | 已满足 | Shell、Routes、States、Question/Scoring 组件 |
| L8 | 已满足 | Training 原文代码摘要、product page 边界测试 |
| L9 | 已满足 | `coverage.test.ts` CJK 泄漏检查 |
| L10 | 已满足 | protected vocabulary 自动检查 |
| L11 | 已满足 | `useLayoutEffect`, `aria-pressed`, `lang` 和无障碍测试 |
| L12 | 已满足 | `localizeUiError`, 双向错误隔离测试 |
| L13 | 已满足 | `coverage.test.ts` 的 7 项静态门禁 |
| L14 | 已满足 | 本轮文件边界，完整 559 项回归测试 |
| L15 | 已满足 | 第 10.4 节完整命令结果 |

---

## 十二、已知边界和非阻断项

### 12.1 Content Pack 原文不会随 UI 切换

这是明确设计边界，不是本轮遗漏。英文 UI 可能包含中文案件内容，中文 UI 也可能包含英文编写的案件内容。

### 12.2 未知内容分类 ID

已知 verdict、题型、证据类型和常见 error type 有稳定词典映射。未知的 Content Pack 自定义分类保留稳定 ID，避免 UI 猜测含义。审核者可判断这是否需要成为未来内容编写规范，但不得要求修改数据库。

### 12.3 翻译 key 的 TypeScript 类型

`Translate` 当前接受 `string`，用以容纳内容定义的动态 taxonomy。缺失 key 通过词典 parity、literal 扫描和 `*Keys` / `labelKey` 动态 registry 扫描防护。如审核者提出类型加强，必须证明现有门禁无法防住的实际缺陷，并保留动态内容 ID 回退。

### 12.4 视觉验收

本轮没有启动本地开发服务器，因此未执行基于真实浏览器的逐页视觉验收。组件、集成、响应式导航和无障碍语义均有 jsdom 测试，但视觉回归仍可作为发布前非架构验收。

### 12.5 构建体积

Vite 生产构建通过，但保留一条非阻断主包提示：

```text
main chunk: 662.88 kB minified / 185.13 kB gzip
```

这是性能/分包后续项，不应被误写为国际化功能失败。

### 12.6 交付状态

当前工作区包含未提交修改。如要发布，应在发布流程中另行审查 diff、提交和部署产物；这不改变本审核包中的功能验证结果。

---

## 十三、审核者必须回答的问题

1. 是否有直接证据证明首次语言不会受浏览器 locale 影响？
2. localStorage 缺失、损坏、被禁用或包含不支持语言时是否仍可用？
3. 顶栏、训练页和 Settings 是否确实共享一份语言状态？
4. 核心页面、题型、反馈、错误、空状态和无障碍名称是否有足够的翻译覆盖证据？
5. 程序 UI 与 Content Pack 原文的边界是否正确？
6. 英文 UI 中出现中文 Content Pack 内容是否被正确区分于中文程序文案泄漏？
7. 静态门禁是否能防止词典缺键、动态 registry 缺键、硬编码文案和技术词误翻？
8. `document.lang`、`aria-pressed`、切换器语言标记和无标题证据是否满足基本无障碍要求？
9. 是否有任何证据表明本轮修改了题库、训练、评分、Mastery、Attempt 或 IndexedDB 契约？
10. 559 项测试、静态门禁和生产构建是否足以支持进入真实用户体验验证？

---

## 十四、强制审核输出格式

审核者必须严格按以下结构输出。

### 1. Final Verdict

只允许以下三种之一：

- `PASS`
- `PASS_WITH_FIXES`
- `FAIL`

### 2. Confidence

给出高、中或低置信度，并用一句话说明证据局限。

### 3. Executive Summary

用不超过 10 句话回答：

- 中文默认和中英文切换是否成立。
- 翻译边界是否正确。
- 数据和训练行为是否保持兼容。
- 是否可以进入真实用户体验验证。

### 4. Requirements Matrix

对 L1–L15 逐项给出：

- `PROVEN`
- `PARTIAL`
- `NOT_PROVEN`
- `FAILED`

每项必须引用本文档中的精确文件或测试证据。

### 5. Findings

按以下优先级分组：

- `P0`：用户数据丢失、安全问题或国际化核心无法成立。
- `P1`：进入真实用户体验前必须修复。
- `P2`：公开发布前必须修复，但不需要重构。
- `P3`：可后续改进，不阻断当前体验验证。

每个 finding 必须包含：

1. 可复现的问题。
2. 本审核包中的直接证据。
3. 实际用户或工程影响。
4. 最小修复边界。
5. 是否阻断用户体验或发布。

如某一级没有问题，必须明确写“无”。

### 6. Localization Boundary Verdict

必须分开回答：

- 程序 UI 文案覆盖。
- Content Pack 原文保留。
- 英文 UI 的中文泄漏风险。
- 未知动态 taxonomy 的回退策略。

### 7. Persistence and Accessibility Verdict

必须单独判断：

- 首次默认、偏好恢复和坏 storage 回退。
- 多控制器同步。
- `<html lang>` 时序。
- 切换器和证据的无障碍语义。

### 8. Regression Verdict

必须明确说明是否存在修改以下能力的证据：

- Content Pack / Case Schema
- Training / Scoring / Mastery
- Attempt / Progress / Mistake
- IndexedDB 数据结构

### 9. Required Fixes Before User Testing

只列出确实阻断真实用户体验的问题。如无，必须写“无”。

### 10. Final Recommendation

最后必须用明确句子回答：

- 是否验收当前中文化实施。
- 是否可以继续当前架构。
- 是否可以立即进入真实用户体验验证。
- 如不可以，阻断项只能是哪些有直接证据的具体问题。

---

## 十五、审核者不得忽略的事实

1. 首次默认语言是产品决策：固定 `zh-CN`，不允许浏览器自动检测。
2. 英文界面中的中文 Content Pack 原文不等于中文程序 UI 泄漏。
3. 本轮没有修改 Content Pack、题型、评分、Mastery、Attempt 或 IndexedDB 契约。
4. 顶部切换器和 Settings radio 共享同一 Context，不是两份状态。
5. 完整回归是 54 个测试文件、559 项测试，不是只运行国际化定向测试。
6. 未启动本地服务器是执行环境安全边界，不等于生产构建未验证。
7. 如审核者需要本包未提供的证据，必须指定精确文件或测试，不得以笼统“信息不足”取代技术结论。

---

## 十六、审核包声明

本文档是可独立上传给 ChatGPT 的实施后证据摘要，用于判断 FDE Arena 当前中文化与国际化实施是否可验收。

它不代替完整源码 diff、真实浏览器视觉验收或发布流程。如审核者认为某项结论必须依赖本文档未提供的实现，应将该项标记为 `NOT_PROVEN`，并精确指明需要查看的文件或测试，而不是虚构问题或虚构通过。
