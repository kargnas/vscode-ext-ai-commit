# kars - Commit AI (source v0.2.2)

VS Code extension to generate Git commit messages via OpenRouter.

## Features
- One button next to the star in SCM input box
- Context-rich prompt (branch, staged name-status, staged patch, recent commits)
- Include/ignore globs, size caps per file and total
- Stage-all confirm when no staged changes
- OpenRouter chat/completions by default, Responses Alpha compatible
- Output channel logs + 'Show Last Payload' for debugging
- Local fallback if AI response is empty

## Build
- Install: 'code --install-extension <this_folder>.vsix' after packing.
- Pack: zip this folder as VSIX layout (put under 'extension/' folder) or use 'vsce package'.
- Remember to include 'meta.json' when creating a .vsix per team convention.
- Dev shortcut: 'npm run package:install' → vsce package + local install.

## Dev convenience commands
- `npm run package:install`: packages via vsce then force-installs the generated VSIX into your local VS Code.
- `npx vsce package --no-yarn`: quick manual package step if you just want the VSIX artifact.
- `code --install-extension <vsix-path> --force`: install a built VSIX (useful if you copied it elsewhere).
- `code --uninstall-extension kars.kars-commit-ai`: remove the installed copy before reinstalling from marketplace or another build.

## Context Pipeline
- 자동으로 리포 메타/브랜치 힌트/파일 요약/프로젝트 트리를 수집해 LLM에 JSON 구조로 전달합니다.
- 모델 응답은 {type, scope, subject, body, breaking_change, issues, rationale} JSON으로 파싱되어 커밋 메시지를 구성합니다.

## Settings (examples)
```json
{
  "karsCommitAI.apiKey": "sk-or-...",
  "karsCommitAI.model": "google/gemini-2.5-flash-lite",
  "karsCommitAI.endpoint": "https://openrouter.ai/api/v1/chat/completions",
  "karsCommitAI.endpointRewrite": true,
  "karsCommitAI.transport": "fetch"
}
```
