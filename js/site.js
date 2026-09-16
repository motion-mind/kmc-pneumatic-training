(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;

  function currentTheme() {
    try { return localStorage.getItem("pneu-theme"); } catch (e) { return null; }
  }
  function applyTheme(theme) {
    if (theme === "dark") body.classList.add("theme-dark");
    else body.classList.remove("theme-dark");
    var btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = theme === "dark" ? "Light" : "Dark";
  }
  try {
    var saved = currentTheme();
    if (saved) applyTheme(saved);
    else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) applyTheme("dark");
    else applyTheme("light");
  } catch (e) { applyTheme("light"); }

  function initThemeToggle() {
    var btn = document.getElementById("themeToggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = body.classList.contains("theme-dark") ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem("pneu-theme", next); } catch (e) {}
    });
  }

  function initNav() {
    var here = location.pathname.split("/").pop() || "index.html";
    var links = document.querySelectorAll(".site-nav a");
    for (var i = 0; i < links.length; i++) {
      var target = links[i].getAttribute("href").split("/").pop();
      if (target === here) links[i].classList.add("active");
      if (here === "" || here === "index.html") {
        if (target === "index.html") links[i].classList.add("active");
      }
    }
  }

  function slug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  }

  function initToc() {
    var host = document.querySelector("[data-toc]");
    if (!host) return;
    var main = document.querySelector("main");
    if (!main) return;
    var heads = main.querySelectorAll("h2");
    if (!heads.length) { host.remove(); return; }
    var used = {};
    var ol = document.createElement("ol");
    for (var i = 0; i < heads.length; i++) {
      var h = heads[i];
      var id = h.id || slug(h.textContent);
      while (used[id]) id = id + "-1";
      used[id] = true;
      h.id = id;
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + id;
      a.textContent = h.textContent;
      li.appendChild(a);
      ol.appendChild(li);
    }
    var title = document.createElement("div");
    title.className = "toc-title";
    title.textContent = "On this page";
    host.appendChild(title);
    host.appendChild(ol);
  }

  function initQuizzes() {
    var hosts = document.querySelectorAll("[data-quiz]");
    if (!hosts.length || typeof QUIZZES === "undefined") return;
    for (var i = 0; i < hosts.length; i++) buildQuiz(hosts[i]);
  }

  function buildQuiz(host) {
    var key = host.getAttribute("data-quiz");
    var items = QUIZZES[key];
    if (!items) { host.textContent = "Quiz not found: " + key; return; }

    var total = items.length;
    var answered = 0;
    var correct = 0;

    var toolbar = document.createElement("div");
    toolbar.className = "quiz-toolbar";
    var score = document.createElement("span");
    score.className = "score";
    score.textContent = "0 / " + total + " answered";
    var reset = document.createElement("button");
    reset.className = "btn";
    reset.type = "button";
    reset.textContent = "Reset";
    toolbar.appendChild(reset);
    toolbar.appendChild(score);
    host.appendChild(toolbar);

    var list = document.createElement("div");
    host.appendChild(list);

    var qEls = [];

    items.forEach(function (item, idx) {
      var q = document.createElement("div");
      q.className = "q";

      var qt = document.createElement("div");
      qt.className = "q-text";
      qt.textContent = (idx + 1) + ". " + item.q;
      q.appendChild(qt);

      var opts = document.createElement("div");
      opts.className = "opts";
      var name = "q_" + key + "_" + idx;

      item.opts.forEach(function (text, oi) {
        var label = document.createElement("label");
        label.className = "opt";
        var input = document.createElement("input");
        input.type = "radio";
        input.name = name;
        input.value = String(oi);
        var span = document.createElement("span");
        span.textContent = text;
        label.appendChild(input);
        label.appendChild(span);
        opts.appendChild(label);

        input.addEventListener("change", function () {
          if (q.classList.contains("answered")) return;
          q.classList.add("answered");
          answered++;
          var isCorrect = oi === item.answer;
          if (isCorrect) correct++;
          var labels = opts.querySelectorAll(".opt");
          for (var k = 0; k < labels.length; k++) {
            var inp = labels[k].querySelector("input");
            if (Number(inp.value) === item.answer) labels[k].classList.add("correct");
            else if (Number(inp.value) === oi) labels[k].classList.add("incorrect");
            inp.disabled = true;
          }
          updateScore();
        });
      });
      q.appendChild(opts);

      var ex = document.createElement("div");
      ex.className = "explain";
      ex.innerHTML = "<strong>Why:</strong> " + item.why;
      q.appendChild(ex);

      qEls.push(q);
      list.appendChild(q);
    });

    function updateScore() {
      score.textContent = answered + " / " + total + " answered \u00B7 " + correct + " correct";
    }

    reset.addEventListener("click", function () {
      answered = 0;
      correct = 0;
      qEls.forEach(function (q) {
        q.classList.remove("answered");
        var labels = q.querySelectorAll(".opt");
        for (var k = 0; k < labels.length; k++) {
          labels[k].classList.remove("correct", "incorrect");
          var inp = labels[k].querySelector("input");
          inp.checked = false;
          inp.disabled = false;
        }
      });
      updateScore();
    });
  }

  function num(v) {
    var n = parseFloat(v);
    return isFinite(n) ? n : NaN;
  }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function fmt(n, d) {
    if (!isFinite(n)) return "\u2014";
    return n.toFixed(d === undefined ? 1 : d);
  }

  function initCalcs() {
    var hosts = document.querySelectorAll("[data-calc]");
    for (var i = 0; i < hosts.length; i++) {
      var kind = hosts[i].getAttribute("data-calc");
      if (kind === "flow") buildFlowCalc(hosts[i]);
      else if (kind === "reset") buildResetCalc(hosts[i]);
    }
  }

  function buildFlowCalc(host) {
    host.innerHTML =
      '<div class="fields">' +
        '<div class="field"><label for="fcK">Box constant K</label><input id="fcK" type="number" step="any" value="2500"></div>' +
        '<div class="field"><label for="fcDp">Velocity pressure \u0394P (in w.c.)</label><input id="fcDp" type="number" step="any" value="0.25"></div>' +
      '</div>' +
      '<div class="out" id="fcOut"></div>' +
      '<p class="disclaimer-inline">CFM = K \u00D7 \u221A\u0394P. K comes from the airflow chart on the specific box \u2014 never from a generic table. A velocity pressure of 1.0 in w.c. is very high for a VAV inlet; typical readings are well under it.</p>';

    var k = host.querySelector("#fcK");
    var dp = host.querySelector("#fcDp");
    var out = host.querySelector("#fcOut");

    function run() {
      var kk = num(k.value), d = num(dp.value);
      if (!isFinite(kk) || !isFinite(d) || d < 0) { out.innerHTML = "Enter a valid K and a non-negative \u0394P."; return; }
      var cfm = kk * Math.sqrt(d);
      out.innerHTML =
        "Indicated flow: <strong>" + fmt(cfm, 0) + " CFM</strong>" +
        "<br><span class=\"disclaimer-inline\">At \u0394P of " + fmt(d, 3) + " in w.c. with K = " + fmt(kk, 0) + ".</span>";
    }
    k.addEventListener("input", run);
    dp.addEventListener("input", run);
    run();
  }

  function buildResetCalc(host) {
    host.innerHTML =
      '<div class="fields">' +
        '<div class="field"><label for="rcType">Reset type</label><select id="rcType"><option value="direct">Direct</option><option value="reverse">Reverse</option></select></div>' +
        '<div class="field"><label for="rcStart">Reset start (psi)</label><input id="rcStart" type="number" step="any" value="8"></div>' +
        '<div class="field"><label for="rcSpan">Reset span (psi)</label><input id="rcSpan" type="number" step="any" value="5"></div>' +
        '<div class="field"><label for="rcMin">Min flow (CFM)</label><input id="rcMin" type="number" step="any" value="300"></div>' +
        '<div class="field"><label for="rcMax">Max flow (CFM)</label><input id="rcMax" type="number" step="any" value="1200"></div>' +
        '<div class="field"><label for="rcT">Thermostat output at T (psi)</label><input id="rcT" type="number" step="any" value="9"></div>' +
      '</div>' +
      '<div class="out" id="rcOut"></div>' +
      '<p class="disclaimer-inline">Direct reset: below the start point the controller holds LO STAT (minimum); above it, flow resets up to HI STAT (maximum). Reverse reset: below the start point it holds LO STAT (maximum); above it, flow resets down to HI STAT (minimum).</p>';

    var t = host.querySelector("#rcType");
    var start = host.querySelector("#rcStart");
    var span = host.querySelector("#rcSpan");
    var mn = host.querySelector("#rcMin");
    var mx = host.querySelector("#rcMax");
    var tt = host.querySelector("#rcT");
    var out = host.querySelector("#rcOut");

    function run() {
      var type = t.value;
      var s = num(start.value), sp = num(span.value);
      var vmin = num(mn.value), vmax = num(mx.value), branch = num(tt.value);
      if (![s, sp, vmin, vmax, branch].every(isFinite) || sp <= 0) { out.innerHTML = "Enter valid numbers (span must be greater than 0)."; return; }
      var lo = type === "direct" ? vmin : vmax;
      var hi = type === "direct" ? vmax : vmin;
      var frac = clamp((branch - s) / sp, 0, 1);
      var val = lo + frac * (hi - lo);
      var state;
      if (branch < s) state = "Below reset start \u2014 holding LO STAT (" + fmt(lo, 0) + " CFM)";
      else if (branch > s + sp) state = "Above reset start + span \u2014 holding HI STAT (" + fmt(hi, 0) + " CFM)";
      else state = "On the reset ramp \u2014 " + fmt(frac * 100, 0) + "% reset";
      out.innerHTML =
        "Commanded flow setpoint: <strong>" + fmt(val, 0) + " CFM</strong>" +
        "<br><span class=\"disclaimer-inline\">" + state + ". Reset band: " + fmt(s, 1) + " \u2013 " + fmt(s + sp, 1) + " psi at port T. LO STAT = " + fmt(lo, 0) + " CFM, HI STAT = " + fmt(hi, 0) + " CFM.</span>";
    }
    [t, start, span, mn, mx, tt].forEach(function (el) { el.addEventListener("input", run); el.addEventListener("change", run); });
    run();
  }

  function init() {
    initThemeToggle();
    initNav();
    initToc();
    initQuizzes();
    initCalcs();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
