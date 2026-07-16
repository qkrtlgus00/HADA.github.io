/* ===========================================================================
   render.js — 데이터를 화면에 그립니다
   ---------------------------------------------------------------------------
   담당: 프로필, 슬라이드, 갤러리 그리드, 링크 카드, 글 목록

   ★ 왜 JS로 그리나요?
     "배열에 { } 한 덩어리 추가"가 "<figure> 10줄 복사하고 속성 5개 고치기"보다
     훨씬 안전하기 때문입니다. 반복되는 구조만 여기서 그립니다.
     산문(소개글, 창작글 본문)과 <head> 메타 정보는 손으로 쓴 HTML로 둡니다.

   다 그리고 나면 'hada:rendered' 이벤트를 쏩니다.
   slider.js / gallery.js 가 이 신호를 기다렸다가 동작을 붙입니다.
   =========================================================================== */

(function (H) {
  'use strict';
  if (!H) return;

  /* ---------- 이미지 헬퍼 ----------
     webp 가 있으면 <picture> 로 감싸고, 없으면 그냥 <img>.
     빌드 과정이 없으니 WebP는 "자동 변환"이 아니라 사용자가 직접 만들어 넣는
     선택 사항입니다. 비워도 아무것도 깨지지 않습니다. */
  function imageNode(item, opts) {
    opts = opts || {};
    var src = opts.thumb && item.thumb ? item.thumb : item.src;
    var img = H.el('img', {
      src: src,
      alt: opts.alt !== undefined ? opts.alt : (item.alt || item.title || ''),
      loading: opts.eager ? 'eager' : 'lazy',
      decoding: 'async'
    });
    if (opts.width)  img.width = opts.width;
    if (opts.height) img.height = opts.height;

    if (!item.webp) return img;

    return H.el('picture', {}, [
      H.el('source', { srcset: item.webp, type: 'image/webp' }),
      img
    ]);
  }

  /* ---------- 프로필 ---------- */
  function renderProfile() {
    var p = (H.cfg && H.cfg.profile) || {};
    var set = function (id, val) {
      var n = H.$(id);
      if (n && val) n.textContent = val;
    };
    set('#profile-name', p.name);
    set('#profile-handle', p.handle);
    set('#profile-job', p.job);
    set('#profile-bio', p.bio);

    var av = H.$('#profile-avatar');
    if (av && p.avatar) {
      av.src = p.avatar;
      // 프로필 사진은 장식입니다 — 바로 옆에 이름이 글자로 있으니
      // alt 를 비워 스크린리더가 같은 말을 두 번 읽지 않게 합니다.
      av.alt = '';
      av.addEventListener('error', function () {
        // 아직 사진을 안 넣었어도 깨진 아이콘이 뜨지 않게.
        av.style.visibility = 'hidden';
      }, { once: true });
    }
  }

  /* ---------- 슬라이드 ---------- */
  function renderSlides() {
    var track = H.$('#hero-track');
    var hero = H.$('.hero');
    if (!track || !hero) return;

    var slides = ((H.cfg && H.cfg.slides) || []).slice(0, 3);  // 최대 3장
    if (!slides.length) { hero.hidden = true; return; }

    track.innerHTML = '';
    slides.forEach(function (s, i) {
      var media = imageNode(s, {
        alt: s.alt || '',
        eager: i === 0            // 첫 장은 화면 맨 위라 지연 로딩하면 오히려 늦습니다.
      });

      var caption = null;
      if (s.title || s.body) {
        caption = H.el('div', { class: 'hero__caption' }, [
          s.title ? H.el('p', { class: 'hero__title', text: s.title }) : null,
          s.body  ? H.el('p', { class: 'hero__body',  text: s.body })  : null
        ]);
      }

      var inner = H.el('div', { class: 'hero__inner' }, [media, caption]);

      var slide = H.el('div', {
        class: 'hero__slide' + (i === 0 ? ' is-on' : ''),
        dataset: { index: String(i) },
        'aria-hidden': i === 0 ? 'false' : 'true'
      }, [
        s.link
          ? H.el('a', { class: 'hero__link', href: s.link }, [inner])
          : inner
      ]);

      track.appendChild(slide);
    });

    hero.hidden = false;
  }

  /* ---------- 갤러리 ----------
     여기서는 "전부" 그립니다. 태그 필터는 gallery.js 가
     data-tags 를 보고 숨기고 보이는 방식으로 처리합니다. */
  function renderGallery() {
    var grid = H.$('#gallery-grid');
    var empty = H.$('#gallery-empty');
    if (!grid) return;

    var items = H.gallery || [];
    grid.innerHTML = '';

    if (!items.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    items.forEach(function (item, i) {
      var tags = item.tags || [];
      var fig = H.el('figure', {
        class: 'card-img',
        dataset: { index: String(i), tags: tags.join('|') }
      }, [
        H.el('button', {
          class: 'card-img__btn',
          type: 'button',
          'aria-label': (item.title || '그림') + ' 크게 보기'
        }, [
          imageNode(item, { thumb: true, alt: item.title || '' })
        ]),
        item.title
          ? H.el('figcaption', { class: 'card-img__cap', text: item.title })
          : null
      ]);
      grid.appendChild(fig);
    });
  }

  /* ---------- 링크 카드 ---------- */
  function renderLinks() {
    var wrap = H.$('#links-grid');
    if (!wrap) return;

    var links = (H.cfg && H.cfg.links) || [];
    wrap.innerHTML = '';

    links.forEach(function (l) {
      if (!l.url) return;
      // 바깥으로 나가는 링크만 새 탭으로. mailto: 나 내부 앵커는 그대로 둡니다.
      var external = /^https?:/i.test(l.url);
      wrap.appendChild(
        H.el('a', {
          class: 'card',
          href: l.url,
          target: external ? '_blank' : null,
          // noopener 는 새 탭이 원래 창을 조작하지 못하게 막습니다. 보안상 필수.
          rel: external ? 'noopener noreferrer' : null
        }, [
          l.icon ? H.el('span', { class: 'card__icon', 'aria-hidden': 'true', text: l.icon }) : null,
          H.el('span', { class: 'card__body' }, [
            H.el('span', { class: 'card__label', text: l.label || l.url }),
            l.desc ? H.el('span', { class: 'card__desc', text: l.desc }) : null
          ])
        ])
      );
    });
  }

  /* ---------- 글 목록 ---------- */
  function renderPosts() {
    var list = H.$('#posts-list');
    var section = H.$('#writing');
    if (!list || !section) return;

    var posts = H.posts || [];
    if (!posts.length) { section.hidden = true; return; }

    list.innerHTML = '';
    posts.forEach(function (p) {
      if (!p.href) return;
      list.appendChild(
        H.el('li', { class: 'post' }, [
          H.el('a', { class: 'post__link', href: p.href }, [
            H.el('span', { class: 'post__title', text: p.title || '(제목 없음)' }),
            p.summary ? H.el('span', { class: 'post__summary', text: p.summary }) : null,
            H.el('span', { class: 'post__meta' }, [
              p.date ? H.el('time', { datetime: p.date, text: p.date }) : null,
              (p.tags && p.tags.length)
                ? H.el('span', { class: 'post__tags', text: p.tags.map(function (t) { return '#' + t; }).join(' ') })
                : null
            ])
          ])
        ])
      );
    });
    section.hidden = false;
  }

  /* ---------- 잡다 ---------- */
  function renderMisc() {
    var year = H.$('#footer-year');
    // 연도는 매년 바뀌므로 손으로 적어두면 반드시 낡습니다.
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function renderAll() {
    renderProfile();
    renderSlides();
    renderGallery();
    renderLinks();
    renderPosts();
    renderMisc();
    document.dispatchEvent(new CustomEvent('hada:rendered'));
  }

  H.ready(renderAll);

  H.render = { all: renderAll, image: imageNode };

})(window.HADA);
