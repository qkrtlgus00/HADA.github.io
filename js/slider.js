/* ===========================================================================
   slider.js — 슬라이드 메인 동작
   ---------------------------------------------------------------------------
   render.js 가 그려 놓은 .hero__slide 들에 동작을 붙입니다.
   구조는 건드리지 않고 .is-on 클래스만 옮겨 다닙니다 (전환 효과는 CSS 담당).
   =========================================================================== */

(function (H) {
  'use strict';
  if (!H) return;

  var hero, track, dots, slides = [], index = 0, timer = null;

  function interval() {
    var ms = H.cfg && H.cfg.slideInterval;
    return (typeof ms === 'number' && ms > 0) ? ms : 0;
  }

  /* 자동 넘김을 돌려도 되는지.
     ★ 방문자가 기기에서 "동작 줄이기"를 켜 두었다면 자동 넘김은 아예 시작하지 않습니다.
       CSS의 blanket 규칙은 트랜지션 시간만 0으로 만들 뿐,
       "6초마다 화면이 제멋대로 바뀌는 것" 자체는 못 막습니다. 그건 여기서 막아야 합니다. */
  function canAuto() {
    return slides.length > 1 && interval() > 0 && !H.reducedMotion();
  }

  function show(next) {
    if (!slides.length) return;
    // 나머지 연산으로 양쪽 끝을 감쌉니다 (-1 → 마지막 장).
    index = (next + slides.length) % slides.length;

    slides.forEach(function (s, i) {
      var on = i === index;
      s.classList.toggle('is-on', on);
      // 안 보이는 슬라이드는 스크린리더에서도 숨깁니다.
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
      // 투명하게 겹쳐 있을 뿐 여전히 DOM에 있으므로,
      // 안 보이는 슬라이드 안의 링크로 탭 이동이 되면 안 됩니다.
      H.$$('a, button', s).forEach(function (f) {
        if (on) f.removeAttribute('tabindex');
        else f.setAttribute('tabindex', '-1');
      });
    });

    H.$$('.hero__dot', dots).forEach(function (d, i) {
      var on = i === index;
      d.classList.toggle('is-on', on);
      d.setAttribute('aria-selected', on ? 'true' : 'false');
      d.tabIndex = on ? 0 : -1;
    });
  }

  function next() { show(index + 1); }
  function prev() { show(index - 1); }

  function start() {
    stop();
    if (!canAuto()) return;
    timer = setInterval(next, interval());
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function buildDots() {
    if (!dots) return;
    dots.innerHTML = '';
    if (slides.length < 2) return;   // 한 장뿐이면 점을 만들 이유가 없습니다.

    slides.forEach(function (s, i) {
      dots.appendChild(H.el('button', {
        class: 'hero__dot' + (i === 0 ? ' is-on' : ''),
        type: 'button',
        role: 'tab',
        'aria-selected': i === 0 ? 'true' : 'false',
        'aria-label': (i + 1) + '번째 슬라이드',
        tabindex: i === 0 ? '0' : '-1',
        onclick: function () { show(i); start(); }
      }));
    });
  }

  function init() {
    hero  = H.$('.hero');
    track = H.$('#hero-track');
    dots  = H.$('#hero-dots');
    // 이 파일은 창작글 페이지에도 실릴 수 있습니다. 슬라이드가 없으면 조용히 물러납니다.
    if (!hero || !track) return;

    slides = H.$$('.hero__slide', track);
    if (!slides.length) { hero.hidden = true; return; }

    buildDots();
    show(0);

    var prevBtn = H.$('#hero-prev');
    var nextBtn = H.$('#hero-next');

    // 한 장뿐이면 화살표도 의미가 없습니다.
    if (slides.length < 2) {
      if (prevBtn) prevBtn.hidden = true;
      if (nextBtn) nextBtn.hidden = true;
      return;
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { prev(); start(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { next(); start(); });

    // 읽는 동안 화면이 바뀌지 않게: 마우스를 올리거나 키보드 포커스가 들어오면 멈춥니다.
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
    hero.addEventListener('focusin', stop);
    hero.addEventListener('focusout', function (e) {
      // 포커스가 여전히 히어로 안에 있으면 재개하지 않습니다.
      if (!hero.contains(e.relatedTarget)) start();
    });

    // 다른 탭을 보고 있는 동안 타이머를 돌릴 이유가 없습니다.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    // 키보드 좌우 이동 (점에 포커스가 있을 때).
    if (dots) {
      dots.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft')       { prev(); start(); }
        else if (e.key === 'ArrowRight') { next(); start(); }
        else return;
        e.preventDefault();
        var active = H.$('.hero__dot.is-on', dots);
        if (active) active.focus();
      });
    }

    start();
  }

  // 설정 서랍에서 넘김 간격을 바꾸면 타이머를 다시 겁니다.
  document.addEventListener('hada:config', function () { start(); });

  // 방문자가 도중에 "동작 줄이기"를 켜면 즉시 자동 넘김을 멈춥니다.
  if (H.motionQuery) {
    var onMotion = function () { start(); };   // start() 안에서 canAuto() 가 판단합니다.
    if (H.motionQuery.addEventListener) H.motionQuery.addEventListener('change', onMotion);
    else if (H.motionQuery.addListener) H.motionQuery.addListener(onMotion);
  }

  // render.js 가 슬라이드를 다 그린 뒤에 붙어야 합니다.
  document.addEventListener('hada:rendered', init);

  H.slider = { next: next, prev: prev, show: show, start: start, stop: stop };

})(window.HADA);
