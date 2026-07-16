/* ===========================================================================
   widgets.js — 시계와 달력 위젯
   ---------------------------------------------------------------------------
   담당:
     - 시간을 초 단위로 업데이트하는 디지털 시계
     - 한국식 12시간 형식 + 현재 날짜와 요일 표시
     - 매월 달력 렌더 (일요일 시작, 토요일 끝)
     - 자정 통과 시 달력 자동 리프레시 (오늘 날짜 유지)
     - 설정 변경 시 반응형 표시/숨김
   =========================================================================== */

(function (H) {
  'use strict';

  if (!H) return;

  var widgets = H.$('#widgets');
  // 마크업이 없으면 writing/*.html 같은 다른 페이지일 수 있습니다. 바로 끝냅니다.
  if (!widgets) return;

  var clockTime = H.$('#clock-time');
  var clockDate = H.$('#clock-date');
  var calendarTitle = H.$('#calendar-title');
  var calendarGrid = H.$('#calendar-grid');

  // 자정 통과를 감지하기 위한 마지막 날짜 (YYYY-MM-DD 형식)
  var lastDateKey = null;
  var intervalId = null;

  // Intl.DateTimeFormat 은 생성 비용이 큽니다. 한 번만 만들고 재사용합니다.
  var timeFormatter = new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  });
  var dateFormatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  var monthFormatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long'
  });

  /* ---------- 달력 렌더 ---------- */
  function renderCalendar(date) {
    var year = date.getFullYear();
    var month = date.getMonth();
    var today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var todayTime = today.getTime();

    // 월 제목: "2026년 7월"
    calendarTitle.textContent = monthFormatter.format(date);

    // 첫째 날의 요일 (0=일, 6=토)
    var firstDay = new Date(year, month, 1).getDay();
    // 마지막 날짜
    var lastDate = new Date(year, month + 1, 0).getDate();

    // DOM 업데이트는 한 번에 — DocumentFragment 사용
    var fragment = document.createDocumentFragment();

    // 요일 헤더: 일 월 화 수 목 금 토
    var days = ['일', '월', '화', '수', '목', '금', '토'];
    days.forEach(function (dayName, idx) {
      var isWeekend = idx === 0 || idx === 6; // 0=일, 6=토
      var headerClass = 'calendar__head' + (isWeekend ? (idx === 0 ? ' is-sun' : ' is-sat') : '');
      var header = H.el('div', {
        class: headerClass,
        'aria-hidden': 'true'
      }, [dayName]);
      fragment.appendChild(header);
    });

    // 선행 빈 칸
    for (var i = 0; i < firstDay; i++) {
      var blank = H.el('div', { class: 'calendar__day is-blank' });
      fragment.appendChild(blank);
    }

    // 날짜들
    for (var d = 1; d <= lastDate; d++) {
      var cellDate = new Date(year, month, d);
      var cellTime = cellDate.getTime();
      var isToday = cellTime === todayTime;
      var dayOfWeek = cellDate.getDay();
      var isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

      var className = 'calendar__day';
      if (isToday) className += ' is-today';
      if (dayOfWeek === 0) className += ' is-sun';
      if (dayOfWeek === 6) className += ' is-sat';

      // 접근성: <time> 요소로 날짜 명시. aria-label로도 한국어 제공
      var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var timeEl = H.el('time', { datetime: dateStr });
      timeEl.textContent = String(d);

      var dayCell = H.el('div', {
        class: className,
        'aria-label': (month + 1) + '월 ' + d + '일',
        'aria-current': isToday ? 'date' : null
      }, [timeEl]);

      fragment.appendChild(dayCell);
    }

    calendarGrid.textContent = ''; // 기존 내용 제거
    calendarGrid.appendChild(fragment);
  }

  /* ---------- 시계 업데이트 ---------- */
  function tick() {
    var now = new Date();

    // 시각 업데이트
    clockTime.textContent = timeFormatter.format(now);
    clockDate.textContent = dateFormatter.format(now);

    // 자정 통과 감지: 날짜가 바뀌었으면 달력을 리프레시합니다.
    // (새로운 "오늘"이 표시되도록 is-today 클래스를 올바르게 이동)
    var dateKey = now.getFullYear() + '-' +
                  String(now.getMonth() + 1).padStart(2, '0') + '-' +
                  String(now.getDate()).padStart(2, '0');
    if (lastDateKey !== null && lastDateKey !== dateKey) {
      renderCalendar(now);
    }
    lastDateKey = dateKey;
  }

  /* ---------- 위젯 갱신 (설정 변경 후 재렌더) ---------- */
  function refresh() {
    var now = new Date();
    tick();
    renderCalendar(now);
  }

  /* ---------- 시계와 달력 초기화 ---------- */
  function init() {
    var show = H.cfg.clockCalendar && H.cfg.clockCalendar.show;

    if (!show) {
      // 설정이 꺼져 있으면 숨깁니다.
      widgets.hidden = true;
      // ★ 타이머를 반드시 같이 끕니다.
      //   안 끄면 안 보이는 시계가 1초마다 계속 도는 채로 남습니다.
      stopTick();
      return;
    }

    // 설정이 켜져 있으면 보입니다.
    widgets.hidden = false;

    // 첫 렌더
    refresh();

    // 초 단위 업데이트 시작
    startTick();
  }

  function startTick() {
    stopTick();   // 중복 실행 방지 — 타이머는 항상 하나만.
    intervalId = setInterval(tick, 1000);
  }

  function stopTick() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
  }

  // 다른 탭을 보고 있는 동안 초를 세고 있을 이유가 없습니다.
  // 돌아오면 즉시 한 번 갱신해서 멈춰 있던 시각이 보이지 않게 합니다.
  document.addEventListener('visibilitychange', function () {
    if (!widgets || widgets.hidden) return;
    if (document.hidden) { stopTick(); }
    else { tick(); startTick(); }
  });

  /* ---------- 공개 API: 설정 서랍이 재렌더를 요청할 때 사용 ---------- */
  H.widgets = {
    refresh: refresh
  };

  /* ---------- 설정 이벤트 리스너 ---------- */
  document.addEventListener('hada:config', function () {
    init();
  });

  /* ---------- DOM 준비 후 실행 ---------- */
  H.ready(init);
})(window.HADA);
