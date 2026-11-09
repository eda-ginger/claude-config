# claude-config

Claude Code 상태창(statusline) 설정. 여러 기기·세션에서 같은 dashboard 양식을 쓰기 위한 레포.

## 지금 나오는 모양

```
🎲 Daily Usage │ Ctx ▬▬▬▬▬▬▬▬▬▬▬ 0% (0/200K) │ 5h ▬▬▬▬▬▬▬▬ 20% (2h 32m)
📅 7days Usage │ All ▬▬▬▬▬▬▬▬▬▬▬ 76% (4h 12m)

🔥 Opus 5 │ Claude v2.1.0 │ 1 CLAUDE.md │ 4 MCP │ 0 Hooks
📁 Life (main) │ 👤 rudwls2717@pusan.ac.kr
```

기반 플러그인은 [uppinote20/claude-dashboard](https://github.com/uppinote20/claude-dashboard).
이 레포가 들고 있는 건 **내 레이아웃 + 업스트림에 없는 패치 2개**다.

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

## 패치 2개와 래퍼가 필요한 이유

패치 대상이 플러그인의 번들 `dist/index.js`라서 **플러그인을 업데이트하면 전부 날아간다.**
그래서 `settings.json`이 번들을 직접 가리키지 않고 `statusline.sh`를 거친다. 래퍼는

- 설치된 dashboard 버전 중 가장 높은 걸 자동으로 찾는다 → settings.json에 `1.25.1` 같은 버전을 박지 않음
- 번들의 mtime·크기가 바뀌면(= 업데이트됨) 패치를 다시 적용한다
- 패치가 실패해도 패치 안 된 번들을 그대로 실행한다 → 상태창이 죽지 않고, 다음 렌더에 재시도

변경 감지는 `stat` 1번 + 작은 파일 읽기 1번이라 비용이 없다. 측정값: 래퍼 경유 0.34초 = 직접 호출 0.34초.

### 1. `model-version`

업스트림이 모델 버전을 `"4.6"`/`"4.5"`로 하드코딩해서 Opus 5가 **Opus 4.6**으로 찍힌다.
모델 id에서 정규식으로 버전을 뽑도록 교체.

### 2. `account` 위젯

업스트림에 없는 위젯. `~/.claude.json`의 `oauthAccount.emailAddress`를 읽어
지금 로그인한 계정을 폴더·브랜치 옆에 띄운다. 계정이 여러 개일 때(개인 / 학교) 헷갈리지 않으려고 추가.

- mtime 기준 캐시 — `~/.claude.json`이 120KB를 넘으므로 매 렌더 파싱을 피한다
- 읽기 실패 시 위젯만 조용히 빠지고 나머지 줄은 정상 출력
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
쓸 수 있는 id는 `dashboard/patches/apply.mjs`가 패치하는 번들의 `widgetRegistry`에서 확인한다
(`model` `context` `cost` `rateLimit5h` `rateLimit7d` `projectInfo` `configCounts` `todayCost`
`burnRate` `codexUsage` `geminiUsage` `zaiUsage` `account` 등 35개 + 패치로 추가한 `account`).

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
