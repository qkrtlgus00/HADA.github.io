/* ===========================================================================
   bgm.js — 배경음악 플레이어
   ---------------------------------------------------------------------------
   담당:
     - "files" 모드: assets/audio 의 mp3 목록 재생 (Audio 객체 하나 재사용)
     - "youtube" 모드: 유튜브 재생목록 (IFrame API)
     - 재생/일시정지, 이전/다음, 반복(전체/한곡/끔), 셔플, 볼륨
     - 곡 위치를 localStorage 에 저장해 페이지 이동 후에도 비슷한 지점에서 이어감

   ★ 왜 항상 "정지 상태"로 시작하나요?
     브라우저는 방문자가 페이지를 한 번이라도 클릭/터치하기 전에는
     소리 재생(play)을 거부합니다. 사이트가 고칠 수 있는 게 아니라
     브라우저 정책입니다. 그래서 플레이어는 늘 ▶ 버튼이 보이는
     정지 상태로 뜨고, 이전 방문에서 재생 중이었다면 "첫 클릭이 일어나는
     순간" 조용히 이어서 재생을 시도합니다. 그래도 막히면 그냥 정지 상태로
     둡니다 — 뜨지도 않는 음악 때문에 알림을 띄우지 않습니다.

   ★ 글 페이지로 이동하면 음악이 처음부터 다시 시작되는 이유
     이 사이트는 페이지마다 문서를 새로 여는 "정적 사이트"입니다.
     페이지가 바뀌면 음악도 함께 내려갔다 다시 올라옵니다. 이건 버그가
     아니라 구조적인 한계입니다. 대신 곡 번호와 재생 위치를 저장해 두어,
     다음 페이지에서 첫 클릭 시 거의 같은 지점부터 이어 듣게 됩니다.
   =========================================================================== */

(function (H) {
  'use strict';
  if (!H) return;

  var engine = null;   // files 또는 youtube 엔진 (init 에서 하나만 선택)
  var els = null;      // 플레이어 DOM 요소 모음
  var playingNow = false;

  // 세션 상태 — localStorage 값이 있으면 그걸, 없으면 config.js 값을 씁니다.
  var state = { volume: 0.4, repeat: 'all', shuffle: false };

  /* ---------- 값 검증 헬퍼 ----------
     localStorage 값은 사람이 지웠거나 깨졌을 수 있으니 절대 믿지 않습니다. */
  function clampVol(v) {
    v = Number(v);
    if (!isFinite(v)) return 0.4;
    return Math.min(1, Math.max(0, v));
  }
  function validRepeat(r) {
    return (r === 'one' || r === 'off') ? r : 'all';
  }
  function validIndex(i, len) {
    return (typeof i === 'number' && isFinite(i) && i === Math.floor(i) && i >= 0 && i < len) ? i : 0;
  }
  function validPos(p) {
    p = Number(p);
    return (isFinite(p) && p > 0) ? p : 0;
  }

  /* ---------- 외부 공개 API ----------
     js/settings.js 가 설정 서랍에서 이걸 호출합니다.
     초기화 전(또는 BGM 꺼짐)에 불려도 조용히 무시되도록 전부 가드합니다. */
  H.bgm = {
    play: function () { if (engine) engine.play(); },
    pause: function () { if (engine) engine.pause(); },
    toggle: function () {
      if (!engine) return;
      if (engine.isPlaying()) engine.pause(); else engine.play();
    },
    setVolume: function (v) { if (engine) setVol(clampVol(v)); },
    /** 설정 서랍이 값을 바꾼 뒤 호출 — 재생을 끊지 않고 볼륨/반복/셔플만 다시 적용 */
    applyConfig: function () {
      var b = H.cfg && H.cfg.bgm;
      if (!b || !engine) return;
      setVol(clampVol(b.volume));
      setRepeat(validRepeat(b.repeat));
      if (!!b.shuffle !== state.shuffle) setShuffle(!!b.shuffle);
    }
  };

  /* ---------- 공통 상태 변경 (UI + 저장 + 엔진 통지를 한 곳에서) ---------- */
  function setVol(v) {
    state.volume = v;
    if (els) els.volume.value = String(v);
    if (engine) engine.setVolume(v);
    H.store.set('bgm:volume', v);
  }

  function setRepeat(mode) {
    state.repeat = mode;
    if (engine) engine.setRepeat(mode);
    updateRepeatUI();
    H.store.set('bgm:repeat', mode);
  }

  function setShuffle(on) {
    state.shuffle = !!on;
    if (engine) engine.setShuffle(state.shuffle);
    updateShuffleUI();
    H.store.set('bgm:shuffle', state.shuffle);
  }

  /* ---------- UI 갱신 ---------- */
  function uiPlayState(on) {
    playingNow = !!on;
    if (!els) return;
    // CSS 가 .is-playing 을 보고 디스크를 돌립니다. 여기선 클래스만 켜고 끕니다.
    els.root.classList.toggle('is-playing', playingNow);
    els.toggle.setAttribute('aria-label', playingNow ? 'BGM 일시정지' : 'BGM 재생');
    H.store.set('bgm:playing', playingNow);
  }

  function updateRepeatUI() {
    if (!els) return;
    els.repeat.classList.toggle('is-on', state.repeat !== 'off');
    els.repeat.setAttribute('data-mode', state.repeat);
    els.repeat.textContent = (state.repeat === 'one') ? '🔂' : '🔁';
    els.repeat.setAttribute('aria-label',
      state.repeat === 'all' ? '반복: 전체' :
      state.repeat === 'one' ? '반복: 한 곡' : '반복: 사용 안 함');
  }

  function updateShuffleUI() {
    if (!els) return;
    els.shuffle.classList.toggle('is-on', state.shuffle);
    els.shuffle.setAttribute('aria-pressed', state.shuffle ? 'true' : 'false');
  }

  /* 제목 표시. 흐르는(마퀴) 애니메이션은 일부러 넣지 않았습니다 —
     "동작 줄이기"를 켠 방문자에게도 안전하고, 넘치면 CSS 말줄임이 받아줍니다. */
  function setTitleText(text) {
    if (els) els.title.textContent = text;
  }
  function trackLabel(t) {
    // "제목 — 아티스트", 아티스트가 없으면 제목만
    if (t.artist) return t.title + ' — ' + t.artist;
    return t.title || 'BGM';
  }

  /* =========================================================================
     files 엔진 — 내 mp3 파일 재생
     ========================================================================= */
  function makeFilesEngine(tracks) {
    // Audio 객체는 하나만 만들어 곡마다 src 만 갈아끼웁니다.
    // 곡 수만큼 만들면 메모리 낭비에, 여러 곡이 겹쳐 나는 사고가 생깁니다.
    var audio = new Audio();
    audio.preload = 'metadata';

    /* ★ 셔플은 "미리 섞어 둔 순서표(order)"를 따라갑니다.
       다음 곡마다 Math.random() 으로 뽑으면 방금 나온 곡이 또 나오고,
       운 나쁘면 어떤 곡은 영영 안 나옵니다. 순서표를 한 번 섞어 두면
       (Fisher–Yates 방식) 전 곡이 정확히 한 번씩 다 나온 뒤 다시 돕니다. */
    var order = [];      // 재생 순서: 트랙 번호의 나열
    var oi = 0;          // order 안에서의 현재 위치
    var pendingSeek = 0; // 메타데이터 로드 후 이동할 재생 위치(초)
    var wantPlay = false;    // 사용자가 재생을 원하는 상태인가
    var failStreak = 0;      // 연속 로드 실패 수 — 전 곡 실패 시 무한루프 방지
    var warnedSrc = {};      // 같은 파일로 토스트를 반복하지 않기 위한 기록
    var lastSavedPos = 0;

    function shuffleArr(a) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
    }

    function buildOrder(keepIdx) {
      order = [];
      for (var i = 0; i < tracks.length; i++) order.push(i);
      if (state.shuffle) {
        shuffleArr(order);
        // 지금 듣던 곡을 순서표 맨 앞으로 — 셔플을 켜는 순간 곡이 확 바뀌면 놀라니까요.
        var p = order.indexOf(keepIdx);
        if (p > 0) { order[p] = order[0]; order[0] = keepIdx; }
        oi = 0;
      } else {
        oi = keepIdx;
      }
    }

    function currentIdx() { return order[oi]; }

    function loadTrack(newOi, autoplay, seekTo) {
      oi = newOi;
      var t = tracks[currentIdx()];
      pendingSeek = seekTo || 0;
      audio.src = t.src;
      setTitleText(trackLabel(t));
      // 페이지 이동 대비 저장 (파일 상단 주석 참고 — 정적 사이트의 구조적 한계 보완)
      H.store.set('bgm:idx', currentIdx());
      H.store.set('bgm:pos', pendingSeek);
      lastSavedPos = pendingSeek;
      if (autoplay) attemptPlay();
    }

    /* ★ play() 는 실패할 수 있는 약속(Promise)을 돌려줍니다.
       브라우저가 막으면(첫 클릭 전 등) 여기서 조용히 받아넘겨야
       콘솔에 빨간 오류가 쌓이지 않습니다. */
    function attemptPlay() {
      var p;
      try { p = audio.play(); } catch (e) { return; }
      if (p && typeof p.catch === 'function') {
        p.catch(function () { /* 자동재생 차단 등 — 정지 상태 유지, 알림 없음 */ });
      }
    }

    // 다음/이전으로 한 칸 이동. allowWrap=false 면 끝에서 멈춥니다.
    function step(delta, autoplay, allowWrap) {
      var n = oi + delta;
      if (n >= order.length) {
        if (!allowWrap) { wantPlay = false; return; }
        n = 0;
      }
      if (n < 0) n = order.length - 1;
      loadTrack(n, autoplay, 0);
    }

    /* ----- Audio 이벤트 ----- */
    audio.addEventListener('play',  function () { uiPlayState(true); });
    audio.addEventListener('pause', function () {
      uiPlayState(false);
      H.store.set('bgm:pos', audio.currentTime || 0);
    });

    audio.addEventListener('loadedmetadata', function () {
      failStreak = 0;
      if (pendingSeek > 0) {
        var d = audio.duration;
        if (isFinite(d) && pendingSeek < d - 1) {
          try { audio.currentTime = pendingSeek; } catch (e) { /* 무시 */ }
        }
        pendingSeek = 0;
      }
    });

    // 재생 위치를 3초 간격으로 저장 — 매번 저장하면 낭비입니다.
    audio.addEventListener('timeupdate', function () {
      var t = audio.currentTime || 0;
      if (Math.abs(t - lastSavedPos) >= 3) {
        lastSavedPos = t;
        H.store.set('bgm:pos', t);
      }
    });

    audio.addEventListener('ended', function () {
      // "한 곡 반복"은 audio.loop 가 처리하므로 이 이벤트가 오지 않습니다.
      if (state.repeat === 'all') {
        step(1, true, true);              // 끝나면 처음으로 되감아 계속
      } else { // 'off'
        if (oi >= order.length - 1) {
          wantPlay = false;               // 목록 끝 — 여기서 멈춤
          H.store.set('bgm:pos', 0);
        } else {
          step(1, true, true);
        }
      }
    });

    /* 파일 경로 오타 대비 — 이 목록은 손으로 편집하니 가장 흔한 사고입니다.
       조용히 죽는 대신: 알리고, 콘솔에 남기고, 다음 곡으로 넘어갑니다. */
    audio.addEventListener('error', function () {
      var t = tracks[currentIdx()];
      var src = (t && t.src) || audio.currentSrc || '(알 수 없음)';
      console.warn('[HADA bgm] BGM 파일 로드 실패:', src);
      if (!warnedSrc[src]) {
        warnedSrc[src] = true;
        H.toast('BGM 파일을 찾을 수 없습니다: ' + src);
      }
      failStreak++;
      if (failStreak >= tracks.length) {
        // 전 곡이 전부 실패 — 더 돌면 무한루프이므로 여기서 포기합니다.
        wantPlay = false;
        return;
      }
      step(1, wantPlay, true);
    });

    /* ----- 초기화: 저장된 곡/위치를 "정지 상태로" 걸어만 둡니다 ----- */
    var savedIdx = validIndex(H.store.get('bgm:idx', 0), tracks.length);
    var savedPos = validPos(H.store.get('bgm:pos', 0));
    audio.loop = (state.repeat === 'one');
    audio.volume = state.volume;
    buildOrder(savedIdx);
    // 셔플 저장 상태였다면 순서표 맨 앞이 savedIdx 이므로 그대로 이어집니다.
    loadTrack(oi, false, savedPos);

    return {
      play: function () { wantPlay = true; attemptPlay(); },
      pause: function () { wantPlay = false; audio.pause(); },
      next: function () { step(1, !audio.paused, true); },
      prev: function () { step(-1, !audio.paused, true); },
      setVolume: function (v) { audio.volume = v; },
      setRepeat: function (mode) { audio.loop = (mode === 'one'); },
      setShuffle: function () { buildOrder(currentIdx()); },
      isPlaying: function () { return !audio.paused; }
    };
  }

  /* =========================================================================
     youtube 엔진 — 유튜브 재생목록
     ---------------------------------------------------------------------------
     ※ 이 모드는 인터넷이 필요하고, index.html 을 더블클릭해서 여는
       file:// 환경에서는 불안정합니다. 반드시 GitHub Pages 에 업로드한 뒤
       실제 주소(https://...)에서 재생되는지 확인하세요.
     ========================================================================= */
  function makeYouTubeEngine(playlistId) {
    var player = null;
    var ready = false;
    var ytPlaying = false;
    var wantPlay = false;   // 준비 전에 재생 요청이 오면 기억해 둠
    var apiArrived = false;
    var failed = false;
    var failTimer = null;
    var saveTimer = null;

    function fail() {
      if (failed || apiArrived) return;
      failed = true;
      clearTimeout(failTimer);
      console.warn('[HADA bgm] 유튜브 IFrame API 로드 실패');
      H.toast('유튜브 플레이어를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');
      // 알림 한 번이면 충분 — 플레이어는 정지 상태로 그냥 둡니다.
    }

    function loadApi() {
      if (window.YT && window.YT.Player) { build(); return; }
      /* 유튜브 API 는 다 받아지면 "전역" onYouTubeIframeAPIReady 를 부릅니다.
         혹시 다른 스크립트가 이미 같은 이름을 쓰고 있다면 덮어쓰지 말고
         둘 다 불리게 이어 붙입니다. */
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prev === 'function') {
          try { prev(); } catch (e) { /* 남의 콜백 오류는 우리 일 아님 */ }
        }
        build();
      };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = fail;
      document.head.appendChild(s);
      // onerror 가 안 오는 차단 환경 대비 — 10초 안에 소식 없으면 실패 처리
      failTimer = setTimeout(fail, 10000);
    }

    function build() {
      apiArrived = true;
      clearTimeout(failTimer);
      /* ★ #bgm-yt 를 직접 바꿔치기하지 않고 안에 자식 div 를 만들어 넘깁니다.
         YT.Player 는 넘긴 요소를 iframe 으로 "교체"해서 클래스가 날아가는데,
         #bgm-yt 의 1×1 픽셀 축소는 CSS 클래스가 하고 있기 때문입니다.
         그리고 display:none 으로 숨기면 유튜브가 재생을 거부하니
         (CSS 가 이미 1×1 투명으로 처리) 절대 display:none 을 쓰면 안 됩니다. */
      var inner = document.createElement('div');
      els.yt.appendChild(inner);
      try {
        player = new window.YT.Player(inner, {
          width: '1',
          height: '1',
          playerVars: { playsinline: 1 },
          events: {
            onReady: onReady,
            onStateChange: onState,
            onError: function (e) {
              console.warn('[HADA bgm] 유튜브 재생 오류:', e && e.data);
            }
          }
        });
      } catch (e) {
        console.warn('[HADA bgm] 유튜브 플레이어 생성 실패:', e);
        fail();
      }
    }

    function onReady() {
      ready = true;
      try {
        player.setVolume(Math.round(state.volume * 100));
        // 저장해 둔 재생목록 위치에서 "정지 상태로" 큐만 걸어 둡니다.
        // (유튜브도 첫 클릭 전에는 소리를 절대 못 냅니다 — 같은 브라우저 정책)
        var idx = validIndex(H.store.get('bgm:ytIdx', 0), 100000);
        var pos = validPos(H.store.get('bgm:ytPos', 0));
        player.cuePlaylist({
          listType: 'playlist',
          list: playlistId,
          index: idx,
          startSeconds: pos
        });
      } catch (e) { /* 무시 — 아래에서 정지 상태 유지 */ }
      if (wantPlay) {
        wantPlay = false;
        try { player.playVideo(); } catch (e) { /* 무시 */ }
      }
    }

    function applyLoopShuffle() {
      if (!ready) return;
      try {
        player.setLoop(state.repeat === 'all');
        player.setShuffle(state.shuffle);
      } catch (e) { /* 재생목록이 아직 준비 전이면 다음 기회에 */ }
    }

    function updateYtTitle() {
      try {
        var d = player.getVideoData();
        if (d && d.title) setTitleText(d.title);
      } catch (e) { /* 무시 */ }
    }

    function savePos() {
      if (!ready) return;
      try {
        H.store.set('bgm:ytIdx', player.getPlaylistIndex() || 0);
        H.store.set('bgm:ytPos', Math.floor(player.getCurrentTime() || 0));
      } catch (e) { /* 무시 */ }
    }
    function startSave() {
      stopSave();
      saveTimer = setInterval(savePos, 5000);
    }
    function stopSave() {
      if (saveTimer) { clearInterval(saveTimer); saveTimer = null; }
    }

    function onState(e) {
      var S = window.YT.PlayerState;
      if (e.data === S.PLAYING) {
        ytPlaying = true;
        uiPlayState(true);
        applyLoopShuffle();   // setLoop/setShuffle 은 목록 로드 후에야 먹습니다
        updateYtTitle();
        startSave();
      } else if (e.data === S.PAUSED) {
        ytPlaying = false;
        uiPlayState(false);
        stopSave();
        savePos();
      } else if (e.data === S.CUED) {
        updateYtTitle();
      } else if (e.data === S.ENDED) {
        stopSave();
        if (state.repeat === 'one') {
          /* 유튜브에는 "한 곡 반복" 기능이 없어서 흉내냅니다:
             곡이 끝나는 순간 처음으로 되감아 다시 재생. */
          try { player.seekTo(0, true); player.playVideo(); } catch (err) { /* 무시 */ }
        } else {
          // 'all' 은 setLoop(true) 가 알아서 처음부터 다시 돌립니다.
          ytPlaying = false;
          uiPlayState(false);
        }
      }
    }

    loadApi();

    return {
      play: function () {
        if (ready) { try { player.playVideo(); } catch (e) { /* 무시 */ } }
        else if (!failed) { wantPlay = true; }
        // 실제로 재생이 시작되면 onStateChange 가 UI 를 켜 줍니다.
        // (차단당하면 아무 일도 안 일어나고 정지 상태 그대로 — 의도된 동작)
      },
      pause: function () {
        wantPlay = false;
        if (ready) { try { player.pauseVideo(); } catch (e) { /* 무시 */ } }
      },
      next: function () {
        if (ready) { try { player.nextVideo(); } catch (e) { /* 무시 */ } }
      },
      prev: function () {
        if (ready) { try { player.previousVideo(); } catch (e) { /* 무시 */ } }
      },
      setVolume: function (v) {
        if (ready) { try { player.setVolume(Math.round(v * 100)); } catch (e) { /* 무시 */ } }
      },
      setRepeat: function () { applyLoopShuffle(); },
      setShuffle: function () { applyLoopShuffle(); },
      isPlaying: function () { return ytPlaying; }
    };
  }

  /* =========================================================================
     초기화
     ========================================================================= */
  H.ready(function () {
    var root = H.$('#bgm');
    if (!root) return;

    var cfgB = H.cfg && H.cfg.bgm;
    // 꺼져 있거나 설정이 없으면 플레이어를 아예 보여주지 않습니다.
    if (!cfgB || cfgB.enabled === false) return;

    var isYt = (cfgB.source === 'youtube');
    var tracks = [];

    if (isYt) {
      if (!cfgB.youtubePlaylistId) return; // 재생목록 없음 — 숨김 유지
    } else {
      // 트랙 배열 검증: src 없는 항목은 걸러냅니다.
      var raw = cfgB.tracks;
      if (Object.prototype.toString.call(raw) === '[object Array]') {
        for (var i = 0; i < raw.length; i++) {
          if (raw[i] && raw[i].src) tracks.push(raw[i]);
        }
      }
      if (!tracks.length) return; // 곡이 없으면 빈 플레이어를 보여줄 이유가 없음
    }

    els = {
      root: root,
      toggle: H.$('#bgm-toggle'),
      title: H.$('#bgm-title'),
      prev: H.$('#bgm-prev'),
      next: H.$('#bgm-next'),
      repeat: H.$('#bgm-repeat'),
      shuffle: H.$('#bgm-shuffle'),
      volume: H.$('#bgm-volume'),
      yt: H.$('#bgm-yt')
    };
    if (!els.toggle || !els.title || !els.volume) return; // 마크업이 깨졌으면 조용히 포기

    // 세션 저장값 > config.js 기본값 순서로 상태를 결정합니다.
    state.volume = clampVol(H.store.get('bgm:volume', cfgB.volume));
    state.repeat = validRepeat(H.store.get('bgm:repeat', cfgB.repeat));
    state.shuffle = H.store.get('bgm:shuffle', !!cfgB.shuffle) === true;

    // ★ 엔진은 여기서 한 번만 고릅니다. 아래의 버튼 배선은 엔진이 무엇이든
    //   동일하게 동작합니다 (play/pause/next/prev/... 인터페이스가 같아서).
    engine = isYt ? makeYouTubeEngine(cfgB.youtubePlaylistId) : makeFilesEngine(tracks);

    /* ----- 버튼 배선 (엔진 공용 — 한 번만 작성) ----- */
    els.toggle.addEventListener('click', function () { H.bgm.toggle(); });
    if (els.prev) els.prev.addEventListener('click', function () { engine.prev(); });
    if (els.next) els.next.addEventListener('click', function () { engine.next(); });
    if (els.repeat) els.repeat.addEventListener('click', function () {
      // all → one → off → all 순환
      setRepeat(state.repeat === 'all' ? 'one' : state.repeat === 'one' ? 'off' : 'all');
    });
    if (els.shuffle) els.shuffle.addEventListener('click', function () {
      setShuffle(!state.shuffle);
    });
    els.volume.addEventListener('input', function () {
      setVol(clampVol(els.volume.value));
    });

    /* ----- 초기 UI ----- */
    els.volume.value = String(state.volume);
    if (isYt) setTitleText('YouTube BGM');
    updateRepeatUI();
    updateShuffleUI();
    uiPlayState(false);   // 항상 정지 상태로 시작 (파일 상단 주석 참고)
    root.hidden = false;

    /* ----- 이어듣기 시도 ----- */
    // 지난 페이지에서 재생 중이었다면, 방문자의 "첫 상호작용"에 딱 한 번
    // 이어재생을 시도합니다. 실패하면 조용히 정지 유지 — 알림 없음.
    if (H.store.get('bgm:playing', false) === true) {
      var resumeOnce = function (ev) {
        document.removeEventListener('pointerdown', resumeOnce, true);
        // 첫 클릭이 플레이어 자체라면 그 버튼이 알아서 처리하게 둡니다
        // (안 그러면 ▶ 클릭 한 번에 재생됐다가 곧바로 꺼지는 사고가 납니다).
        if (root.contains(ev.target)) return;
        engine.play();
      };
      document.addEventListener('pointerdown', resumeOnce, true);
    }
  });

})(window.HADA);
