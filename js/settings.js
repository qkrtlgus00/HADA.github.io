/* ===========================================================================
   settings.js — 설정 서랍 (이 정적 사이트의 "관리자 페이지")
   ---------------------------------------------------------------------------
   원래 영감이 된 PHP 홈페이지에는 관리자 페이지가 따로 있었지만,
   여기는 서버가 없습니다. 그래서 이 서랍이 곧 관리자 페이지입니다.

   동작 원리, 세 문장 요약:
     1. 서랍에서 바꾼 값은 localStorage 에 "오버라이드"로 저장됩니다.
        → 지금 이 브라우저에서는 즉시 적용되지만, 파일은 그대로입니다.
     2. 그래서 다른 기기·다른 브라우저에서는 예전 모습 그대로 보입니다.
        이 어긋남(드리프트)을 알리려고 톱니 버튼에 분홍 점을 띄웁니다.
     3. "설정 내보내기"를 누르면 data/config.js 전체 내용을 다시 만들어
        줍니다. 복사해서 파일에 덮어쓰고 업로드하면 모든 기기가 같아집니다.

   ★ 내보내기가 JSON.stringify 가 아닌 이유:
     config.js 의 한국어 주석이 이 사이트의 유일한 설명서입니다.
     JSON.stringify 는 주석을 전부 날려버리므로, 파일 구조와 주석을
     그대로 본뜬 "틀"에 현재 값만 끼워 넣는 방식으로 다시 만듭니다.

   ★ ES 모듈이 아닌 이유: index.html 을 file:// 로 더블클릭해서 여는
     사용 습관 때문입니다 (index.html 하단 주석 참고).
   =========================================================================== */

(function (H) {
  'use strict';
  if (!H) return;

  H.ready(function () {

    /* ---------- 필수 마크업 확인 ----------
       이 스크립트는 index.html 에서만 로드되지만, 혹시 다른 페이지에
       실수로 넣어도 조용히 물러나도록 방어합니다. */
    var dlg     = H.$('#settings');
    var openBtn = H.$('#settings-open');
    if (!dlg || !openBtn) return;

    var body      = H.$('#settings-body');
    var closeBtn  = H.$('#settings-close');
    var badge     = H.$('#settings-badge');
    var resetBtn  = H.$('#settings-reset');
    var exportBtn = H.$('#settings-export');
    if (!body) return;

    /* 서랍 안에서 계속 만지작거릴 요소들의 참조.
       (행 전체를 다시 만들면 null 로 되돌립니다) */
    var driftNote    = null;   // "이 브라우저에만 저장됨" 안내문
    var themeChips   = null;   // 테마 칩 묶음
    var bgmVolumeRow = null;   // BGM 볼륨 행 (BGM 꺼짐이면 숨김)
    var exportBox    = null;   // 내보내기 영역 (버튼 누르면 생김)
    var exportTa     = null;   // 내보내기 텍스트 상자

    /* =======================================================================
       열기 / 닫기
       -----------------------------------------------------------------------
       <dialog> + showModal() 을 쓰면 포커스 가두기와 Esc 닫기가 공짜입니다.
       직접 만들지 않습니다 — 브라우저가 해주는 게 더 정확합니다.
       ======================================================================= */
    openBtn.addEventListener('click', function () {
      if (typeof dlg.showModal === 'function') {
        if (!dlg.open) dlg.showModal();
      } else {
        // <dialog> 를 모르는 아주 오래된 브라우저용 최소한의 대비책
        dlg.setAttribute('open', '');
      }
      // 서랍이 닫혀 있는 동안 푸터의 테마 칩으로 테마가 바뀌었을 수 있으니
      // 열 때마다 가벼운 동기화만 해줍니다 (행 전체를 다시 만들진 않음).
      syncThemeChips();
      syncDrift();
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.removeAttribute('open');
      });
    }

    /* 배경(백드롭) 클릭으로 닫기.
       서랍 안쪽을 누르면 target 이 자식 요소이고,
       바깥 어두운 막을 누르면 target 이 <dialog> 그 자체입니다. */
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg && typeof dlg.close === 'function') dlg.close();
    });

    /* =======================================================================
       작은 도우미들
       ======================================================================= */

    function clamp01(v) {
      v = Number(v);
      if (!isFinite(v)) return 0.4;
      return Math.min(1, Math.max(0, v));
    }

    /** 한 줄 = 왼쪽 라벨(+힌트) + 오른쪽 컨트롤.
        asLabel 이 참이면 <label> 로 감싸 라벨 글자를 눌러도 토글됩니다. */
    function fieldRow(labelText, hintText, controls, asLabel) {
      var labelKids = [labelText];
      if (hintText) {
        labelKids.push(H.el('span', { class: 'field__hint', text: hintText }));
      }
      return H.el(asLabel ? 'label' : 'div', { class: 'field' }, [
        H.el('span', { class: 'field__label' }, labelKids),
        H.el('span', { class: 'field__control' }, controls)
      ]);
    }

    /** 토글 스위치 한 줄. onChange(불리언) 을 넘겨받습니다. */
    function switchRow(labelText, hintText, checked, onChange) {
      var input = H.el('input', { type: 'checkbox', class: 'switch' });
      input.checked = !!checked;
      input.addEventListener('change', function () {
        onChange(input.checked);
      });
      return fieldRow(labelText, hintText, [input], true);
    }

    function syncBadge() {
      if (badge) badge.hidden = !H.hasOverrides();
    }

    function syncDrift() {
      if (driftNote) driftNote.hidden = !H.hasOverrides();
      syncBadge();
    }

    /* =======================================================================
       테마 행 — theme.js 의 프리셋 목록을 재사용합니다
       ======================================================================= */

    function syncThemeChips() {
      if (!themeChips || !H.theme || !H.theme.resolve) return;
      var active = H.theme.resolve();
      H.$$('.chip[data-theme]', themeChips).forEach(function (b) {
        var on = b.dataset.theme === active;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function buildThemeRow() {
      if (!H.theme || !H.theme.presets || !H.theme.presets.length) return null;

      themeChips = H.el('div', { class: 'chips', role: 'group', 'aria-label': '테마 선택' });

      H.theme.presets.forEach(function (p) {
        var swatch = H.el('span', { class: 'chip__swatch', 'aria-hidden': 'true' });
        // 다른 테마의 색을 미리 보여줘야 하니 토큰 대신 직접 칠합니다
        // (theme.js 의 같은 자리 주석 참고 — 인라인 스타일이 허용되는 유일한 곳).
        if (p.swatch && p.swatch.length >= 2) {
          swatch.style.background =
            'linear-gradient(135deg, ' + p.swatch[0] + ' 50%, ' + p.swatch[1] + ' 50%)';
        }
        var btn = H.el('button', {
          class: 'chip',
          type: 'button',
          dataset: { theme: p.id },
          'aria-pressed': 'false',
          onclick: function () {
            if (H.theme && H.theme.choose) H.theme.choose(p.id);
            syncThemeChips();
          }
        }, [swatch, H.el('span', { text: p.name })]);
        themeChips.appendChild(btn);
      });

      syncThemeChips();

      return H.el('div', { class: 'field' }, [
        H.el('span', { class: 'field__label', text: '테마' }),
        H.el('span', { class: 'field__control' }, [themeChips])
      ]);
    }

    /* =======================================================================
       BGM 볼륨 행
       -----------------------------------------------------------------------
       드래그하는 동안(input)은 소리만 바로 바꾸고,
       손을 뗐을 때(change)만 오버라이드로 저장합니다.
       매 픽셀마다 저장하면 hada:config 이벤트가 폭주해서
       다른 모듈들이 쓸데없이 다시 그려집니다.
       ======================================================================= */
    function buildBgmVolumeRow(cfgB) {
      var input = H.el('input', {
        type: 'range', min: '0', max: '1', step: '0.05',
        'aria-label': 'BGM 볼륨'
      });
      input.value = String(clamp01(cfgB.volume));

      input.addEventListener('input', function () {
        var v = clamp01(input.value);
        // 모듈이 일찍 물러났을 수 있으니(곡 없음 등) 항상 가드하고 부릅니다.
        if (H.bgm && H.bgm.setVolume) H.bgm.setVolume(v);
      });
      input.addEventListener('change', function () {
        var v = clamp01(input.value);
        H.setOverride({ bgm: { volume: v } });
        if (H.bgm && H.bgm.setVolume) H.bgm.setVolume(v);
      });

      return fieldRow('BGM 볼륨', null, [input], true);
    }

    /* =======================================================================
       서랍 몸통 만들기
       -----------------------------------------------------------------------
       ★ 모든 컨트롤의 초기값은 H.cfg(병합된 최종 설정)에서 읽습니다.
         H.defaults(파일 원본)가 아닙니다 — 서랍은 "지금 화면의 상태"를
         보여줘야 하니까요.
       ★ 저장은 전부 H.setOverride() 로만 합니다. localStorage 를 직접
         만지지 않습니다 — setOverride 가 깊은 병합 + 저장 + hada:config
         이벤트 발송까지 다 해주고, 다른 모듈들이 그 이벤트를 듣고 있습니다.
       ======================================================================= */
    function buildRows() {
      body.innerHTML = '';
      driftNote = null;
      themeChips = null;
      bgmVolumeRow = null;
      exportBox = null;
      exportTa = null;

      var cfg  = H.cfg || {};
      var cfgB = cfg.bgm || {};
      var cfgC = cfg.cursor || {};

      /* --- 드리프트 안내문 ---
         오버라이드가 있다는 건 "이 브라우저와 파일이 서로 다르다"는 뜻.
         내보내기 전까지는 폰에서, 다른 컴퓨터에서 예전 모습이 보입니다. */
      driftNote = H.el('p', {
        class: 'field__hint',
        text: '여기서 바꾼 설정은 이 브라우저에만 저장됩니다. 다른 기기에서는 '
            + '예전 모습 그대로예요. 아래 「설정 내보내기」로 config.js 를 '
            + '만들어 덮어쓰고 업로드해야 어디서나 똑같이 보입니다.'
      });
      driftNote.hidden = !H.hasOverrides();
      body.appendChild(driftNote);

      /* --- 테마 --- */
      var themeRow = buildThemeRow();
      if (themeRow) body.appendChild(themeRow);

      /* --- BGM 볼륨 (BGM 이 켜져 있을 때만 보임) --- */
      bgmVolumeRow = buildBgmVolumeRow(cfgB);
      bgmVolumeRow.hidden = !(cfg.bgm && cfg.bgm.enabled);
      body.appendChild(bgmVolumeRow);

      /* --- BGM 켜기/끄기 ---
         bgm.js 는 페이지가 뜰 때 딱 한 번 플레이어를 만들지/말지 정하므로,
         플레이어의 등장·퇴장 자체는 새로고침이 있어야 반영됩니다.
         (볼륨·반복 같은 값은 applyConfig 로 바로 적용됩니다.) */
      body.appendChild(switchRow(
        'BGM 켜기/끄기',
        '플레이어 표시/숨김은 새로고침 후 반영됩니다.',
        !!cfgB.enabled,
        function (on) {
          H.setOverride({ bgm: { enabled: on } });
          if (!on && H.bgm && H.bgm.pause) H.bgm.pause();           // 즉시 소리는 멈춤
          if (on && H.bgm && H.bgm.applyConfig) H.bgm.applyConfig(); // 살아 있다면 값 재적용
          if (bgmVolumeRow) bgmVolumeRow.hidden = !on;
        }
      ));

      /* --- 슬라이드 넘김 간격 --- */
      var intervalOpts = [
        [0,    '끄기'],
        [4000, '4초'],
        [6000, '6초'],
        [8000, '8초']
      ];
      var curMs = Number(cfg.slideInterval);
      if (!isFinite(curMs) || curMs < 0) curMs = 0;
      // 파일에 목록 밖의 값(예: 5000)이 적혀 있어도 그 값을 지워버리지 않고
      // "현재 값" 항목으로 보여줍니다.
      var known = false, oi;
      for (oi = 0; oi < intervalOpts.length; oi++) {
        if (intervalOpts[oi][0] === curMs) { known = true; break; }
      }
      if (!known) intervalOpts.push([curMs, (curMs / 1000) + '초 (현재 값)']);

      var sel = H.el('select', { class: 'select', 'aria-label': '슬라이드 넘김 간격' });
      intervalOpts.forEach(function (o) {
        sel.appendChild(H.el('option', { value: String(o[0]), text: o[1] }));
      });
      sel.value = String(curMs);
      sel.addEventListener('change', function () {
        var ms = Number(sel.value);
        if (!isFinite(ms) || ms < 0) ms = 0;
        H.setOverride({ slideInterval: ms });
      });
      body.appendChild(fieldRow('슬라이드 넘김 간격', null, [sel], true));

      /* --- 커서 커스텀 --- */
      body.appendChild(switchRow(
        '커서 커스텀',
        'assets/cursor 의 커서 이미지를 사용합니다 (32×32 이하).',
        !!cfgC.enabled,
        function (on) {
          H.setOverride({ cursor: { enabled: on } });
          if (H.cursor && H.cursor.apply) H.cursor.apply();
        }
      ));

      /* --- 클릭음 --- */
      body.appendChild(switchRow(
        '클릭음',
        'config.js 의 clickSound.src 에 소리 파일이 있어야 납니다.',
        !!(cfgC.clickSound && cfgC.clickSound.enabled),
        function (on) {
          H.setOverride({ cursor: { clickSound: { enabled: on } } });
          if (H.cursor && H.cursor.apply) H.cursor.apply();
        }
      ));

      /* --- 우클릭 막기 ---
         힌트는 일부러 솔직하게 씁니다. 과장하면 나중에 실망합니다. */
      body.appendChild(switchRow(
        '우클릭 막기',
        '가볍게 저장하는 것만 막아줍니다. 스크린샷·개발자도구는 못 막고, '
          + '그림(이미지)에만 적용됩니다.',
        !!cfgC.blockRightClick,
        function (on) {
          H.setOverride({ cursor: { blockRightClick: on } });
          if (H.cursor && H.cursor.apply) H.cursor.apply();
        }
      ));

      /* --- 시계 · 달력 --- */
      body.appendChild(switchRow(
        '시계·달력',
        null,
        !!(cfg.clockCalendar && cfg.clockCalendar.show),
        function (on) {
          H.setOverride({ clockCalendar: { show: on } });
          // widgets.js 가 hada:config 를 듣고 표시/숨김은 스스로 처리하지만,
          // 켤 때는 오늘 날짜 기준으로 한 번 새로 그려달라고 부탁합니다.
          if (on && H.widgets && H.widgets.refresh) H.widgets.refresh();
        }
      ));
    }

    /* =======================================================================
       내보내기 — data/config.js 전체를 다시 만들어 줍니다
       -----------------------------------------------------------------------
       왜 이렇게까지 하냐면: 서랍의 변경은 localStorage 에만 삽니다.
       이 텍스트를 data/config.js 에 붙여넣고 업로드해야 비로소
       "진짜 설정"이 됩니다. 그래서 파일의 주석·순서·모양까지 그대로
       본떠서, 붙여넣기만 하면 되는 완성본을 만들어 줍니다.
       ======================================================================= */

    /* ----- 값 직렬화 도우미 -----
       String(v) 에 맡기면 따옴표·역슬래시가 들어간 한국어 문장에서
       파일이 통째로 깨집니다. 문자열 "하나"를 안전하게 따옴표 처리하는
       데는 JSON.stringify 가 정확합니다 (주석을 날리는 문제는 파일
       전체를 stringify 할 때 이야기입니다). */
    function str(v) {
      if (v === undefined || v === null) v = '';
      return JSON.stringify(String(v));
    }
    function num(v, fallback) {
      v = Number(v);
      return String(isFinite(v) ? v : fallback);
    }
    function bool(v) {
      return v ? 'true' : 'false';
    }

    function buildConfigText() {
      var c       = H.cfg || {};
      var site    = c.site || {};
      var profile = c.profile || {};
      var theme   = c.theme || {};
      var slides  = Array.isArray(c.slides) ? c.slides : [];
      var links   = Array.isArray(c.links) ? c.links : [];
      var bgm     = c.bgm || {};
      var tracks  = Array.isArray(bgm.tracks) ? bgm.tracks : [];
      var cur     = c.cursor || {};
      var curN    = cur.normal || {};
      var curP    = cur.pointer || {};
      var curC    = cur.clickSound || {};
      var cc      = c.clockCalendar || {};

      // 목록 밖의 값이 저장돼 있어도 파일이 깨지지 않게 한 번 걸러줍니다.
      var repeat = (bgm.repeat === 'one' || bgm.repeat === 'off') ? bgm.repeat : 'all';
      var source = (bgm.source === 'youtube') ? 'youtube' : 'files';
      var themePreset = theme.preset || 'classic';
      var darkPreset  = theme.darkPreset || 'dark';

      var L = [];

      /* 아래 주석 문구들은 data/config.js 원본과 글자 하나까지 같아야 합니다.
         이 주석들이 사용자의 유일한 설명서라서, 내보내기가 주석을 바꾸거나
         지우면 설명서를 잃어버리는 셈이 됩니다. */
      L.push('/* ===========================================================================');
      L.push('   config.js — 사이트 설정');
      L.push('   ---------------------------------------------------------------------------');
      L.push('   ★ 이 파일은 "값만" 바꾸면 됩니다. 구조(중괄호, 대괄호)는 그대로 두세요.');
      L.push('   ★ 고친 뒤 index.html 을 새로고침하면 바로 반영됩니다.');
      L.push('   ★ 화면이 갑자기 텅 비면 십중팔구 쉼표(,)나 따옴표(")가 빠진 겁니다.');
      L.push('');
      L.push('   설정 서랍(오른쪽 위 ⚙)에서 눌러가며 바꾼 뒤 "설정 내보내기"를 누르면');
      L.push('   이 파일 내용을 통째로 만들어 줍니다. 복사해서 여기 붙여넣고 커밋하세요.');
      L.push('   =========================================================================== */');
      L.push('');
      L.push('window.HADA_CONFIG = {');
      L.push('');

      /* ----- 사이트 기본 정보 ----- */
      L.push('  /* ---------- 사이트 기본 정보 ----------');
      L.push('     주의: 검색·SNS 카드에 쓰이는 정보는 index.html 의 <head> 에 따로 있습니다.');
      L.push('     (크롤러가 자바스크립트를 실행하지 않기 때문입니다.)');
      L.push('     제목을 바꾸려면 index.html 의 <title> 과 og:title 도 같이 고쳐주세요. */');
      L.push('  site: {');
      L.push('    title: ' + str(site.title) + ',');
      L.push('    description: ' + str(site.description) + ',');
      L.push('  },');
      L.push('');

      /* ----- 프로필 ----- */
      L.push('  /* ---------- 프로필 ---------- */');
      L.push('  profile: {');
      L.push('    name:   ' + str(profile.name) + ',');
      L.push('    handle: ' + str(profile.handle) + ',');
      L.push('    job:    ' + str(profile.job) + ',');
      L.push('    bio:    ' + str(profile.bio) + ',');
      L.push('    avatar: ' + str(profile.avatar) + ',');
      L.push('  },');
      L.push('');

      /* ----- 테마 ----- */
      L.push('  /* ---------- 테마 ----------');
      L.push('     preset      : "classic"(클래식 블루) | "dark"(모던 다크) | "sepia"(세피아 서고)');
      L.push('     followSystem: true면 방문자 기기의 다크모드 설정을 따릅니다.');
      L.push('                   (단, 방문자가 직접 테마를 고르면 그 선택이 우선합니다.)');
      L.push('     darkPreset  : followSystem 이 켜져 있고 기기가 다크모드일 때 쓸 프리셋 */');
      L.push('  theme: {');
      L.push('    preset:       ' + str(themePreset) + ',');
      L.push('    followSystem: ' + bool(theme.followSystem) + ',');
      L.push('    darkPreset:   ' + str(darkPreset) + ',');
      L.push('  },');
      L.push('');

      /* ----- 슬라이드 ----- */
      L.push('  /* ---------- 슬라이드 메인 ----------');
      L.push('     최대 3장. 배열을 통째로 비우면([]) 슬라이드 영역이 사라집니다.');
      L.push('     image : 이미지 경로');
      L.push('     webp  : WebP 버전이 있으면 경로, 없으면 "" (있으면 더 빨리 뜹니다)');
      L.push('     alt   : 눈이 불편한 방문자와 검색엔진이 읽는 설명. 꼭 채워주세요.');
      L.push('     link  : 클릭 시 이동할 곳. "" 면 클릭해도 아무 일 없음. */');
      L.push('  slides: [');
      slides.forEach(function (s) {
        s = s || {};
        L.push('    {');
        L.push('      image: ' + str(s.image) + ',');
        L.push('      webp:  ' + str(s.webp) + ',');
        L.push('      alt:   ' + str(s.alt) + ',');
        L.push('      title: ' + str(s.title) + ',');
        L.push('      body:  ' + str(s.body) + ',');
        L.push('      link:  ' + str(s.link) + ',');
        L.push('    },');
      });
      L.push('  ],');
      L.push('');

      /* ----- 링크 카드 ----- */
      L.push('  /* ---------- 링크 카드 ----------');
      L.push('     icon 은 이모지 한 글자를 넣으면 됩니다. 비워도 됩니다. */');
      L.push('  links: [');
      links.forEach(function (k) {
        k = k || {};
        L.push('    { label: ' + str(k.label)
             + ', url: ' + str(k.url)
             + ', desc: ' + str(k.desc)
             + ', icon: ' + str(k.icon) + ' },');
      });
      L.push('  ],');
      L.push('');

      /* ----- BGM ----- */
      L.push('  /* ---------- BGM ----------');
      L.push('     ★ 브라우저 정책상 방문자가 한 번 클릭하기 전에는 소리가 나지 않습니다.');
      L.push('       이건 고칠 수 없는 제약이라, 플레이어는 항상 정지 상태로 시작합니다.');
      L.push('');
      L.push('     enabled : false 면 플레이어 자체가 안 보입니다.');
      L.push('     source  : "files"(내 mp3 파일) | "youtube"(유튜브 재생목록)');
      L.push('     tracks  : source 가 "files" 일 때 재생할 곡 목록');
      L.push('     youtubePlaylistId : source 가 "youtube" 일 때.');
      L.push('               https://www.youtube.com/playlist?list=PLxxxxxx 에서 list= 뒤 부분만.');
      L.push('               ※ 유튜브 모드는 file:// 더블클릭에서 불안정합니다.');
      L.push('                 업로드한 뒤 실제 주소에서 확인하세요.');
      L.push('     repeat  : "all"(전체 반복) | "one"(한 곡 반복) | "off"(반복 안 함) */');
      L.push('  bgm: {');
      L.push('    enabled: ' + bool(bgm.enabled) + ',');
      L.push('    source:  ' + str(source) + ',');
      L.push('    tracks: [');
      if (tracks.length) {
        tracks.forEach(function (t) {
          t = t || {};
          L.push('      { title: ' + str(t.title)
               + ', artist: ' + str(t.artist)
               + ', src: ' + str(t.src) + ' },');
        });
      } else {
        // 곡이 없을 때는 원본 파일처럼 "채우는 법" 예시 주석을 남겨줍니다.
        L.push('      // { title: "곡 제목", artist: "아티스트", src: "assets/audio/track1.mp3" },');
      }
      L.push('    ],');
      L.push('    youtubePlaylistId: ' + str(bgm.youtubePlaylistId) + ',');
      L.push('    volume:  ' + num(bgm.volume, 0.4) + ',');
      L.push('    repeat:  ' + str(repeat) + ',');
      L.push('    shuffle: ' + bool(bgm.shuffle) + ',');
      L.push('  },');
      L.push('');

      /* ----- 커서 ----- */
      L.push('  /* ---------- 마우스 커서 ----------');
      L.push('     ★ 커서 이미지는 32×32 픽셀 이하여야 합니다.');
      L.push('       더 크면 일부 브라우저/윈도우 배율에서 그냥 무시됩니다.');
      L.push('     x, y : 이미지 안에서 "실제로 클릭되는 점"의 좌표. 보통 뾰족한 끝.');
      L.push('');
      L.push('     blockRightClick 에 대해 솔직히 말씀드리면:');
      L.push('     켜도 스크린샷과 개발자도구로 그림은 그대로 저장됩니다. 작정한 사람은 못 막습니다.');
      L.push('     그래서 기본값은 꺼짐이고, 켜더라도 그림(<img>)에만 적용됩니다.');
      L.push('     F12나 드래그·복사를 사이트 전체에서 막는 기능은 넣지 않았습니다 —');
      L.push('     그건 정상적인 방문자만 불편하게 만듭니다. */');
      L.push('  cursor: {');
      L.push('    enabled: ' + bool(cur.enabled) + ',');
      L.push('    normal:  { src: ' + str(curN.src)
           + ', x: ' + num(curN.x, 0) + ', y: ' + num(curN.y, 0) + ' },');
      L.push('    pointer: { src: ' + str(curP.src)
           + ', x: ' + num(curP.x, 0) + ', y: ' + num(curP.y, 0) + ' },');
      L.push('    clickSound: { enabled: ' + bool(curC.enabled)
           + ', src: ' + str(curC.src)
           + ', volume: ' + num(curC.volume, 0.3) + ' },');
      L.push('    blockRightClick: ' + bool(cur.blockRightClick) + ',');
      L.push('  },');
      L.push('');

      /* ----- 시계 · 달력 ----- */
      L.push('  /* ---------- 시계 · 달력 위젯 ---------- */');
      L.push('  clockCalendar: {');
      L.push('    show: ' + bool(cc.show) + ',');
      L.push('  },');
      L.push('');

      /* ----- 슬라이드 간격 ----- */
      L.push('  /* ---------- 슬라이드 넘김 간격 (밀리초) ----------');
      L.push('     6000 = 6초. 0 으로 두면 자동으로 넘어가지 않습니다.');
      L.push('     ※ 방문자가 기기에서 "동작 줄이기"를 켜 두었다면 이 값과 무관하게');
      L.push('       자동 넘김이 꺼집니다. 의도된 동작입니다. */');
      L.push('  slideInterval: ' + num(c.slideInterval, 6000) + ',');
      L.push('');
      L.push('};');

      return L.join('\n') + '\n';
    }

    /* ----- 복사 버튼 -----
       ★ file:// 로 열면 navigator.clipboard 가 아예 없는 브라우저가
         있습니다 — 그게 바로 이 사이트를 여는 방식입니다. 그래서
         옛날 방식(select + execCommand)을 반드시 예비로 둡니다. */
    function copyExport() {
      if (!exportTa) return;
      var text = exportTa.value;

      function ok()  { H.toast('복사했습니다. data/config.js 에 붙여넣어 주세요.'); }
      function legacy() {
        try {
          exportTa.focus();
          exportTa.select();
          var done = document.execCommand('copy');
          if (done) ok();
          else H.toast('복사하지 못했습니다. 상자 안 내용을 직접 선택해 복사해 주세요.');
        } catch (e) {
          H.toast('복사하지 못했습니다. 상자 안 내용을 직접 선택해 복사해 주세요.');
        }
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok).catch(legacy);
      } else {
        legacy();
      }
    }

    /* ----- 다운로드 버튼 -----
       Blob 으로 config.js 파일을 만들어 내려받게 합니다.
       복사-붙여넣기가 익숙하지 않아도 "받아서 덮어쓰기"는 할 수 있으니까요. */
    function downloadExport() {
      if (!exportTa) return;
      var blob = new Blob([exportTa.value], { type: 'text/javascript;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = H.el('a', { href: url, download: 'config.js' });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 브라우저가 내려받기를 시작할 시간을 준 뒤 임시 주소를 정리합니다.
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      H.toast('config.js 를 내려받았습니다. data 폴더의 파일과 바꿔치기해 주세요.');
    }

    /** 내보내기 영역을 (없으면 만들고) 최신 내용으로 채워 보여줍니다. */
    function showExport() {
      var text = buildConfigText();

      if (!exportBox) {
        exportTa = H.el('textarea', {
          class: 'export-area',
          spellcheck: 'false',
          'aria-label': '내보낸 config.js 내용'
        });

        var copyBtn = H.el('button', {
          class: 'btn btn--primary', type: 'button', text: '복사',
          onclick: copyExport
        });
        var dlBtn = H.el('button', {
          class: 'btn btn--ghost', type: 'button', text: '다운로드',
          onclick: downloadExport
        });

        exportBox = H.el('div', {}, [
          H.el('p', {
            class: 'field__hint',
            text: '아래 내용 전체를 data/config.js 파일에 그대로 덮어쓴 뒤 '
                + '커밋(업로드)하세요. 그래야 모든 기기에서 똑같이 보입니다.'
          }),
          exportTa,
          H.el('p', {}, [copyBtn, ' ', dlBtn])
        ]);
        body.appendChild(exportBox);
      }

      exportTa.value = text;
      exportBox.hidden = false;
      // 서랍 몸통이 길면 안 보일 수 있으니 내보내기 영역까지 스크롤해 줍니다.
      try { exportBox.scrollIntoView({ block: 'nearest' }); } catch (e) { /* 무시 */ }
      H.toast('현재 설정으로 config.js 내용을 만들었습니다.');
    }

    /* =======================================================================
       되돌리기 — 오버라이드를 모두 버리고 파일 값으로
       ======================================================================= */
    function resetAll() {
      H.clearOverrides();
      // 테마는 화면에 이미 칠해져 있으니 즉시 다시 계산해 입힙니다.
      if (H.theme && H.theme.apply && H.theme.resolve) {
        H.theme.apply(H.theme.resolve());
      }
      // 살아 있는 플레이어에도 파일 값(볼륨·반복·셔플)을 다시 적용합니다.
      if (H.bgm && H.bgm.applyConfig) H.bgm.applyConfig();
      // 행 전체를 다시 만들어 모든 컨트롤이 파일 값으로 딱 돌아가게 합니다.
      buildRows();
      syncBadge();
      H.toast('파일(data/config.js)에 적힌 설정으로 되돌렸습니다.');
    }

    /* =======================================================================
       배선과 첫 그리기
       ======================================================================= */
    if (resetBtn)  resetBtn.addEventListener('click', resetAll);
    if (exportBtn) exportBtn.addEventListener('click', showExport);

    /* 설정이 바뀔 때마다(어디서 바꿨든) 배지와 안내문만 갱신합니다.
       ★ 여기서 행 전체를 다시 만들면 안 됩니다 — 볼륨 슬라이더를
         드래그하는 도중에 그 슬라이더가 통째로 새로 만들어져서
         사용자의 손과 싸우게 됩니다. 전체 재구성은 되돌리기 때만. */
    document.addEventListener('hada:config', function () {
      syncDrift();
      syncThemeChips();
    });

    buildRows();
    syncBadge();
  });

})(window.HADA);
