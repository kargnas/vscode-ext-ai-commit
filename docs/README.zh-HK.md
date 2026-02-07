# LLM 提交訊息

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/kargnas.llm-commit-message?label=VS%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=kargnas.llm-commit-message)
[![Blog](https://img.shields.io/badge/Blog-kargn.as-green)](https://kargn.as)

用 AI 自動分析你嘅程式碼改動,幫你整高質素嘅 git 提交訊息。透過 [OpenRouter](https://openrouter.ai) 支援 GPT、Claude、Gemini 等各種大型語言模型。

[English](../README.md) | [한국어](README.ko.md) | [简体中文](README.zh-CN.md) | [繁體中文-台灣](README.zh-TW.md) | **繁體中文-香港** | [日本語](README.ja.md)

## ✨ 主要功能

### 🎯 一撳即有提交訊息
喺原始檔控制面板撳一下閃閃燈掣(✨),幾秒鐘就有條靚嘅 Conventional Commit 訊息啦。

### 🧠 豐富嘅情境資訊收集
唔係淨係睇程式碼改動咁簡單,會深入分析成個專案環境:

- **暫存區差異** - 詳細分析實際程式碼變更同補丁細節
- **專案樹狀結構** - 理解工作區嘅檔案架構同修改狀態
- **最近嘅提交紀錄** - 每個修改咗嘅檔案最多包含 10 筆歷史提交,保持風格一致
- **開緊嘅分頁** - 而家編輯器入面處理緊嘅檔案
- **終端機記錄** - 最近執行咗啲乜指令
- **大量差異處理** - 對於改動多啲嘅檔案(3 個以上程式碼區塊),會包埋完整檔案快照

### 🌐 透過 OpenRouter 支援多種 AI 模型
自由選擇最新嘅 AI 模型:

- **OpenAI**: GPT-4、GPT-4 Turbo、GPT-3.5
- **Anthropic**: Claude 3.5 Sonnet、Claude 3 Opus
- **Google**: Gemini 2.5 Flash、Gemini Pro
- **Meta**: Llama 3
- **Mistral**: Mixtral 8x7B
- 仲有好多模型俾你揀...

預設模型: `google/gemini-2.5-flash-lite` (快又平)

### 📝 自動生成 Conventional Commits 格式
生成嘅訊息自動遵循 [Conventional Commits](https://www.conventionalcommits.org/) 標準:

```
<type>(<scope>): <subject>

<body>
```

**類型**: `feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`chore`、`ci`、`build`

### 🌍 多語言提交訊息
可以用你慣用嘅語言寫提交訊息:
- 將 `kargnas.aiCommit.commitLanguage` 設做 `"ko"` 就出韓文,`"ja"` 就出日文,`"auto"` 就用英文

### 🔍 除錯同透明度
- **完整請求記錄** - 所有 API 請求都會記錄到輸出面板
- **「查看最後嘅酬載」** - 睇返發送畀 AI 嘅確切提示詞同情境資訊
- **原始回應記錄** - 可以睇返解析之前模型傳返嚟嘅原始內容

### 🏢 多倉庫工作區支援
喺多個 git 倉庫度做嘢?冇問題:
- 自動偵測而家做緊嘅倉庫
- 唔肯定就會問你揀邊個
- 為每個倉庫維護獨立嘅情境資訊

## 📦 安裝

1. 喺 [VS Code 市集](https://marketplace.visualstudio.com/items?itemName=kargnas.llm-commit-message)度裝
2. 去 [OpenRouter](https://openrouter.ai/keys) 攞 API 金鑰
3. 開 VS Code 設定 (⌘+, 或者 Ctrl+,)
4. 搵 "kargnas commit"
5. 將 API 金鑰貼入 `Kargnas Commit AI: API Key` 度

## 🚀 點樣用

1. **喺原始檔控制面板度暫存你嘅改動**
2. **撳提交訊息輸入框隔籬嘅閃閃燈掣(✨)**
3. **等幾秒俾 AI 分析你嘅改動**
4. **睇下生成咗啲乜** - 要改就改
5. **提交!**

### 冇暫存嘅改動?
如果你冇暫存任何嘢就撳個掣,佢會問你使唔使自動暫存晒所有改動。

## ⚙️ 設定

| 設定 | 預設值 | 說明 |
|------|--------|------|
| `kargnas.aiCommit.apiKey` | `""` | OpenRouter API 金鑰 (必要) |
| `kargnas.aiCommit.model` | `"google/gemini-2.5-flash-lite"` | OpenRouter 模型 ID |
| `kargnas.aiCommit.endpoint` | OpenRouter API | 自訂 API 端點 (進階) |
| `kargnas.aiCommit.commitLanguage` | `"auto"` | 提交訊息語言 (例如 `"ko"`、`"ja"`) |
| `kargnas.aiCommit.transport` | `"fetch"` | HTTP 傳輸方式 (`"fetch"` 或者 `"curl"`) |
| `kargnas.aiCommit.requestTimeoutMs` | `25000` | API 請求逾時時間(毫秒) |
| `kargnas.aiCommit.logRawResponse` | `true` | 將原始 API 回應記錄到輸出面板 |
| `kargnas.aiCommit.contextIncludeGlobs` | `["**/*"]` | 包埋喺情境入面嘅檔案模式 |
| `kargnas.aiCommit.contextIgnoreGlobs` | `["**/*.lock", "dist/**", ...]` | 從情境入面排除嘅檔案模式 |
| `kargnas.aiCommit.maxFilePatchBytes` | `12000` | 單一檔案差異嘅最大位元組數 |
| `kargnas.aiCommit.maxPatchBytes` | `50000` | 總差異嘅最大位元組數 |
| `kargnas.aiCommit.previousCommitLimit` | `10` | 包埋嘅最近提交數量 |
| `kargnas.aiCommit.openTabsLimit` | `10` | 包埋嘅開緊分頁數量 |
| `kargnas.aiCommit.terminalLogLines` | `20` | 包埋嘅終端機記錄行數 |
| `kargnas.aiCommit.projectTreeMaxEntries` | `400` | 專案樹狀結構嘅最大條目數 |
| `kargnas.aiCommit.logPromptMaxChars` | `0` | 提示詞記錄截斷長度(0 = 無限制) |

### 設定範例

```json
{
  "kargnas.aiCommit.apiKey": "sk-or-v1-...",
  "kargnas.aiCommit.model": "anthropic/claude-3.5-sonnet",
  "kargnas.aiCommit.commitLanguage": "ko",
  "kargnas.aiCommit.logPromptMaxChars": 0
}
```

## 🤔 點解要用呢個擴充功能?

### 對比 GitHub Copilot
- **更多模型選擇**: 透過 OpenRouter 可以用 100 幾種模型
- **更豐富嘅情境資訊**: 包埋專案樹狀結構、終端機記錄、開緊嘅分頁
- **更透明**: 完整嘅請求/回應記錄
- **可客製化**: 可以精細調整情境資訊收集同格式化

### 對比其他 AI 提交工具
- **情境深度**: 大多數工具淨係傳送差異,我哋傳送專案架構、最近提交同編輯器狀態
- **多倉庫感知**: 正確處理工作區資料夾
- **Conventional Commits**: 強制用業界標準格式
- **除錯友善**: 「查看最後嘅酬載」指令方便排查問題
- **大量差異處理**: 智慧截斷同必要時嘅完整檔案快照

### 對比手動寫提交訊息
- **一致性**: 每則訊息都跟住同一個高質素格式
- **速度**: 幾秒鐘就搞掂原本要幾分鐘嘅嘢
- **細節**: AI 會發現你可能睇漏咗嘅模式同關聯
- **學習**: 了解點樣整出好嘅提交訊息

## 🛠️ 指令

- **AI Commit** (`kargnas.aiCommit.generate`) - 從暫存嘅改動生成提交訊息
- **Ping OpenRouter** (`kargnas.aiCommit.pingOpenRouter`) - 測試 API 連線
- **Show Last Payload** (`kargnas.aiCommit.showLastPayload`) - 睇返發送畀 AI 嘅最後一個提示詞
- **Open in GitHub** (`kargnas.aiCommit.openInGitHub`) - 喺 GitHub 度開而家嘅檔案(額外功能!)

## 🐛 疑難排解

### "No API key configured"
喺設定度加 OpenRouter API 金鑰。去 [openrouter.ai/keys](https://openrouter.ai/keys) 攞。

### "API request failed"
- 檢查網絡連線
- 驗證 API 金鑰啱唔啱
- 試下執行 "Ping OpenRouter" 指令
- 睇下輸出面板 (檢視 → 輸出 → "kargnas - Commit AI") 有咩錯誤訊息

### 生成咗空嘅提交訊息
- 擴充功能有本地備援機制: `chore: update files`
- 檢查 API 金鑰有冇額度
- 試下其他模型
- 用 "Show Last Payload" 睇下傳送咗啲乜情境資訊

### 生成嘅訊息語言唔啱
將 `kargnas.aiCommit.commitLanguage` 設做你想要嘅語言代碼(例如 `"ko"`、`"ja"`)

## 📄 授權

MIT © [Sangrak Choi](https://kargn.as)

## 🔗 連結

- [GitHub 倉庫](https://github.com/kargnas/vscode-ext-ai-commit)
- [VS Code 市集](https://marketplace.visualstudio.com/items?itemName=kargnas.llm-commit-message)
- [OpenRouter](https://openrouter.ai)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [作者部落格](https://kargn.as)

---

**享受更聰明嘅提交體驗!** ✨
