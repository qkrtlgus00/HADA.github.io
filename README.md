# HADA — 개인 홈페이지 편집 가이드

안녕하세요. 이 사이트는 일러스트레이터를 위해 만들어졌습니다. 텍스트 에디터에서 파일을 고쳐 업데이트하세요.

## 가장 자주 하는 세 가지 일

### 1. 색·테마 바꾸기

화면 오른쪽 위의 **⚙ 설정** 버튼을 누르면 설정 창이 열립니다.

**테마 선택:** 세 가지 중 고르세요.
- **클래식 블루** — 파스텔 하늘색, 기본 테마
- **모던 다크** — 깊은 남색 어둠, 그림이 잘 보입니다
- **세피아 서고** — 옛 종이 느낌, 긴 글을 읽기 편합니다

설정 창에서 함께 조절할 수 있는 것: BGM 켜기/볼륨, 슬라이드 넘김 간격, 커서, 클릭음, 우클릭 막기, 시계·달력.
(프로필과 링크, 슬라이드 내용은 설정 창에 없습니다 — 아래 "다른 기능들"을 참고해 `data/config.js`에서 직접 고칩니다.)

**저장하기:**
1. 설정을 다 고친 뒤, 창 아래 **"설정 내보내기"** 버튼을 클릭합니다
2. 긴 텍스트가 나타납니다. **복사** 버튼을 누르거나, **다운로드** 버튼으로 `config.js` 파일을 받습니다
3. `data/config.js` 파일을 열어서 **파일 내용 전체를** 그 텍스트로 바꿉니다 (일부만 바꾸지 마세요 — 통째로 갈아끼우는 게 맞습니다)
4. 파일을 저장하고 `index.html`을 새로고침하면 반영됩니다
5. GitHub에 커밋·푸시해야 다른 사람에게도 보입니다

**중요:** 설정 창에서 바꾼 것은 **지금 보는 브라우저에만** 저장됩니다. 휴대폰이나 다른 사람은 여전히 옛날 설정을 봅니다. ⚙ 버튼에 작은 점이 있으면 아직 내보내지 않은 변경이 있다는 뜻입니다.

---

### 2. 그림 추가하기

#### 파일 준비
그림 파일(`png`, `jpg`, `webp` 등)을 `assets/img/` 폴더에 넣습니다.
(폴더가 없으면 만듭니다)

#### 갤러리 목록에 추가
`data/gallery.js` 파일을 열어서, `window.HADA_GALLERY = [` 바로 다음에 이 블록을 추가합니다:

```javascript
  {
    id:      "그림-고유-이름",
    src:     "assets/img/그림파일.png",
    webp:    "",
    thumb:   "",
    title:   "그림 제목",
    caption: "그림에 대한 설명",
    tags:    ["태그1", "태그2"],
    date:    "2026-07-16",
  },
```

**각 항목의 뜻:**
- `id` — 이 그림만의 이름. 겹치지 않으면 됩니다. 날짜를 넣으면 편합니다: `"2026-07-여름"`
- `src` — 파일 경로. `assets/img/` 안에 넣은 경로를 적습니다
- `webp` — WebP 버전이 있으면 경로를 쓰고, 없으면 `""` (비워도 상관없습니다)
  - 만드는 법: [squoosh.app](https://squoosh.app)에 그림을 끌어다 놓고 **Export** 할 때 **WebP**를 선택. 브라우저에서 바로 되고 아무것도 설치할 필요 없습니다.
- `thumb` — 목록에 쓸 작은 미리보기 이미지. 보통 비워도 됩니다 (src를 그대로 씁니다)
- `title` — 그림 제목
- `caption` — 그림을 크게 봤을 때 아래에 나오는 설명. 없어도 됩니다
- `tags` — 태그 목록. 여기 있는 태그로 필터 버튼이 **자동으로** 만들어집니다. 같은 태그가 여러 그림에 있으면 그 버튼은 한 번만 나타납니다
- `date` — "2026-07-16" 형식

**예시:**
```javascript
  {
    id:      "2026-07-여름",
    src:     "assets/img/summer.png",
    webp:    "assets/img/summer.webp",
    thumb:   "",
    title:   "여름 밤의 산책",
    caption: "초록 숲과 작은 불빛",
    tags:    ["일러스트", "자연"],
    date:    "2026-07-15",
  },
```

**참고:** 새 그림은 맨 위에 추가하세요. 위에 있는 게 먼저 보입니다. 마지막 쉼표(`,`)를 빼먹지 마세요.

---

### 3. 글 올리기

#### 1단계: 새 글 파일 만들기
`writing/template.html`을 열어서 **다른 이름으로 저장**합니다.
예를 들어: `writing/2026-07-여름밤의 이야기.html`

#### 2단계: 글 내용 작성
파일을 열어서:
- `<title>` 태그의 제목을 바꿉니다
- `<article class="wr-body">` 안의 내용을 지우고 글을 작성합니다

**쓸 수 있는 서식:**
`template.html`에 모든 서식이 예시로 들어 있습니다. 필요한 부분을 복사해서 쓰면 됩니다:

- `.wr-title` — 큰 제목 + 사건번호 같은 라벨
- `.wr-sub` — 장면 구분
- `.wr-hl` — 노란 형광펜
- `.wr-wavy` — 물결 밑줄
- `.wr-spoiler` — 숨겨지는 텍스트 (클릭하면 나타남)
- `.wr-code` — `[증거-A]` 같은 코드 표기
- `.wr-sticky` — 포스트잇 메모
- `.wr-quote` — 인용
- `.wr-small` — 작은 글자
- `.wr-log` — 로그 스타일 (시간, 상태, 메시지)
- `.wr-system` — 시스템 안내 메시지
- `.wr-warn` — 경고 박스

#### 3단계: 글 목록에 추가
`data/posts.js` 파일을 열어서, 맨 위의 `window.HADA_POSTS = [` 바로 다음에 이 블록을 추가합니다:

```javascript
  {
    title:   "글의 제목",
    href:    "writing/파일이름.html",
    date:    "2026-07-16",
    tags:    ["태그1", "태그2"],
    summary: "한 줄 소개",
  },
```

**주의:** 경로를 적는 칸의 이름은 **`href`** 입니다. `path`라고 쓰면 링크가 안 걸립니다.

**글이 하나도 없으면** 메인의 "글" 섹션은 자동으로 숨겨집니다.

---

## 다른 기능들

### 프로필 · 소개글

**프로필 (이름, 직업, 한 줄 소개):**
`data/config.js`에서 `profile` 섹션을 고칩니다.
```javascript
  profile: {
    name:   "HADA",
    handle: "@hada",
    job:    "Illustrator",
    bio:    "분위기 있는 캐릭터 일러스트를 그립니다.",
    avatar: "assets/img/avatar.png",
  },
```

**소개글 (긴 산문):**
이건 `data/config.js`에 없습니다. `index.html`을 열어서 "소개" 섹션을 찾아 직접 고칩니다:
```html
<section class="section wrap" id="about" aria-labelledby="about-h">
  <h2 class="section__title" id="about-h">소개</h2>
  <div class="prose">
    <!-- 여기를 고칩니다 -->
  </div>
</section>
```

### 링크 카드

`data/config.js`의 `links` 섹션을 고칩니다.
```javascript
  links: [
    { label: "Twitter", url: "https://twitter.com/yourname", desc: "일상과 낙서", icon: "🐦" },
    { label: "Pixiv",   url: "https://pixiv.net/members/yourname", desc: "아카이브", icon: "🎨" },
  ],
```

- `icon` — 이모지 한 글자. 없으면 비웁니다
- `url` — 링크 주소

### 슬라이드 메인

메인 화면 위에 보이는 큰 이미지들입니다. `data/config.js`의 `slides` 섹션을 고칩니다.

```javascript
  slides: [
    {
      image: "assets/img/slide1.png",
      webp:  "",
      alt:   "여름 배경의 캐릭터 일러스트",
      title: "여름 신작",
      body:  "새 그림이 올라왔어요.",
      link:  "#gallery",
    },
  ],
```

- 최대 3장입니다
- 배열을 비우면 (`[]`) 슬라이드 영역이 사라집니다
- `link` — 클릭할 때 이동할 곳. 그냥 링크가 없으면 `""`
- 6초마다 자동으로 넘어갑니다 (설정에서 바꿀 수 있습니다)

### BGM (배경음악)

`data/config.js`의 `bgm` 섹션:

```javascript
  bgm: {
    enabled: false,
    source:  "files",
    tracks: [
      { title: "곡 제목", artist: "아티스트", src: "assets/audio/track1.mp3" },
    ],
    youtubePlaylistId: "",
    volume:  0.4,
    repeat:  "all",
    shuffle: false,
  },
```

- `enabled: true` — 플레이어를 보입니다
- `source: "files"` — 내 mp3 파일 재생. 또는 `"youtube"` (유튜브 재생목록)
- `youtubePlaylistId` — 유튜브 사용 시, 재생목록 URL에서 `list=` 뒤의 글자들

**중요:**
- **방문자가 한 번 클릭하기 전에는 소리가 나지 않습니다.** 이건 모든 브라우저의 정책이라 고칠 수 없습니다. 그래서 플레이어는 항상 정지 상태(▶)로 시작합니다. 버그가 아닙니다.
- **유튜브 모드는 `file://` 더블클릭에서 불안정합니다.** 사이트를 실제 주소에 올린 뒤 확인하세요.
- **음악을 다시 재생하면 처음부터입니다.** 글 페이지로 이동할 때 전체 페이지가 새로고침되기 때문입니다. 이건 이런 종류의 사이트의 구조적 한계입니다.

### 커서

마우스 커서를 커스텀할 수 있습니다. `data/config.js`의 `cursor` 섹션:

```javascript
  cursor: {
    enabled: false,
    normal:  { src: "assets/cursor/cursor.png",         x: 4, y: 4 },
    pointer: { src: "assets/cursor/cursor-pointer.png", x: 4, y: 4 },
    clickSound: { enabled: false, src: "assets/audio/click.mp3", volume: 0.3 },
    blockRightClick: false,
  },
```

- `enabled: true` — 커스텀 커서를 봅니다
- `src` — 커서 이미지 파일
- `x, y` — 이미지 안에서 "실제로 클릭되는 점"의 좌표 (보통 뾰족한 끝)
- `clickSound` — 클릭할 때 소리

**주의:**
- **커서 이미지는 32×32 픽셀 이하여야 합니다.** 더 크면 일부 브라우저에서 무시됩니다.
- `blockRightClick: true` 로 해도 스크린샷과 개발자도구(F12)로는 그림을 그대로 저장할 수 있습니다. 작정한 사람은 못 막는다는 뜻입니다. 그래서 기본값은 꺼져 있고, 켜도 이미지에만 적용됩니다. F12 자체를 막거나 드래그·복사를 전체에서 막는 기능은 의도적으로 만들지 않았습니다 — 그건 정상적인 방문자만 불편하게 만들기 때문입니다.

### 시계 · 달력 위젯

프로필 아래에 시계와 달력이 나란히 표시됩니다. (좁은 화면에서는 위아래로 쌓입니다.)
달력은 한국 달력처럼 일요일이 빨강, 토요일이 파랑이고 오늘 날짜에 동그라미가 들어갑니다.

`data/config.js`의 `clockCalendar`:
```javascript
  clockCalendar: {
    show: true,
  },
```

`show: false` 로 하면 숨겨집니다.

---

## 반드시 알아야 할 것

### 파일 구조

```
갠홈/
├─ index.html          ← 메인 페이지
├─ writing/
│  ├─ template.html    ← 글 만들 때 복사하는 템플릿
│  └─ (새 글들)
├─ data/
│  ├─ config.js        ← 모든 설정
│  ├─ gallery.js       ← 그림 목록
│  └─ posts.js         ← 글 목록
├─ assets/
│  ├─ img/             ← 그림, 아바타, 슬라이드
│  ├─ audio/           ← BGM, 클릭음
│  └─ cursor/          ← 커서 이미지
├─ css/                ← 스타일 (보통 안 고칩니다)
├─ js/                 ← 자바스크립트 (보통 안 고칩니다)
└─ .nojekyll           ← GitHub Pages용 파일 (지우지 마세요)
```

**중요:** `data/` 폴더가 유일하게 자주 고치는 곳입니다.

### 문제가 있을 때

**갤러리나 글 목록이 갑자기 사라졌어요:**
십중팔구 `data/` 안의 파일에서 **쉼표(`,`)나 따옴표(`"`)가 빠진** 것입니다. 컴퓨터는 그 파일 전체를 통째로 못 읽게 되고, 그래서 그 부분이 텅 비어 보입니다.

혼자 알아내실 필요 없습니다. **어느 파일이 문제인지 화면 위에 노란 상자로 알려줍니다:**

> 데이터 파일을 읽지 못했습니다.
> 아래 파일에 오타가 있는 것 같아요: `data/gallery.js`

몇 번째 줄인지까지 알고 싶으면:
1. **F12**를 누르면 개발자 도구가 열립니다
2. **Console** 탭을 클릭하면 빨간 글씨로 파일명과 줄 번호가 나옵니다
3. 그 줄과 **바로 윗줄**을 보세요. 쉼표는 보통 윗줄 끝에서 빠집니다

가장 흔한 실수:
```javascript
{ id: "a", src: "x.png" title: "제목" },
                       ↑ 여기 쉼표가 빠졌습니다
```

### SNS 카드 (링크를 공유할 때 나오는 미리보기)

링크를 카톡이나 트위터에 붙여 넣으면 제목, 설명, 이미지가 나옵니다. 이걸 "OG 카드"라고 부르는데, 크롤러가 자바스크립트를 실행하지 않기 때문에 손으로 적어야 합니다.

`index.html`의 `<head>` 섹션을 찾아서:
```html
<meta property="og:title" content="HADA">
<meta property="og:description" content="일러스트레이터 하다의 개인 홈페이지">
<meta property="og:url" content="https://qkrtlgus00.github.io/HADA/">
<meta property="og:image" content="https://qkrtlgus00.github.io/HADA/assets/img/og.png">
```

여기서:
- `og:title` — 카드의 제목
- `og:description` — 카드의 설명
- `og:url` — 사이트 주소 (절대 경로여야 합니다)
- `og:image` — 카드의 이미지 (절대 경로여야 합니다)

**URL은 반드시 `https://...` 형태로** 써야 합니다. 상대 경로(예: `assets/img/og.png`)는 크롤러가 제대로 읽지 못합니다.

### 배포: GitHub Pages

이 사이트는 GitHub에 올려서 공개합니다.

#### 저장소 이름 바꾸기
1. GitHub에서 저장소 설정(Settings)을 열어서 **저장소 이름**을 `HADA`로 바꿉니다
   (원래: `HADA.github.io` → 새로: `HADA`)
2. Settings → **Pages** 섹션으로 가서, 어느 브랜치를 배포할지 선택합니다 (보통 `main`)
3. 저장하면 `https://계정.github.io/HADA/` 주소가 됩니다

#### `.nojekyll` 파일
저장소 루트에 `.nojekyll` 파일이 있습니다. **지우지 마세요.** 없으면 GitHub Pages가 Jekyll을 실행해서 일부 파일이 사라집니다.

#### OG URL 업데이트
저장소 이름이 바뀌거나 실제 도메인을 쓰기로 했다면, `index.html`의 OG 태그도 새 주소로 고쳐야 합니다 (위 "SNS 카드" 섹션 참고).

### WebP는 선택 사항

WebP는 더 작고 빠른 이미지 형식입니다. 하지만 필수는 아닙니다.
- `gallery.js`의 `webp` 필드를 `""` (비움)로 두면 평상시 이미지(`src`)를 씁니다
- WebP를 원하면 [squoosh.app](https://squoosh.app)에서 만듭니다. 브라우저에서 바로 되고 프로그램을 설치할 필요 없습니다

### 미리보기

`index.html`을 더블클릭해서 브라우저에서 열면 거의 모든 기능을 볼 수 있습니다. 유튜브 BGM 모드만 주의하세요 (위 "BGM" 섹션 참고).

---

## 빠른 참고

**자주 쓰는 파일:**
- `data/config.js` — 거의 모든 설정
- `data/gallery.js` — 그림 추가
- `data/posts.js` — 글 추가
- `index.html` — 소개글, SNS 카드

**새 그림 추가:**
1. `assets/img/`에 파일 넣기
2. `data/gallery.js` 맨 위에 한 덩어리 추가
3. 저장하고 새로고침

**새 글 올리기:**
1. `writing/template.html` 복사해서 이름 바꾸기
2. 파일 열어서 글 작성
3. `data/posts.js` 맨 위에 한 덩어리 추가
4. 저장하고 새로고침

**설정 저장:**
1. ⚙ 설정 창에서 조절
2. "설정 내보내기" 클릭
3. `data/config.js` 파일 통째로 바꾸기
4. 커밋 & 푸시

행운을 빕니다! 질문이 있으면 각 파일의 주석을 참고하세요.
