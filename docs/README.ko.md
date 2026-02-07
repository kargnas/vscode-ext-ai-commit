# LLM 커밋 메시지

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/kargnas.llm-commit-message?label=VS%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=kargnas.llm-commit-message)
[![Blog](https://img.shields.io/badge/Blog-kargn.as-green)](https://kargn.as)

AI가 코드 변경사항을 분석해서 고품질 커밋 메시지를 자동으로 만들어줍니다. GPT, Claude, Gemini 등 [OpenRouter](https://openrouter.ai)에서 제공하는 모든 LLM을 사용할 수 있어요.

[English](../README.md) | **한국어** | [简体中文](README.zh-CN.md) | [繁體中文-台灣](README.zh-TW.md) | [繁體中文-香港](README.zh-HK.md) | [日本語](README.ja.md)

## ✨ 주요 기능

### 🎯 원클릭 커밋 메시지 생성
소스 제어 패널에서 반짝이(✨) 버튼만 누르면 끝! 몇 초 안에 Conventional Commit 규칙에 맞는 완벽한 커밋 메시지가 생성됩니다.

### 🧠 똑똑한 컨텍스트 수집
단순히 diff만 보는 게 아니라 프로젝트 전체를 이해하고 메시지를 작성합니다:

- **스테이징된 diff** - 실제 코드 변경사항을 패치 상세까지 분석
- **프로젝트 트리** - 워크스페이스 파일 구조와 수정 상태 파악
- **최근 커밋 히스토리** - 수정된 파일별로 최대 10개 이전 커밋 참고
- **열린 탭 목록** - 현재 에디터에서 작업 중인 파일들
- **터미널 로그** - 최근 실행한 명령어 출력
- **대용량 diff 처리** - 변경이 많은 파일(3개 이상 hunk)은 전체 스냅샷 포함

### 🌐 OpenRouter로 다양한 AI 모델 사용
원하는 최신 AI 모델을 자유롭게 선택하세요:

- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus
- **Google**: Gemini 2.5 Flash, Gemini Pro
- **Meta**: Llama 3
- **Mistral**: Mixtral 8x7B
- 그 외 수십 가지 모델...

기본 모델: `google/gemini-2.5-flash-lite` (빠르고 저렴함)

### 📝 Conventional Commits 포맷 자동 생성
[Conventional Commits](https://www.conventionalcommits.org/) 표준을 따르는 메시지를 자동으로 만들어줍니다:

```
<type>(<scope>): <subject>

<body>
```

**타입**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`

### 🌍 다국어 커밋 메시지
원하는 언어로 커밋 메시지를 작성할 수 있어요:
- `kargnas.aiCommit.commitLanguage`를 `"ko"`로 설정하면 한국어로, `"ja"`면 일본어로, `"auto"`는 영어로 생성됩니다

### 🔍 디버깅과 투명성
- **전체 요청 로깅** - API 요청이 Output 패널에 모두 기록됨
- **"마지막 페이로드 보기"** - AI에 보낸 정확한 프롬프트와 컨텍스트 확인
- **응답 원본 로깅** - 파싱 전 모델이 반환한 원본 응답 확인 가능

### 🏢 멀티 레포 워크스페이스 지원
여러 git 저장소에서 작업하시나요? 걱정 없어요:
- 현재 작업 중인 레포를 자동 감지
- 애매한 경우 선택하도록 물어봄
- 각 레포별로 독립적인 컨텍스트 유지

## 📦 설치 방법

1. [VS Code 마켓플레이스](https://marketplace.visualstudio.com/items?itemName=kargnas.llm-commit-message)에서 설치
2. [OpenRouter](https://openrouter.ai/keys)에서 API 키 발급
3. VS Code 설정 열기 (⌘+, 또는 Ctrl+,)
4. "kargnas commit" 검색
5. `Kargnas Commit AI: API Key`에 API 키 붙여넣기

## 🚀 사용법

1. **소스 제어 패널에서 변경사항 스테이징**
2. **커밋 메시지 입력란 옆 반짝이 버튼(✨) 클릭**
3. **AI가 분석하는 동안 몇 초 기다리기**
4. **생성된 메시지 확인** - 필요하면 수정
5. **커밋!**

### 스테이징된 게 없다면?
스테이징 없이 버튼을 누르면 모든 변경사항을 자동으로 스테이징할지 물어봅니다.

## ⚙️ 설정

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `kargnas.aiCommit.apiKey` | `""` | OpenRouter API 키 (필수) |
| `kargnas.aiCommit.model` | `"google/gemini-2.5-flash-lite"` | OpenRouter 모델 ID |
| `kargnas.aiCommit.endpoint` | OpenRouter API | 커스텀 API 엔드포인트 (고급) |
| `kargnas.aiCommit.commitLanguage` | `"auto"` | 커밋 메시지 언어 (예: `"ko"`, `"ja"`) |
| `kargnas.aiCommit.transport` | `"fetch"` | HTTP 전송 방식 (`"fetch"` 또는 `"curl"`) |
| `kargnas.aiCommit.requestTimeoutMs` | `25000` | API 요청 타임아웃 (밀리초) |
| `kargnas.aiCommit.logRawResponse` | `true` | 원본 API 응답을 Output에 로깅 |
| `kargnas.aiCommit.contextIncludeGlobs` | `["**/*"]` | 컨텍스트에 포함할 파일 패턴 |
| `kargnas.aiCommit.contextIgnoreGlobs` | `["**/*.lock", "dist/**", ...]` | 컨텍스트에서 제외할 파일 패턴 |
| `kargnas.aiCommit.maxFilePatchBytes` | `12000` | 파일당 최대 diff 크기 |
| `kargnas.aiCommit.maxPatchBytes` | `50000` | 전체 diff 최대 크기 |
| `kargnas.aiCommit.previousCommitLimit` | `10` | 포함할 최근 커밋 개수 |
| `kargnas.aiCommit.openTabsLimit` | `10` | 포함할 열린 탭 개수 |
| `kargnas.aiCommit.terminalLogLines` | `20` | 포함할 터미널 로그 줄 수 |
| `kargnas.aiCommit.projectTreeMaxEntries` | `400` | 프로젝트 트리 최대 항목 수 |
| `kargnas.aiCommit.logPromptMaxChars` | `0` | 프롬프트 로그 자르기 (0 = 무제한) |

### 설정 예시

```json
{
  "kargnas.aiCommit.apiKey": "sk-or-v1-...",
  "kargnas.aiCommit.model": "anthropic/claude-3.5-sonnet",
  "kargnas.aiCommit.commitLanguage": "ko",
  "kargnas.aiCommit.logPromptMaxChars": 0
}
```

## 🤔 왜 이 확장을 쓰나요?

### vs. GitHub Copilot
- **더 많은 모델**: OpenRouter를 통해 100개 이상의 모델 선택 가능
- **풍부한 컨텍스트**: 프로젝트 트리, 터미널 로그, 열린 탭까지 포함
- **투명함**: 전체 요청/응답 로깅
- **커스터마이징**: 컨텍스트 수집과 포맷 세밀 조정 가능

### vs. 다른 AI 커밋 도구들
- **컨텍스트 깊이**: 대부분은 diff만 보냄. 우리는 프로젝트 구조, 최근 커밋, 에디터 상태까지 보냄
- **멀티 레포 인식**: 워크스페이스 폴더를 제대로 처리
- **Conventional Commits**: 업계 표준 포맷 강제
- **디버그 친화적**: "마지막 페이로드 보기" 명령으로 문제 해결 쉬움
- **대용량 diff 처리**: 스마트한 자르기와 필요시 전체 파일 스냅샷 제공

### vs. 수동 커밋 메시지
- **일관성**: 모든 메시지가 같은 높은 품질의 포맷을 따름
- **속도**: 몇 분 걸릴 걸 몇 초 만에 생성
- **디테일**: AI가 놓치기 쉬운 패턴과 관계를 발견함
- **학습**: 좋은 커밋 메시지가 어떻게 구성되는지 배울 수 있음

## 🛠️ 명령어

- **AI Commit** (`kargnas.aiCommit.generate`) - 스테이징된 변경사항으로 커밋 메시지 생성
- **Ping OpenRouter** (`kargnas.aiCommit.pingOpenRouter`) - API 연결 테스트
- **Show Last Payload** (`kargnas.aiCommit.showLastPayload`) - AI에 보낸 마지막 프롬프트 확인
- **Open in GitHub** (`kargnas.aiCommit.openInGitHub`) - 현재 파일을 GitHub에서 열기 (보너스 기능!)

## 🐛 문제 해결

### "No API key configured"
설정에 OpenRouter API 키를 추가하세요. [openrouter.ai/keys](https://openrouter.ai/keys)에서 발급받을 수 있어요.

### "API request failed"
- 인터넷 연결 확인
- API 키가 올바른지 확인
- "Ping OpenRouter" 명령 실행해보기
- Output 패널 (보기 → 출력 → "kargnas - Commit AI") 에러 확인

### 빈 커밋 메시지 생성됨
- 확장은 로컬 폴백을 제공함: `chore: update files`
- API 키에 크레딧이 있는지 확인
- 다른 모델 시도
- "Show Last Payload"로 어떤 컨텍스트가 전송됐는지 확인

### 생성된 메시지 언어가 틀림
`kargnas.aiCommit.commitLanguage`를 원하는 언어 코드로 설정하세요 (예: `"ko"`, `"ja"`)

## 📄 라이선스

MIT © [Sangrak Choi](https://kargn.as)

## 🔗 링크

- [GitHub 저장소](https://github.com/kargnas/vscode-ext-ai-commit)
- [VS Code 마켓플레이스](https://marketplace.visualstudio.com/items?itemName=kargnas.llm-commit-message)
- [OpenRouter](https://openrouter.ai)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [개발자 블로그](https://kargn.as)

---

**더 똑똑한 커밋 생활을 즐기세요!** ✨
