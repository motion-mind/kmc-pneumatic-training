(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var svg = document.getElementById("sim");
  var tubeLayer = document.getElementById("tubeLayer");

  var MAX = 1200, MIN = 300, RESET_START = 8, RESET_SPAN = 5;
  var DEFAULTS = { mainOn: true, resetType: "direct", setpoint: 72, roomTemp: 78, terminalType: "reheat", damperAction: "NO", dualActuators: true };

  var state = {
    mainOn: DEFAULTS.mainOn,
    resetType: DEFAULTS.resetType,
    setpoint: DEFAULTS.setpoint,
    roomTemp: DEFAULTS.roomTemp,
    terminalType: DEFAULTS.terminalType,
    damperAction: DEFAULTS.damperAction,
    dualActuators: DEFAULTS.dualActuators,
    lines: {
      mainToThermostat: true,
      mainToController: true,
      tLine: true,
      bLine: true,
      hLine: true,
      lLine: true,
      reheatLine: true,
      hotLine: true
    },
    main: 20, tOut: 9, tAtCtrl: 9, flowSP: 540, bPsi: 6.6, actPsi: 6.6,
    damper: 45, coldPct: 45, hotPct: 0, reheatPct: 0, supplyTemp: 55,
    flow: 540, dp: 0.25, sensorOK: true, ctrlHasAir: true, tHasAir: true, failHeat: false
  };

  var TUBES = [
    { id: "mainToThermostat", points: [[910, 516], [910, 456]], cls: "wire-main", name: "main air to thermostat" },
    { id: "mainToController", points: [[520, 516], [520, 420], [558, 420]], cls: "wire-main", name: "main air to controller" },
    { id: "tLine", points: [[678, 332], [678, 282], [880, 282], [880, 320]], cls: "wire-reset", name: "reset signal to controller" },
    { id: "bLine", points: [[556, 372], [450, 372]], cls: "wire-branch", name: "branch to actuator" },
    { id: "hLine", points: [[585, 250], [585, 332]], cls: "wire-sensor", name: "sensor H line" },
    { id: "lLine", points: [[622, 250], [622, 320]], cls: "wire-sensor", name: "sensor L line" },
    { id: "reheatLine", points: [[535, 420], [288, 420], [288, 300]], cls: "wire-heat", name: "reheat branch", mode: "reheat" },
    { id: "hotLine", points: [[725, 340], [786, 340], [786, 56], [450, 56]], cls: "wire-heat", name: "hot deck branch", mode: "dual" }
  ];

  var els = {};

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function polar(cx, cy, r, deg) {
    var a = deg * Math.PI / 180;
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  }

  function seg(cls, x1, y1, x2, y2) {
    var l = document.createElementNS(NS, "line");
    l.setAttribute("class", cls);
    l.setAttribute("x1", x1.toFixed(1)); l.setAttribute("y1", y1.toFixed(1));
    l.setAttribute("x2", x2.toFixed(1)); l.setAttribute("y2", y2.toFixed(1));
    return l;
  }

  function initDeviceArt() {
    var i, a, p1, p2, p;

    var gs = document.getElementById("tstatScale");
    if (gs) {
      for (a = -60; a <= 60; a += 15) {
        var major = (a % 30 === 0);
        p1 = polar(834, 370, 26, a);
        p2 = polar(834, 370, major ? 31.5 : 30, a);
        gs.appendChild(seg("tstat-tick" + (major ? " major" : ""), p1[0], p1[1], p2[0], p2[1]));
      }
      [-60, -30, 0, 30, 60].forEach(function (ang) {
        var pt = polar(834, 370, 20.5, ang);
        var t = document.createElementNS(NS, "text");
        t.setAttribute("class", "tstat-num");
        t.setAttribute("x", pt[0].toFixed(1));
        t.setAttribute("y", (pt[1] + 2.8).toFixed(1));
        t.textContent = String(60 + (ang + 60) / 120 * 20);
        gs.appendChild(t);
      });
    }

  }

  function buildTube(t) {
    var pts = t.points;
    var n = pts.length;
    var last = pts[n - 1];
    var prev = pts[n - 2] || pts[0];
    var dx = last[0] - prev[0], dy = last[1] - prev[1];
    var len = Math.hypot(dx, dy) || 1;
    var ux = dx / len, uy = dy / len;
    var retract = [last[0] - ux * 22, last[1] - uy * 22];

    function pathTo(endPt) {
      var d = "M" + pts[0][0] + " " + pts[0][1];
      for (var i = 1; i < n - 1; i++) d += " L" + pts[i][0] + " " + pts[i][1];
      return d + " L" + endPt[0] + " " + endPt[1];
    }

    var g = document.createElementNS(NS, "g");
    g.setAttribute("class", "tube " + t.cls);
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", "Plug or unplug " + t.name);

    function mk(tag, cls, attrs) {
      var e = document.createElementNS(NS, tag);
      e.setAttribute("class", cls);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }

    var port = mk("circle", "port", { cx: last[0], cy: last[1], r: 5 });
    var wire = mk("path", "wire", { d: pathTo(last) });
    var cap = mk("circle", "plug-cap", { cx: last[0], cy: last[1], r: 5.5 });
    var hit = mk("path", "hit", { d: pathTo(last) });

    g.appendChild(port); g.appendChild(wire); g.appendChild(cap); g.appendChild(hit);
    tubeLayer.appendChild(g);

    els[t.id] = { g: g, wire: wire, cap: cap, port: port, pathTo: pathTo, last: last, retract: retract, mode: t.mode || "always" };

    function toggle() { setLine(t.id, !state.lines[t.id]); }
    g.addEventListener("click", toggle);
    g.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); }
    });
  }

  function setLine(id, on) {
    state.lines[id] = on;
    var T = els[id];
    var end = on ? T.last : T.retract;
    T.wire.setAttribute("d", T.pathTo(end));
    T.cap.setAttribute("cx", end[0]);
    T.cap.setAttribute("cy", end[1]);
    T.g.classList.toggle("off", !on);
    T.g.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function syncLines() {
    for (var id in els) setLine(id, state.lines[id]);
  }

  function setText(id, txt, bad) {
    var e = document.getElementById(id);
    if (!e) return;
    e.textContent = txt;
    e.classList.toggle("bad", !!bad);
  }

  function update(dt) {
    var L = state.lines;
    state.main = state.mainOn ? 20 : 0;

    var tHasAir = state.mainOn && L.mainToThermostat;
    var tOut = tHasAir ? clamp(9 + (state.roomTemp - state.setpoint) * 1.2, 3, 15) : 0;

    var ctrlHasAir = state.mainOn && L.mainToController;
    var tAtCtrl = (ctrlHasAir && L.tLine) ? tOut : 0;

    var frac = clamp((tAtCtrl - RESET_START) / RESET_SPAN, 0, 1);
    var flowSP = state.resetType === "direct" ? MIN + frac * (MAX - MIN)
                                             : MAX - frac * (MAX - MIN);

    var sensorOK = L.hLine && L.lLine;
    var dual = state.terminalType === "dual";
    var failHeat = !state.mainOn || !L.mainToController || !L.bLine;

    var coolCmd;
    if (!ctrlHasAir || !sensorOK) coolCmd = 100;
    else coolCmd = clamp(flowSP / MAX * 100, 5, 100);

    var e = state.roomTemp - state.setpoint;
    var coldFail = (state.damperAction === "NO") ? 100 : 0;
    var coldPct, hotPct, reheatPct;

    if (dual) {
      reheatPct = 0;
      if (state.dualActuators) {
        coldPct = failHeat ? 0 : clamp(0.5 + e * 0.4, 0, 1) * 100;
        hotPct = failHeat ? 100 : (L.hotLine ? clamp(0.5 - e * 0.4, 0, 1) * 100 : 100);
      } else {
        coldPct = failHeat ? 0 : clamp(0.5 + e * 0.4, 0, 1) * 100;
        hotPct = 100 - coldPct;
      }
    } else {
      reheatPct = (failHeat || !L.reheatLine) ? 100 : clamp((state.setpoint - state.roomTemp - 0.5) / 3, 0, 1) * 100;
      coldPct = failHeat ? coldFail : coolCmd;
      hotPct = 0;
    }

    var coldFlow = coldPct / 100 * MAX;
    var hotFlow = hotPct / 100 * MAX;
    var flow = coldFlow + hotFlow;

    var supplyTemp;
    if (dual) {
      supplyTemp = flow > 0 ? (coldFlow * 55 + hotFlow * 95) / flow : 55;
    } else {
      supplyTemp = 55 + (reheatPct / 100) * 45;
    }

    var bPsi = ctrlHasAir ? 3 + coldPct / 100 * 12 : 0;
    var actPsi = L.bLine ? bPsi : 0;
    var dp = sensorOK ? 0.5 * Math.pow(clamp(flow / MAX, 0, 1), 2) : 0;

    var target = dual ? 80 + (hotFlow - coldFlow) / MAX * 22
                      : 85 - (flow / MAX) * 30 + (reheatPct / 100) * 25;
    state.roomTemp = clamp(state.roomTemp + (target - state.roomTemp) * 1.3 * dt, 45, 98);

    state.tHasAir = tHasAir;
    state.ctrlHasAir = ctrlHasAir;
    state.sensorOK = sensorOK;
    state.failHeat = failHeat;
    state.tOut = tOut;
    state.tAtCtrl = tAtCtrl;
    state.flowSP = flowSP;
    state.bPsi = bPsi;
    state.actPsi = actPsi;
    state.coldPct = coldPct;
    state.hotPct = hotPct;
    state.reheatPct = reheatPct;
    state.damper = coldPct;
    state.flow = flow;
    state.supplyTemp = supplyTemp;
    state.dp = dp;

    paint();
  }

  function paint() {
    var L = state.lines;
    var mainPSI = state.mainOn ? "20 psi" : "0 psi";

    setText("rdComp", mainPSI, !state.mainOn);
    setText("rdMainTstat", (state.mainOn && L.mainToThermostat) ? "20 psi" : "0 psi", !(state.mainOn && L.mainToThermostat));
    setText("rdMainCtrl", (state.mainOn && L.mainToController) ? "20 psi" : "0 psi", !(state.mainOn && L.mainToController));

    setText("rdTOut", state.tOut.toFixed(1) + " psi", !state.tHasAir);
    setText("rdT", state.tAtCtrl.toFixed(1) + " psi", state.tAtCtrl <= 0);
    setText("rdB", state.bPsi.toFixed(1) + " psi", !state.ctrlHasAir);
    setText("rdAct", state.actPsi.toFixed(1) + " psi", state.actPsi <= 0);
    setText("rdDp", "\u0394P " + state.dp.toFixed(2) + " in wc", !state.sensorOK);
    var dual = state.terminalType === "dual";

    setText("rdDamper", Math.round(state.coldPct) + "%", false);
    setText("rdReheat", Math.round(state.reheatPct) + "%", state.failHeat);
    setText("rdHot", Math.round(state.hotPct) + "%", state.failHeat);
    setText("rdFlow", Math.round(state.flow) + " CFM", false);
    setText("rdRoom", state.roomTemp.toFixed(1) + "\u00B0F", false);
    setText("rdTSp", "set " + state.setpoint.toFixed(1) + "\u00B0F", false);
    setText("rdRoomSp", "set " + state.setpoint.toFixed(1) + "\u00B0F", false);

    document.getElementById("blade").setAttribute("transform",
      "rotate(" + (90 * (1 - state.coldPct / 100)).toFixed(1) + " 390 210)");
    document.getElementById("hotBlade").setAttribute("transform",
      "rotate(" + (90 * (state.hotPct / 100)).toFixed(1) + " 390 129)");

    document.getElementById("reheatGroup").style.display = dual ? "none" : "block";
    document.getElementById("dualGroup").style.display = dual ? "block" : "none";
    document.getElementById("hotActuator").style.display = (dual && state.dualActuators) ? "block" : "none";
    document.getElementById("opposedNote").style.display = (dual && !state.dualActuators) ? "block" : "none";
    document.getElementById("opposedLink").style.display = (dual && !state.dualActuators) ? "block" : "none";

    var nc = state.damperAction === "NC";
    document.getElementById("damperPtr").setAttribute("transform",
      "rotate(" + (nc ? 90 : 180) + " 596 376)");
    setText("roAction", nc ? "N.C." : "N.O.", false);

    var needAng = -60 + (state.setpoint - 60) / 20 * 120;
    document.getElementById("tNeedle").setAttribute("transform",
      "rotate(" + needAng.toFixed(1) + " 834 370)");

    var zone = document.getElementById("zoneRect");
    var tc = clamp((state.roomTemp - 55) / 30, 0, 1);
    zone.style.fill = "hsla(" + (210 - tc * 202).toFixed(0) + ", 72%, 48%, 0.30)";

    var fl = document.getElementById("flowLine");
    var fr = clamp(state.flow / MAX, 0, 1);
    fl.style.animationDuration = (1.6 - fr * 1.45).toFixed(2) + "s";
    fl.style.opacity = (0.22 + fr * 0.7).toFixed(2);

    setText("ductLabel", dual ? "COLD DECK" : "SUPPLY DUCT", false);
    var flh = document.getElementById("flowLineHot");
    if (flh) {
      var hr = clamp(state.hotPct / 100, 0, 1);
      flh.style.animationDuration = (1.6 - hr * 1.45).toFixed(2) + "s";
      flh.style.opacity = (0.16 + hr * 0.72).toFixed(2);
    }

    document.getElementById("compressor").style.opacity = state.mainOn ? "1" : "0.45";
    document.getElementById("mainHeader").style.opacity = state.mainOn ? "1" : "0.45";

    setText("roMain", mainPSI, !state.mainOn);
    setText("roT", state.tOut.toFixed(1) + " psi", !state.tHasAir);
    setText("roTC", state.tAtCtrl.toFixed(1) + " psi", state.tAtCtrl <= 0);
    setText("roB", state.bPsi.toFixed(1) + " psi", !state.ctrlHasAir);
    setText("roDamper", Math.round(state.coldPct) + "%", false);
    setText("roHeat", Math.round(dual ? state.hotPct : state.reheatPct) + "%", state.failHeat);
    setText("roFlow", Math.round(state.flow) + " CFM", false);
    setText("roDp", state.dp.toFixed(2) + " in wc", !state.sensorOK);
    setText("roSupply", state.supplyTemp.toFixed(0) + "\u00B0F", false);
    setText("roRoom", state.roomTemp.toFixed(1) + "\u00B0F", false);
    document.getElementById("roHeatLabel").textContent = dual ? "Hot damper" : "Reheat";

    paintStatus();
  }

  function paintStatus() {
    var L = state.lines, cls = "ok", msg;
    var dual = state.terminalType === "dual";
    var heatName = dual ? "hot-deck damper" : "reheat valve";
    if (state.failHeat) {
      cls = "bad";
      if (!state.mainOn) {
        msg = "Main air is OFF. The terminal fails to heat \u2014 the cold damper springs closed and the " + heatName + " goes wide open.";
      } else if (!L.mainToController) {
        msg = "No main air at the controller (port M). The terminal fails to heat: cold damper closed, " + heatName + " wide open.";
      } else {
        msg = "The branch line (port B) is unplugged. The cold damper loses air and springs closed \u2014 the terminal fails to heat.";
      }
    } else if (!L.mainToThermostat) {
      cls = "warn";
      msg = "The thermostat has no main air, so its output bleeds to 0 psi. The controller reads no reset signal and holds LO STAT.";
    } else if (!L.tLine) {
      cls = "warn";
      msg = "The reset line (port T) is unplugged. The controller sees 0 psi and holds LO STAT.";
    } else if (!L.hLine || !L.lLine) {
      cls = "bad";
      msg = "A flow-sensor line (H or L) is unplugged. The controller can\u2019t measure velocity pressure, so it drives the cold damper wide open chasing a flow it can\u2019t read.";
    } else if (dual && !L.hotLine) {
      cls = "warn";
      msg = "The hot-deck branch is unplugged. The hot-deck damper loses air and fails open \u2014 heating, with reheat-style control lost.";
    } else if (!dual && !L.reheatLine) {
      cls = "warn";
      msg = "The reheat branch is unplugged. The normally-open reheat valve loses air and fails open \u2014 full heat on minimum airflow.";
    } else if (state.resetType === "reverse") {
      cls = "warn";
      msg = "Reverse reset with a direct-acting thermostat controls backwards: a warm room calls for LESS air, so the loop runs away.";
    } else {
      var d = state.roomTemp - state.setpoint;
      if (dual) {
        if (d > 0.8) msg = "Normal. The room is warm, so the cold damper is opening and the hot deck is closing.";
        else if (d < -0.8) msg = "Normal. The room is cool, so the hot-deck damper is opening and the cold damper is closing.";
        else msg = "Normal. The dual-duct terminal is mixing to hold the room near setpoint. Loss of control air will fail it to heat.";
      } else {
        if (d > 0.8) msg = "Normal. The room is above setpoint, so the box resets toward maximum cooling flow.";
        else if (d < -0.8) msg = "Normal. The room is cool, so reheat is taking over on minimum airflow.";
        else msg = "Normal. The terminal is holding the room near setpoint. Loss of control air will fail it to heat.";
      }
    }
    var panel = document.getElementById("statusPanel");
    panel.className = "panel status " + cls;
    document.getElementById("statusText").textContent = msg;
  }

  function syncControls() {
    document.getElementById("spSl").value = String(state.setpoint);
    document.getElementById("spOut").textContent = state.setpoint.toFixed(1) + "\u00B0F";
    document.getElementById("rtDirect").classList.toggle("active", state.resetType === "direct");
    document.getElementById("rtReverse").classList.toggle("active", state.resetType === "reverse");
    document.getElementById("rtHint").textContent = state.resetType === "direct"
      ? "Cooling air + direct-acting thermostat = Direct reset (correct)."
      : "Cooling air + reverse-acting thermostat = Reverse reset. With our direct thermostat this is wrong on purpose.";
    var dual = state.terminalType === "dual";
    document.getElementById("ttReheat").classList.toggle("active", !dual);
    document.getElementById("ttDual").classList.toggle("active", dual);
    document.getElementById("ttHint").textContent = dual
      ? "Dual duct: hot + cold decks mix. Loss of control air fails to heat (cold closes, hot opens)."
      : "Single duct + hot-water reheat coil. Loss of control air fails to heat (damper closes, reheat opens).";
    var mb = document.getElementById("mainBtn");
    mb.textContent = state.mainOn ? "Cut main air" : "Restore main air";
    mb.classList.toggle("on", !state.mainOn);
    document.getElementById("dualActCtl").style.display = dual ? "" : "none";
    document.getElementById("daDual").classList.toggle("active", state.dualActuators);
    document.getElementById("daSingle").classList.toggle("active", !state.dualActuators);
  }

  function setActuators(v) { state.dualActuators = v; syncMode(); syncControls(); }

  function toggleDamperAction() {
    state.damperAction = state.damperAction === "NO" ? "NC" : "NO";
    syncControls();
  }

  function setTerminal(t) { state.terminalType = t; syncMode(); syncControls(); }

  function syncMode() {
    var dual = state.terminalType === "dual";
    for (var id in els) {
      var m = els[id].mode, show;
      if (m === "always") show = true;
      else if (m === "dual") show = dual;
      else show = !dual;
      if (id === "hotLine") show = dual && state.dualActuators;
      els[id].g.style.display = show ? "" : "none";
    }
    var rg = document.getElementById("reheatGroup");
    var dg = document.getElementById("dualGroup");
    if (rg) rg.style.display = dual ? "none" : "block";
    if (dg) dg.style.display = dual ? "block" : "none";
  }

  function setResetType(t) { state.resetType = t; syncControls(); }

  function toggleMain() { state.mainOn = !state.mainOn; syncControls(); }

  function reconnectAll() {
    for (var id in state.lines) state.lines[id] = true;
    syncLines();
  }

  function resetAll() {
    state.mainOn = DEFAULTS.mainOn;
    state.resetType = DEFAULTS.resetType;
    state.setpoint = DEFAULTS.setpoint;
    state.roomTemp = DEFAULTS.roomTemp;
    state.terminalType = DEFAULTS.terminalType;
    state.damperAction = DEFAULTS.damperAction;
    state.dualActuators = DEFAULTS.dualActuators;
    reconnectAll();
    syncMode();
    syncControls();
  }

  function init() {
    TUBES.forEach(buildTube);
    syncLines();
    initDeviceArt();
    syncMode();

    document.getElementById("spSl").addEventListener("input", function () {
      state.setpoint = parseFloat(this.value);
      syncControls();
    });
    document.getElementById("rtDirect").addEventListener("click", function () { setResetType("direct"); });
    document.getElementById("rtReverse").addEventListener("click", function () { setResetType("reverse"); });
    document.getElementById("ttReheat").addEventListener("click", function () { setTerminal("reheat"); });
    document.getElementById("ttDual").addEventListener("click", function () { setTerminal("dual"); });
    document.getElementById("daDual").addEventListener("click", function () { setActuators(true); });
    document.getElementById("daSingle").addEventListener("click", function () { setActuators(false); });
    var dd = document.getElementById("damperDial");
    dd.addEventListener("click", toggleDamperAction);
    dd.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleDamperAction(); }
    });
    document.getElementById("mainBtn").addEventListener("click", toggleMain);
    document.getElementById("reconnect").addEventListener("click", reconnectAll);
    document.getElementById("resetAll").addEventListener("click", resetAll);

    var comp = document.getElementById("compressor");
    comp.addEventListener("click", toggleMain);
    comp.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleMain(); }
    });

    var btn = document.getElementById("themeToggle");
    var saved = null;
    try { saved = localStorage.getItem("pneu-theme"); } catch (e) {}
    var dark = saved ? saved === "dark"
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    applyTheme(dark);
    btn.addEventListener("click", function () {
      dark = !document.body.classList.contains("theme-dark");
      applyTheme(dark);
      try { localStorage.setItem("pneu-theme", dark ? "dark" : "light"); } catch (e) {}
    });

    syncControls();

    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
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
