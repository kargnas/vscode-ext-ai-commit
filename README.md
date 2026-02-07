# AI Commit Message

[![VS Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/kargnas.ai-commit-message)](https://marketplace.visualstudio.com/items?itemName=kargnas.ai-commit-message)
[![Blog](https://img.shields.io/badge/blog-kargn.as-blue)](https://kargn.as)

Generate high-quality, context-aware git commit messages powered by AI. Works with GPT, Claude, Gemini, and any LLM available through [OpenRouter](https://openrouter.ai).

## ✨ Features

### 🎯 One-Click Commit Messages
Click the sparkle (✨) button in your Source Control panel and get a perfectly formatted Conventional Commit message in seconds.

### 🧠 Rich Context Collection
The extension gathers comprehensive context before generating your commit message:

- **Staged Diff** - Your actual code changes with full patch details
- **Project Tree** - Structured view of your workspace files with modification status
- **Recent Commits** - Up to 10 previous commits for each touched file to maintain consistency
- **Open Tabs** - List of currently open files in your editor
- **Terminal Logs** - Recent terminal output for additional context
- **Heavy Diff Support** - For files with 3+ hunks, includes full file snapshots

### 🌐 Multi-Model Support via OpenRouter
Choose from a wide selection of cutting-edge AI models:

- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus
- **Google**: Gemini 2.5 Flash, Gemini Pro
- **Meta**: Llama 3
- **Mistral**: Mixtral 8x7B
- And many more...

Default model: `google/gemini-2.5-flash-lite` (fast & cost-effective)

### 📝 Conventional Commits Format
All generated messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`

### 🌍 Multi-Language Support
Generate commit messages in your preferred language:
- Set `kargnasCommitAI.commitLanguage` to `"ko"` for Korean, `"ja"` for Japanese, or keep as `"auto"` for English

### 🔍 Debug & Transparency
- **Full Request Logging** - Every API request is logged to the Output panel
- **"Show Last Payload"** - View the exact prompt and context sent to the AI
- **Raw Response Logging** - See what the model returned before parsing

### 🏢 Multi-Repo Workspace Support
Working with multiple git repositories? No problem. The extension:
- Detects which repo you're working in
- Prompts you to choose if ambiguous
- Maintains separate context for each repo

## 📦 Installation

1. Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=kargnas.ai-commit-message)
2. Get your API key from [OpenRouter](https://openrouter.ai/keys)
3. Open VS Code settings (⌘+, or Ctrl+,)
4. Search for "kargnas commit"
5. Paste your API key into `Kargnas Commit AI: API Key`

## 🚀 Usage

1. **Stage your changes** in the Source Control panel
2. **Click the sparkle button** (✨) next to the commit message input
3. **Wait a few seconds** for AI to analyze your changes
4. **Review the generated message** - edit if needed
5. **Commit!**

### No Staged Changes?
If you click the button without staging anything, the extension will offer to stage all changes for you.

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `kargnasCommitAI.apiKey` | `""` | Your OpenRouter API key (required) |
| `kargnasCommitAI.model` | `"google/gemini-2.5-flash-lite"` | OpenRouter model ID |
| `kargnasCommitAI.endpoint` | OpenRouter API | Custom API endpoint (advanced) |
| `kargnasCommitAI.commitLanguage` | `"auto"` | Commit message language (e.g., `"ko"`, `"ja"`) |
| `kargnasCommitAI.transport` | `"fetch"` | HTTP transport (`"fetch"` or `"curl"`) |
| `kargnasCommitAI.requestTimeoutMs` | `25000` | API request timeout in milliseconds |
| `kargnasCommitAI.logRawResponse` | `true` | Log raw API responses to Output panel |
| `kargnasCommitAI.contextIncludeGlobs` | `["**/*"]` | Files to include in context |
| `kargnasCommitAI.contextIgnoreGlobs` | `["**/*.lock", "dist/**", ...]` | Files to exclude from context |
| `kargnasCommitAI.maxFilePatchBytes` | `12000` | Max bytes per file diff |
| `kargnasCommitAI.maxPatchBytes` | `50000` | Max total diff size |
| `kargnasCommitAI.previousCommitLimit` | `10` | Number of recent commits to include |
| `kargnasCommitAI.openTabsLimit` | `10` | Number of open tabs to include |
| `kargnasCommitAI.terminalLogLines` | `20` | Terminal log lines to include |
| `kargnasCommitAI.projectTreeMaxEntries` | `400` | Max project tree entries |
| `kargnasCommitAI.logPromptMaxChars` | `0` | Prompt log truncation (0 = unlimited) |

### Example Configuration

```json
{
  "kargnasCommitAI.apiKey": "sk-or-v1-...",
  "kargnasCommitAI.model": "anthropic/claude-3.5-sonnet",
  "kargnasCommitAI.commitLanguage": "ko",
  "kargnasCommitAI.logPromptMaxChars": 0
}
```

## 🤔 Why This Extension?

### vs. GitHub Copilot
- **More models**: Choose from 100+ models via OpenRouter
- **Richer context**: Includes project tree, terminal logs, open tabs
- **Transparent**: Full request/response logging
- **Customizable**: Fine-tune context collection and formatting

### vs. Other AI Commit Tools
- **Context depth**: Most tools only send the diff. We send project structure, recent commits, and editor state
- **Multi-repo aware**: Properly handles workspace folders
- **Conventional Commits**: Enforces industry-standard format
- **Debug-friendly**: "Show Last Payload" command for troubleshooting
- **Heavy diff handling**: Smart truncation and full file snapshots when needed

### vs. Manual Commit Messages
- **Consistency**: Every message follows the same high-quality format
- **Speed**: Generate in seconds what would take minutes to write
- **Detail**: AI notices patterns and relationships you might miss
- **Learning**: See how good commit messages are structured

## 🛠️ Commands

- **AI Commit** (`kargnasCommitAI.generate`) - Generate commit message from staged changes
- **Ping OpenRouter** (`kargnasCommitAI.pingOpenRouter`) - Test your API connection
- **Show Last Payload** (`kargnasCommitAI.showLastPayload`) - View the last prompt sent to the AI
- **Open in GitHub** (`kargnasCommitAI.openInGitHub`) - Open current file in GitHub (bonus feature!)

## 🐛 Troubleshooting

### "No API key configured"
Add your OpenRouter API key to settings. Get one at [openrouter.ai/keys](https://openrouter.ai/keys)

### "API request failed"
- Check your internet connection
- Verify your API key is correct
- Try the "Ping OpenRouter" command
- Check the Output panel (View → Output → "kargnas - Commit AI") for errors

### Empty commit message generated
- The extension has a local fallback: `chore: update files`
- Check if your API key has credits
- Try a different model
- Use "Show Last Payload" to see what context was sent

### Generated message is in the wrong language
Set `kargnasCommitAI.commitLanguage` to your preferred language code (e.g., `"ko"`, `"ja"`)

## 📄 License

MIT © [Sangrak Choi](https://kargn.as)

## 🔗 Links

- [GitHub Repository](https://github.com/kargnas/vscode-ext-ai-commit)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=kargnas.ai-commit-message)
- [OpenRouter](https://openrouter.ai)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Author's Blog](https://kargn.as)

---

**Enjoy smarter commits!** ✨
