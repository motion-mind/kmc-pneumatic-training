/* controllers.js — declarative controller artwork.
 *
 * EVERY number below is authored in INCHES, measured from the manufacturer's
 * dimensioned drawing.  `ppu` (pixels-per-unit) converts inches to drawing
 * coordinates, so the artwork scales as one piece and stays dimensionally
 * faithful: if a port sits 0.42 in from the body edge on the real device it is
 * 0.42 * ppu from the body edge in the drawing.
 *
 * Origin (0,0) is the top-left of the body's bounding box; +x is right, +y is
 * down, exactly like SVG.
 *
 * To retune: turn on "Tune controllers" in the page, drag anything, then hit
 * "Copy spec" and paste the JSON back into SPECS below.  Nothing else needs to
 * change — the pneumatic tubes in sim.js are derived from these coordinates via
 * Controllers.anchor().
 */
(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  // ---------------------------------------------------------------- specs --
  // CSC-3000, from KMC DS_CSC-3000 (213-035-01): 4-1/2" (114 mm) across the
  // mounting plate.  H, L, T, B, M are 1/4" push-on fittings — small barbs.
  // The big circles are the LO STAT / HI STAT / RESET SPAN adjustment dials,
  // NOT ports.  G is the larger gauge-tap cap (5/32" tubing).
  var csc3000 = {
    name: "CSC-3000",
    // Measured octagon: 1.48" top & bottom, 2.07" diagonals, 0.85" sides.
    body: { top: 1.48, diag: 2.07, side: 0.85 },
    ports: [
      { id: "H", x: 0.72, y: 0.71, d: 0.3 },
      { id: "L", x: 1.21, y: 0.7, d: 0.3 },
      { id: "T", x: 3.04, y: 0.65, d: 0.3, label: { dx: 0.3, dy: 0.05, anchor: "start" } },
      { id: "B", x: 0.25, y: 1.68, d: 0.3, label: { dx: 0.1, dy: -0.34, anchor: "middle" } },
      { id: "M", x: 0.27, y: 2.1, d: 0.3 }
    ],
    caps: [{ id: "G", x: 1.59, y: 3, d: 0.19 }],
    // One adjuster per panel legend row, in the same top-to-bottom order.
    // hiStat is 72% of loStat's diameter, as on the real face.
    dials: [
      { id: "damper", x: 1.1, y: 1.87, d: 1, kind: "damper" },
      { id: "resetStart", x: 2.26, y: 0.65, d: 0.9, kind: "arrow" },
      { id: "loStat", x: 2.11, y: 1.87, d: 0.9, kind: "arrow" },
      { id: "hiStat", x: 3.13, y: 1.95, d: 0.648, kind: "arrow" },
      { id: "resetSpan", x: 2.3, y: 3.1, d: 0.9, kind: "screw" }
    ],
    panel: {
      x: 2.78, y: 1.05, w: 1.2, h: 1.68,
      lines: [
        { t: "RESET START", dy: 0.17, lead: "resetStart" },
        { t: "LO STAT \u0394P", dy: 0.4, lead: "loStat" },
        { t: "HI STAT", dy: 0.84, dx: 0.68 },
        { t: "\u0394P", dy: 0.99, dx: 0.68 },
        { t: "RESET SPAN", dy: 1.5, lead: "resetSpan" }
      ],
      sticker: { dx: 0.08, dy: 1.28, w: 0.94, h: 0.15 }
    }
  };

  // CSC-2000 (CSC-2003), from KMC DS_CSC-2000: 3-1/4" (83) x 3-9/16" (91).
  // Port side: X/Y differential velocity taps, M main, B branch, T thermostat.
  // Two diaphragm housings plus six mounting bolts.
  var csc2000 = {
    name: "CSC-2000",
    // Regular hexagon: 1.72" sides, 3.0" tall, 3.4" across the corners, so the
    // flats sit at y = 0 / 3.0 and the left/right vertices at x = 0 / 3.4.
    size: { w: 3.4, h: 3.26 },
    poly: [[0, 1.5], [0.84, 0], [2.56, 0], [3.4, 1.5], [2.56, 3.0], [0.84, 3.0]],
    circles: [
      { x: 1.7, y: 1.5, d: 2.57 },    // main diaphragm, centred in the hexagon
      { x: 1.7, y: 2.57, d: 1.37 },   // secondary housing
      { x: 1.7, y: 2.42, d: 1.00 }    // inner boss carrying T
    ],
    // 6 x 0.25" holes, set inboard of each hexagon corner so they sit between
    // the corner and the 2.57" main circle (corner radius 1.72", circle 1.285").
    bolts: [
      { id: "h1", x: 0.95, y: 0.20 }, { id: "h2", x: 2.45, y: 0.20 },
      { id: "h3", x: 3.20, y: 1.50 }, { id: "h4", x: 2.45, y: 2.80 },
      { id: "h5", x: 0.95, y: 2.80 }, { id: "h6", x: 0.20, y: 1.50 }
    ],
    boltD: 0.25,
    // all ports 0.36"
    ports: [
      { id: "X", x: 1.7, y: 0, d: 0.36, label: { dx: -0.30, dy: 0.275, anchor: "end" } },
      { id: "Y", x: 1.7, y: 0.65, d: 0.36, label: { dx: 0, dy: 0.42, anchor: "middle" } },
      { id: "M", x: 1.48, y: 1.5, d: 0.36, label: { dx: -0.28, dy: 0.06, anchor: "end" } },
      { id: "B", x: 1.92, y: 1.5, d: 0.36, label: { dx: 0.28, dy: 0.06, anchor: "start" } },
      { id: "T", x: 1.7, y: 2.42, d: 0.36, label: { dx: 0, dy: -0.34, anchor: "middle" } }
    ]
  };

  var SPECS = { csc3000: csc3000, csc2000: csc2000 };

  // Where each model is drawn.  `hot`/`cold` are the drawing coordinates that
  // the spec's (0,0) maps to for that deck.
  var PLACEMENT = {
    csc3000: { ppu: 48, hot: { x: 520, y: 160 }, cold: { x: 520, y: 450 } },
    csc2000: { ppu: 48, hot: { x: 524, y: 168 }, cold: { x: 524, y: 458 } }
  };

  // ------------------------------------------------------------- geometry --
  // The octagonal body is specified the way you measure it on the part:
  //   top/bottom edge length, diagonal edge length, left/right edge length.
  // The chamfers are 45 degrees, so  diagonal = chamfer * sqrt(2).
  function octagon(s) {
    var b = s.body;
    var cut = b.diag / Math.SQRT2;
    return { cut: cut, w: b.top + 2 * cut, h: b.side + 2 * cut };
  }
  function bodySize(s) {
    if (s.body) { var o = octagon(s); return { w: o.w, h: o.h }; }
    return s.size || { w: 1, h: 1 };
  }

  function place(model, deck) {
    var pl = PLACEMENT[model];
    return { ppu: pl.ppu, origin: pl[deck] || pl.hot };
  }

  function items(model, key) { return (SPECS[model] && SPECS[model][key]) || []; }

  // Find a named item (port/cap/dial/bolt) in a model spec.
  function find(model, id) {
    var lists = [items(model, "ports"), items(model, "caps"),
                 items(model, "dials"), items(model, "bolts")];
    for (var k = 0; k < lists.length; k++) {
      for (var i = 0; i < lists[k].length; i++) {
        if (lists[k][i].id === id) return lists[k][i];
      }
    }
    return null;
  }

  // Origin-local coordinate (what a rotate() centre inside the translated group
  // needs).  Inches * ppu, no origin offset.
  function rel(model, id) {
    var it = find(model, id), pl = PLACEMENT[model];
    if (!it) return null;
    return { x: it.x * pl.ppu, y: it.y * pl.ppu };
  }

  // Absolute drawing coordinate of a named item.
  function anchor(model, deck, id) {
    var it = find(model, id), pl = place(model, deck);
    if (!it) return null;
    return { x: pl.origin.x + it.x * pl.ppu, y: pl.origin.y + it.y * pl.ppu };
  }

  // -------------------------------------------------------------- builders --
  function el(tag, cls, attrs) {
    var e = document.createElementNS(NS, tag);
    if (cls) e.setAttribute("class", cls);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function txt(cls, x, y, s, anchor2, transform) {
    var t = el("text", cls, { x: x, y: y });
    if (anchor2) t.setAttribute("text-anchor", anchor2);
    if (transform) t.setAttribute("transform", transform);
    t.textContent = s;
    return t;
  }
  var f1 = function (n) { return (+n).toFixed(1); };

  function bodyPoints(s, ppu) {
    var o = octagon(s);
    var w = o.w * ppu, h = o.h * ppu, c = o.cut * ppu;
    return [[c, 0], [w - c, 0], [w, c], [w, h - c],
            [w - c, h], [c, h], [0, h - c], [0, c]]
      .map(function (p) { return f1(p[0]) + "," + f1(p[1]); }).join(" ");
  }

  // `g` receives coordinates RELATIVE to the controller origin (inches * ppu);
  // the caller wraps it in a translate().
  function buildPort(g, s, port, ppu) {
    var x = port.x * ppu, y = port.y * ppu, r = port.d / 2 * ppu;
    g.appendChild(el("circle", "tc-boss", { cx: x, cy: y, r: f1(r) }));
    g.appendChild(el("circle", "tc-bore", { cx: x, cy: y, r: f1(r * 0.45) }));
    var lb = port.label || { dx: 0, dy: port.d / 2 + 0.26, anchor: "middle" };
    g.appendChild(txt("portlbl", x + (lb.dx || 0) * ppu, y + (lb.dy || 0) * ppu,
      port.id, lb.anchor));
  }

  function buildScrew(g, x, y, r) {
    g.appendChild(el("circle", "tc-screw", { cx: x, cy: y, r: f1(r * 0.30) }));
    g.appendChild(el("line", "tc-screw-x", {
      x1: x - r * 0.19, y1: y, x2: x + r * 0.19, y2: y
    }));
  }

  function buildDial(g, s, d, deck, ppu, uid) {
    var x = d.x * ppu, y = d.y * ppu, r = d.d / 2 * ppu;

    if (d.kind === "damper") {
      var grp = el("g", "clickable", {
        id: "damperDial" + (deck === "cold" ? "Cold" : "Hot"),
        tabindex: "0", role: "button",
        "aria-label": "Toggle damper action between N.O. and N.C.",
        transform: "rotate(0 " + f1(x) + " " + f1(y) + ")"
      });
      grp.appendChild(el("circle", "tc-wheel", { cx: x, cy: y, r: f1(r) }));
      var a = r * 0.707;
      [[a, -a], [-a, -a], [a, a], [-a, a]].forEach(function (v) {
        grp.appendChild(el("line", "tc-spoke", {
          x1: x, y1: y, x2: f1(x + v[0]), y2: f1(y + v[1])
        }));
      });
      buildScrew(grp, x, y, r);
      // NO / NC each get a label plus a fixed index triangle pointing outward,
      // so the pair reads symmetrically (NO straight down, NC to the right).
      grp.appendChild(txt("tc-note", x, f1(y + r * 0.62), "NO", "middle"));
      grp.appendChild(el("polygon", "tc-note-mark", {
        points: f1(x - 5) + "," + f1(y + r * 0.80) + " " + f1(x + 5) + "," + f1(y + r * 0.80) +
                " " + f1(x) + "," + f1(y + r * 1.05)
      }));
      var nx = x + r * 0.58;
      grp.appendChild(txt("tc-note", f1(nx), f1(y), "NC", "middle",
        "rotate(-90 " + f1(nx) + " " + f1(y) + ")"));
      grp.appendChild(el("polygon", "tc-note-mark", {
        points: f1(x + r * 0.80) + "," + f1(y - 5) + " " + f1(x + r * 0.80) + "," + f1(y + 5) +
                " " + f1(x + r * 1.05) + "," + f1(y)
      }));
      g.appendChild(grp);
      // Fixed DAMPER index — outside the rotating group.
      g.appendChild(el("polygon", "tc-note-mark", {
        points: f1(x - 5) + "," + f1(y + r + 13) + " " + f1(x + 5) + "," + f1(y + r + 13) +
                " " + f1(x) + "," + f1(y + r + 6)
      }));
      g.appendChild(txt("tc-note", x, f1(y + r + 21), "DAMPER", "middle"));
      return;
    }

    // Adjustment screw/dial: recessed rim, inner face, optional curved arrow.
    g.appendChild(el("circle", "tc-dial-rim", { cx: x, cy: y, r: f1(r) }));
    g.appendChild(el("circle", "tc-dial-face", { cx: x, cy: y, r: f1(r * 0.60) }));
    if (d.kind === "arrow") {
      // Counter-clockwise arc across the top (decreasing angle in SVG's
      // y-down space = CCW on screen), with a head at the trailing end.
      var ra = r * 0.66, aFrom = 330, aTo = 210;
      var rad = function (deg) { return deg * Math.PI / 180; };
      var pt = function (R, deg) { return [x + R * Math.cos(rad(deg)), y + R * Math.sin(rad(deg))]; };
      var A = pt(ra, aFrom), B = pt(ra, aTo);
      g.appendChild(el("path", "tc-dial-arrow", {
        d: "M " + f1(A[0]) + " " + f1(A[1]) +
           " A " + f1(ra) + " " + f1(ra) + " 0 0 0 " + f1(B[0]) + " " + f1(B[1])
      }));
      // head: tangent at the end of a CCW sweep is (sin t, -cos t)
      var t = rad(aTo), dir = [Math.sin(t), -Math.cos(t)];
      var perp = [-dir[1], dir[0]], hl = 5.4, hw = 3.0;
      var bc = [B[0] - dir[0] * hl, B[1] - dir[1] * hl];
      g.appendChild(el("polygon", "tc-dial-arrowhead", {
        points: f1(B[0]) + "," + f1(B[1]) + " " +
                f1(bc[0] + perp[0] * hw) + "," + f1(bc[1] + perp[1] * hw) + " " +
                f1(bc[0] - perp[0] * hw) + "," + f1(bc[1] - perp[1] * hw)
      }));
      // "INCR" curved along the bottom, inside the rim. Laid out glyph by
      // glyph rather than with <textPath> so it renders everywhere.
      var word = "INCR", rt = r * 0.62, sweep = 108;
      var gstep = sweep / word.length;
      for (var ci = 0; ci < word.length; ci++) {
        var ga = (90 + sweep / 2) - (ci + 0.5) * gstep;    // 90 = bottom (y-down)
        var gp = pt(rt, ga);
        var gt = txt("tc-dial-incr", f1(gp[0]), f1(gp[1]), word.charAt(ci), "middle",
          "rotate(" + f1(ga - 90) + " " + f1(gp[0]) + " " + f1(gp[1]) + ")");
        gt.setAttribute("font-size", f1(Math.max(3.4, r * 0.23)));
        g.appendChild(gt);
      }
    }
    buildScrew(g, x, y, r);
  }

  function buildPanel(g, s, model, deck, ppu) {
    var p = s.panel; if (!p) return;
    var x = p.x * ppu, y = p.y * ppu;
    g.appendChild(el("rect", "tc-panel", {
      x: f1(x), y: f1(y), width: f1(p.w * ppu), height: f1(p.h * ppu), rx: 5
    }));
    (p.lines || []).forEach(function (ln) {
      var lx = x + (ln.dx || 0.11) * ppu, ly = y + ln.dy * ppu;
      if (ln.lead) {
        // Leader from the left end of the label out to the dial it names.
        var d = find(model, ln.lead);
        if (d) {
          var dcx = d.x * ppu, dcy = d.y * ppu, dr = d.d / 2 * ppu;
          var sx = lx - 0.04 * ppu, sy = ly - 0.05 * ppu;
          var vx = sx - dcx, vy = sy - dcy, vl = Math.hypot(vx, vy) || 1;
          g.appendChild(el("line", "tc-panel-lead", {
            x1: f1(dcx + (vx / vl) * (dr + 1.5)), y1: f1(dcy + (vy / vl) * (dr + 1.5)),
            x2: f1(sx), y2: f1(sy)
          }));
        }
      }
      g.appendChild(txt("tc-paneltext", f1(lx), f1(ly), ln.t));
    });
    if (p.sticker) {
      g.appendChild(el("rect", "tc-sticker", {
        x: f1(x + p.sticker.dx * ppu), y: f1(y + p.sticker.dy * ppu),
        width: f1(p.sticker.w * ppu), height: f1(p.sticker.h * ppu), rx: 1.5
      }));
    }
  }

  // Returns a <g> whose transform places it; children are origin-relative.
  function build(model, deck) {
    var s = SPECS[model];
    if (!s) return null;
    var pl = place(model, deck), ppu = pl.ppu;
    var g = el("g", null, {});

    if (s.plate) {
      g.appendChild(el("rect", "tc-plate-outline", {
        x: 0, y: 0, width: f1(s.size.w * ppu), height: f1(s.size.h * ppu),
        rx: f1((s.plate.r || 0.15) * ppu)
      }));
    }
    if (s.body) g.appendChild(el("polygon", "tc-body", { points: bodyPoints(s, ppu) }));
    if (s.poly) {
      g.appendChild(el("polygon", "tc-body", {
        points: s.poly.map(function (v) { return f1(v[0] * ppu) + "," + f1(v[1] * ppu); }).join(" ")
      }));
    }
    items(model, "circles").forEach(function (c) {
      g.appendChild(el("circle", "tc-body", {
        cx: f1(c.x * ppu), cy: f1(c.y * ppu), r: f1(c.d / 2 * ppu)
      }));
    });
    items(model, "bolts").forEach(function (b) {
      g.appendChild(el("circle", "tc-bolt", {
        cx: f1(b.x * ppu), cy: f1(b.y * ppu), r: f1((s.boltD || 0.3) / 2 * ppu)
      }));
    });
    items(model, "caps").forEach(function (c) {
      var x = c.x * ppu, y = c.y * ppu, r = c.d / 2 * ppu;
      g.appendChild(el("circle", "tc-plug", { cx: f1(x), cy: f1(y), r: f1(r) }));
      g.appendChild(txt("portlbl", f1(x), f1(y + r + 0.24 * ppu), c.id, "middle"));
    });
    // Panel first: the HI STAT adjuster sits on top of the printed plate.
    buildPanel(g, s, model, deck, ppu);
    items(model, "dials").forEach(function (d) { buildDial(g, s, d, deck, ppu, model + "-" + deck); });
    items(model, "ports").forEach(function (p) { buildPort(g, s, p, ppu); });

    var bs = bodySize(s);
    g.appendChild(txt("eq dim", bs.w / 2 * ppu, (bs.h + 0.30) * ppu,
      deck.toUpperCase() + " DECK CONTROLLER", "middle"));
    g.setAttribute("transform", "translate(" + pl.origin.x + "," + pl.origin.y + ")");
    return g;
  }

  // --------------------------------------------------------------- mounting --
  var MOUNTS = [
    { model: "csc3000", deck: "hot", host: "ctrlHot" },
    { model: "csc3000", deck: "cold", host: "ctrlCold" },
    { model: "csc2000", deck: "hot", host: "ctrlHot2" },
    { model: "csc2000", deck: "cold", host: "ctrlCold2" }
  ];

  function render() {
    MOUNTS.forEach(function (m) {
      var host = document.getElementById(m.host);
      if (!host) return;
      var g = build(m.model, m.deck);
      while (host.firstChild) host.removeChild(host.firstChild);
      var wrap = el("g", "dev-shadow", {});
      var kids = [];
      while (g.firstChild) { var k = g.firstChild; g.removeChild(k); kids.push(k); }
      kids.forEach(function (kid) { wrap.appendChild(kid); });
      wrap.setAttribute("transform", g.getAttribute("transform"));
      host.appendChild(wrap);
    });
  }


  // ---------------------------------------------------------------- tuner --
  // Interactive calibration: drag any port/dial/bolt and the spec updates in
  // inches, live.  "Copy spec" gives you JSON to paste back into SPECS.
  var tuneOn = false, tuneModel = "csc3000", tuneSvg = null, tuneLayer = null;

  function editable(model) {
    var out = [];
    ["ports", "caps", "dials", "bolts"].forEach(function (key) {
      items(model, key).forEach(function (it) {
        out.push({ key: key, it: it });
      });
    });
    return out;
  }

  // Is a disc of radius `r` centred at (x,y) wholly inside the octagon?
  function outsideBody(model, x, y, r) {
    var s = SPECS[model];
    if (!s || !s.body) return false;
    var o = octagon(s);
    return (x + y < o.cut + r) || (o.w - x + y < o.cut + r) ||
           (x + o.h - y < o.cut + r) || (o.w - x + o.h - y < o.cut + r) ||
           (x < r) || (y < r) || (x > o.w - r) || (y > o.h - r);
  }

  function drawHandles() {
    if (!tuneLayer) return;
    while (tuneLayer.firstChild) tuneLayer.removeChild(tuneLayer.firstChild);
    if (!tuneOn) return;
    editable(tuneModel).forEach(function (e) {
      var a = anchor(tuneModel, "hot", e.it.id);
      if (!a) return;
      var h = el("circle", "tune-handle", { cx: f1(a.x), cy: f1(a.y), r: 9 });
      h.setAttribute("data-key", e.key);
      h.setAttribute("data-id", e.it.id);
      if (outsideBody(tuneModel, e.it.x, e.it.y, (e.it.d || 0.3) / 2)) {
        h.classList.add("tune-bad");
      }
      tuneLayer.appendChild(h);
      tuneLayer.appendChild(txt("tune-lbl", f1(a.x), f1(a.y - 13), e.it.id, "middle"));
    });
    // Octagon handles: one per edge family, so you drag the measurement you
    // actually took with a tape (top/bottom, diagonal, left/right).
    var s = SPECS[tuneModel];
    if (s.body) {
      var pl = place(tuneModel, "hot"), o = octagon(s);
      var w = o.w * pl.ppu, hgt = o.h * pl.ppu, c = o.cut * pl.ppu;
      [
        { key: "body.top", x: w / 2, y: 0, id: "top" },
        { key: "body.side", x: 0, y: hgt / 2, id: "side" },
        { key: "body.diag", x: c / 2, y: c / 2, id: "diag" }
      ].forEach(function (g) {
        var h = el("rect", "tune-handle", {
          x: f1(g.x - 6), y: f1(g.y - 6), width: 12, height: 12
        });
        h.setAttribute("data-key", g.key);
        h.setAttribute("data-id", g.id);
        tuneLayer.appendChild(h);
        tuneLayer.appendChild(txt("tune-lbl", f1(pl.origin.x + g.x),
          f1(pl.origin.y + g.y - 14), g.id, "middle"));
      });
    }
  }

  function toSvg(evt) {
    var pt = tuneSvg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    var m = tuneSvg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }

  function snap(v) { return Math.round(v * 100) / 100; }

  function beginDrag(e) {
    var key = e.target.getAttribute && e.target.getAttribute("data-key");
    var id = e.target.getAttribute && e.target.getAttribute("data-id");
    if (!key) return;
    var spec = SPECS[tuneModel], pl = place(tuneModel, "hot");
    e.target.classList.add("dragging");
    e.preventDefault();

    function move(ev) {
      var loc = toSvg(ev);
      var x = (loc.x - pl.origin.x) / pl.ppu;
      var y = (loc.y - pl.origin.y) / pl.ppu;
      if (key === "body.top") {
        // top edge spans chamfer..w-chamfer; its midpoint is w/2 = (top+2c)/2
        var c1 = spec.body.diag / Math.SQRT2;
        spec.body.top = Math.max(0.05, snap(2 * x - 2 * c1));
      } else if (key === "body.side") {
        var c2 = spec.body.diag / Math.SQRT2;
        spec.body.side = Math.max(0.05, snap(2 * y - 2 * c2));
      } else if (key === "body.diag") {
        // chamfer midpoint sits at (c/2, c/2), so x + y = c  =>  diag = c*sqrt2
        spec.body.diag = Math.max(0.05, snap((x + y) * Math.SQRT2));
      }
      else {
        var it = find(tuneModel, id);
        if (!it) return;
        it.x = snap(x); it.y = snap(y);
      }
      render();
      if (api.afterRender) api.afterRender();
      drawHandles();
      exportSpec();
      status("Drag any handle \u2014 " + dimsText(tuneModel) + warnText());
    }
    function up() {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      drawHandles();
    }
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  }

  function dimsText(model) {
    var s = SPECS[model];
    if (!s.body) return "";
    var o = octagon(s);
    return "top " + s.body.top.toFixed(3) + "\u2033  \u00b7  diag " +
      s.body.diag.toFixed(3) + "\u2033  \u00b7  side " + s.body.side.toFixed(3) +
      "\u2033   (\u2192 " + o.w.toFixed(3) + "\u2033 \u00d7 " + o.h.toFixed(3) + "\u2033, chamfer " +
      o.cut.toFixed(3) + "\u2033)";
  }

  // Anything hanging off the octagon would look broken in the drawing.
  function warnText() {
    var bad = [];
    editable(tuneModel).forEach(function (e) {
      if (outsideBody(tuneModel, e.it.x, e.it.y, (e.it.d || 0.3) / 2)) bad.push(e.it.id);
    });
    return bad.length ? "\n\u26a0 outside the body: " + bad.join(", ") : "";
  }

  function exportSpec() {
    var ta = document.getElementById("tuneSpec");
    if (ta) ta.value = JSON.stringify(SPECS[tuneModel], null, 1);
  }

  function applySpec() {
    var ta = document.getElementById("tuneSpec");
    if (!ta) return;
    try {
      var obj = JSON.parse(ta.value);
      SPECS[tuneModel] = obj;
      render();
      if (api.afterRender) api.afterRender();
      drawHandles();
      status("Applied.");
    } catch (err) { status("JSON error: " + err.message); }
  }

  function status(msg) {
    var el2 = document.getElementById("tuneStatus");
    if (el2) el2.textContent = msg;
  }

  function tune(on, model) {
    if (model) tuneModel = model;
    tuneOn = (on === undefined) ? !tuneOn : !!on;
    tuneSvg = tuneSvg || document.getElementById("sim");
    tuneLayer = tuneLayer || document.getElementById("tunerLayer");
    if (tuneLayer) tuneLayer.classList.toggle("on", tuneOn);
    var box = document.getElementById("tunebox");
    if (box) box.style.display = tuneOn ? "" : "none";
    if (tuneOn) {
      drawHandles();
      exportSpec();
      status("Drag any handle \u2014 " + dimsText(tuneModel) + warnText());
    }
  }

  var api = {
    SPECS: SPECS, PLACEMENT: PLACEMENT, MOUNTS: MOUNTS,
    render: render, build: build, anchor: anchor, rel: rel, find: find,
    items: items, place: place,
    tune: tune, applySpec: applySpec, exportSpec: exportSpec, outsideBody: outsideBody,
    beginDrag: beginDrag, redrawHandles: drawHandles, octagon: octagon, dimsText: dimsText,
    setTuneModel: function (m) { tuneModel = m; if (tuneOn) drawHandles(); },
    set: function (model, spec) { SPECS[model] = spec; }
  };
  global.Controllers = api;
  // Mirror onto the real global so non-browser hosts (and the test harness,
  // which defines a stub `window`) can reach it as a bare identifier too.
  if (typeof globalThis !== "undefined" && globalThis !== global) globalThis.Controllers = api;

  // Render before sim.js wires anything up: sim.js looks up the generated
  // #damperDialHot / #damperDialCold nodes during its own init().
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
    else render();
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
