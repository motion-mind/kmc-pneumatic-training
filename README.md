# Pneumatic VAV Trainer

A single-page, interactive visual tutorial for a pneumatic VAV terminal built around a
KMC **CSC-3000**–style reset volume controller and a pneumatic thermostat. Click any tube
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
- **Controller** (ports `M`, `T`, `B`, `H`, `L`, `G`) takes the reset signal at `T` and the
  velocity pressure from the sensor at `H`/`L`, and drives the damper through branch `B`.
- **Reset type** direct (`LO STAT` = min, `HI STAT` = max) or reverse (swapped) — flip it
  to see what a mis-applied reset does.
- **Velocity pressure** follows `ΔP ≈ 0.5 × (flow/max)²`; the control loop, the duct airflow
  animation, the damper blade, the thermostat dial, and the live readouts all update continuously.

## Files

```
index.html     Single page: SVG system, controls, readouts, short legend + "try this"
css/style.css  Theme (light/dark), layout, SVG palette, side panel
js/sim.js      State, tube build/plug logic, control loop, rendering, controls
```

## Deployed

- Homelab: LXC CT 209 on r740, nginx, `https://kmc.mywork.locker` (see `../ps/kmc/`).
  Update = push here, then `ssh root@192.168.10.74 'git -C /var/www/kmc pull'`.
- **Cache note:** Cloudflare serves `index.html` dynamically (always fresh) but caches
  `js`/`css` for 4h regardless of origin headers. The asset URLs carry a `?v=N` version —
  **bump `?v=` in `index.html` whenever you change `js` or `css`** so clients pull the new files.

## Sources

Simplified from the KMC CSC-3000 Series Application Guide (`AN1205B`) and general pneumatic
control practice. The manufacturer's manual and the tag-specific airflow chart always govern.
