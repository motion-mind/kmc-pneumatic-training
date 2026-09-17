(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var tubeLayer = document.getElementById("tubeLayer");

  var MAX = 200, MIN = 50, RESET_START = 8, RESET_SPAN = 5;
  // Actuator response (first-order). Slowed 50% from the previous 0.4 s baseline.
  var ACT_TAU = 0.8;
  var DEFAULTS = { mainOn: true, setpoint: 72, roomTemp: 78, oat: 70, twoControllers: true, coldAction: "NO", hotAction: "NC", series: "3000" };

  var state = {
    mainOn: DEFAULTS.mainOn,
    setpoint: DEFAULTS.setpoint,
    roomTemp: DEFAULTS.roomTemp,
    oat: DEFAULTS.oat,
    twoControllers: DEFAULTS.twoControllers,
    coldAction: DEFAULTS.coldAction,
    hotAction: DEFAULTS.hotAction,
    series: DEFAULTS.series,
    lines: {
      hotH: true, hotL: true, coldH: true, coldL: true,
      hotB: true, coldB: true,
      mainHot: true, mainCold: true, mainTstat: true,
      tMain: true, tHot: true, tCold: true, tDirect: true
    },
    tOut: 9, coldT: 9, hotT: 9, coldPct: 45, hotPct: 0,
    coldFlow: 50, hotFlow: 0, supplyTemp: 55, flow: 50, failHeat: false
  };

  // Both series take a differential velocity signal (two sensor taps), so the
  // same two leads must be landed for either controller.
  function sensorOK(deck) {
    var L = state.lines;
    return L[deck + "H"] && L[deck + "L"];
  }

  // Tube routing differs by controller series: the CSC-2000's ports sit on its
  // face (X/Y velocity at the top, M and B mid-face, T at the bottom), so those
  // runs tuck behind the controller body; the CSC-3000 uses perimeter ports.
  var TUBES = [
    { id: "hotH", points: [[570, 150], [570, 197]], p2000: [[570, 150], [570, 174], [603, 174]], cls: "wire-sensor", name: "hot deck sensor H", mode: "ctrl" },
    { id: "hotL", points: [[607, 150], [607, 185]], p2000: [[607, 150], [607, 198]], cls: "wire-sensor", name: "hot deck sensor L", mode: "ctrl" },
    { id: "coldH", points: [[570, 440], [570, 487]], p2000: [[570, 440], [570, 467], [603, 467]], cls: "wire-sensor", name: "cold deck sensor H", mode: "ctrl" },
    { id: "coldL", points: [[607, 440], [607, 475]], p2000: [[607, 440], [607, 491]], cls: "wire-sensor", name: "cold deck sensor L", mode: "ctrl" },
    { id: "hotB", points: [[541, 237], [460, 237]], p2000: [[616, 237], [460, 237]], cls: "wire-branch", name: "hot deck branch", mode: "ctrl" },
    { id: "coldB", points: [[541, 527], [460, 527]], p2000: [[616, 527], [460, 527]], cls: "wire-branch", name: "cold deck branch", mode: "ctrl" },
    { id: "mainHot", points: [[240, 285], [543, 285]], p2000: [[240, 285], [588, 285], [588, 236]], cls: "wire-main", name: "main air to hot controller", mode: "ctrl" },
    { id: "mainCold", points: [[240, 575], [543, 575]], p2000: [[240, 575], [588, 575], [588, 530]], cls: "wire-main", name: "main air to cold controller", mode: "ctrl" },
    { id: "mainTstat", points: [[1165, 645], [1165, 380]], cls: "wire-main", name: "main air to thermostat" },
    { id: "tMain", points: [[1105, 380], [1105, 400], [1000, 400]], cls: "wire-reset", name: "thermostat output", mode: "ctrl" },
    { id: "tHot", points: [[1000, 400], [1000, 197], [663, 197]], p2000: [[1000, 400], [1000, 292], [596, 292]], cls: "wire-reset", name: "teed signal to hot controller", mode: "ctrl" },
    { id: "tCold", points: [[1000, 400], [1000, 487], [663, 487]], p2000: [[1000, 400], [1000, 588], [596, 588]], cls: "wire-reset", name: "teed signal to cold controller", mode: "ctrl" },
    { id: "tDirect", points: [[1105, 380], [1105, 400], [1000, 400], [1000, 490], [460, 490]], cls: "wire-reset", name: "thermostat to linked actuator", mode: "opposed" }
  ];

  var els = {};

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function actLag(cur, tgt, dt) {
    var v = cur + (tgt - cur) * (1 - Math.exp(-dt / ACT_TAU));
    return Math.abs(tgt - v) < 1 ? tgt : v;
  }
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
    var pts = (state.series === "2000" && t.p2000) ? t.p2000 : t.points;
    var n = pts.length;
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

  // Series changes move the port positions, so the tube geometry is rebuilt.
  function rebuildTubes() {
    while (tubeLayer.firstChild) tubeLayer.removeChild(tubeLayer.firstChild);
    els = {};
    TUBES.forEach(buildTube);
    syncLines();
  }

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

    var coldPct, hotPct, coldT = 0, hotT = 0, failHeat = false, outPsi = tOut;

    if (two) {
      var coldAir = state.mainOn && L.mainCold;
      var hotAir = state.mainOn && L.mainHot;
      var sig = L.tMain && tHasAir;
      // A broken leg on the teed signal is an open bleed: the restrictor can no
      // longer hold the shared line, so both legs collapse. One open leg leaves
      // the other controller with only a small residual; two open = nothing.
      var legsOpen = (L.tHot ? 0 : 1) + (L.tCold ? 0 : 1);
      if (!sig || legsOpen >= 2) outPsi = 0;
      else if (legsOpen === 1) outPsi = Math.round(tOut * 0.2 * 10) / 10;
      coldT = (coldAir && sig && L.tCold) ? outPsi : 0;
      hotT = (hotAir && sig && L.tHot) ? outPsi : 0;

      // The selector sets the actuator type (spring/fail position) AND the drive
      // direction: the correct pairing is cold = N.C., hot = N.O. Setting either
      // selector to the other value reverses that deck's operating direction.
      var fc = clamp((coldT - RESET_START) / RESET_SPAN, 0, 1);
      var coldSP = MIN + fc * (MAX - MIN);
      var coldCmd = coldAir ? clamp(coldSP / MAX * 100, 0, 100) : null;
      if (coldAir && !sensorOK("cold")) coldCmd = 100;
      // The actuator springs are fixed: cold deck is normally CLOSED (fails
      // shut) and hot deck normally OPEN (fails open), so the box fails to
      // heat. The selector's correct pairing is cold = N.O. / hot = N.C.; any
      // other selector position drives that deck's damper backwards.
      var coldTgt;
      if (coldCmd === null) coldTgt = 0;
      else coldTgt = (state.coldAction === "NO") ? coldCmd : (100 - coldCmd);

      var fh = clamp((RESET_START - hotT) / RESET_SPAN, 0, 1);
      var hotSP = fh * MAX;
      var hotCmd = hotAir ? clamp(hotSP / MAX * 100, 0, 100) : null;
      if (hotAir && !sensorOK("hot")) hotCmd = 100;
      var hotTgt;
      if (hotCmd === null) hotTgt = 100;
      else hotTgt = (state.hotAction === "NC") ? hotCmd : (100 - hotCmd);

      // the actuators stroke to the commanded position at a finite rate
      coldPct = actLag(state.coldPct, coldTgt, dt);
      hotPct = actLag(state.hotPct, hotTgt, dt);

      failHeat = !coldAir && !hotAir;
    } else {
      var actAir = state.mainOn && L.mainTstat && L.tDirect;
      var coldTgt2 = actAir ? clamp((tOut - 7) / 5, 0, 1) * 100 : 0;
      coldPct = actLag(state.coldPct, coldTgt2, dt);
      hotPct = 100 - coldPct;
      if (!actAir) failHeat = true;
    }

    var coldFlow = coldPct / 100 * MAX, hotFlow = hotPct / 100 * MAX;
    var flow = coldFlow + hotFlow;
    var supplyTemp = flow > 0 ? (coldFlow * 55 + hotFlow * 95) / flow : 55;
    // Outside air sets the building load: with little airflow the room floats
    // toward (OAT + internal gains); supply air drives it back to the setpoint.
    var freeFloat = state.oat + 12;
    var starved = 1 - clamp(flow / (2 * MAX), 0, 1);
    var target = state.setpoint + (hotFlow - coldFlow) / MAX * 20 + (freeFloat - state.setpoint) * starved;
    state.roomTemp = clamp(state.roomTemp + (target - state.roomTemp) * 1.3 * dt, 45, 98);

    state.tOut = outPsi;
    state.tHasAir = tHasAir;
    state.coldT = coldT;
    state.hotT = hotT;
    state.coldPct = coldPct;
    state.hotPct = hotPct;
    state.coldFlow = coldFlow;
    state.hotFlow = hotFlow;
    state.flow = flow;
    state.supplyTemp = supplyTemp;
    state.failHeat = failHeat;

    paint();
  }

  function setFlowAnim(el, frac) {
    if (!el) return;
    if (frac <= 0.01) {
      el.style.animationPlayState = "paused";
      el.style.opacity = "0";
    } else {
      el.style.animationPlayState = "running";
      el.style.animationDuration = (1.6 - frac * 1.45).toFixed(2) + "s";
      el.style.opacity = (0.2 + frac * 0.72).toFixed(2);
    }
  }

  function paint() {
    var L = state.lines, two = state.twoControllers;
    var mainPSI = state.mainOn ? "20 psi" : "0 psi";

    // Single shaft: the two blades are mounted 90 deg apart, so the hot deck
    // blade tracks the cold deck blade + 90 deg (they stay perpendicular).
    var coldAng = 90 * (1 - state.coldPct / 100);
    var hotAng = two ? (90 * (1 - state.hotPct / 100)) : (coldAng + 90);
    document.getElementById("blade").setAttribute("transform",
      "rotate(" + coldAng.toFixed(1) + " 430 410)");
    document.getElementById("hotBlade").setAttribute("transform",
      "rotate(" + hotAng.toFixed(1) + " 430 120)");

    document.getElementById("hotActuator").style.display = two ? "block" : "none";
    document.getElementById("coldActuator").style.display = two ? "block" : "none";
    document.getElementById("singleActuator").style.display = two ? "none" : "block";
    document.getElementById("opposedNote").style.display = two ? "none" : "block";
    document.getElementById("opposedLink").style.display = two ? "none" : "block";


    // The NO / NC markings are printed on the wheel and rotate with it; the
    // fixed index triangle outside the wheel points at the selected one.
    document.getElementById("damperDialCold").setAttribute("transform", "rotate(" + (state.coldAction === "NO" ? 0 : 90) + " 581 521)");
    document.getElementById("damperDialHot").setAttribute("transform", "rotate(" + (state.hotAction === "NC" ? 90 : 0) + " 581 231)");

    document.getElementById("teeMark").style.display = two ? "block" : "none";
    document.getElementById("ctrlReadouts").style.display = two ? "block" : "none";
    document.getElementById("sensorHot").style.display = two ? "block" : "none";
    document.getElementById("sensorCold").style.display = two ? "block" : "none";

    var needAng = -60 + (state.setpoint - 60) / 20 * 120;
    document.getElementById("tNeedle").setAttribute("transform", "rotate(" + needAng.toFixed(1) + " 1058 292)");

    setFlowAnim(document.getElementById("flowLine"), clamp(state.coldPct / 100, 0, 1));
    setFlowAnim(document.getElementById("flowLineHot"), clamp(state.hotPct / 100, 0, 1));

    document.getElementById("compressor").style.opacity = state.mainOn ? "1" : "0.45";
    document.getElementById("mainHeader").style.opacity = state.mainOn ? "1" : "0.45";
    document.getElementById("mainTrunk").style.display = two ? "block" : "none";
    document.getElementById("mainTrunk").style.opacity = state.mainOn ? "1" : "0.45";

    setText("rdComp", mainPSI, !state.mainOn);
    setText("rdDamper", Math.round(state.coldPct) + "%", false);
    setText("rdHot", Math.round(state.hotPct) + "%", false);
    setText("rdActCold", Math.round(state.coldPct) + "%", false);
    setText("rdActHot", Math.round(state.hotPct) + "%", false);
    setText("rdActSingle", Math.round(state.coldPct) + "%", false);
    setText("rdCfmHot", Math.round(state.hotFlow) + " CFM", false);
    setText("rdCfmCold", Math.round(state.coldFlow) + " CFM", false);
    setText("rdRoomT", "room " + state.roomTemp.toFixed(1) + "\u00B0F", false);
    
    setText("rdTSp", "set " + state.setpoint.toFixed(1) + "\u00B0F", false);
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
    setText("roCfmCold", Math.round(state.coldFlow) + " CFM", false);
    setText("roCfmHot", Math.round(state.hotFlow) + " CFM", false);
    setText("roSupply", state.supplyTemp.toFixed(0) + "\u00B0F", false);
    setText("roRoom", state.roomTemp.toFixed(1) + "\u00B0F", false);
    setText("roAction", "cold " + (state.coldAction === "NO" ? "N.O." : "N.C.") + " / hot " + (state.hotAction === "NC" ? "N.C." : "N.O."), false);

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
      } else if (!L.tMain) {
        cls = "bad"; msg = "The thermostat output line is unplugged \u2014 both controllers lose reset and the box fails to heat.";
      } else if (!L.tHot && !L.tCold) {
        cls = "bad"; msg = "Both teed signal legs are open \u2014 nothing reaches either controller, so the box fails to heat.";
      } else if (!L.tHot || !L.tCold) {
        cls = "warn"; msg = "A teed signal leg is broken. That open bleed collapses the shared line to ~" + state.tOut.toFixed(1) + " psi, so BOTH controllers lose most of their reset (the unbroken deck drops toward LO STAT).";
      } else if (!sensorOK("cold")) {
        cls = "bad"; msg = "The cold deck sensor is unplugged \u2014 that controller can't measure flow and drives its damper wide open.";
      } else if (!sensorOK("hot")) {
        cls = "warn"; msg = "The hot deck sensor is unplugged \u2014 that controller drives its damper wide open (heat).";
      } else {
        var d = state.roomTemp - state.setpoint;
        if (d > 0.8) msg = "Normal. The room is warm: the cold deck controller is resetting open and the hot deck is closing.";
        else if (d < -0.8) msg = "Normal. The room is cool: the hot deck controller is resetting open and the cold deck is closing.";
        else msg = "Normal. Two KMC controllers (one per deck) sharing the teed thermostat signal; the box is holding setpoint.";
        if (state.series === "2000") msg += " Both CSC-2000 controllers are direct acting, so the hot deck's branch signal is inverted by the RCC-1012 reversing relay before it reaches the actuator.";
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
    document.getElementById("oatSl").value = String(state.oat);
    document.getElementById("oatOut").textContent = state.oat.toFixed(0) + "\u00B0F";
    document.getElementById("daDual").classList.toggle("active", state.twoControllers);
    document.getElementById("daSingle").classList.toggle("active", !state.twoControllers);
    document.getElementById("actHint").textContent = state.twoControllers
      ? "Two actuators \u2192 one KMC controller per deck; thermostat signal teed."
      : "Single shaft, 90\u00B0 opposed \u2192 no KMC controller; thermostat drives it directly.";
    document.getElementById("cs3000").classList.toggle("active", state.series === "3000");
    document.getElementById("cs2000").classList.toggle("active", state.series === "2000");
    document.getElementById("csHint").textContent = state.series === "3000"
      ? "CSC-3000 \u2014 universal reset volume controller (direct / reverse acting, H + L sensor ports)."
      : "CSC-2000 (CSC-2003) \u2014 direct acting only, with the velocity sensor landed at X/Y. The hot deck needs the RCC-1012 reversing relay to invert its 3\u201315 psi branch signal.";
    document.getElementById("roMainLabel").textContent = state.twoControllers ? "Main air at M" : "Main air";
    var mb = document.getElementById("mainBtn");
    mb.textContent = state.mainOn ? "Cut main air" : "Restore main air";
    mb.classList.toggle("on", !state.mainOn);
  }

  function setActuators(two) {
    if (state.series === "2000" && !two) { state.series = "3000"; } state.twoControllers = two; syncMode(); syncControls(); }
  function setColdAction(a) { state.coldAction = a; }
  function setHotAction(a) { state.hotAction = a; }

  function syncMode() {
    var two = state.twoControllers, csc2 = state.series === "2000";
    for (var id in els) {
      var m = els[id].mode, show = true;
      if (m === "ctrl") show = two;
      else if (m === "opposed") show = !two;
      els[id].g.style.display = show ? "" : "none";
    }
    document.getElementById("ctrlCold").style.display = (two && !csc2) ? "block" : "none";
    document.getElementById("ctrlHot").style.display = (two && !csc2) ? "block" : "none";
    document.getElementById("ctrlCold2").style.display = (two && csc2) ? "block" : "none";
    document.getElementById("ctrlHot2").style.display = (two && csc2) ? "block" : "none";
    document.getElementById("relayHot").style.display = (two && csc2) ? "block" : "none";
    document.getElementById("csc2Front").style.display = (two && csc2) ? "block" : "none";
    // The teed-signal readouts ride the tube, whose y depends on the series.
    document.getElementById("rdTHot").setAttribute("y", csc2 ? "282" : "188");
    document.getElementById("rdTCold").setAttribute("y", csc2 ? "578" : "478");
  }

  function updateTubeStyle() {}

  function setSeries(v) { state.series = v; rebuildTubes(); syncMode(); syncControls(); }

  function toggleMain() { state.mainOn = !state.mainOn; syncControls(); }
  function reconnectAll() { for (var id in state.lines) state.lines[id] = true; syncLines(); }
  function resetAll() {
    state.mainOn = DEFAULTS.mainOn; state.setpoint = DEFAULTS.setpoint;
    state.roomTemp = DEFAULTS.roomTemp; state.oat = DEFAULTS.oat; state.twoControllers = DEFAULTS.twoControllers;
    state.coldAction = DEFAULTS.coldAction; state.hotAction = DEFAULTS.hotAction;
    if (state.series !== DEFAULTS.series) { state.series = DEFAULTS.series; reconnectAll(); rebuildTubes(); }
    else reconnectAll();
    syncMode(); syncControls();
  }

  function init() {
    TUBES.forEach(buildTube);
    syncLines();
    initDeviceArt();
    syncMode();

    document.getElementById("spSl").addEventListener("input", function () {
      state.setpoint = parseFloat(this.value); syncControls();
    });
    document.getElementById("oatSl").addEventListener("input", function () {
      state.oat = parseFloat(this.value); syncControls();
    });
    document.getElementById("daDual").addEventListener("click", function () { setActuators(true); });
    document.getElementById("daSingle").addEventListener("click", function () { setActuators(false); });
    document.getElementById("cs3000").addEventListener("click", function () { setSeries("3000"); });
    document.getElementById("cs2000").addEventListener("click", function () { setSeries("2000"); });
    document.getElementById("mainBtn").addEventListener("click", toggleMain);
    document.getElementById("reconnect").addEventListener("click", reconnectAll);
    document.getElementById("resetAll").addEventListener("click", resetAll);

    var cc = document.getElementById("damperDialCold");
    if (cc) {
      cc.addEventListener("click", function () { setColdAction(state.coldAction === "NO" ? "NC" : "NO"); });
      cc.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setColdAction(state.coldAction === "NO" ? "NC" : "NO"); } });
    }
    var hc = document.getElementById("damperDialHot");
    if (hc) {
      hc.addEventListener("click", function () { setHotAction(state.hotAction === "NC" ? "NO" : "NC"); });
      hc.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setHotAction(state.hotAction === "NC" ? "NO" : "NC"); } });
    }

    var dial = document.getElementById("tstatDial");
    if (dial) {
      var dragging = false;
      function setFromPointer(evt) {
        var box = document.getElementById("sim").getBoundingClientRect();
        var x = (evt.clientX - box.left) / box.width * 1250;
        var y = (evt.clientY - box.top) / box.height * 700;
        var ang = clamp(Math.atan2(x - 1058, -(y - 292)) * 180 / Math.PI, -60, 60);
        state.setpoint = Math.round((60 + (ang + 60) / 120 * 20) * 2) / 2;
        syncControls();
      }
      dial.addEventListener("pointerdown", function (e) {
        dragging = true;
        if (dial.setPointerCapture) { try { dial.setPointerCapture(e.pointerId); } catch (err) {} }
        setFromPointer(e);
      });
      dial.addEventListener("pointermove", function (e) { if (dragging) setFromPointer(e); });
      dial.addEventListener("pointerup", function () { dragging = false; });
      dial.addEventListener("pointercancel", function () { dragging = false; });
      dial.addEventListener("keydown", function (e) {
        var d = 0;
        if (e.key === "ArrowUp" || e.key === "ArrowRight") d = 0.5;
        else if (e.key === "ArrowDown" || e.key === "ArrowLeft") d = -0.5;
        if (d) { state.setpoint = clamp(state.setpoint + d, 60, 80); syncControls(); e.preventDefault(); }
      });
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
