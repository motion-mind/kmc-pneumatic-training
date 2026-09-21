(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var tubeLayer = document.getElementById("tubeLayer");

  var MAX = 200, MIN = 50, RESET_START = 8, RESET_SPAN = 5;
  // Thermostat setpoint range and the dial's mechanical sweep either side of 12 o'clock.
  var SP_MIN = 55, SP_MAX = 95, SP_SWEEP = 135;
  // The room is bounded whatever the box does.
  var ROOM_MIN = 65, ROOM_MAX = 80;
  // Deck supply temperatures: cold deck 55 F, hot deck 80 F.
  var COLD_DECK_T = 55, HOT_DECK_T = 80;   // 270-degree sweep, gap at the bottom
  // Dial graduations: a minor notch every TICK_STEP degF, a long notch and a
  // number every LABEL_STEP.  Entry resolution is coarser than the notches
  // (see SP_STEP) so the readout still lands on clean half degrees.
  var TICK_STEP = 2.5, LABEL_STEP = 10, SP_STEP = 0.5;
  function spFromAngle(ang) {
    return SP_MIN + (ang + SP_SWEEP) / (2 * SP_SWEEP) * (SP_MAX - SP_MIN);
  }
  function angleFromSp(sp) {
    return -SP_SWEEP + (sp - SP_MIN) / (SP_MAX - SP_MIN) * (2 * SP_SWEEP);
  }
  // Actuator response (first-order). Slowed 50% from the previous 0.4 s baseline.
  var ACT_TAU = 0.8;
  // Global emulator rate. 0.5 = half speed: every rate (actuator stroke, room
  // response) is driven off dt, so scaling dt here slows the whole thing.
  var TIME_SCALE = 0.5;
  var DEFAULTS = { mainOn: true, setpoint: 72, roomTemp: 78, twoControllers: true, coldAction: "NO", hotAction: "NC", series: "3000" };

  var state = {
    mainOn: DEFAULTS.mainOn,
    setpoint: DEFAULTS.setpoint,
    roomTemp: DEFAULTS.roomTemp,
    twoControllers: DEFAULTS.twoControllers,
    coldAction: DEFAULTS.coldAction,
    hotAction: DEFAULTS.hotAction,
    series: DEFAULTS.series,
    lines: {
      hotH: true, hotL: true, coldH: true, coldL: true,
      hotB: true, coldB: true,
      mainHot: true, mainCold: true, mainTstat: true,
      tMain: true, tHot: true, tCold: true, tDirect: true, hotAct: true
    },
    trunkPSI: 20, hotPSI: 20, coldPSI: 20, statPSI: 20,
    tOut: 9, coldT: 9, hotT: 9, coldPct: 45, hotPct: 0,
    coldFlow: 50, hotFlow: 0, supplyTemp: 55, flow: 50, failHeat: false
  };

  // Both series take a differential velocity signal (two sensor taps), so the
  // same two leads must be landed for either controller.
  function sensorOK(deck) {
    var L = state.lines;
    return L[deck + "H"] && L[deck + "L"];
  }

  // ---- tube routing -------------------------------------------------------
  // The controller end of every tube is read straight from the controller spec
  // (Controllers.anchor), so retuning the artwork in js/controllers.js moves the
  // tubing with it.  The other end is fixed plant: probes, actuators, tee.
  var PORTMAP = {
    csc3000: { hi: "H", lo: "L", branch: "B", main: "M", stat: "T" },
    csc2000: { hi: "X", lo: "Y", branch: "B", main: "M", stat: "T" }
  };

  // Sensor tap positions. These follow the controller's H and L ports so the
  // probe body stays centred between them and the leads drop straight in.
  var PROBE = { hot: { hi: [570, 150], lo: [607, 150] },
                cold: { hi: [570, 440], lo: [607, 440] } };
  // The CSC-2000's velocity ports (X/Y) are stacked on one axis, so there is
  // nothing to centre between — keep the stock probe spacing there.
  var PROBE_FIXED = { hot: { hi: [570, 150], lo: [607, 150] },
                      cold: { hi: [570, 440], lo: [607, 440] } };
  var ACTUATOR_X = 460, TEE = [1000, 400], TRUNK_X = 240;

  function activeModel() { return state.series === "2000" ? "csc2000" : "csc3000"; }

  function probeTaps(deck) {
    var y = deck === "hot" ? 150 : 440;
    if (state.series === "2000") {
      return { hi: [PROBE_FIXED[deck].hi[0], y], lo: [PROBE_FIXED[deck].lo[0], y] };
    }
    var hi = Controllers.anchor("csc3000", deck, "H");
    var lo = Controllers.anchor("csc3000", deck, "L");
    if (!hi || !lo) return { hi: [PROBE[deck].hi[0], y], lo: [PROBE[deck].lo[0], y] };
    return { hi: [hi.x, y], lo: [lo.x, y] };
  }

  function rebuildProbe() {
    ["hot", "cold"].forEach(function (deck) {
      var t = probeTaps(deck);
      PROBE[deck].hi = t.hi;
      PROBE[deck].lo = t.lo;
    });
  }

  // Move the drawn sensor so its probe sits midway between the H and L ports.
  // Probe body = the vertical averaging probe plus its sensing points; the two
  // taps land on the port positions and the lead spans between them.
  function positionSensor(deck) {
    var g = document.getElementById(deck === "hot" ? "sensorHot" : "sensorCold");
    if (!g || typeof Controllers === "undefined") return;
    var t = probeTaps(deck);
    var hi = { x: t.hi[0] }, lo = { x: t.lo[0] };
    var mid = (hi.x + lo.x) / 2, taps = [], k;
    for (k = 0; k < g.children.length; k++) {
      var c = g.children[k];
      var cls = (c.getAttribute && c.getAttribute("class")) || "";
      if (cls.indexOf("sensor-probe") === 0) {
        c.setAttribute("x1", mid); c.setAttribute("x2", mid);
      } else if (cls.indexOf("sensor-port") === 0) {
        c.setAttribute("cx", mid);
      } else if (cls.indexOf("sensor-lead") === 0) {
        c.setAttribute("x1", hi.x); c.setAttribute("x2", lo.x);
        c.setAttribute("y1", t.hi[1]); c.setAttribute("y2", t.hi[1]);
      } else if (cls.indexOf("sensor-tap") === 0) {
        taps.push(c);
      }
    }
    if (taps[0]) { taps[0].setAttribute("cx", hi.x); taps[0].setAttribute("cy", t.hi[1]); }
    if (taps[1]) { taps[1].setAttribute("cx", lo.x); taps[1].setAttribute("cy", t.lo[1]); }
  }

  function ports(model, deck) {
    var m = PORTMAP[model], o = {};
    for (var k in m) o[k] = Controllers.anchor(model, deck, m[k]);
    return o;
  }

  // Route helper: drop the probe tap to `jog`, run across to the port, drop in.
  function probeRoute(tap, port, jog) {
    var pts = [tap];
    if (Math.abs(tap[0] - port.x) > 0.6) {
      pts.push([tap[0], jog]);
      pts.push([port.x, jog]);
    }
    pts.push([port.x, port.y]);
    return pts;
  }

  function buildTubeSpecs(model) {
    var h = ports(model, "hot"), c = ports(model, "cold");
    // On the CSC-2000 the M and B ports sit side by side at the same height,
    // so the main and branch runs would lie on top of each other. Drop the
    // branch run clear of the main so they read as two separate lines.
    var bOff = (model === "csc2000") ? 16 : 0;
    // RCC-1012 reversing relay (hot deck, CSC-2000 only): S takes the
    // controller's branch, B drives the actuator, M takes main air.
    var hasRelay = (model === "csc2000");
    var RELAY_S = [455.5, 307.6], RELAY_B = [493.9, 307.6];

    var specs = [];
    if (hasRelay) {
      specs.push({ id: "hotAct", points: [[ACTUATOR_X, 237], [ACTUATOR_X, 250],
        [RELAY_B[0], 250], [RELAY_B[0], RELAY_B[1]]],
        cls: "wire-act", name: "relay to hot actuator", mode: "ctrl" });
    }
    var tHotY = model === "csc2000" ? 295 : 175;
    var tColdY = model === "csc2000" ? 589 : 475;
    return specs.concat([
      { id: "hotH", points: probeRoute(PROBE.hot.hi, h.hi, 180),
        cls: "wire-sensor", name: "hot deck sensor H", mode: "ctrl" },
      { id: "hotL", points: probeRoute(PROBE.hot.lo, h.lo, 170),
        cls: "wire-sensor", name: "hot deck sensor L", mode: "ctrl" },
      { id: "coldH", points: probeRoute(PROBE.cold.hi, c.hi, 470),
        cls: "wire-sensor", name: "cold deck sensor H", mode: "ctrl" },
      { id: "coldL", points: probeRoute(PROBE.cold.lo, c.lo, 460),
        cls: "wire-sensor", name: "cold deck sensor L", mode: "ctrl" },
      { id: "hotB", points: hasRelay
          ? [[h.branch.x, h.branch.y], [h.branch.x, RELAY_S[1] + 52],
             [RELAY_S[0], RELAY_S[1] + 52], [RELAY_S[0], RELAY_S[1]]]
          : [[ACTUATOR_X, 237], [ACTUATOR_X, h.branch.y + bOff],
             [h.branch.x, h.branch.y + bOff], [h.branch.x, h.branch.y]],
        cls: "wire-branch", name: "hot deck branch", mode: "ctrl" },
      { id: "coldB", points: [[ACTUATOR_X, 527], [ACTUATOR_X, c.branch.y + bOff],
        [c.branch.x, c.branch.y + bOff], [c.branch.x, c.branch.y]],
        cls: "wire-branch", name: "cold deck branch", mode: "ctrl" },
      { id: "mainHot", points: [[TRUNK_X, h.main.y], [h.main.x, h.main.y]],
        cls: "wire-main", name: "main air to hot controller", mode: "ctrl" },
      { id: "mainCold", points: [[TRUNK_X, c.main.y], [c.main.x, c.main.y]],
        cls: "wire-main", name: "main air to cold controller", mode: "ctrl" },
      { id: "mainTstat", points: [[1165, 660], [1165, 380]], cls: "wire-main", name: "main air to thermostat" },
      { id: "tMain", points: [[1105, 380], [1105, 400], TEE], cls: "wire-reset", name: "thermostat output", mode: "ctrl" },
      { id: "tHot", points: [TEE, [TEE[0], tHotY], [h.stat.x, tHotY], [h.stat.x, h.stat.y]],
        cls: "wire-reset", name: "teed signal to hot controller", mode: "ctrl" },
      { id: "tCold", points: [TEE, [TEE[0], tColdY], [c.stat.x, tColdY], [c.stat.x, c.stat.y]],
        cls: "wire-reset", name: "teed signal to cold controller", mode: "ctrl" },
      { id: "tDirect", points: [[1105, 380], [1105, 400], TEE, [1000, 610], [445, 610], [445, 557]],
        cls: "wire-reset", name: "thermostat to linked actuator", mode: "opposed" }
    ]);
  }

  var TUBE_GEOM = [];

  // Rebuild routing when the series or the controller artwork changes.
  function retube() {
    if (typeof Controllers === "undefined") return;
    // The header trunk has to reach the highest M tap, which moves with the
    // controller model — a fixed end left a gap on the CSC-2000.
    var trunk = document.getElementById("mainTrunk");
    if (trunk) {
      var pm = ports(activeModel(), "hot"), pc = ports(activeModel(), "cold");
      trunk.setAttribute("y2", Math.min(pm.main.y, pc.main.y).toFixed(1));
    }
    rebuildProbe();
    positionSensor("hot");
    positionSensor("cold");
    TUBE_GEOM = buildTubeSpecs(state.series === "2000" ? "csc2000" : "csc3000");
  }

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
    var nMinor = Math.round((SP_MAX - SP_MIN) / TICK_STEP);
    var perLabel = Math.round(LABEL_STEP / TICK_STEP);
    for (var i = 0; i <= nMinor; i++) {
      var a = -SP_SWEEP + i * (2 * SP_SWEEP / nMinor);
      var major = (i % perLabel === 0);
      var p1 = polar(1058, 292, major ? 26 : 28, a);
      var p2 = polar(1058, 292, major ? 32 : 30.5, a);
      gs.appendChild(seg("tstat-tick" + (major ? " major" : ""), p1[0], p1[1], p2[0], p2[1]));
    }
    for (var k = 0; k <= nMinor; k += perLabel) {
      var ang = -SP_SWEEP + k * (2 * SP_SWEEP / nMinor);
      var pt = polar(1058, 292, 18, ang);
      var t = document.createElementNS(NS, "text");
      t.setAttribute("class", "tstat-num");
      t.setAttribute("x", pt[0].toFixed(1)); t.setAttribute("y", (pt[1] + 2.8).toFixed(1));
      t.textContent = String(spFromAngle(ang));
      gs.appendChild(t);
    }
  }

  function buildTube(t) {
    var pts = (TUBE_GEOM.filter(function (g) { return g.id === t.id; })[0] || t).points;
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
    retube();
    while (tubeLayer.firstChild) tubeLayer.removeChild(tubeLayer.firstChild);
    els = {};
    TUBE_GEOM.forEach(buildTube);
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
    // The two controllers AND the thermostat all tee off ONE main-air trunk.
    // Any open leg divides the trunk down (one open leg ≈ half pressure), so
    // pulling air anywhere lowers everyone's pressure: the disconnected leg
    // reads 0, the others keep working at reduced pressure. Everything is
    // affected by everything else.
    var hotLeg = state.mainOn && L.mainHot;
    var coldLeg = state.mainOn && L.mainCold;
    var statLeg = state.mainOn && L.mainTstat;
    var legsOn = (hotLeg ? 1 : 0) + (coldLeg ? 1 : 0) + (statLeg ? 1 : 0);
    var open = 3 - legsOn;
    state.trunkPSI = legsOn === 0 ? 0 : 20 / (1 + open);
    state.hotPSI = hotLeg ? state.trunkPSI : 0;
    state.coldPSI = coldLeg ? state.trunkPSI : 0;
    state.statPSI = statLeg ? state.trunkPSI : 0;
    var trunkOK = (open === 0);
    // The thermostat loses output authority in proportion to its supply.
    var tHasAir = statLeg && state.trunkPSI > 0;
    var tOut = tHasAir
      ? clamp(9 + (state.roomTemp - state.setpoint) * 1.2, 3, 15) * (state.statPSI / 20)
      : 0;

    var coldPct, hotPct, coldT = 0, hotT = 0, failHeat = false, outPsi = tOut;

    if (two) {
      var coldAir = coldLeg;
      var hotAir = hotLeg;
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
      // An unplugged branch never reaches the actuator, so it springs home
      // regardless of what the controller is putting out.
      if (!L.coldB) coldTgt = 0;

      var fh = clamp((RESET_START - hotT) / RESET_SPAN, 0, 1);
      var hotSP = fh * MAX;
      var hotCmd = hotAir ? clamp(hotSP / MAX * 100, 0, 100) : null;
      if (hotAir && !sensorOK("hot")) hotCmd = 100;
      var hotTgt;
      if (hotCmd === null) hotTgt = 100;
      else hotTgt = (state.hotAction === "NC") ? hotCmd : (100 - hotCmd);
      if (!L.hotB) hotTgt = 100;

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
    var supplyTemp = flow > 0
      ? (coldFlow * COLD_DECK_T + hotFlow * HOT_DECK_T) / flow
      : COLD_DECK_T;
    // The thermostat trims ordinary deck imbalance out, so the room settles on
    // setpoint with no standing offset. Only a large imbalance — the box
    // driving the wrong way, or springs failed — moves the room off setpoint.
    var pull = (hotFlow - coldFlow) / MAX;          // + heating, - cooling
    var dead = 0.4;    // covers the box's own minimum-flow imbalance
    var excess = Math.abs(pull) > dead
      ? (Math.abs(pull) - dead) * Math.sign(pull)
      : 0;
    var target = state.setpoint + excess * 25;
    state.roomTemp = clamp(state.roomTemp + (target - state.roomTemp) * 1.3 * dt, ROOM_MIN, ROOM_MAX);

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

    // Damper linkage: a crank on the blade rotates with it, so the rod down to
    // the actuator lengthens and shortens — the actuator appears to stroke.
    function linkage(crankId, rodId, pinId, bodyId, bx, by, ang, cx, cy, half) {
      var rad = (ang + 90) * Math.PI / 180, r = 20;
      var ex = bx + r * Math.cos(rad), ey = by + r * Math.sin(rad);
      var c = document.getElementById(crankId), rod = document.getElementById(rodId);
      var pin = document.getElementById(pinId), body = document.getElementById(bodyId);
      if (c) { c.setAttribute("x2", ex.toFixed(1)); c.setAttribute("y2", ey.toFixed(1)); }
      if (pin) { pin.setAttribute("cx", ex.toFixed(1)); pin.setAttribute("cy", ey.toFixed(1)); }
      // Body stays centred on (cx,cy) and swings to lie along the rod, so the
      // rod meets its top face and the whole actuator reads as one piece.
      var dx = cx - ex, dy = cy - ey, L = Math.hypot(dx, dy) || 1;
      var ux = dx / L, uy = dy / L;
      var rx = cx - half * ux, ry = cy - half * uy;
      if (rod) {
        rod.setAttribute("x1", ex.toFixed(1)); rod.setAttribute("y1", ey.toFixed(1));
        rod.setAttribute("x2", rx.toFixed(1)); rod.setAttribute("y2", ry.toFixed(1));
      }
      if (body) {
        var theta = Math.atan2(-ux, uy) * 180 / Math.PI;
        body.setAttribute("transform",
          "translate(" + cx + "," + cy + ") rotate(" + theta.toFixed(1) + ")");
      }
    }
    linkage("crankHot", "rodHot", "pinHot", "actBodyHot", 430, 110, hotAng, 448, 196, 36);
    linkage("crankCold", "rodCold", "pinCold", "actBodyCold", 430, 400, coldAng, 448, 486, 36);
    // Single shaft: the one actuator drives the cold blade's crank, and the
    // opposed link carries that on to the hot blade.
    linkage("crankSingle", "rodSingle", "pinSingle", "actBodySingle", 430, 400, coldAng, 445, 500, 45);

    document.getElementById("hotActuator").style.display = two ? "block" : "none";
    document.getElementById("coldActuator").style.display = two ? "block" : "none";
    document.getElementById("singleActuator").style.display = two ? "none" : "block";
    document.getElementById("opposedNote").style.display = two ? "none" : "block";
    document.getElementById("opposedLink").style.display = two ? "none" : "block";


    // The NO / NC markings are printed on the wheel and rotate with it; the
    // fixed index triangle outside the wheel points at the selected one.
    var rc = Controllers.rel("csc3000", "damper");
    var dc = document.getElementById("damperDialCold");
    if (dc) dc.setAttribute("transform",
      "rotate(" + (state.coldAction === "NO" ? 0 : 90) + " " + rc.x + " " + rc.y + ")");
    var dh = document.getElementById("damperDialHot");
    if (dh) dh.setAttribute("transform",
      "rotate(" + (state.hotAction === "NC" ? 90 : 0) + " " + rc.x + " " + rc.y + ")");

    document.getElementById("teeMark").style.display = two ? "block" : "none";
    document.getElementById("ctrlReadouts").style.display = two ? "block" : "none";
    document.getElementById("sensorHot").style.display = two ? "block" : "none";
    document.getElementById("sensorCold").style.display = two ? "block" : "none";

    var needAng = angleFromSp(state.setpoint);
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

    setText("rdMainHot", two && state.hotPSI ? state.hotPSI + " psi" : "0 psi", two && !state.hotPSI);
    setText("rdMainCold", two && state.coldPSI ? state.coldPSI + " psi" : "0 psi", two && !state.coldPSI);
    setText("rdTHot", (two ? state.hotT : state.tOut).toFixed(1) + " psi", two && state.hotT <= 0);
    setText("rdTCold", (two ? state.coldT : state.tOut).toFixed(1) + " psi", two && state.coldT <= 0);

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
    } else if (two && (!L.hotB || !L.coldB)) {
      cls = "bad";
      msg = "The branch line to the " + (!L.hotB && !L.coldB ? "actuators" : (L.hotB ? "cold" : "hot")) +
        " deck actuator is unplugged. With no branch pressure that actuator springs home (" +
        (L.hotB ? "cold deck shuts" : "hot deck opens") + ").";
    } else if (two && (!L.mainHot || !L.mainCold)) {
      cls = "warn";
      msg = "Main air pulled from one controller. Both legs tee off one trunk, so it divides to roughly half pressure \u2014 the disconnected deck loses air, while the other keeps running at about " +
        Math.round(state.trunkPSI) + " psi.";
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
    document.getElementById("daDual").classList.toggle("active", state.twoControllers);
    document.getElementById("daSingle").classList.toggle("active", !state.twoControllers);
    document.getElementById("actHint").textContent = state.twoControllers
      ? "Two actuators \u2192 one KMC controller per deck; thermostat signal teed."
      : "Single shaft, 90\u00B0 opposed \u2192 no KMC controller; thermostat drives it directly.";
    // The controller series only applies when there are two controllers, so
    // hide the whole block for the single-shaft system.
    document.getElementById("seriesCtl").style.display = state.twoControllers ? "" : "none";
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
    // The teed-signal readouts ride the tube, whose y depends on the series.
    document.getElementById("rdTHot").setAttribute("y", csc2 ? "282" : "163");
    document.getElementById("rdTCold").setAttribute("y", csc2 ? "578" : "463");
  }

  function updateTubeStyle() {}

  function setSeries(v) {
    state.series = v;
    rebuildTubes(); syncMode(); syncControls();
    if (typeof Controllers !== "undefined" && Controllers.setTuneModel) {
      Controllers.setTuneModel(v === "2000" ? "csc2000" : "csc3000");
      Controllers.redrawHandles();
    }
  }

  function toggleMain() { state.mainOn = !state.mainOn; syncControls(); }
  function reconnectAll() { for (var id in state.lines) state.lines[id] = true; syncLines(); }
  function resetAll() {
    state.mainOn = DEFAULTS.mainOn; state.setpoint = DEFAULTS.setpoint;
    state.roomTemp = DEFAULTS.roomTemp; state.twoControllers = DEFAULTS.twoControllers;
    state.coldAction = DEFAULTS.coldAction; state.hotAction = DEFAULTS.hotAction;
    if (state.series !== DEFAULTS.series) { state.series = DEFAULTS.series; reconnectAll(); rebuildTubes(); }
    else reconnectAll();
    syncMode(); syncControls();
  }

  function init() {
    retube();
    TUBE_GEOM.forEach(buildTube);
    syncLines();
    initDeviceArt();
    syncMode();

    document.getElementById("spSl").addEventListener("input", function () {
      state.setpoint = parseFloat(this.value); syncControls();
    });
    document.getElementById("daDual").addEventListener("click", function () { setActuators(true); });
    document.getElementById("daSingle").addEventListener("click", function () { setActuators(false); });
    document.getElementById("cs3000").addEventListener("click", function () { setSeries("3000"); });
    document.getElementById("cs2000").addEventListener("click", function () { setSeries("2000"); });
    document.getElementById("mainBtn").addEventListener("click", toggleMain);
    document.getElementById("reconnect").addEventListener("click", reconnectAll);
    document.getElementById("resetAll").addEventListener("click", resetAll);

    // ---- controller artwork tuner ----
    var tuneBtn = document.getElementById("tuneBtn");
    if (tuneBtn) {
      tuneBtn.addEventListener("click", function () { Controllers.tune(); });
      document.getElementById("tuneModel").addEventListener("change", function () {
        Controllers.setTuneModel(this.value);
        Controllers.exportSpec();
      });
      document.getElementById("tuneApply").addEventListener("click", function () {
        Controllers.applySpec();
      });
      document.getElementById("tuneCopy").addEventListener("click", function () {
        var ta = document.getElementById("tuneSpec");
        ta.select();
        if (navigator.clipboard) navigator.clipboard.writeText(ta.value);
        else document.execCommand("copy");
        document.getElementById("tuneStatus").textContent = "Spec copied to clipboard.";
      });
      document.getElementById("tunerLayer").addEventListener("pointerdown", function (e) {
        Controllers.beginDrag(e);
      });
    }

    // Delegated on the SVG root: the tuner re-renders these groups, so
    // per-element listeners would be lost.
    var svgRoot = document.getElementById("sim");
    function closestId(node, id) {
      while (node && node !== svgRoot) {
        if (node.id === id) return node;
        node = node.parentNode;
      }
      return null;
    }
    svgRoot.addEventListener("click", function (e) {
      if (closestId(e.target, "damperDialCold")) setColdAction(state.coldAction === "NO" ? "NC" : "NO");
      else if (closestId(e.target, "damperDialHot")) setHotAction(state.hotAction === "NC" ? "NO" : "NC");
    });
    svgRoot.addEventListener("keydown", function (e) {
      if (e.key !== " " && e.key !== "Enter") return;
      var t = closestId(e.target, "damperDialCold") ? "cold"
            : closestId(e.target, "damperDialHot") ? "hot" : null;
      if (!t) return;
      e.preventDefault();
      if (t === "cold") setColdAction(state.coldAction === "NO" ? "NC" : "NO");
      else setHotAction(state.hotAction === "NC" ? "NO" : "NC");
    });

    // Thermostat dial: drag or arrow keys to change setpoint.
    var dial = document.getElementById("tstatDial");
    if (dial) {
      var dragging = false;
      function setFromPointer(evt) {
        var box = document.getElementById("sim").getBoundingClientRect();
        var x = (evt.clientX - box.left) / box.width * 1250;
        var y = (evt.clientY - box.top) / box.height * 700;
        var ang = clamp(Math.atan2(x - 1058, -(y - 292)) * 180 / Math.PI, -SP_SWEEP, SP_SWEEP);
        state.setpoint = Math.round(spFromAngle(ang) / SP_STEP) * SP_STEP;
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
        if (d) { state.setpoint = clamp(state.setpoint + d, SP_MIN, SP_MAX); syncControls(); e.preventDefault(); }
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
      var dt = Math.min(0.05, (now - last) / 1000) * TIME_SCALE; last = now;
      update(dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function applyTheme(isDark) {
    document.body.classList.toggle("theme-dark", isDark);
    document.getElementById("themeToggle").textContent = isDark ? "Light" : "Dark";
  }

  // The controller tuner re-renders the artwork; keep the tubing attached.
  if (typeof Controllers !== "undefined") {
    Controllers.afterRender = function () {
      if (typeof els !== "undefined" && Object.keys(els).length) rebuildTubes();
    };
  }

  // Preview/test hook: lets a headless host select the controller series.
  if (typeof window !== "undefined") {
    window.__sim = { setSeries: setSeries, retube: rebuildTubes, state: state };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
