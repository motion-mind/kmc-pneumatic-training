var QUIZZES = {

  fundamentals: [
    {
      q: "What is the standard proportional pneumatic control (branch) signal range?",
      opts: ["0\u201310 psi", "3\u201315 psi", "15\u201330 psi", "0\u201320 psi"],
      answer: 1,
      why: "3\u201315 psi is the universal branch/output range for proportional pneumatic control. 15\u201330 psi is main air, not a signal. A 3\u201315 signal lets a controller express \u201Cfully one way\u201D at ~3 psi and \u201Cfully the other way\u201D at ~15 psi, with everything in between proportional."
    },
    {
      q: "On a KMC CSC-3000 series controller, main air connects to which port, and at what supply pressure?",
      opts: ["Port B at 3\u201315 psi", "Port M at 15\u201330 psi", "Port T at 15\u201330 psi", "Port G at 0\u201310 psi"],
      answer: 1,
      why: "Main air goes to port <code>M</code> at 15\u201330 psi (KMC's Application Guide). <code>B</code> is the branch to the damper actuator, <code>T</code> is the thermostat reset signal, and <code>G</code> is a plugged test/relief port."
    },
    {
      q: "What is the function of the restrictor in a pneumatic device?",
      opts: [
        "It filters dirt out of the main air",
        "It limits supply airflow so the nozzle/flapper can bleed and modulate branch pressure",
        "It boosts branch pressure up to main pressure",
        "It converts pressure to an electrical signal"
      ],
      answer: 1,
      why: "The restrictor is a tiny fixed orifice in the supply path. It feeds a chamber that also vents through a nozzle. Because supply is limited, how far the flapper opens the nozzle determines the balance point \u2014 and therefore the branch pressure."
    },
    {
      q: "A single-pipe pneumatic thermostat uses how many tubes?",
      opts: ["One", "Two", "Three", "Four"],
      answer: 0,
      why: "In a single-pipe system the main air and the branch share one tube; the device contains the restrictor and bleeds through its own nozzle. Two-pipe systems run a separate main and branch line."
    },
    {
      q: "Which device converts a pneumatic pressure signal into electrical contacts \u2014 for example, to start a fan or enable electric heat?",
      opts: ["A relay", "A pneumatic-electric (P-E) switch", "An EP transducer", "A restrictor"],
      answer: 1,
      why: "A P-E switch makes or breaks electrical contacts at an adjustable pressure setpoint. An EP (electric-to-pneumatic) transducer does the opposite: it converts an electrical signal into a pneumatic output."
    },
    {
      q: "Why must pneumatic control air be clean, dry, and oil-free?",
      opts: [
        "It is only a manufacturer preference",
        "Oil and moisture clog nozzles and orifices and cause drift and eventual failure",
        "Wet air increases pressure too much",
        "Dry air is needed to lubricate actuators"
      ],
      answer: 1,
      why: "KMC explicitly warns that any medium other than clean, dry control air \u2014 oil or moisture contamination \u2014 will cause the device to fail. Tiny nozzles and restrictors are easily blocked, and moisture causes corrosion, sticking, and erratic output."
    },
    {
      q: "Which instrument reads a VAV inlet's velocity pressure (\u0394P) so you can find airflow from the box chart?",
      opts: ["A 0\u201330 psi pressure gauge", "A Magnehelic differential pressure gauge", "A multimeter", "A clamp meter"],
      answer: 1,
      why: "A Magnehelic (differential) gauge reads the small velocity pressure, typically on a 0\u20130.5 or 0\u20131 in w.c. scale. The box airflow chart converts that \u0394P to CFM."
    },
    {
      q: "You need a quick pressure reading off the inlet sensor. Where must you NOT connect the Magnehelic?",
      opts: [
        "Across the H and L sensor taps",
        "Directly to the main air line at roughly 20 psi",
        "Teed between the controller and the \u0394P pickup",
        "To the airflow sensor's differential ports"
      ],
      answer: 1,
      why: "KMC warns that connecting a low-range Magnehelic (for example 0\u20130.5 in w.c.) to main air at roughly 20 psi (about 554 in w.c.) will destroy the gauge. Use a 0\u201330 psi gauge for main air."
    }
  ],

  thermostats: [
    {
      q: "How is a pneumatic thermostat normally calibrated at mid-scale?",
      opts: [
        "Set the dial to the actual room temperature and turn the calibration screw until branch reads half of the 3\u201315 range (about 9 psi)",
        "Set the calibration screw wide open and read main air",
        "Set the dial to 55\u00B0F and adjust until branch reads 15 psi",
        "Disconnect T and adjust until branch reads 0 psi"
      ],
      answer: 0,
      why: "The robust field method is to compare the dial against a known-accurate thermometer at the sensor, then adjust the calibration (zero) screw so the branch sits at mid-scale \u2014 about 9 psi for a 3\u201315 signal. That centers the proportional band on the setpoint."
    },
    {
      q: "A thermostat whose branch output falls as the sensed temperature rises is:",
      opts: ["Direct acting", "Reverse acting", "Single acting", "Pilot acting"],
      answer: 1,
      why: "Reverse acting (RA) output decreases as the sensed variable increases. Direct acting (DA) output increases with the sensed variable. Cooling thermostats are commonly DA, heating thermostats commonly RA \u2014 always confirm the actual device."
    },
    {
      q: "\u201CThrottling range\u201D on a pneumatic thermostat describes:",
      opts: [
        "The maximum pressure the thermostat can output",
        "The temperature change required to move the branch through its full output range",
        "The gap between heating and cooling setpoints",
        "The time it takes to reach setpoint"
      ],
      answer: 1,
      why: "Throttling range (proportional band) is the temperature span that drives branch from one end of the range to the other. A narrow range gives tighter control but more hunting; a wide range is more stable but less precise."
    },
    {
      q: "What is the \u201Cdeadband\u201D on a dual temperature (heating/cooling) pneumatic thermostat?",
      opts: [
        "The pressure at which both outputs are at 15 psi",
        "The temperature gap between the heating and cooling changeover points where neither output is calling",
        "The time delay before the fan starts",
        "The loss of pressure through a restriction"
      ],
      answer: 1,
      why: "Deadband is the neutral zone between heating and cooling setpoints. A wider deadband prevents the heating and cooling outputs from fighting; too wide, and the space drifts uncomfortably before anything responds."
    },
    {
      q: "What is the purpose of a night (setback) main-air connection on a pneumatic thermostat?",
      opts: [
        "It supplies extra air for faster response",
        "It shifts the thermostat to a different setpoint, usually under time-clock or solenoid control",
        "It filters the branch air",
        "It disables the thermostat completely"
      ],
      answer: 1,
      why: "A separate night main-air line changes the effective setpoint when energized \u2014 the thermostat has separate day and night calibration/adjustment. This is how unoccupied setback was done long before DDC."
    },
    {
      q: "A thermostat shows 0 psi branch but has good main air. Which is the most likely cause?",
      opts: [
        "The room is too warm",
        "A blocked nozzle/orifice, a stuck flapper, or a badly mis-set calibration",
        "The dial is set too high",
        "The actuator is too large"
      ],
      answer: 1,
      why: "Good main air with no branch output points inside the thermostat: a clogged nozzle or restrictor, a stuck or damaged flapper, or calibration run to an extreme. Remember that 0 psi branch is also a legitimate \u201Cfull cool\u201D or \u201Cfull heat\u201D command on some actions, so check the action before condemning it."
    },
    {
      q: "Which mounting location will most likely cause a pneumatic thermostat to sense wrong?",
      opts: [
        "An interior wall at breathing height",
        "On an exterior wall, in direct sun, or near a heat-producing appliance",
        "Where room air circulates freely",
        "Away from supply diffusers"
      ],
      answer: 1,
      why: "Thermostats read the air at their sensing element. Exterior walls, direct sun, door drafts, and heat sources (copiers, coffee makers, monitors) all bias the reading. No amount of calibration fixes a bad location."
    }
  ],

  vav: [
    {
      q: "In a pneumatic VAV control sequence, the room thermostat is the ______ controller and the KMC CSC-3000 is the ______ controller.",
      opts: [
        "sub-master / master",
        "master / sub-master (reset volume)",
        "pilot / main",
        "day / night"
      ],
      answer: 1,
      why: "The thermostat is the master: it sends a 3\u201315 psi reset signal to port T. The CSC-3000 is a sub-master reset volume controller: it takes that reset signal and a velocity-pressure input and positions the damper to a flow setpoint."
    },
    {
      q: "What is the factory reset span on a KMC CSC-3000, and should you change it?",
      opts: [
        "3 psi, and yes, always reset it",
        "5 psi, and no \u2014 leave it at the factory setting in almost every application",
        "10 psi, and change it to 5",
        "15 psi, and change it to 3"
      ],
      answer: 1,
      why: "KMC states the reset span is factory set at 5 psi, is standard in almost all applications, and should be left alone unless genuinely necessary. Changing it may force you to redo the minimum and maximum flow calibration."
    },
    {
      q: "Cooling primary air with a direct-acting (DA) room thermostat calls for which reset type?",
      opts: ["Direct reset", "Reverse reset", "No reset", "Night reset"],
      answer: 0,
      why: "KMC's table: cooling primary + DA thermostat = Direct Reset. Cooling primary + RA = Reverse Reset; heating primary + DA = Reverse Reset; heating primary + RA = Direct Reset. Get this wrong and the box controls backwards."
    },
    {
      q: "On a DIRECT reset controller calibration, LO STAT is set to ______ and HI STAT is set to ______.",
      opts: [
        "minimum flow / maximum flow",
        "maximum flow / minimum flow",
        "reset start / reset span",
        "damper closed / damper open"
      ],
      answer: 0,
      why: "Direct reset: start with the thermostat signal removed, set LO STAT to the desired minimum, then call for full flow and set HI STAT to the desired maximum. Reverse reset swaps them: LO STAT = maximum, HI STAT = minimum."
    },
    {
      q: "Which port on the CSC-3000 receives the thermostat's reset output?",
      opts: ["M", "B", "T", "G"],
      answer: 2,
      why: "T is the thermostat (reset) port. M is main air, B is the branch to the damper actuator, H and L are the high (total) and low (static) airflow sensor taps, and G is a plugged test port."
    },
    {
      q: "The VAV airflow sensor's HIGH (total) pressure tap connects to which controller port?",
      opts: ["Port H", "Port L", "Port M", "Port T"],
      answer: 0,
      why: "Total (high) goes to H and static (low) goes to L. Reversed H/L gives a negative or nonsense differential, so the controller can never hold the right flow."
    },
    {
      q: "When sequencing a heating valve or a pneumatic-electric switch off a CSC-3000, you must sequence using:",
      opts: [
        "the actuator's spring range",
        "the controller's reset range",
        "the main air pressure",
        "the room thermostat's throttling range"
      ],
      answer: 1,
      why: "KMC is explicit: sequence with the controller's reset range, NOT the actuator's spring range. The reset range is where the flow setpoint actually moves, so that is where reheat or a P-E switch should be triggered."
    },
    {
      q: "KMC warns that turning the LO STAT \u0394P knob fully clockwise past a zero minimum causes:",
      opts: [
        "a negative reset condition that narrows the effective reset span",
        "a permanent gain of 2 psi",
        "the controller to switch to Normally Closed",
        "main air to leak at port M"
      ],
      answer: 0,
      why: "Past the zero-minimum point the knob goes into negative reset. The controller must then overcome that negative offset before reset begins, which narrows and shifts the effective reset span. To get zero minimum, adjust until the damper just cracks open, then back off about a quarter turn."
    }
  ],

  setup: [
    {
      q: "What is the first thing to verify before calibrating any pneumatic device?",
      opts: [
        "The room thermostat setpoint",
        "Adequate, clean, dry main air at port M",
        "The color of the tubing",
        "The building schedule"
      ],
      answer: 1,
      why: "Almost every mysterious pneumatic fault traces back to air supply. Confirm 15\u201330 psi at M (KMC spec for the CSC-3000), that it is clean and dry, and that it holds steady under load. Only then does calibration mean anything."
    },
    {
      q: "After making an airflow adjustment on a CSC-3000, how long should you wait before judging the result?",
      opts: ["2\u20133 seconds", "20\u201330 seconds", "5 minutes", "No wait is needed"],
      answer: 1,
      why: "KMC's procedure: wait for flow to stabilize, usually 20\u201330 seconds, before making further adjustments. Adjust no more than about a half rotation at a time and watch the damper shaft for motion between adjustments."
    },
    {
      q: "What tubing does KMC specify for the CSC-3000 push-on fittings?",
      opts: ["1/8\" O.D. copper", "1/4\" (5 mm) O.D. FR tubing", "3/8\" I.D. vinyl", "Any flexible tube"],
      answer: 1,
      why: "1/4\" (5 mm) O.D. FR tubing on the push-on fittings. Trim or replace tubing that has stretched, cracked, become brittle, or discolored, because microcracks and loose ends leak and skew every pressure reading."
    },
    {
      q: "What simple tool does KMC suggest for finding small leaks at an actuator diaphragm or fitting?",
      opts: ["A pressure washer", "A squeeze bulb", "A voltmeter", "A smoke pencil"],
      answer: 1,
      why: "A squeeze bulb lets you pressurize a small section and watch for pressure loss. Even a small actuator diaphragm leak can rob enough air that the actuator will not stroke fully."
    },
    {
      q: "To simulate \u201Cno thermostat signal\u201D during direct reset calibration, you should:",
      opts: [
        "Cap port T tightly",
        "Disconnect the T tubing and leave the port open (or temporarily remove the G port plug)",
        "Set main air to zero",
        "Disconnect the damper actuator"
      ],
      answer: 1,
      why: "Either disconnect the thermostat tubing from T and leave the port open, or remove the rubber plug from the G test port. Both relieve the reset pressure. Never plug the port itself."
    },
    {
      q: "Why does the mounting plane matter on a CSC-3000?",
      opts: [
        "It only affects appearance",
        "These controllers are position sensitive and must be mounted and calibrated in the same plane",
        "It changes the main air pressure",
        "It sets the damper action"
      ],
      answer: 1,
      why: "The CSC-3000 is position sensitive. If you calibrate it lying on a bench and then mount it vertically (or the reverse), the minimum and maximum flow settings will be off and must be redone."
    },
    {
      q: "Before blowing out a dirty velocity airflow sensor, what must you do?",
      opts: [
        "Increase main air pressure",
        "Disconnect the sensor from the controller first",
        "Close the damper",
        "Remove the thermostat"
      ],
      answer: 1,
      why: "KMC says to disconnect the sensor from the controller before attempting to blow it clean. Blowing into a connected controller can drive pressure and debris the wrong way and damage or contaminate the controller."
    },
    {
      q: "Mounting a replacement controller is only half the job. What else does KMC require after replacement?",
      opts: [
        "Nothing \u2014 it is pre-calibrated",
        "Adjustments and calibration of minimum and maximum flow",
        "A new thermostat",
        "A new airflow sensor"
      ],
      answer: 1,
      why: "KMC's cross-reference note is explicit: after replacing the controller, adjustments and calibration will be necessary. Always recommission min/max flow and verify reset start/span."
    }
  ],

  troubleshooting: [
    {
      q: "A VAV box sits at full airflow no matter what the thermostat does. What should you check FIRST?",
      opts: [
        "Replace the thermostat",
        "Main air at port M and a real reset signal at port T",
        "Re-pipe the ductwork",
        "Reconfigure the AHU",
        "Reprogram the schedule"
      ],
      answer: 1,
      why: "Establish the signal chain before condemning parts: is there adequate main air at M, and does the thermostat actually vary pressure at T as its setpoint is changed? If T is dead at 0 or pinned at 15\u201320, the problem is upstream of the box controller."
    },
    {
      q: "A damper will not stroke, but main air at M is a solid 20 psi. Which is the most likely cause?",
      opts: [
        "The building compressor is off",
        "A binding damper/linkage or a leaking actuator diaphragm",
        "The thermostat is calibrated too low",
        "The velocity sensor is reversed"
      ],
      answer: 1,
      why: "With good air supply, failure to stroke points to mechanical resistance or air loss at the actuator. Check that the actuator can drive the damper full open to full close, look for binding, and leak-test the diaphragm/fittings with a squeeze bulb."
    },
    {
      q: "Every pneumatic box on a floor misbehaves at the same time. What is the most probable cause?",
      opts: [
        "All the thermostats failed together",
        "A building-level air supply problem \u2014 compressor, dryer, filter, or main regulator",
        "The VAV boxes were all installed backwards",
        "The airflow charts are wrong"
      ],
      answer: 1,
      why: "Simultaneous, system-wide symptoms point to the shared air supply, not individual boxes. Check compressor operation, dryer performance, filter/separator condition, and the building main-air regulator. Oil or moisture in the main air will degrade every device at once."
    },
    {
      q: "A box cannot reach its design maximum airflow even with the damper driven open. Which check is NOT relevant?",
      opts: [
        "Upstream duct static pressure from the AHU",
        "The HI STAT setting and full damper stroke",
        "The color of the low-voltage wiring to the P-E switch",
        "Velocity sensor condition and its H/L connection"
      ],
      answer: 2,
      why: "A VAV box cannot deliver air the AHU is not supplying, so upstream static matters. HI STAT caps the maximum; a partially stroking damper caps it too; and a dirty/reversed velocity sensor gives a false low \u0394P. Wire color is not a diagnostic factor."
    },
    {
      q: "A box slams fully shut at its minimum position. The likely cause is:",
      opts: [
        "The HI STAT knob was set too high",
        "The LO STAT knob was run past the zero-minimum point into negative reset",
        "The thermostat is reverse acting",
        "Main air is too low"
      ],
      answer: 1,
      why: "KMC warns specifically about this: turning the LO STAT \u0394P knob fully clockwise past zero creates a negative reset condition. The controller overdrives toward closed and loses effective reset range. Set zero minimum by cracking the damper open, then backing off about a quarter turn."
    },
    {
      q: "A VAV box responds backwards: airflow increases on a heating call. The most likely cause is:",
      opts: [
        "The damper actuator needs oil",
        "A reset-type or thermostat-action mismatch (direct vs reverse)",
        "The Magnehelic is out of range",
        "The box is oversized"
      ],
      answer: 1,
      why: "Backwards control is the classic signature of the wrong reset type for the thermostat's action, or the wrong N.O./N.C. damper selection. Re-apply KMC's reset-type table (primary air temperature + thermostat action) and verify the damper-action arrows are aligned."
    },
    {
      q: "Reheat runs and fights the cooling airflow on the same box. Which mistake best explains it?",
      opts: [
        "Sequencing the reheat off the actuator spring range instead of the controller reset range",
        "Using 1/4\" tubing",
        "Mounting the thermostat on an interior wall",
        "Setting the reset span to 5 psi"
      ],
      answer: 0,
      why: "KMC requires sequencing with the controller's reset range, not the actuator's spring range. Triggering reheat off the spring range starts heating at the wrong airflow and produces simultaneous heating and cooling."
    },
    {
      q: "A box's indicated airflow is consistently low and the Magnehelic needle barely moves. Which is LEAST likely?",
      opts: [
        "H and L sensor taps are reversed",
        "The velocity pickup is dirty or mis-placed",
        "The tubing between sensor and controller is kinked or leaking",
        "The room thermostat's dial is set a degree too high"
      ],
      answer: 3,
      why: "A weak or wrong differential points at the sensing path: reversed H/L, a dirty or wrongly placed pickup, or leaking/kinked tubing. The thermostat setpoint changes the target flow, not the measured velocity pressure, so it would not make the needle barely move."
    }
  ],

  mixed: [
    {
      q: "Main air at port M reads 26 psi. Is that acceptable for a CSC-3000?",
      opts: ["No, it must be exactly 20 psi", "Yes, the spec is 15\u201330 psi", "No, it must be 3\u201315 psi", "Only if the dryer is off"],
      answer: 1,
      why: "KMC specifies 15\u201330 psi for the CSC-3000 main air port M. 26 psi is within range. The 3\u201315 psi range is the control signal, not main air."
    },
    {
      q: "You replace an old CSC-2008 with a CSC-3021. What must you do before leaving?",
      opts: [
        "Nothing, it drops in",
        "Calibrate minimum and maximum flow and verify reset start/span and damper action",
        "Replace the thermostat",
        "Replace the airflow sensor"
      ],
      answer: 1,
      why: "KMC's cross-reference says the CSC-3021 replaces the CSC-2008, and that after replacement adjustments and calibration are necessary. Re-commission min/max, confirm the reset range matches the sequence, and check N.O./N.C. damper action."
    },
    {
      q: "Where does airflow (CFM) come from once you read velocity pressure?",
      opts: [
        "A universal table that works for every box",
        "The box-specific Magnehelic-to-CFM chart affixed to that VAV box",
        "The building automation system only",
        "Multiply \u0394P by 100"
      ],
      answer: 1,
      why: "The conversion depends on the box's inlet size and flow sensor, so it uses the chart specific to that box. KMC warns that an example chart is for illustration only and must not be used to calibrate a real box."
    },
    {
      q: "Which statement about direct and reverse acting is correct?",
      opts: [
        "Direct acting output rises with the sensed variable; reverse acting output falls",
        "Direct acting is only used in heating",
        "Reverse acting always outputs 3 psi at full load",
        "The terms apply only to actuators"
      ],
      answer: 0,
      why: "Direct acting (DA) output increases as the sensed variable increases; reverse acting (RA) output decreases. The convention applies to thermostats, controllers, and actuators, and it must be matched to the application and reset type."
    },
    {
      q: "A thermostat has 2 psi on its branch and the room is well below setpoint in cooling. What is the box most likely doing?",
      opts: ["Full cooling", "Minimum or closed airflow", "Maximum airflow", "Hunting"],
      answer: 1,
      why: "With a 3\u201315 branch and a DA cooling thermostat, low output (near or below 3 psi) commands minimum/closed. If the room is still too warm, the real question is why the thermostat is not calling \u2014 sensor location, calibration, or a lost reset signal."
    },
    {
      q: "Which of these is the strongest early warning that moisture and oil are entering the control air?",
      opts: [
        "Devices drift and stick, and actuators respond sluggishly across many boxes",
        "The room gets too hot in winter",
        "Main air pressure reads exactly 20 psi",
        "The building schedule changes"
      ],
      answer: 0,
      why: "Contamination shows up as widespread drift, sticking, and sluggish response because nozzles and orifices foul and diaphragms degrade. It is a supply-side problem, so servicing individual devices will not fix it."
    }
  ]
};
