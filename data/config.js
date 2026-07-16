/* ===========================================================================
   config.js — 사이트 설정
   ---------------------------------------------------------------------------
   ★ 이 파일은 "값만" 바꾸면 됩니다. 구조(중괄호, 대괄호)는 그대로 두세요.
   ★ 고친 뒤 index.html 을 새로고침하면 바로 반영됩니다.
   ★ 화면이 갑자기 텅 비면 십중팔구 쉼표(,)나 따옴표(")가 빠진 겁니다.

   설정 서랍(오른쪽 위 ⚙)에서 눌러가며 바꾼 뒤 "설정 내보내기"를 누르면
   이 파일 내용을 통째로 만들어 줍니다. 복사해서 여기 붙여넣고 커밋하세요.
   =========================================================================== */

window.HADA_CONFIG = {

  /* ---------- 사이트 기본 정보 ----------
     주의: 검색·SNS 카드에 쓰이는 정보는 index.html 의 <head> 에 따로 있습니다.
     (크롤러가 자바스크립트를 실행하지 않기 때문입니다.)
     제목을 바꾸려면 index.html 의 <title> 과 og:title 도 같이 고쳐주세요. */
  site: {
    title: "HADA",
    description: "일러스트레이터 하다의 개인 홈페이지",
  },

  /* ---------- 프로필 ---------- */
  profile: {
    name:   "HADA",
    handle: "@hada",
    job:    "Illustrator",
    bio:    "분위기 있는 캐릭터 일러스트를 그립니다.",
    avatar: "assets/img/avatar.png",
  },

  /* ---------- 테마 ----------
     preset      : "classic"(클래식 블루) | "dark"(모던 다크) | "sepia"(세피아 서고)
     followSystem: true면 방문자 기기의 다크모드 설정을 따릅니다.
                   (단, 방문자가 직접 테마를 고르면 그 선택이 우선합니다.)
     darkPreset  : followSystem 이 켜져 있고 기기가 다크모드일 때 쓸 프리셋 */
  theme: {
    preset:       "classic",
    followSystem: true,
    darkPreset:   "dark",
  },

  /* ---------- 슬라이드 메인 ----------
     최대 3장. 배열을 통째로 비우면([]) 슬라이드 영역이 사라집니다.
     image : 이미지 경로
     webp  : WebP 버전이 있으면 경로, 없으면 "" (있으면 더 빨리 뜹니다)
     alt   : 눈이 불편한 방문자와 검색엔진이 읽는 설명. 꼭 채워주세요.
     link  : 클릭 시 이동할 곳. "" 면 클릭해도 아무 일 없음. */
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

  /* ---------- 링크 카드 ----------
     icon 은 이모지 한 글자를 넣으면 됩니다. 비워도 됩니다. */
  links: [
    { label: "Twitter", url: "https://twitter.com/", desc: "일상과 낙서",     icon: "🐦" },
    { label: "Pixiv",   url: "https://pixiv.net/",   desc: "일러스트 아카이브", icon: "🎨" },
    { label: "Email",   url: "mailto:you@example.com", desc: "커미션 문의",   icon: "✉️" },
  ],

  /* ---------- BGM ----------
     ★ 브라우저 정책상 방문자가 한 번 클릭하기 전에는 소리가 나지 않습니다.
       이건 고칠 수 없는 제약이라, 플레이어는 항상 정지 상태로 시작합니다.

     enabled : false 면 플레이어 자체가 안 보입니다.
     source  : "files"(내 mp3 파일) | "youtube"(유튜브 재생목록)
     tracks  : source 가 "files" 일 때 재생할 곡 목록
     youtubePlaylistId : source 가 "youtube" 일 때.
               https://www.youtube.com/playlist?list=PLxxxxxx 에서 list= 뒤 부분만.
               ※ 유튜브 모드는 file:// 더블클릭에서 불안정합니다.
                 업로드한 뒤 실제 주소에서 확인하세요.
     repeat  : "all"(전체 반복) | "one"(한 곡 반복) | "off"(반복 안 함) */
  bgm: {
    enabled: false,
    source:  "files",
    tracks: [
      // { title: "곡 제목", artist: "아티스트", src: "assets/audio/track1.mp3" },
    ],
    youtubePlaylistId: "",
    volume:  0.4,
    repeat:  "all",
    shuffle: false,
  },

  /* ---------- 마우스 커서 ----------
     ★ 커서 이미지는 32×32 픽셀 이하여야 합니다.
       더 크면 일부 브라우저/윈도우 배율에서 그냥 무시됩니다.
     x, y : 이미지 안에서 "실제로 클릭되는 점"의 좌표. 보통 뾰족한 끝.

     blockRightClick 에 대해 솔직히 말씀드리면:
     켜도 스크린샷과 개발자도구로 그림은 그대로 저장됩니다. 작정한 사람은 못 막습니다.
     그래서 기본값은 꺼짐이고, 켜더라도 그림(<img>)에만 적용됩니다.
     F12나 드래그·복사를 사이트 전체에서 막는 기능은 넣지 않았습니다 —
     그건 정상적인 방문자만 불편하게 만듭니다. */
  cursor: {
    enabled: false,
    normal:  { src: "assets/cursor/cursor.png",         x: 4, y: 4 },
    pointer: { src: "assets/cursor/cursor-pointer.png", x: 4, y: 4 },
    clickSound: { enabled: false, src: "assets/audio/click.mp3", volume: 0.3 },
    blockRightClick: false,
  },

  /* ---------- 시계 · 달력 위젯 ---------- */
  clockCalendar: {
    show: true,
  },

  /* ---------- 슬라이드 넘김 간격 (밀리초) ----------
     6000 = 6초. 0 으로 두면 자동으로 넘어가지 않습니다.
     ※ 방문자가 기기에서 "동작 줄이기"를 켜 두었다면 이 값과 무관하게
       자동 넘김이 꺼집니다. 의도된 동작입니다. */
  slideInterval: 6000,

};
