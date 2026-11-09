# claude-config

Claude Code 상태창(statusline) 설정. 여러 기기·세션에서 같은 dashboard 양식을 쓰기 위한 레포.

## 지금 나오는 모양

플러그인 1.25.1:

```
🎧 Daily Usage │ Ctx ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬   0% (0/200K)   │ 5h ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  48% (2h 2m)
📅 7days Usage │ All ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  80% (3h 42m)

🔥 Opus 5 │ Claude v2.1.318 │ 1 CLAUDE.md │ 4 MCP │ 0 Hooks
📁 Life (main) │ 👤 rudwls2717@pusan.ac.kr
```

플러그인 1.36.0 (bar-style·spacer 패치 적용 후):

```
💰️ Today: $105.25 │ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ │ 0% │ 0/200K │ 5h: 48% (2h2m)
7d: 80% (3h42m)

◆ Opus 5(H) │ v2.1.318 │ CLAUDE.md: 1, MCP: 3
📁️ Life (main) │ 👤 rudwls2717@pusan.ac.kr
```

### 이 모양은 업스트림 버전이 아니라 패치 결과다

**위 1.25.1 출력은 공개 v1.25.1이 아니다.** 공개 태그에는 `Daily Usage`·`▬`·`🎧`가 아예 없다
(v1.15.0~v1.36.0 전 태그 확인). `🎧 Daily Usage │ Ctx ▬▬▬` 모양은
**업스트림 + 직접 넣은 커스텀 패치 12개**의 결과이고, 그 전체 목록과 before/after는
vault의 `04. Resources/tools/claude-dashboard-setup.md` 4-1 ~ 4-12에 있다.

`dashboard/patches/anchors.mjs`가 그 12개를 전부 들고 있다 (+ 계정 위젯, 폴더 아이콘):

| 문서 | 패치 이름 | 내용 |
|---|---|---|
| 4-1 | `bar-chars`, `bar-empty-color` | 막대 `▬` ×15, 빈 칸은 `barEmpty` 색으로 따로 |
| 4-2 | `theme-model-color`, `theme-barempty-color` | default 테마 model 파스텔 주황, barEmpty 어두운 회색 |
| 4-3 | `todaycost-label` | todayCost → `🎧 Daily Usage` |
| 4-4 | `context-render` | `Ctx` 라벨 + 빨간 막대 + 토큰 패딩 |
| 4-5 | `ratelimit-render`, `-5h-color`, `-7d-label`, `-7ds-color` | rateLimit을 라벨+막대로, `📅 7days Usage` |
| 4-6 | `en-labels` | 영어 라벨 `All`·`Sn` |
| 4-7 | `model-render` | `🔥` 아이콘, effort 배지 제거, 버전은 모델 id에서 정규식 |
| 4-8 | `version-render` | `Claude v~` + model 색 |
| 4-9 | `configcounts-render`, `countmcps-cache` | 숫자 앞으로·MCP/Hooks 항상, MCP 수는 디스크 캐시 + 백그라운드 갱신 |
| 4-9b | `git-status-timeout` | `isGitDirty` 1s → 300ms |
| 4-10 | `time-format-days`, `-hours` | 시간 포맷 `2h 5m` 띄어쓰기 |
| 4-11 | `separator-color` | 구분선 `barEmpty` 색 |
| 4-12 | `spacer-after-line` | `spacerAfterLine` 설정 지원 추가 |
| 4-13 | `folder-icon` | 1.36.0이 `📁`에 붙인 U+FE0F 제거 |
| new | `account-widget` | 로그인 계정 표시 |

그래서 `spacerAfterLine`은 **업스트림이 제거한 게 아니라 처음부터 커스텀 패치**였고,
todayCost가 금액 대신 라벨만 띄우는 것도 버그가 아니라 4-3의 의도된 변경이다.

**검증:** 공개 1.36.0에 22개를 적용한 출력이 이 기기의 커스텀 1.25.1 출력과
**ANSI 색상까지 포함해 바이트 단위로 완전히 동일**하다.

> 앵커는 **1.36.0 기준**으로 썼다. 더 오래된 번들(공개 v1.25.1 등)은 소스 모양이 달라
> 일부가 `~`로 빠지므로 모양이 부분만 복원된다. 앞으로 기준 버전은 1.36.0 이상이다.

기반 플러그인은 [uppinote20/claude-dashboard](https://github.com/uppinote20/claude-dashboard).
이 레포가 들고 있는 건 **내 레이아웃 + 업스트림에 없는 패치**다.

## 설치

```bash
git clone https://github.com/eda-ginger/claude-config.git ~/claude-config
bash ~/claude-config/install.sh
```

플러그인이 아직 없으면 Claude Code 안에서 먼저:

```
/plugin marketplace add uppinote20/claude-dashboard
/plugin install claude-dashboard@claude-dashboard
```

install.sh가 하는 일:

1. `~/.claude/claude-dashboard.local.json` → 이 레포 파일로 **심링크** (기존 파일은 `.bak-<날짜>`로 백업)
2. `~/.claude/settings.json`의 `statusLine`을 `dashboard/statusline.sh`로 지정 (settings.json도 백업)
3. 번들 패치 적용

`~/claude-config` 외의 경로에 clone해도 된다 — 스크립트가 자기 위치를 기준으로 잡는다.

> 레포를 `/mnt/d`(Google Drive) 아래 두지 말 것. 상태창은 렌더마다 래퍼를 실행하므로
> DriveFS 경유 읽기는 지연이 붙고, Drive 동기화와 git이 겹쳐 충돌이 난다. 홈 디렉터리에 둔다.

## 구성

```
install.sh                              설치·갱신
dashboard/
  claude-dashboard.local.json           레이아웃·테마·accountFormat
  statusline.sh                         settings.json이 호출하는 래퍼
  patches/anchors.mjs                   패치 정의 22개 (문서 4-1~4-13 + 계정 위젯)
  patches/apply.mjs                     패치 실행기 (멱등, 패치별 독립)
```

## 패치와 래퍼가 필요한 이유

패치 대상이 플러그인의 번들 `dist/index.js`라서 **플러그인을 업데이트하면 전부 날아간다.**
그래서 `settings.json`이 번들을 직접 가리키지 않고 `statusline.sh`를 거친다. 래퍼는

- 설치된 dashboard 버전 중 가장 높은 걸 자동으로 찾는다 → settings.json에 `1.25.1` 같은 버전을 박지 않음
- 번들의 mtime·크기가 바뀌면(= 업데이트됨) 패치를 다시 적용한다
- 패치가 실패해도 패치 안 된 번들을 그대로 실행한다 → 상태창이 죽지 않고, 다음 렌더에 재시도

- `apply.mjs`가 바뀐 것도 감지한다 → 패치 세트를 고쳐서 push하면 다른 기기는 `git pull`만 하면 적용된다

변경 감지는 `stat` 2번 + 작은 파일 읽기 1번이라 비용이 없다. 측정값: 래퍼 경유 0.34초 = 직접 호출 0.34초.

### 패치는 서로 독립이다 (중요)

`apply.mjs`의 패치는 **하나가 실패해도 나머지는 적용된다.** 각 패치는 네 가지로 보고된다:

| 표시 | 뜻 |
|---|---|
| `+` | 적용함 |
| `=` | 이미 적용돼 있음 |
| `~` | obsolete — 앵커가 사라짐, 즉 업스트림이 고쳤음 (`optional` 패치만) |
| `!` | 앵커 없음 — 이 버전에 맞게 패치를 고쳐야 함 |

마지막 실행 결과는 **`~/.cache/claude-config/last-patch.log`** 에 남는다. 계정 표시가 안 보이면 이 파일부터 본다.

> 2026-11-09에 이 구조 때문에 사고가 났다. 초기 버전은 앵커를 못 찾으면 throw해서 전체가 중단됐고,
> 1.36.0에서 업스트림이 모델 버전 버그를 고치자 **계정 위젯까지 같이 안 들어갔다.**
> 그래서 패치를 독립 실행 + obsolete 개념으로 바꿨다.

### 패치 목록

전체 정의는 `dashboard/patches/anchors.mjs` 한 파일에 있다. 각 항목에 문서 번호(`doc`)와
한 줄 설명(`note`)이 붙어 있어 `apply.mjs` 출력과 바로 대응된다. 새 패치를 넣을 때는
`anchors.mjs`의 `patches` 배열에 추가하면 된다 — `apply.mjs`는 실행기일 뿐이다.

### `account` 위젯 (업스트림에 없음)

`~/.claude.json`의 `oauthAccount.emailAddress`를 읽어
지금 로그인한 계정을 폴더·브랜치 옆에 띄운다. 계정이 여러 개일 때(개인 / 학교) 헷갈리지 않으려고 추가.

- mtime 기준 캐시 — `~/.claude.json`이 120KB를 넘으므로 매 렌더 파싱을 피한다
- 읽기 실패 시 위젯만 조용히 빠지고 나머지 줄은 정상 출력
- **번들 내부 식별자에 의존하지 않는다.** esbuild가 번들 순서대로 import 이름을 바꾸므로
  (`join` → `join9`) 주입 코드는 `node:fs/promises`를 직접 동적 import하고, `colorize`·`getTheme`은
  try/catch로 감싸 없으면 색 없는 평문으로 떨어진다. 1.25.1·1.36.0 양쪽에서 렌더 확인함
- 표시 형식은 config의 `accountFormat`으로 바꾼다

| `accountFormat` | 출력 |
|---|---|
| `"email"` (기본) | `👤 rudwls2717@pusan.ac.kr` |
| `"domain"` | `👤 pusan.ac.kr` |
| `"user"` | `👤 rudwls2717` |

아이콘은 `"accountIcon": "🎓"` 처럼 지정.

## 설정 바꾸기

`dashboard/claude-dashboard.local.json`을 고치면 심링크라 즉시 반영된다. 그다음 커밋:

```bash
cd ~/claude-config && git add -A && git commit -m "dashboard: ..." && git push
```

다른 기기에서는 `git pull`만 하면 끝. 번들 패치는 래퍼가 알아서 다시 넣는다.

위젯 id는 `lines` 배열에 넣는 순서대로 왼쪽→오른쪽, 배열 하나가 한 줄.
쓸 수 있는 id 목록은 설치된 번들에서 직접 뽑는다 (버전마다 다름):

```bash
grep -o 'id: "[a-zA-Z0-9]*"' \
  ~/.claude/plugins/cache/claude-dashboard/claude-dashboard/*/dist/index.js | sort -u
```

`account`는 업스트림에 없고 이 레포의 패치가 넣는 id다.

## 계정 표시가 안 보일 때

```bash
cat ~/.cache/claude-config/last-patch.log     # 1. 마지막 패치 결과
```

- `! account-widget: ANCHOR MISSING` → 플러그인이 올라가면서 위젯 등록부 구조가 바뀐 것.
  `apply.mjs`의 `REGISTRY_ANCHOR`·`ENTRY_ANCHOR`를 새 번들에 맞춰 고쳐야 한다
- `= account-widget: already applied` 인데도 안 보이면 → 설정의 `lines`에 `"account"`가 없는 것.
  `dashboard/claude-dashboard.local.json` 확인
- 로그 파일 자체가 없으면 → 래퍼가 안 돌고 있다. `~/.claude/settings.json`의 `statusLine`이
  `bash .../dashboard/statusline.sh`를 가리키는지 확인 (`install.sh` 재실행)

강제로 다시 패치:

```bash
rm -f ~/.cache/claude-config/dashboard-patch.stamp
node ~/claude-config/dashboard/patches/apply.mjs
```

## 되돌리기

```bash
# 번들만 패치 이전으로
cp ~/.claude/plugins/cache/claude-dashboard/claude-dashboard/*/dist/index.js.bak-prepatch \
   ~/.claude/plugins/cache/claude-dashboard/claude-dashboard/*/dist/index.js

# statusLine·config 원복 (install.sh가 남긴 백업 사용)
ls ~/.claude/settings.json.bak-* ~/.claude/claude-dashboard.local.json.bak-*
```

## 알려진 어긋남

`claude-dashboard.local.json`의 `"plan": "max"`와 실제 계정의
`oauthAccount.organizationType`(`claude_pro`)이 다르다. 5h/7days 사용량 계산이 `plan` 값을
쓰면 표시되는 한도가 실제와 어긋날 수 있다. 확인 후 맞출 것.
