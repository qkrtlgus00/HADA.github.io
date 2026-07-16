/* ===========================================================================
   core.js — 모든 스크립트의 공통 기반
   ---------------------------------------------------------------------------
   담당:
     - window.HADA 네임스페이스
     - DOM 헬퍼 ($ / $$ / el)
     - localStorage 래퍼 (hada:v1: 접두사)
     - 설정 병합: data/config.js 기본값 + localStorage 오버라이드
     - 데이터 파일 오타 시 빈 화면 대신 한국어 힌트 박스
     - 토스트, 움직임 줄이기 감지

   ★ 이 파일은 다른 js/*.js 보다 먼저 로드됩니다 (index.html의 defer 순서).
   =========================================================================== */

window.HADA = (function () {
  'use strict';

  /* ---------- DOM 헬퍼 ---------- */
  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /** el('div', {class:'x', text:'하이'}, [자식...]) */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text')      { node.textContent = v; }
      else if (k === 'html') { node.innerHTML = v; }
      else if (k === 'class'){ node.className = v; }
      else if (k === 'dataset') {
        Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      }
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      }
      else if (v === true)   { node.setAttribute(k, ''); }
      else                   { node.setAttribute(k, v); }
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  /* ---------- localStorage 래퍼 ----------
     ★ 접두사가 중요합니다. GitHub Pages 프로젝트 페이지는
       qkrtlgus00.github.io 오리진을 이 계정의 다른 저장소 사이트와 "공유"합니다.
       접두사가 없으면 다른 프로젝트와 키가 충돌합니다.
     ★ 사생활 보호 모드나 쿠키 차단 환경에선 localStorage 접근 자체가 던집니다.
       그래서 전부 try/catch — 저장이 안 돼도 사이트는 그냥 동작해야 합니다. */
  var PREFIX = 'hada:v1:';
  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove: function (key) {
      try { localStorage.removeItem(PREFIX + key); return true; }
      catch (e) { return false; }
    }
  };

  /* ---------- 깊은 병합 ----------
     오버라이드가 기본값 위에 얹힙니다.
     배열은 병합하지 않고 통째로 교체합니다 — 슬라이드 3개를 2개로 줄였는데
     3번째가 좀비처럼 살아남으면 안 되니까요. */
  function merge(base, over) {
    if (!isPlainObject(base) || !isPlainObject(over)) {
      return over === undefined ? base : over;
    }
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(over).forEach(function (k) {
      var b = out[k], o = over[k];
      out[k] = (isPlainObject(b) && isPlainObject(o)) ? merge(b, o) : o;
    });
    return out;
  }
  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  /* ---------- 데이터 파일 오타 안내 ----------
     손으로 편집하는 사용자에게 가장 중요한 복원력 장치입니다.
     data/gallery.js 에 쉼표 하나 빠지면 그 파일 전체가 실행되지 않아
     window.HADA_GALLERY 가 undefined 로 남습니다. 그 상태로 두면
     "갤러리가 그냥 텅 비어 보이는" 미스터리가 됩니다.
     빈 화면 대신 무엇을 고쳐야 하는지 한국어로 말해줍니다. */
  var missing = [];

  /**
   * needsSelector: 이 데이터가 "이 페이지에" 정말 필요한지 판단하는 선택자.
   *   창작글 페이지(writing/*.html)는 갤러리와 글 목록이 없어서
   *   data/gallery.js, data/posts.js 를 일부러 부르지 않습니다.
   *   그 경우까지 "파일을 읽지 못했다"고 하면 멀쩡한 페이지에 가짜 경고가 뜹니다.
   *   null 이면 어느 페이지에서나 필요하다는 뜻입니다.
   */
  function readData(globalName, fileName, fallback, needsSelector) {
    var v = window[globalName];
    if (v === undefined || v === null) {
      missing.push({ file: fileName, needs: needsSelector || null });
      return fallback;
    }
    return v;
  }

  function reportDataErrors() {
    // 이 페이지가 실제로 쓰는 데이터만 남깁니다.
    missing = missing.filter(function (m) {
      return m.needs === null || $(m.needs) !== null;
    });
    if (!missing.length) return;
    var names = missing.map(function (m) { return m.file; }).join(', ');

    var main = $('#main') || document.body;
    var box = el('div', { class: 'hada-error wrap' }, [
      el('strong', { text: '데이터 파일을 읽지 못했습니다.' }),
      el('p', {}, [
        document.createTextNode('아래 파일에 오타가 있는 것 같아요: '),
        el('code', { text: names })
      ]),
      el('p', { text: '쉼표(,)나 따옴표(")가 빠졌는지 확인해 주세요. '
                    + '브라우저에서 F12를 눌러 콘솔(Console) 탭을 보면 몇 번째 줄이 문제인지 알려줍니다.' })
    ]);
    main.insertBefore(box, main.firstChild);
    // 콘솔에도 남깁니다 — 개발자 도구를 여는 사람에겐 이게 더 빠릅니다.
    console.error('[HADA] 데이터 파일 로드 실패:', names);
  }

  /* ---------- 토스트 ---------- */
  var toastTimer = null;
  function toast(message, ms) {
    var node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    // 리플로우를 강제해 연속 호출에도 트랜지션이 다시 돕니다.
    void node.offsetWidth;
    node.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.classList.remove('is-on');
      setTimeout(function () { node.hidden = true; }, 300);
    }, ms || 2400);
  }

  /* ---------- 움직임 줄이기 ----------
     CSS의 blanket 규칙이 트랜지션·애니메이션은 잡아주지만,
     "슬라이드 자동넘김 타이머를 아예 돌리지 않는다" 같은 건 JS가 알아야 합니다. */
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reducedMotion() { return motionQuery.matches; }

  /* ---------- 설정 조립 ----------
     config.js 는 어느 페이지에서나 필요하므로 선택자가 없습니다(null). */
  var defaults = readData('HADA_CONFIG', 'data/config.js', {}, null);
  var overrides = store.get('overrides', {});
  var cfg = merge(defaults, overrides);

  var api = {
    $: $, $$: $$, el: el,
    store: store,
    merge: merge,
    toast: toast,
    reducedMotion: reducedMotion,
    motionQuery: motionQuery,

    /** 병합된 최종 설정 (파일 기본값 + localStorage 오버라이드) */
    cfg: cfg,
    /** 파일에 적힌 원본 설정. 설정 서랍의 "되돌리기"와 내보내기가 씁니다. */
    defaults: defaults,
    /** 현재 localStorage 오버라이드. 비어 있으면 파일 그대로라는 뜻. */
    overrides: overrides,

    // 갤러리와 글 목록은 메인에만 있습니다. 창작글 페이지엔 이 칸이 없으므로
    // 해당 데이터 파일을 안 불러도 정상입니다 — 선택자로 그걸 구분합니다.
    gallery: readData('HADA_GALLERY', 'data/gallery.js', [], '#gallery-grid'),
    posts:   readData('HADA_POSTS',   'data/posts.js',   [], '#posts-list'),

    /** 설정 오버라이드를 저장하고 병합된 cfg를 갱신합니다. (설정 서랍이 사용) */
    setOverride: function (patch) {
      api.overrides = merge(api.overrides, patch);
      store.set('overrides', api.overrides);
      var next = merge(api.defaults, api.overrides);
      // cfg 참조를 유지하려고 제자리에서 갱신합니다 —
      // 다른 모듈이 이미 HADA.cfg 를 붙들고 있을 수 있습니다.
      Object.keys(api.cfg).forEach(function (k) { delete api.cfg[k]; });
      Object.keys(next).forEach(function (k) { api.cfg[k] = next[k]; });
      document.dispatchEvent(new CustomEvent('hada:config'));
      return api.cfg;
    },

    /** 모든 오버라이드를 버리고 파일 설정으로 되돌립니다. */
    clearOverrides: function () {
      api.overrides = {};
      store.remove('overrides');
      Object.keys(api.cfg).forEach(function (k) { delete api.cfg[k]; });
      Object.keys(api.defaults).forEach(function (k) { api.cfg[k] = api.defaults[k]; });
      document.dispatchEvent(new CustomEvent('hada:config'));
      return api.cfg;
    },

    /** 오버라이드가 하나라도 있는지 — 설정 서랍의 드리프트 배지가 씁니다. */
    hasOverrides: function () { return Object.keys(api.overrides).length > 0; },

    /** DOM 준비 후 실행. defer 스크립트는 보통 이미 준비돼 있지만 안전하게. */
    ready: function (fn) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn, { once: true });
      } else {
        fn();
      }
    }
  };

  api.ready(reportDataErrors);

  return api;
})();
