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

### 버전 간 모양 차이

줄 구성(`lines`)은 두 버전이 똑같다. 다른 건 위젯 렌더링이고, 일부만 패치로 되돌릴 수 있다.

| | 1.25.1 | 1.36.0 | 패치로 복원 |
|---|---|---|---|
| 막대 | `▬` ×15 | `█`/`░` ×10 | ✅ `bar-style` |
| 줄 사이 빈 줄 | `spacerAfterLine` 지원 | 키 자체가 삭제됨 | ✅ `spacer-after-line` |
| 비용 | `🎧 Daily Usage` | `💰️ Today: $105.25` | ❌ 복원 안 함 — 아래 참고 |
| 모델·개수 표기 | `🔥 Opus 5` / `1 CLAUDE.md │ 4 MCP` | `◆ Opus 5(H)` / `CLAUDE.md: 1, MCP: 3` | ❌ 위젯 전면 재작성 필요 |

> **1.25.1의 `todayCost`는 버그다.** `dailyTotal`을 계산한 뒤 숫자를 버리고 `🎧 Daily Usage`
> 라벨만 출력한다(`t`를 destructure해놓고 쓰지도 않음). 즉 **1.25.1에서는 오늘 쓴 금액이 안 보인다.**
> 1.36.0의 `💰️ Today: $105.25`가 그 수정판이므로, 이 부분은 의도적으로 되돌리지 않는다.

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
  patches/apply.mjs                     번들 패치 (멱등)
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

### 1. `model-version` (optional)

1.25.x 업스트림이 모델 버전을 `"4.6"`/`"4.5"`로 하드코딩해서 Opus 5가 **Opus 4.6**으로 찍혔다.
모델 id에서 정규식으로 버전을 뽑도록 교체.

**1.36.0에서 업스트림이 고쳤으므로 `~`로 건너뛴다.** 정상이다.

### 1b. `bar-style` (optional)

1.36.0이 기본 막대를 `█`/`░` ×10으로 바꿨다. 1.25.1의 `▬` ×15로 되돌린다.
1.25.x에는 해당 앵커가 없어 `~`로 건너뛴다.

### 1c. `spacer-after-line` (optional)

1.36.0이 `spacerAfterLine` 설정을 통째로 제거해 줄 그룹 사이 빈 줄이 사라졌다.
1.25.1의 `formatOutput` 구현을 그대로 되살려 `"spacerAfterLine": [1]` 이 다시 먹게 한다.
1.25.x는 원래 지원하므로 `~`로 건너뛴다.

### 2. `account` 위젯

업스트림에 없는 위젯. `~/.claude.json`의 `oauthAccount.emailAddress`를 읽어
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
