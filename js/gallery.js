/* ===========================================================================
   gallery.js — 갤러리 태그 필터 + 라이트박스
   ---------------------------------------------------------------------------
   담당:
     - 태그 필터 칩: data/gallery.js 의 tags 를 모아서 버튼을 자동 생성
     - 라이트박스: 그림을 클릭하면 크게 보기 (<dialog> 사용)

   ★ 왜 <dialog> 인가요?
     브라우저가 기본으로 주는 기능이 많습니다 — Esc 키로 닫기,
     열려 있는 동안 뒤쪽 화면 조작 잠금(포커스 트랩)이 전부 공짜입니다.
     직접 만들면 길고 버그가 잘 나는 부분이라, 기본 기능을 그대로 씁니다.

   ★ render.js 가 그리드를 다 그린 뒤 'hada:rendered' 신호를 쏩니다.
     이 파일은 그 신호를 기다리되, 신호가 이미 지나갔을 수도 있으니
     "그리드가 이미 채워져 있으면 바로 시작"도 함께 합니다. (이중 안전장치)
   =========================================================================== */

(function (H) {
  'use strict';
  if (!H) return;

  var booted = false;

  /* ---------------------------------------------------------------
     시작 지점.
     이 스크립트는 writing/*.html 같은 "갤러리가 없는" 페이지에도
     실리므로, 필요한 요소가 없으면 조용히 아무것도 하지 않습니다.
     --------------------------------------------------------------- */
  function boot() {
    if (booted) return;

    var grid = H.$('#gallery-grid');
    if (!grid) return;                    // 갤러리 없는 페이지 — 그냥 통과

    var items = H.gallery || [];
    var filters = H.$('#gallery-filters');

    if (!items.length) {                  // 그림이 하나도 없으면 할 일이 없습니다.
      if (filters) filters.hidden = true;
      booted = true;
      return;
    }

    // render.js 가 아직 안 그렸으면 'hada:rendered' 신호를 기다립니다.
    if (!H.$$('.card-img', grid).length) return;

    booted = true;
    setupFilters(grid, filters, items);
    setupLightbox(grid, items);
  }

  /* ===============================================================
     1) 태그 필터 칩
     =============================================================== */
  var activeTag = null;                   // null = "전체"

  function setupFilters(grid, filters, items) {
    if (!filters) return;

    // 모든 그림의 tags 를 훑어 "처음 나온 순서"대로 태그 목록을 만듭니다.
    var tags = [];
    items.forEach(function (item) {
      (item.tags || []).forEach(function (t) {
        if (tags.indexOf(t) === -1) tags.push(t);
      });
    });

    // 태그가 하나도 없으면 "전체" 버튼 하나만 덜렁 있는 것보다
    // 필터 줄 자체를 숨기는 편이 깔끔합니다.
    if (!tags.length) { filters.hidden = true; return; }

    filters.innerHTML = '';

    function makeChip(label, tag) {
      var isAll = tag === null;
      var chip = H.el('button', {
        class: 'chip' + (isAll ? ' is-on' : ''),
        type: 'button',
        'aria-pressed': isAll ? 'true' : 'false',
        text: label
      });
      chip.addEventListener('click', function () { selectTag(tag, chip); });
      return chip;
    }

    filters.appendChild(makeChip('전체', null));
    tags.forEach(function (t) { filters.appendChild(makeChip(t, t)); });
    filters.hidden = false;

    function selectTag(tag, clicked) {
      activeTag = tag;

      // 눌린 칩만 켜진 모양(is-on)으로 바꿉니다.
      H.$$('.chip', filters).forEach(function (chip) {
        var on = chip === clicked;
        chip.classList.toggle('is-on', on);
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      // 실제 필터링: 카드를 지우는 게 아니라 hidden 속성만 껐다 켭니다.
      // (지웠다 다시 만들면 느리고, 라이트박스의 순서 계산도 꼬입니다.)
      H.$$('.card-img', grid).forEach(function (fig) {
        var cardTags = (fig.dataset.tags || '').split('|');
        fig.hidden = !!tag && cardTags.indexOf(tag) === -1;
      });
    }
  }

  /* ===============================================================
     2) 라이트박스
     =============================================================== */
  function setupLightbox(grid, items) {
    var dlg     = H.$('#lightbox');
    var img     = H.$('#lightbox-img');
    var caption = H.$('#lightbox-caption');
    var btnX    = H.$('#lightbox-close');
    var btnPrev = H.$('#lightbox-prev');
    var btnNext = H.$('#lightbox-next');

    // 요소가 없거나 브라우저가 <dialog> 를 모르면 라이트박스 없이 지나갑니다.
    // (필터는 이미 동작하므로 사이트가 통째로 죽는 일은 없습니다.)
    if (!dlg || !img || !caption || typeof dlg.showModal !== 'function') return;

    var opener = null;      // 라이트박스를 연 썸네일 버튼 (닫을 때 포커스를 돌려주려고 기억)
    var visList = [];       // 지금 보이는 그림들의 "원본 배열 번호" 목록
    var pos = 0;            // visList 안에서의 현재 위치

    /* ---- 지금 화면에 보이는 카드만 모읍니다 ----
       ★ 여기가 핵심입니다. 필터로 일부 그림이 숨겨져 있을 때
         이전/다음이 "숨겨진 그림"으로 건너뛰면 화면과 어긋나 혼란스럽습니다.
         그래서 항상 hidden 이 아닌 카드만 목록으로 삼습니다. */
    function visibleIndexes() {
      var out = [];
      H.$$('.card-img', grid).forEach(function (fig) {
        if (!fig.hidden) out.push(parseInt(fig.dataset.index, 10));
      });
      return out;
    }

    /* ---- 현재 위치의 그림을 화면에 채웁니다 ---- */
    function show(newPos) {
      var n = visList.length;
      pos = ((newPos % n) + n) % n;       // 끝에서 한 번 더 누르면 반대쪽 끝으로 (순환)
      var item = items[visList[pos]] || {};

      // ★ webp 선택에 대하여: 목록(썸네일)은 <picture> 라 webp 실패 시
      //   자동으로 원본으로 넘어가지만, 여기는 <img> 하나뿐이라 대체가 없습니다.
      //   webp 파일이 깨져 있으면 "아무것도 안 보이는" 사고가 나므로
      //   라이트박스는 안전하게 항상 원본(src)을 씁니다.
      img.src = item.src || '';
      img.alt = item.title || item.alt || '';

      // 설명이 없으면 제목으로, 그것도 없으면 빈 상자가 뜨지 않게 숨깁니다.
      var cap = item.caption || item.title || '';
      caption.textContent = cap;
      caption.hidden = !cap;

      // 그림이 한 장뿐이면 이전/다음 버튼은 의미가 없으니 숨깁니다.
      var solo = n <= 1;
      if (btnPrev) btnPrev.hidden = solo;
      if (btnNext) btnNext.hidden = solo;

      preloadNeighbours();
    }

    /* ---- 양옆 그림을 미리 받아둡니다 ----
       다음 그림을 눌렀을 때 로딩을 기다리지 않고 바로 뜨게 하는 장치입니다. */
    function preloadNeighbours() {
      var n = visList.length;
      if (n < 2) return;
      [visList[(pos + 1) % n], visList[(pos - 1 + n) % n]].forEach(function (di) {
        var it = items[di];
        if (it && it.src) { new Image().src = it.src; }
      });
    }

    /* ---- 열기 / 닫기 ---- */
    function openAt(dataIndex, openerBtn) {
      opener = openerBtn || null;
      visList = visibleIndexes();
      var p = visList.indexOf(dataIndex);
      if (p === -1) { visList = [dataIndex]; p = 0; }  // 만일을 대비한 안전장치
      show(p);
      if (!dlg.open) dlg.showModal();
    }

    function close() { if (dlg.open) dlg.close(); }

    /* ---- 썸네일 클릭으로 열기 ---- */
    grid.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.card-img__btn') : null;
      if (!btn) return;
      var fig = btn.closest('.card-img');
      if (!fig) return;
      openAt(parseInt(fig.dataset.index, 10), btn);
    });

    /* ---- 이전 / 다음 / 닫기 버튼 ---- */
    if (btnPrev) btnPrev.addEventListener('click', function () { show(pos - 1); });
    if (btnNext) btnNext.addEventListener('click', function () { show(pos + 1); });
    if (btnX)    btnX.addEventListener('click', close);

    /* ---- 키보드 화살표 ----
       Esc 닫기는 <dialog> 가 알아서 하므로 여기서 다시 만들지 않습니다. */
    dlg.addEventListener('keydown', function (e) {
      if (visList.length < 2) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); show(pos - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(pos + 1); }
    });

    /* ---- 손가락 스와이프 ----
       기준: 가로로 50px 이상 움직였고, 가로 이동이 세로 이동보다 클 것.
       ★ 왜 두 조건 다 필요한가요?
         화면을 위아래로 스크롤하다 보면 손가락이 옆으로도 살짝 흔들립니다.
         "가로가 세로보다 크다"는 조건이 없으면 스크롤할 때마다
         그림이 제멋대로 넘어가 버립니다. 50px 은 "실수로 스친 것"과
         "일부러 민 것"을 가르는 최소 거리입니다. */
    var swipe = { x: 0, y: 0, id: null };
    var suppressClick = false;            // 스와이프 직후의 클릭으로 창이 닫히는 것 방지

    if (window.PointerEvent) {
      dlg.addEventListener('pointerdown', function (e) {
        swipe.x = e.clientX; swipe.y = e.clientY; swipe.id = e.pointerId;
      });
      dlg.addEventListener('pointerup', function (e) {
        if (swipe.id === null || e.pointerId !== swipe.id) return;
        swipe.id = null;
        var dx = e.clientX - swipe.x;
        var dy = e.clientY - swipe.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) suppressClick = true;
        if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) && visList.length > 1) {
          show(dx < 0 ? pos + 1 : pos - 1);   // 왼쪽으로 밀면 다음 그림
        }
      });
    }

    /* ---- 배경(그림 바깥) 클릭으로 닫기 ----
       <dialog> 자체를 클릭했다는 것은 그림이 아니라 그 바깥의
       어두운 배경을 눌렀다는 뜻입니다. 그림이나 버튼을 누른 경우엔
       e.target 이 그 요소라서 이 조건에 걸리지 않습니다. */
    dlg.addEventListener('click', function (e) {
      if (suppressClick) { suppressClick = false; return; }
      if (e.target === dlg) close();
    });

    /* ---- 닫힌 뒤 포커스 되돌리기 ----
       보통은 <dialog> 가 알아서 원래 버튼으로 돌려주지만,
       라이트박스를 보는 사이 그 버튼이 필터로 숨겨졌다면 실패합니다.
       그럴 땐 지금 보이는 첫 번째 그림 버튼으로, 그것도 없으면
       그리드 자체로 포커스를 보냅니다. (키보드 사용자가 길을 잃지 않게) */
    dlg.addEventListener('close', function () {
      var target = opener;
      var fig = target && target.closest ? target.closest('.card-img') : null;
      var ok = target && document.contains(target) && fig && !fig.hidden;
      if (!ok) {
        var vis = H.$$('.card-img', grid).filter(function (f) { return !f.hidden; });
        target = vis.length ? H.$('.card-img__btn', vis[0]) : null;
        if (!target) { grid.setAttribute('tabindex', '-1'); target = grid; }
      }
      opener = null;
      if (target && target.focus) {
        try { target.focus(); } catch (err) { /* 포커스 실패는 치명적이지 않음 */ }
      }
    });

    /* ---- 작은 공개 API ----
       ★ H.gallery 는 이미 "그림 데이터 배열"이라 덮어쓰면 안 됩니다.
         그래서 H.lightbox 라는 별도 이름을 씁니다. */
    H.lightbox = {
      open: function (dataIndex) { openAt(dataIndex, null); },
      close: close
    };
  }

  /* ---------------------------------------------------------------
     시동: 신호를 듣고 + 이미 그려져 있으면 즉시 시작 (이중 안전장치)
     --------------------------------------------------------------- */
  document.addEventListener('hada:rendered', boot);
  H.ready(boot);

})(window.HADA);
