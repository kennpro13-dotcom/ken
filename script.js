(function () {
  var TP = Math.PI * 2, $ = function (i) { return document.getElementById(i); };
  var cv = $("c"), ctx = cv.getContext("2d"), stage = $("stage");
  var RAMP = ".`'^\",:;Il!i~+_-?]}1)|/trxnuczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  var LANGS = [
    ["English", "I love you"], ["Filipino", "Mahal kita"], ["Spanish", "Te quiero"], ["French", "Je t’aime"],
    ["German", "Ich liebe dich"], ["Italian", "Ti amo"], ["Portuguese", "Eu te amo"], ["Dutch", "Ik hou van je"],
    ["Swedish", "Jag älskar dig"], ["Polish", "Kocham cię"], ["Russian", "Я тебя люблю"], ["Greek", "Σ’ αγαπώ"],
    ["Turkish", "Seni seviyorum"], ["Arabic", "أحبك"], ["Hindi", "मैं तुमसे प्यार करता हूँ"], ["Japanese", "愛してる"],
    ["Korean", "사랑해"], ["Mandarin", "我爱你"], ["Vietnamese", "Anh yêu em"], ["Swahili", "Nakupenda"]
  ];
  // Arabic letters must join, so it is shown in the caption only, not split into single cells
  var stream = [], seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter() : null;
  LANGS.forEach(function (l) {
    if (l[0] === "Arabic") return;
    var s = l[1].replace(/ /g, "");
    (seg ? Array.from(seg.segment(s), function (x) { return x.segment; }) : Array.from(s)).forEach(function (g) { stream.push(g); });
  });

  // rose head: parametric rose surface, built once with normals
  var NR = 30, NT = 520, TMIN = -2, TMAX = 15 * Math.PI, NP = NR * NT;
  var P = new Float32Array(NP * 3), N = new Float32Array(NP * 3), TH = new Float32Array(NP);
  function m(a) { return ((a % TP) + TP) % TP; }
  function pt(i, j) {
    var r = i / (NR - 1), th = TMIN + (TMAX - TMIN) * j / (NT - 1);
    var x = 1 - 0.5 * Math.pow(1.25 * Math.pow(1 - m(3.6 * th) / Math.PI, 2) - 0.25, 2);
    var phi = Math.PI / 2 * Math.exp(-th / (8 * Math.PI));
    var y = 1.95653 * r * r * Math.pow(1.27689 * r - 1, 2) * Math.sin(phi);
    var rr = x * (r * Math.sin(phi) + y * Math.cos(phi));
    return [rr * Math.sin(th), rr * Math.cos(th), x * (r * Math.cos(phi) - y * Math.sin(phi)), th];
  }
  for (var i = 0; i < NR; i++) for (var j = 0; j < NT; j++) {
    var a = pt(i, j), b = pt(i < NR - 1 ? i + 1 : i - 1, j), c = pt(i, j < NT - 1 ? j + 1 : j - 1), k = (i * NT + j) * 3;
    var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    var nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0];
    var L = Math.hypot(nx, ny, nz) || 1;
    P[k] = a[0]; P[k + 1] = a[1]; P[k + 2] = a[2]; N[k] = nx / L; N[k + 1] = ny / L; N[k + 2] = nz / L; TH[k / 3] = a[3];
  }

  var COLS = 80, cols, rows, cw, ch, fs, W, H, dpr, zb, lum, hue;
  var stars = [];
  for (var s = 0; s < 130; s++) stars.push({ x: Math.random(), y: Math.random(), p: Math.random() * 9, v: .8 + Math.random() * 2.2, big: s < 14 });
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = stage.clientWidth; H = Math.round(W * 1.45);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fs = W / (COLS * 0.6); cw = fs * 0.6; ch = fs;
    cols = Math.floor(W / cw); rows = Math.floor(H / ch);
    zb = new Float32Array(cols * rows); lum = new Float32Array(cols * rows); hue = new Uint8Array(cols * rows);
  }
  var RC = [], GC = [];
  for (var q = 0; q < 8; q++) { RC.push("hsl(350 85% " + (22 + q * 6.5) + "%)"); GC.push("hsl(135 70% " + (18 + q * 5.5) + "%)"); }

  var ease = function (x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); };
  var lets = !!0, t0 = performance.now(), calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (calm) t0 -= 24000;
  var HS = 2.1, TILT = 0.22, ct = Math.cos(TILT), st = Math.sin(TILT);
  var ang = 0, ca = 1, sa = 0, sc, cx, y0;

  function shade(nx, ny, nz) {
    var x = nx * ca + ny * sa, y = -nx * sa + ny * ca;
    return 0.22 + 0.78 * Math.abs(x * -0.45 + y * 0.55 + nz * 0.7);
  }
  function plot(x, y, z, l, h) {
    var X = x * ca + y * sa, D = -x * sa + y * ca;
    var col = Math.floor((cx + X * sc) / cw), row = Math.floor((y0 - (z * ct + D * st) * sc) / ch);
    if (col < 0 || row < 0 || col >= cols || row >= rows) return;
    var d = D * ct - z * st, idx = row * cols + col;
    if (hue[idx] && d < zb[idx]) return;
    zb[idx] = d; lum[idx] = l > 1 ? 1 : l; hue[idx] = h;
  }
  function stemX(z) { return 0.1 * Math.sin(z * 1.3); }

  function frame(now) {
    var t = (now - t0) / 1000;
    var u = Math.min(1, Math.max(0, (t - 5.5) / 9)), bl = u * (2 - u) * 0.55 + u * u * (3 - 2 * u) * 0.45;
    ang = calm || t < 7 ? 0 : (t - 7) * 0.35; ca = Math.cos(ang); sa = Math.sin(ang);
    sc = H * 0.26; cx = W / 2; y0 = H * 0.9;
    hue.fill(0);
    // stem
    var grow = ease(t / 3.5), ns = 90, a, k;
    for (k = 0; k <= ns; k++) {
      var z = HS * grow * k / ns;
      for (a = 0; a < 6; a++) {
        var an = a / 6 * TP, nx = Math.cos(an), ny = Math.sin(an);
        plot(stemX(z) + 0.045 * nx, 0.045 * ny, z, shade(nx, ny, 0) * 0.9, 2);
      }
    }
    // leaves
    var ls = ease((t - 3) / 2.5), lv = [[0.55, 0.5], [1.05, Math.PI + 0.5]];
    if (ls > 0) lv.forEach(function (f) {
      var dx = Math.cos(f[1]), dy = Math.sin(f[1]);
      for (var p = 0; p <= 12; p++) for (var w = -6; w <= 6; w++) {
        var uu = p / 12, r = uu * 0.95 * ls, lat = (w / 6) * 0.3 * Math.sin(Math.PI * uu) * ls;
        var zz = f[0] + (0.55 * uu - 0.5 * uu * uu) * ls;
        plot(stemX(f[0]) + dx * r - dy * lat, dy * r + dx * lat, zz, shade(-dy * w * 0.07, dx * w * 0.07, 1) * 0.85, 2);
      }
    });
    // head
    var bud = ease((t - 4.8) / 1), hs = (0.42 + 0.58 * bl) * 0.95 * bud, vs = (1.15 - 0.2 * bl) * 0.95 * bud;
    var tmax = 3 + (TMAX - 3) * (0.2 + 0.8 * bl), sx = stemX(HS * grow);
    if (bud > 0.01 && grow > 0.98) for (k = 0; k < NP; k++) {
      if (TH[k] > tmax) continue;
      plot(sx + P[k * 3] * hs, P[k * 3 + 1] * hs, HS + P[k * 3 + 2] * vs, shade(N[k * 3], N[k * 3 + 1], N[k * 3 + 2]), 1);
    }

    ctx.clearRect(0, 0, W, H);
    // sparkles
    stars.forEach(function (s) {
      var al = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * s.v + s.p)), x = s.x * W, y = s.y * H * 0.96;
      ctx.fillStyle = "rgba(255,255,255," + (al * 0.7) + ")"; ctx.fillRect(x, y, 1.5, 1.5);
      if (s.big) {
        var L = 5 + 10 * al; ctx.strokeStyle = "rgba(255,255,255," + (al * 0.55) + ")"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - L, y + .7); ctx.lineTo(x + L, y + .7); ctx.moveTo(x + .7, y - L); ctx.lineTo(x + .7, y + L); ctx.stroke();
      }
    });
    // letters
    ctx.font = fs + "px ui-monospace,Menlo,Consolas,'Noto Sans Mono CJK SC',monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var bk = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []], count = 0, off = Math.floor(t * 3);
    for (k = 0; k < hue.length; k++) if (hue[k]) { bk[(hue[k] - 1) * 8 + Math.min(7, Math.floor(lum[k] * 8))].push(k); count++; }
    bk.forEach(function (list, bi) {
      ctx.fillStyle = bi < 8 ? RC[bi] : GC[bi - 8];
      list.forEach(function (i2) {
        var ch2 = lets ? stream[(i2 + off) % stream.length] : RAMP[Math.floor(lum[i2] * (RAMP.length - 1))];
        ctx.fillText(ch2, ((i2 % cols) + 0.5) * cw, (Math.floor(i2 / cols) + 0.5) * ch);
      });
    });
    $("t").textContent = t.toFixed(2).padStart(5, "0");
    $("b").textContent = (bl * 100).toFixed(1);
    $("a").textContent = ((ang * 180 / Math.PI) % 360).toFixed(2).padStart(6, "0");
    $("n").textContent = count.toLocaleString("en-US");
    if (lets) {
      var li = Math.floor(Math.max(0, t) / 2.4) % LANGS.length, cap = $("cap");
      if (cap.dataset.i !== String(li)) {
        cap.dataset.i = li; cap.textContent = "";
        var bb = document.createElement("b"); bb.textContent = LANGS[li][1]; bb.lang = ["en","fil","es","fr","de","it","pt","nl","sv","pl","ru","el","tr","ar","hi","ja","ko","zh","vi","sw"][li];
        cap.appendChild(bb); cap.appendChild(document.createTextNode(" · " + LANGS[li][0]));
      }
    }
    requestAnimationFrame(frame);
  }

  $("mode").addEventListener("click", function () {
    lets = !lets; this.setAttribute("aria-pressed", lets); this.textContent = lets ? "Letters: I love you" : "Letters: symbols";
    if (!lets) { $("cap").dataset.i = ""; $("cap").textContent = "Switch to “I love you” letters to draw the rose from 20 languages."; }
  });
  $("replay").addEventListener("click", function () { t0 = performance.now(); });
  window.addEventListener("resize", size);
  size(); requestAnimationFrame(frame);
})();
