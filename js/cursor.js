(function (H) {
  'use strict';
  if (!H) return;

  /**
   * cursor.js — 마우스 커서 커스텀
   *
   * 커서 이미지, 클릭음, 우클릭 차단을 담당합니다.
   * CSS cursor 속성만 쓰므로 마우스무브 핸들러 오버헤드가 없습니다.
   */

  var $ = H.$;
  var toast = H.toast;
  var styleEl = null;
  var clickAudio = null;

  /**
   * 커서 이미지를 비동기로 검증합니다.
   * 32x32 초과면 경고를 출력합니다.
   * 로드 실패면 경고 후 콜백을 호출합니다.
   */
  function validateImage(src) {
    if (!src || !src.trim()) return;

    var img = new Image();

    img.onload = function () {
      if (img.naturalWidth > 32 || img.naturalHeight > 32) {
        console.warn(
          '[HADA] 커서 이미지가 너무 큽니다: ' + src +
          ' (' + img.naturalWidth + 'x' + img.naturalHeight + 'px). ' +
          '권장 크기는 32×32 이하입니다.'
        );
      }
    };

    img.onerror = function () {
      console.warn('[HADA] 커서 이미지를 로드할 수 없습니다: ' + src);
    };

    img.src = src;
  }

  /**
   * 클릭음을 초기화합니다.
   */
  function initClickSound() {
    clickAudio = null;

    var cfg = H.cfg.cursor;
    if (!cfg || !cfg.clickSound || !cfg.clickSound.enabled || !cfg.clickSound.src) {
      return;
    }

    var audio = new Audio();
    audio.src = cfg.clickSound.src;
    audio.volume = cfg.clickSound.volume || 0.3;

    audio.onerror = function () {
      console.warn('[HADA] 클릭음을 로드할 수 없습니다: ' + cfg.clickSound.src);
      clickAudio = null;
    };

    // 정상 로드 시 준비 완료
    clickAudio = audio;
  }

  /**
   * 클릭음을 재생합니다.
   * currentTime을 0으로 리셋해 연속 클릭 때 겹쳐서 나올 수 있게 합니다.
   * Promise 거부(브라우저 정책)를 조용히 처리합니다.
   */
  function playClickSound() {
    if (!clickAudio) return;

    clickAudio.currentTime = 0;
    var playPromise = clickAudio.play();

    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {
        // 조용히 무시 — 브라우저 정책상 첫 사용자 조작 전에 audio.play()가 거부될 수 있습니다.
        // 이건 오류가 아니라 정상이므로 콘솔 잡음을 내지 않습니다.
      });
    }
  }

  /**
   * 커서 CSS를 생성하고 DOM에 주입합니다.
   */
  function applyCursorCSS() {
    var cfg = H.cfg.cursor;

    // 기존 스타일 엘리먼트 제거
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
      styleEl = null;
    }

    // 커서가 비활성화되었거나 설정이 없으면 종료
    if (!cfg || !cfg.enabled || !cfg.normal || !cfg.normal.src) {
      return;
    }

    var rules = [];

    // 기본 커서 규칙 (body)
    var x = cfg.normal.x || 0;
    var y = cfg.normal.y || 0;
    rules.push(
      'body { cursor: url("' + cfg.normal.src + '") ' + x + ' ' + y + ', auto; }'
    );

    // 포인터 커서 규칙 (링크, 버튼 등)
    if (cfg.pointer && cfg.pointer.src) {
      var px = cfg.pointer.x || 0;
      var py = cfg.pointer.y || 0;
      rules.push(
        'a, button, [role="button"], input, select, textarea, summary, .card-img__btn ' +
        '{ cursor: url("' + cfg.pointer.src + '") ' + px + ' ' + py + ', pointer; }'
      );
    }

    // 스타일 엘리먼트 생성 및 주입
    styleEl = H.el('style', { id: 'hada-cursor' });
    styleEl.textContent = rules.join('\n');
    document.head.appendChild(styleEl);

    // 이미지 크기 검증 (경고만 하고 CSS 적용은 차단하지 않음)
    validateImage(cfg.normal.src);
    if (cfg.pointer && cfg.pointer.src) {
      validateImage(cfg.pointer.src);
    }
  }

  /**
   * 우클릭 차단 (이미지에만 적용).
   *
   * 솔직히: 스크린샷과 개발자 도구로는 그림을 여전히 저장할 수 있습니다.
   * 이건 캐주얼한 저장만 억제할 뿐, 작정한 사람은 못 막습니다.
   * F12, 드래그, 복사를 사이트 전체에서 막지 않습니다 —
   * 정상 방문자만 불편하게 만들기 때문입니다.
   */
  function onContextMenu(e) {
    var cfg = H.cfg.cursor;
    if (!cfg || !cfg.blockRightClick) return;

    var imgTarget = e.target.closest('img');
    if (imgTarget) {
      e.preventDefault();
      toast('그림은 저장하지 말아 주세요.');
    }
  }

  /**
   * 포인터 다운 시 클릭음 재생
   */
  function onPointerDown() {
    playClickSound();
  }

  /**
   * 모든 커서 기능을 적용합니다.
   */
  function apply() {
    var cfg = H.cfg.cursor;
    if (!cfg) return;

    // 커서 CSS 적용
    applyCursorCSS();

    // 클릭음 초기화
    initClickSound();

    // 우클릭 차단, 클릭음 리스너 재바인드
    // (설정 변경 시 중복을 피하기 위해 먼저 제거)
    document.removeEventListener('contextmenu', onContextMenu);
    document.removeEventListener('pointerdown', onPointerDown);

    if (cfg.blockRightClick) {
      document.addEventListener('contextmenu', onContextMenu);
    }

    if (cfg.clickSound && cfg.clickSound.enabled && cfg.clickSound.src) {
      document.addEventListener('pointerdown', onPointerDown);
    }
  }

  /**
   * 설정 변경 시 다시 적용
   */
  function onConfigChange() {
    apply();
  }

  // DOM 준비 후 초기화
  H.ready(function () {
    apply();
    document.addEventListener('hada:config', onConfigChange);
  });

  // 설정 서랍에서 접근할 수 있도록 노출
  H.cursor = { apply: apply };

})(window.HADA);
