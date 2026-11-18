(function () {
  var stage = document.getElementById('stage'), slides = [].slice.call(document.querySelectorAll('.slide'));
  var pager = document.getElementById('pager'), black = document.getElementById('black');
  var cur = -1, outT;
  if (/still/.test(location.search)) document.documentElement.classList.add('still');

  // линии сетки собираются из границ клеток: одинаковые отрезки сливаются, рамка общая
  function lines(slide) {
    var grid = slide.querySelector('.grid'), gx = grid.offsetLeft, gy = grid.offsetTop, H = {}, V = {};
    function add(m, k, a, b) { (m[k] = m[k] || []).push([a, b]); }
    [].forEach.call(grid.children, function (c, i) {
      c.style.setProperty('--i', i);
      var x = gx + c.offsetLeft, y = gy + c.offsetTop, w = c.offsetWidth, h = c.offsetHeight;
      add(H, y, x, x + w); add(H, y + h, x, x + w); add(V, x, y, y + h); add(V, x + w, y, y + h);
    });
    var out = [];
    function merge(m, hor) {
      Object.keys(m).forEach(function (k) {
        var s = m[k].sort(function (p, q) { return p[0] - q[0]; }), a = s[0][0], b = s[0][1];
        for (var i = 1; i <= s.length; i++) {
          if (i < s.length && s[i][0] <= b + 1) { b = Math.max(b, s[i][1]); continue; }
          out.push({ hor: hor, k: +k, a: a, b: b });
          if (i < s.length) { a = s[i][0]; b = s[i][1]; }
        }
      });
    }
    merge(H, true); merge(V, false);
    out.sort(function (p, q) { return (p.hor ? p.k : p.k * .5) - (q.hor ? q.k : q.k * .5); });
    out.forEach(function (l, i) {
      var d = document.createElement('i'), lw = 3;
      d.className = 'ln ' + (l.hor ? 'h' : 'v');
      if (l.hor) { d.style.left = l.a + 'px'; d.style.top = (l.k - lw / 2) + 'px'; d.style.width = (l.b - l.a) + 'px'; }
      else { d.style.left = (l.k - lw / 2) + 'px'; d.style.top = (l.a - lw / 2) + 'px'; d.style.height = (l.b - l.a + lw) + 'px'; }
      d.style.setProperty('--dl', (i * 35) + 'ms');
      slide.appendChild(d);
    });
  }

  function fit() {
    var k = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = 'scale(' + k + ') translate(-50%, -50%)';
  }
  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === cur) return;
    var first = cur < 0;
    if (cur >= 0) {
      var old = slides[cur];
      old.classList.remove('on'); old.classList.add('out');
      clearTimeout(outT);
      outT = setTimeout(function () { slides.forEach(function (s) { if (!s.classList.contains('on')) s.classList.remove('out'); }); }, 1100);
    }
    cur = i;
    slides[i].classList.remove('out');
    // новый слайд начинает рисоваться, когда старый уже наполовину стёрт
    setTimeout(function () { if (cur === i) slides[i].classList.add('on'); }, first ? 0 : 380);
    [].forEach.call(pager.children, function (d, k) { d.classList.toggle('on', k === i); });
    history.replaceState(null, '', '#' + (i + 1));
  }

  // слайд 1: первое «вперёд» запускает голос Claude (браузер не даёт играть без нажатия), следующее — уже слайд 2.
  // V — сказать заново
  var voice = document.getElementById('voice'), C = window.CLAUDE, said = false, raf;
  var say = document.getElementById('say'), bars = document.querySelectorAll('#claude .bars i');
  function talk() {
    said = true; voice.currentTime = 0; voice.play().catch(function () {});
    say.textContent = ''; document.body.classList.add('talk');
    cancelAnimationFrame(raf); tick();
  }
  function hush() { voice.pause(); document.body.classList.remove('talk'); cancelAnimationFrame(raf); }
  function tick() {
    var t = voice.currentTime, f = Math.floor(t * C.fps);
    C.cues.forEach(function (c) { if (t >= c.t && say.textContent !== c.text) say.textContent = c.text; });
    // полоски — громкость чуть разных моментов, чтобы качались волной, а не хором
    [].forEach.call(bars, function (b, k) { b.style.transform = 'scaleY(' + Math.max(.08, Math.sqrt(C.env[f - Math.abs(k - 3)] || 0)) + ')'; });
    raf = requestAnimationFrame(tick);
  }
  voice.addEventListener('ended', hush);

  // кликер шлёт PageDown/PageUp или стрелки; F — во весь экран, B или точка — чёрный экран
  addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'v' || k === 'V' || k === 'м' || k === 'М') { go(0); talk(); return; }
    if (k === 'b' || k === 'B' || k === 'и' || k === 'И' || k === '.' || k === 'ю') { black.hidden = !black.hidden; if (!black.hidden) hush(); return; }
    if (k === 'F5' || k === 'f' || k === 'F' || k === 'а' || k === 'А') {
      e.preventDefault();
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () {}); else document.exitFullscreen();
      return;
    }
    if (!black.hidden) black.hidden = true;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].indexOf(k) >= 0) {
      e.preventDefault();
      if (cur === 0 && !said) { talk(); return; }
      hush(); go(cur + 1);
    }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].indexOf(k) >= 0) { e.preventDefault(); hush(); go(cur - 1); }
    else if (k === 'Home') { hush(); go(0); }
    else if (k === 'End') { hush(); go(slides.length - 1); }
  });

  var hideT;
  addEventListener('mousemove', function () {
    document.body.classList.add('mouse');
    clearTimeout(hideT); hideT = setTimeout(function () { document.body.classList.remove('mouse'); }, 1500);
  });
  addEventListener('resize', fit);
  fit();
  slides.forEach(function () { pager.appendChild(document.createElement('i')); });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
    slides.forEach(lines);
    go((parseInt(location.hash.slice(1), 10) || 1) - 1);
  });
})();
