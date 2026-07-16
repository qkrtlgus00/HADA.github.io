/* ===========================================================================
   theme.js — 테마 프리셋 적용 / 전환 / 저장 + 테마 선택 UI
   ---------------------------------------------------------------------------
   ★ 첫 페인트 전 테마 적용은 index.html <head> 의 인라인 스크립트가 합니다.
     이 파일은 그 뒤의 "전환"과 "선택 UI"를 담당합니다.

   우선순위:
     1. 방문자가 직접 고른 테마 (localStorage 오버라이드)  ← 가장 셈
     2. config.theme.followSystem 이 true 면 기기의 다크모드 설정
     3. config.theme.preset (파일 기본값)
   =========================================================================== */

(function (H) {
  'use strict';
  if (!H) return;

  /* 프리셋 목록.
     swatch 는 "다른 테마의 색"을 미리 보여주는 용도라 토큰을 쓸 수 없습니다.
     (지금 적용된 테마의 var(--accent) 를 쓰면 세 칩이 전부 같은 색이 됩니다.)
     그래서 여기만 색을 직접 적습니다 — tokens.css 를 고치면 여기도 맞춰주세요. */
  var PRESETS = [
    { id: 'classic', name: '클래식 블루',  swatch: ['#5a8fe0', '#f3f6fb'] },
    { id: 'dark',    name: '모던 다크',    swatch: ['#7fb0f5', '#14171c'] },
    { id: 'sepia',   name: '세피아 서고',  swatch: ['#b0452b', '#f5efe4'] },
  ];

  var root = document.documentElement;

  function themeCfg() {
    return (H.cfg && H.cfg.theme) || {};
  }

  /** 지금 적용해야 할 프리셋 id 를 계산합니다. */
  function resolve() {
    // 방문자가 직접 고른 게 있으면 그게 최우선.
    var chosen = H.overrides && H.overrides.theme && H.overrides.theme.preset;
    if (chosen) return chosen;

    var t = themeCfg();
    if (t.followSystem && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return t.darkPreset || 'dark';
    }
    return t.preset || 'classic';
  }

  function apply(id) {
    root.dataset.theme = id;
    syncPicker(id);
  }

  /** 방문자가 칩을 눌렀을 때. 선택은 localStorage 에 남아 재방문 시 유지됩니다. */
  function choose(id) {
    H.setOverride({ theme: { preset: id } });
    apply(id);
  }

  /* ---------- 테마 선택 UI ---------- */
  var picker = H.$('#theme-picker');

  function buildPicker() {
    if (!picker) return;
    picker.innerHTML = '';
    PRESETS.forEach(function (p) {
      var swatch = H.el('span', { class: 'chip__swatch', 'aria-hidden': 'true' });
      // 인라인 스타일을 쓰는 유일한 곳 — 위 주석 참고.
      swatch.style.background =
        'linear-gradient(135deg, ' + p.swatch[0] + ' 50%, ' + p.swatch[1] + ' 50%)';

      var btn = H.el('button', {
        class: 'chip',
        type: 'button',
        dataset: { theme: p.id },
        'aria-pressed': 'false',
        onclick: function () { choose(p.id); }
      }, [swatch, H.el('span', { text: p.name })]);

      picker.appendChild(btn);
    });
  }

  function syncPicker(active) {
    if (!picker) return;
    H.$$('.chip[data-theme]', picker).forEach(function (b) {
      var on = b.dataset.theme === active;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* ---------- 기기 다크모드 변화 추적 ----------
     방문자가 직접 테마를 고르지 않았을 때만 따라갑니다.
     고른 뒤에도 OS 따라 바뀌면 "내가 고른 게 왜 사라지지?"가 됩니다. */
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var onSystemChange = function () {
    var chosen = H.overrides && H.overrides.theme && H.overrides.theme.preset;
    if (!chosen && themeCfg().followSystem) apply(resolve());
  };
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', onSystemChange);
  else if (darkQuery.addListener)  darkQuery.addListener(onSystemChange);  // 구형 사파리

  /* 설정 서랍이 테마를 바꾸면 여기서 다시 그립니다. */
  document.addEventListener('hada:config', function () { apply(resolve()); });

  H.ready(function () {
    buildPicker();
    apply(resolve());
  });

  /* 설정 서랍이 재사용합니다. */
  H.theme = {
    presets: PRESETS,
    apply: apply,
    choose: choose,
    resolve: resolve
  };

})(window.HADA);
