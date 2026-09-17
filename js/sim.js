(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var tubeLayer = document.getElementById("tubeLayer");

  var MAX = 1200, MIN = 300, RESET_START = 8, RESET_SPAN = 5;
  var DEFAULTS = { mainOn: true, setpoint: 72, roomTemp: 78, twoControllers: true, coldAction: "NC", hotAction: "NO" };

  var state = {
    mainOn: DEFAULTS.mainOn,
    setpoint: DEFAULTS.setpoint,
    roomTemp: DEFAULTS.roomTemp,
    twoControllers: DEFAULTS.twoControllers,
    coldAction: DEFAULTS.coldAction,
    hotAction: DEFAULTS.hotAction,
    lines: {
      hotH: true, hotL: true, coldH: true, coldL: true,
      hotB: true, coldB: true,
      mainHot: true, mainCold: true, mainTstat: true,
      tMain: true, tHot: true, tCold: true, tDirect: true
    },
    tOut: 9, coldT: 9, hotT: 9, coldPct: 45, hotPct: 0,
    supplyTemp: 55, flow: 540, failHeat: false
  };

  var TUBES = [
    { id: "hotH", points: [[570, 150], [570, 187]], cls: "wire-sensor", name: "hot deck sensor H", mode: "ctrl" },
    { id: "hotL", points: [[607, 150], [607, 175]], cls: "wire-sensor", name: "hot deck sensor L", mode: "ctrl" },
    { id: "coldH", points: [[570, 440], [570, 467]], cls: "wire-sensor", name: "cold deck sensor H", mode: "ctrl" },
    { id: "coldL", points: [[607, 440], [607, 455]], cls: "wire-sensor", name: "cold deck sensor L", mode: "ctrl" },
    { id: "hotB", points: [[541, 227], [460, 227]], cls: "wire-branch", name: "hot deck branch", mode: "ctrl" },
    { id: "coldB", points: [[541, 507], [460, 507]], cls: "wire-branch", name: "cold deck branch", mode: "ctrl" },
    { id: "mainHot", points: [[290, 275], [543, 275]], cls: "wire-main", name: "main air to hot controller", mode: "ctrl" },
    { id: "mainCold", points: [[290, 555], [543, 555]], cls: "wire-main", name: "main air to cold controller", mode: "ctrl" },
    { id: "mainTstat", points: [[1150, 630], [1150, 380]], cls: "wire-main", name: "main air to thermostat" },
    { id: "tMain", points: [[1108, 240], [1108, 187], [1000, 187]], cls: "wire-reset", name: "thermostat output", mode: "ctrl" },
    { id: "tHot", points: [[1000, 187], [663, 187]], cls: "wire-reset", name: "teed signal to hot controller", mode: "ctrl" },
    { id: "tCold", points: [[1000, 187], [1000, 467], [663, 467]], cls: "wire-reset", name: "teed signal to cold controller", mode: "ctrl" },
    { id: "tDirect", points: [[1000, 187], [1000, 490], [460, 490]], cls: "wire-reset", name: "thermostat to linked actuator", mode: "opposed" }
  ];

  var els = {};

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function polar(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; }
  function seg(cls, x1, y1, x2, y2) {
    var l = document.createElementNS(NS, "line");
    l.setAttribute("class", cls);
    l.setAttribute("x1", x1.toFixed(1)); l.setAttribute("y1", y1.toFixed(1));
    l.setAttribute("x2", x2.toFixed(1)); l.setAttribute("y2", y2.toFixed(1));
    return l;
  }

  function initDeviceArt() {
    var gs = document.getElementById("tstatScale");
    if (!gs) return;
    for (var a = -60; a <= 60; a += 15) {
      var major = (a % 30 === 0);
      var p1 = polar(1058, 292, 26, a), p2 = polar(1058, 292, major ? 31.5 : 30, a);
      gs.appendChild(seg("tstat-tick" + (major ? " major" : ""), p1[0], p1[1], p2[0], p2[1]));
    }
    [-60, -30, 0, 30, 60].forEach(function (ang) {
      var pt = polar(1058, 292, 20.5, ang);
      var t = document.createElementNS(NS, "text");
      t.setAttribute("class", "tstat-num");
      t.setAttribute("x", pt[0].toFixed(1)); t.setAttribute("y", (pt[1] + 2.8).toFixed(1));
      t.textContent = String(60 + (ang + 60) / 120 * 20);
      gs.appendChild(t);
    });
  }

  function buildTube(t) {
    var pts = t.points, n = pts.length;
    var last = pts[n - 1], prev = pts[n - 2] || pts[0];
    var dx = last[0] - prev[0], dy = last[1] - prev[1];
    var len = Math.hypot(dx, dy) || 1;
    var ux = dx / len, uy = dy / len;
    var retract = [last[0] - ux * 22, last[1] - uy * 22];

    function pathTo(endPt) {
      var d = "M" + pts[0][0] + " " + pts[0][1];
      for (var i = 1; i < n - 1; i++) d += " L" + pts[i][0] + " " + pts[i][1];
      return d + " L" + endPt[0] + " " + endPt[1];
    }
    function mk(tag, cls, attrs) {
      var e = document.createElementNS(NS, tag);
      e.setAttribute("class", cls);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }

    var g = document.createElementNS(NS, "g");
    g.setAttribute("class", "tube " + t.cls);
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", "Plug or unplug " + t.name);

    var port = mk("circle", "port", { cx: last[0], cy: last[1], r: 5 });
    var wire = mk("path", "wire", { d: pathTo(last) });
    var cap = mk("circle", "plug-cap", { cx: last[0], cy: last[1], r: 5.5 });
    var hit = mk("path", "hit", { d: pathTo(last) });

    g.appendChild(port); g.appendChild(wire); g.appendChild(cap); g.appendChild(hit);
    tubeLayer.appendChild(g);
    els[t.id] = { g: g, wire: wire, cap: cap, pathTo: pathTo, last: last, retract: retract, mode: t.mode || "always" };

    function toggle() { setLine(t.id, !state.lines[t.id]); }
    g.addEventListener("click", toggle);
    g.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); }
    });
  }

  function setLine(id, on) {
    state.lines[id] = on;
    var T = els[id], end = on ? T.last : T.retract;
    T.wire.setAttribute("d", T.pathTo(end));
    T.cap.setAttribute("cx", end[0]);
    T.cap.setAttribute("cy", end[1]);
    T.g.classList.toggle("off", !on);
    T.g.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function syncLines() { for (var id in els) setLine(id, state.lines[id]); }

  function setText(id, txt, bad) {
    var e = document.getElementById(id);
    if (!e) return;
    e.textContent = txt;
    e.classList.toggle("bad", !!bad);
  }

  function update(dt) {
    var L = state.lines;
    var two = state.twoControllers;
    var tHasAir = state.mainOn && L.mainTstat;
    var tOut = tHasAir ? clamp(9 + (state.roomTemp - state.setpoint) * 1.2, 3, 15) : 0;

    var coldPct, hotPct, coldT = 0, hotT = 0, failHeat = false;

    if (two) {
      var coldAir = state.mainOn && L.mainCold;
      var hotAir = state.mainOn && L.mainHot;
      var sig = L.tMain && tHasAir;
      coldT = (coldAir && sig && L.tCold) ? tOut : 0;
      hotT = (hotAir && sig && L.tHot) ? tOut : 0;

      var fc = clamp((coldT - RESET_START) / RESET_SPAN, 0, 1);
      var coldSP = MIN + fc * (MAX - MIN);
      coldPct = coldAir ? clamp(coldSP / MAX * 100, 0, 100) : (state.coldAction === "NO" ? 100 : 0);
      if (coldAir && !(L.coldH && L.coldL)) coldPct = 100;

      var fh = clamp((RESET_START - hotT) / RESET_SPAN, 0, 1);
      var hotSP = fh * MAX;
      hotPct = hotAir ? clamp(hotSP / MAX * 100, 0, 100) : 100;
      if (hotAir && !(L.hotH && L.hotL)) hotPct = 100;

      failHeat = !coldAir && !hotAir;
    } else {
      var actAir = state.mainOn && L.mainTstat && L.tDirect;
      if (actAir) {
        coldPct = clamp((tOut - 7) / 5, 0, 1) * 100;
        hotPct = 100 - coldPct;
      } else {
        coldPct = 0; hotPct = 100; failHeat = true;
      }
    }

    var coldFlow = coldPct / 100 * MAX, hotFlow = hotPct / 100 * MAX;
    var flow = coldFlow + hotFlow;
    var supplyTemp = flow > 0 ? (coldFlow * 55 + hotFlow * 95) / flow : 55;
    var target = state.setpoint + (hotFlow - coldFlow) / MAX * 20 + (1 - clamp(flow / MAX, 0, 1)) * 8;
    state.roomTemp = clamp(state.roomTemp + (target - state.roomTemp) * 1.3 * dt, 45, 98);

    state.tOut = tOut;
    state.tHasAir = tHasAir;
    state.coldT = coldT;
    state.hotT = hotT;
    state.coldPct = coldPct;
    state.hotPct = hotPct;
    state.flow = flow;
    state.supplyTemp = supplyTemp;
    state.failHeat = failHeat;

    paint();
  }

  function paint() {
    var L = state.lines, two = state.twoControllers;
    var mainPSI = state.mainOn ? "20 psi" : "0 psi";

    document.getElementById("blade").setAttribute("transform",
      "rotate(" + (90 * (1 - state.coldPct / 100)).toFixed(1) + " 430 410)");
    document.getElementById("hotBlade").setAttribute("transform",
      "rotate(" + (90 * (1 - state.hotPct / 100)).toFixed(1) + " 430 120)");

    document.getElementById("hotActuator").style.display = two ? "block" : "none";
    document.getElementById("coldActuator").style.display = "block";
    document.getElementById("opposedNote").style.display = two ? "none" : "block";
    document.getElementById("opposedLink").style.display = two ? "none" : "block";

    document.getElementById("ctrlCold").style.display = two ? "block" : "none";
    document.getElementById("ctrlHot").style.display = two ? "block" : "none";

    var coolNC = state.coldAction === "NC", hotNO = state.hotAction === "NO";
    document.getElementById("damperPtrCold").setAttribute("transform", "rotate(" + (coolNC ? 90 : 180) + " 581 511)");
    document.getElementById("damperPtrHot").setAttribute("transform", "rotate(" + (hotNO ? 180 : 90) + " 581 231)");

    document.getElementById("teeMark").style.display = two ? "block" : "none";
    document.getElementById("ctrlReadouts").style.display = two ? "block" : "none";
    document.getElementById("actColdL1").textContent = two ? "COLD DECK" : "LINKED";
    document.getElementById("actColdL2").textContent = two ? "ACTUATOR" : "ACTUATOR";

    var needAng = -60 + (state.setpoint - 60) / 20 * 120;
    document.getElementById("tNeedle").setAttribute("transform", "rotate(" + needAng.toFixed(1) + " 1058 292)");

    var zone = document.getElementById("zoneRect");
    var tc = clamp((state.roomTemp - 55) / 30, 0, 1);
    zone.style.fill = "hsla(" + (210 - tc * 202).toFixed(0) + ", 72%, 48%, 0.30)";

    var fr = clamp(state.flow / MAX, 0, 1);
    var fl = document.getElementById("flowLine");
    fl.style.animationDuration = (1.6 - fr * 1.45).toFixed(2) + "s";
    fl.style.opacity = (0.22 + fr * 0.7).toFixed(2);
    var flh = document.getElementById("flowLineHot");
    var hr = clamp(state.hotPct / 100, 0, 1);
    flh.style.animationDuration = (1.6 - hr * 1.45).toFixed(2) + "s";
    flh.style.opacity = (0.16 + hr * 0.72).toFixed(2);

    document.getElementById("compressor").style.opacity = state.mainOn ? "1" : "0.45";
    document.getElementById("mainHeader").style.opacity = state.mainOn ? "1" : "0.45";
    document.getElementById("mainTrunk").style.opacity = state.mainOn ? "1" : "0.45";

    setText("rdComp", mainPSI, !state.mainOn);
    setText("rdDamper", Math.round(state.coldPct) + "%", false);
    setText("rdHot", Math.round(state.hotPct) + "%", false);
    setText("rdActCold", Math.round(state.coldPct) + "%", false);
    setText("rdActHot", two ? Math.round(state.hotPct) + "%" : "linked", false);
    setText("rdFlow", Math.round(state.flow) + " CFM", false);
    setText("rdRoom", state.roomTemp.toFixed(1) + "\u00B0F", false);
    setText("rdTSp", "set " + state.setpoint.toFixed(1) + "\u00B0F", false);
    setText("rdRoomSp", "set " + state.setpoint.toFixed(1) + "\u00B0F", false);
    setText("rdTOut", state.tOut.toFixed(1) + " psi", !state.tHasAir);

    setText("rdMainHot", two && state.mainOn && L.mainHot ? "20 psi" : "0 psi", two && !(state.mainOn && L.mainHot));
    setText("rdMainCold", two && state.mainOn && L.mainCold ? "20 psi" : "0 psi", two && !(state.mainOn && L.mainCold));
    setText("rdTHot", (two ? state.hotT : state.tOut).toFixed(1) + " psi", two && state.hotT <= 0);
    setText("rdTCold", (two ? state.coldT : state.tOut).toFixed(1) + " psi", two && state.coldT <= 0);
    setText("rdBHot", two ? state.hotPct.toFixed(0) + "%" : "\u2014", false);
    setText("rdBCold", two ? state.coldPct.toFixed(0) + "%" : "\u2014", false);

    setText("roMain", mainPSI, !state.mainOn);
    setText("roT", state.tOut.toFixed(1) + " psi", !state.tHasAir);
    setText("roTC", (two ? state.coldT : state.tOut).toFixed(1) + " psi", two && state.coldT <= 0);
    setText("roDamper", Math.round(state.coldPct) + "%", false);
    setText("roHeat", Math.round(state.hotPct) + "%", false);
    setText("roFlow", Math.round(state.flow) + " CFM", false);
    setText("roSupply", state.supplyTemp.toFixed(0) + "\u00B0F", false);
    setText("roRoom", state.roomTemp.toFixed(1) + "\u00B0F", false);

    paintStatus();
  }

  function paintStatus() {
    var L = state.lines, two = state.twoControllers, cls = "ok", msg;
    if (!state.mainOn) {
      cls = "bad"; msg = "Main air is OFF. The box fails to heat \u2014 the cold deck springs closed and the hot deck springs open.";
    } else if (!L.mainTstat) {
      cls = "warn"; msg = "The thermostat has no main air, so its output bleeds to 0 psi.";
    } else if (two) {
      var coldAir = L.mainCold, hotAir = L.mainHot;
      if (!coldAir && !hotAir) {
        cls = "bad"; msg = "Both controllers lost main air (M). The box fails to heat: cold deck closed, hot deck wide open.";
      } else if (!coldAir) {
        cls = "bad"; msg = "The cold deck controller lost main air (M). Its normally-closed actuator springs shut; the hot deck still modulates.";
      } else if (!hotAir) {
        cls = "bad"; msg = "The hot deck controller lost main air (M). Its normally-open actuator springs wide open \u2014 full heat.";
      } else if (!L.tMain || !L.tCold) {
        cls = "warn"; msg = "A thermostat signal leg is unplugged. The affected controller loses reset and its deck fails to its spring.";
      } else if (!L.tHot) {
        cls = "warn"; msg = "The hot controller's signal leg is unplugged \u2014 the hot deck holds LO STAT (maximum flow / heat).";
      } else if (!(L.coldH && L.coldL)) {
        cls = "bad"; msg = "The cold deck sensor is unplugged \u2014 that controller can't measure flow and drives its damper wide open.";
      } else if (!(L.hotH && L.hotL)) {
        cls = "warn"; msg = "The hot deck sensor is unplugged \u2014 that controller drives its damper wide open (heat).";
      } else {
        var d = state.roomTemp - state.setpoint;
        if (d > 0.8) msg = "Normal. The room is warm: the cold deck controller is resetting open and the hot deck is closing.";
        else if (d < -0.8) msg = "Normal. The room is cool: the hot deck controller is resetting open and the cold deck is closing.";
        else msg = "Normal. Two KMC controllers (one per deck) sharing the teed thermostat signal; the box is holding setpoint.";
      }
    } else {
      if (!L.tDirect) { cls = "bad"; msg = "The thermostat-to-actuator line is unplugged. The linked dampers lose air and fail to heat."; }
      else if (L.tMain) { cls = "ok"; msg = "Single-shaft box: no controller \u2014 the pneumatic thermostat drives the two 90\u00B0 opposed dampers directly."; }
      else { cls = "warn"; msg = "The thermostat signal is unplugged."; }
    }
    var panel = document.getElementById("statusPanel");
    panel.className = "panel status " + cls;
    document.getElementById("statusText").textContent = msg;
  }

  function syncControls() {
    document.getElementById("spSl").value = String(state.setpoint);
    document.getElementById("spOut").textContent = state.setpoint.toFixed(1) + "\u00B0F";
    document.getElementById("daDual").classList.toggle("active", state.twoControllers);
    document.getElementById("daSingle").classList.toggle("active", !state.twoControllers);
    document.getElementById("actHint").textContent = state.twoControllers
      ? "Two actuators \u2192 one KMC controller per deck; thermostat signal teed."
      : "Single shaft, 90\u00B0 opposed \u2192 no KMC controller; thermostat drives it directly.";
    document.getElementById("roMainLabel").textContent = state.twoControllers ? "Main air at M" : "Main air";
    var mb = document.getElementById("mainBtn");
    mb.textContent = state.mainOn ? "Cut main air" : "Restore main air";
    mb.classList.toggle("on", !state.mainOn);
  }

  function setActuators(two) { state.twoControllers = two; syncMode(); syncControls(); }
  function setColdAction(a) { state.coldAction = a; }
  function setHotAction(a) { state.hotAction = a; }

  function syncMode() {
    for (var id in els) {
      var m = els[id].mode, show = true;
      if (m === "ctrl") show = state.twoControllers;
      else if (m === "opposed") show = !state.twoControllers;
      els[id].g.style.display = show ? "" : "none";
    }
  }

  function toggleMain() { state.mainOn = !state.mainOn; syncControls(); }
  function reconnectAll() { for (var id in state.lines) state.lines[id] = true; syncLines(); }
  function resetAll() {
    state.mainOn = DEFAULTS.mainOn; state.setpoint = DEFAULTS.setpoint;
    state.roomTemp = DEFAULTS.roomTemp; state.twoControllers = DEFAULTS.twoControllers;
    state.coldAction = DEFAULTS.coldAction; state.hotAction = DEFAULTS.hotAction;
    reconnectAll(); syncMode(); syncControls();
  }

  function init() {
    TUBES.forEach(buildTube);
    syncLines();
    initDeviceArt();
    syncMode();

    document.getElementById("spSl").addEventListener("input", function () {
      state.setpoint = parseFloat(this.value); syncControls();
    });
    document.getElementById("daDual").addEventListener("click", function () { setActuators(true); });
    document.getElementById("daSingle").addEventListener("click", function () { setActuators(false); });
    document.getElementById("mainBtn").addEventListener("click", toggleMain);
    document.getElementById("reconnect").addEventListener("click", reconnectAll);
    document.getElementById("resetAll").addEventListener("click", resetAll);

    var cc = document.getElementById("damperDialCold");
    if (cc) {
      cc.addEventListener("click", function () { setColdAction(state.coldAction === "NC" ? "NO" : "NC"); });
      cc.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setColdAction(state.coldAction === "NC" ? "NO" : "NC"); } });
    }
    var hc = document.getElementById("damperDialHot");
    if (hc) {
      hc.addEventListener("click", function () { setHotAction(state.hotAction === "NO" ? "NC" : "NO"); });
      hc.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setHotAction(state.hotAction === "NO" ? "NC" : "NO"); } });
    }

    var comp = document.getElementById("compressor");
    comp.addEventListener("click", toggleMain);
    comp.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleMain(); } });

    var btn = document.getElementById("themeToggle");
    var saved = null;
    try { saved = localStorage.getItem("pneu-theme"); } catch (e) {}
    var dark = saved ? saved === "dark" : !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    applyTheme(dark);
    btn.addEventListener("click", function () {
      dark = !document.body.classList.contains("theme-dark");
      applyTheme(dark);
      try { localStorage.setItem("pneu-theme", dark ? "dark" : "light"); } catch (e) {}
    });

    syncControls();
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      update(dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function applyTheme(isDark) {
    document.body.classList.toggle("theme-dark", isDark);
    document.getElementById("themeToggle").textContent = isDark ? "Light" : "Dark";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
