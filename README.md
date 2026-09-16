# Pneumatic VAV & Thermostat Training

A self-contained, zero-build training website for **pneumatic VAV box controllers** and
**pneumatic thermostats**, built around the KMC Controls **CSC-3000 series** reset volume
controller and KMC pneumatic thermostats. It teaches fundamentals first, then setup,
calibration, and troubleshooting, with quizzes and calculators.

> Independent training material. Not affiliated with or endorsed by KMC Controls, Inc.

## Run it

There is no build step, no dependencies, and no server required.

```sh
# just open it
open index.html            # macOS
xdg-open index.html        # Linux

# or serve it statically (recommended so relative paths behave identically to production)
python3 -m http.server 8080
# then visit http://localhost:8080/
```

Open `index.html` from the project root. All navigation uses relative paths and works
from the filesystem or any static host (nginx, GitHub Pages, Caddy, a Proxmox LXC, etc.).

## Contents

```
index.html                    Home: who this is for, learning path, quick pressure reference
pages/
  fundamentals.html           Unit 01 — air supply, main vs branch, restrictor & nozzle-flapper,
                              relays, DA/RA, actuators, P-E switches, tools
  thermostats.html            Unit 02 — thermostat operation, types, installation, calibration,
                              day/night setback, troubleshooting
  vav-controllers.html        Unit 03 — KMC CSC-3000: ports, reset type, damper action,
                              reset start & span, models & cross-references, cautions
  setup.html                  Unit 04 — pre-checks, thermostat calibration, and the KMC
                              direct/reverse reset min/max procedures, plus a record sheet
  troubleshooting.html        Unit 05 — signal-chain method, gauge interpretation, decision
                              trees by symptom, phantom faults
  practice.html               Unit 06 — ΔP→CFM calculator, reset-setpoint calculator,
                              worked field scenarios, mixed quiz
  reference.html              Printable reference: pressures, port codes, cross-references,
                              formulas, glossary, sources
css/style.css                 Theme (light/dark), layout, components, print styles
js/site.js                    Theme toggle, nav highlighting, auto table of contents,
                              quiz engine, calculators
js/quizzes.js                 Question banks (fundamentals, thermostats, vav, setup,
                              troubleshooting, mixed)
```

## Editing

- **Add a question:** append an object to the matching array in `js/quizzes.js`, then the
  page's `<div class="quiz" data-quiz="...">` picks it up automatically.
- **Add a calculator:** add a `<div class="calc" data-calc="...">` and a builder function in
  `js/site.js` (`initCalcs`).
- **Add a page:** copy the header/footer from an existing page, update the nav, and add the
  new link to every page's `<nav class="site-nav">`. `site.js` highlights the active link by
  filename automatically.
- **Theme colors** live in the `:root` and `body.theme-dark` blocks of `css/style.css`.

## Sources

Primary technical source: KMC Controls, *CSC-3000 Series Pneumatic VAV Reset Volume
Controllers — Application Guide*, `AG_CSC-3000_SAN1205B-RevH`. Thermostat content also
references KMC CTC-1600 / CTE-5100 series documentation. General pneumatic practice fills in
thermostat calibration and day/night methods. The manufacturer's manual and the box's own
airflow chart always govern over this site.

## Deploying

Any static host works. For the homelab pattern used by the sibling `hvacsim` project, clone
this directory into an LXC and point nginx at it:

```sh
git clone <this repo> /var/www/pneumatic-training
# nginx root /var/www/pneumatic-training;
# update with: git -C /var/www/pneumatic-training pull
```

## License

No license is declared. Educational content; verify all procedures against the current
manufacturer documentation before field use.
