# Pneumatic VAV Trainer

A single-page, interactive visual tutorial for a pneumatic VAV terminal built around a
KMC **CSC-3000**– or **CSC-2000**–series reset volume controller and a pneumatic thermostat. Click any tube
to **plug or unplug** it, click the air supply to cut main air, and watch the damper,
airflow, and room temperature respond in real time. No quizzes, no long reading — poke at it.

> Independent training material. Not affiliated with or endorsed by KMC Controls, Inc.

## Run it

No build step, no dependencies.

```sh
open index.html          # or: python3 -m http.server 8080
```

## What the simulator models

A simplified but physically reasonable loop:

- **Main air** 15–30 psi powers everything (loss of air ⇒ everything fails to its spring position).
- **Thermostat** is the master: direct-acting, 3–15 psi output proportional to room temperature vs setpoint.
- **Controller series** — pick `CSC-3000` or `CSC-2000` in the controls:
  - **CSC-3000** (ports `M`, `T`, `B`, `H`, `L`, `G`) — universal reset volume controller,
    direct *or* reverse acting, differential velocity input at `H`/`L`.
  - **CSC-2000** (CSC-2003, ports `X`/`Y` velocity, `M` main, `B` branch, `T` thermostat) —
    **direct acting only**. Because both decks are then direct acting, the hot deck's 3–15 psi
    branch signal is inverted by an **RCC-1012 reversing relay** before it reaches the actuator.
    The drawing shows the controller's **port side** per KMC's CSC-2000 datasheet
    (`DS_CSC-2000_S20503501G.pdf`, "Connections" detail): a single velocity port `X` at the top,
    `Y` below it, `M`/`B` side by side at mid-body, and a larger `T` port at the bottom — drawn
    with the same body/boss/bore styling as the CSC-3000 so both controllers read consistently.
    Because those ports sit on the face rather than the rim, the tubing tucks behind the
    controller body to reach them; the LO/HI/SETPOINT calibration face is on the reverse side.
  Either way the controller takes the reset signal at `T` and drives the damper through branch `B`.
- **Reset type** direct (`LO STAT` = min, `HI STAT` = max) or reverse (swapped) — flip it
  to see what a mis-applied reset does.
- **Velocity pressure** follows `ΔP ≈ 0.5 × (flow/max)²`; the control loop, the duct airflow
  animation, the damper blade, the thermostat dial, and the live readouts all update continuously.

## Files

```
index.html        Single page: SVG system, controls, readouts, legend + "try this"
css/style.css     Theme (light/dark), layout, SVG palette, side panel
js/controllers.js Controller artwork + the calibration tuner (see below)
js/sim.js         State, tube build/plug logic, control loop, rendering, controls
```

## Controller artwork (and how to correct it)

The two controllers are **not** hand-drawn SVG. `js/controllers.js` holds a
declarative spec per model, authored **in inches** measured from the
manufacturer's dimensioned drawing:

- `size` — overall body, inches. `body.cut` — the octagon corner chamfer.
- `ports[]` — `{ id, x, y, d }`; push-on barbs on the CSC-3000 are ~0.26 in
  across, not big bosses.
- `dials[]` — the large **adjustment screws** (`loStat`, `hiStat`,
  `resetSpan`) plus the `damper` selector wheel. These are the big circles on
  the face; they are *not* ports.
- `panel` — the etched `RESET START / LO STAT ΔP / HI STAT ΔP / RESET SPAN`
  plate and its blank label.
- `caps[]` — `G`, the larger gauge-tap cap.

`PLACEMENT[model].ppu` is pixels-per-inch, so the whole part scales as one
unit and stays dimensionally faithful. **The tubing is derived from these
coordinates** (`Controllers.anchor()`), so moving a port moves its tube too —
you never edit tube paths by hand.

### Tuning workflow

1. Open the page and press **Tune controllers** (in the right-hand panel).
2. Drag any handle: ports, dials, bolt heads, and the three body corners
   (width, height, corner chamfer). Everything updates live, in inches.
3. **Copy spec**, then paste the JSON over the matching entry in
   `js/controllers.js` (`csc3000` or `csc2000`) and commit.

"Apply JSON" re-parses the textarea in place for quick experimentation without
a reload. Neither button touches the layout math — they only edit the numbers.

> Dimensions currently seeded from KMC `DS_CSC-3000` (213-035-01, 4-1/2 in
> plate) and `DS_CSC-2000` (3-1/4 x 3-9/16 in). Always confirm against the
> tag-specific drawing for the unit you are duplicating.

## Deployed

- Homelab: LXC CT 209 on r740, nginx, `https://kmc.mywork.locker` (see `../ps/kmc/`).
  Update = push here, then `ssh root@192.168.10.74 'git -C /var/www/kmc pull'`.
- **Cache note:** Cloudflare serves `index.html` dynamically (always fresh) but caches
  `js`/`css` for 4h regardless of origin headers. The asset URLs carry a `?v=N` version —
  **bump `?v=` in `index.html` whenever you change `js` or `css`** so clients pull the new files.

## Sources

Simplified from the KMC CSC-3000 Series Application Guide (`AN1205B`) and general pneumatic
control practice. The manufacturer's manual and the tag-specific airflow chart always govern.
