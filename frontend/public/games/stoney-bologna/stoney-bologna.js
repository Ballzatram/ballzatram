const meterDefinitions = [
  ["safety", "Hostage Safety", false],
  ["confidence", "Public Confidence", false],
  ["suspicion", "Suspicion", true],
  ["media", "Media Heat", true],
  ["morale", "Officer Morale", false],
  ["bullshit", "Bullshit Level", true],
];

const initialMeters = {
  safety: 68,
  confidence: 42,
  suspicion: 18,
  media: 36,
  morale: 54,
  bullshit: 38,
};

const scenes = [
  {
    title: "Opening Scene: South Gate Mall, 2:17 P.M.",
    body:
      "A pretzel kiosk has become an unofficial command post. Chief Stoney Bologna arrives wearing two radios, neither tuned to the correct channel. Inside, a tense standoff has frozen the mall concourse. Outside, three cameras are already waiting for him to say something usable.",
    actions: [
      ["Establish a calm perimeter and ask for the actual floor plan.", { safety: 8, confidence: 5, suspicion: -2, bullshit: -4 }, "Stoney briefly resembles a trained adult. Everyone is startled."],
      ["Declare Operation Marble Thunder before knowing what it means.", { confidence: 8, suspicion: 9, media: 7, bullshit: 13 }, "The name tests well with one cameraman and terribly with everyone holding a clipboard."],
      ["Ask the pretzel manager if cinnamon sugar counts as tactical dust.", { morale: 8, confidence: -2, media: 4, bullshit: 7 }, "Morale rises because the officers finally know what kind of day this is."],
    ],
  },
  {
    title: "The First Briefing",
    body:
      "A deputy offers a concise briefing: exits, family contacts, mall security radios, and one very loud escalator. Stoney nods like the information is entering a secure vault instead of bouncing off a decorative helmet.",
    actions: [
      ["Let the deputy run the facts while Stoney takes notes.", { safety: 9, morale: 7, confidence: 3, bullshit: -6 }, "The command post becomes 31 percent more useful."],
      ["Interrupt with a fake doctrine called diagonal de-escalation.", { confidence: 5, suspicion: 8, morale: -5, bullshit: 12 }, "Two officers write it down only so they can complain accurately later."],
      ["Send mall security to check every service corridor twice.", { safety: 6, media: 3, morale: 2, suspicion: 1 }, "Mall security salutes with a ring of janitor keys and professional resentment."],
    ],
  },
  {
    title: "Channel 9 Wants a Quote",
    body:
      "A reporter leans over the barricade. The red light is on. Stoney can feel his mustache trying to become policy.",
    actions: [
      ["Say the priority is safety and confirmed information.", { confidence: 8, safety: 3, media: -2, bullshit: -5 }, "It is boring, responsible, and accidentally good television."],
      ["Promise a swift, mall-specific restoration of vibes.", { confidence: 9, media: 8, suspicion: 5, bullshit: 10 }, "The phrase restoration of vibes trends locally for eleven minutes."],
      ["Point at the sky and blame barometric law enforcement pressure.", { media: 10, suspicion: 9, morale: 3, bullshit: 13 }, "Weather Desk files a complaint from the archive."],
    ],
  },
  {
    title: "Negotiation Line Opens",
    body:
      "The phone rings from inside the mall office. The person on the line sounds scared, tired, and mostly angry about being unheard. Stoney covers the receiver and asks if anyone knows the legal definition of mall.",
    actions: [
      ["Hand the phone to the trained negotiator.", { safety: 13, confidence: 5, suspicion: -4, morale: 5, bullshit: -8 }, "The negotiator does negotiator things. Stoney mouths along silently."],
      ["Read from a motivational calendar found in the kiosk.", { safety: -6, confidence: 3, media: 4, suspicion: 7, bullshit: 11 }, "April says courage is a hallway. No one is helped by April."],
      ["Ask what the person needs before offering anything.", { safety: 9, confidence: 3, suspicion: -1, bullshit: -4 }, "This works so well that Stoney suspects it is illegal."],
    ],
  },
  {
    title: "The Escalator Rumor",
    body:
      "A rumor spreads that the hostage-taker has demanded control of the north escalator. The north escalator is broken and has been broken since Tuesday.",
    actions: [
      ["Verify the rumor before reacting.", { safety: 6, suspicion: -3, media: -3, bullshit: -5 }, "The rumor collapses into a maintenance ticket."],
      ["Hold a press update about escalator sovereignty.", { confidence: 4, media: 11, suspicion: 8, bullshit: 12 }, "A mall lawyer begins aging in real time."],
      ["Use the broken escalator as a quiet evacuation landmark.", { safety: 10, morale: 4, confidence: 2, media: 2 }, "People follow directions because broken escalators are at least easy to identify."],
    ],
  },
  {
    title: "Food Court Diplomacy",
    body:
      "The command post receives a tray of cooling fries, two lemonades, and a note reading: please solve this before dinner rush. Stoney calls this a citizen mandate.",
    actions: [
      ["Send food and water through the approved negotiator channel.", { safety: 9, confidence: 6, suspicion: -2, morale: 4 }, "Human needs remain undefeated."],
      ["Stage a heroic fry inspection for the cameras.", { confidence: 5, media: 8, suspicion: 6, morale: -2, bullshit: 9 }, "The fries pass. The chief does not."],
      ["Let officers rotate for food before they get sloppy.", { morale: 11, safety: 4, confidence: 1, bullshit: -2 }, "The line steadies after everyone stops running on vending-machine peanuts."],
    ],
  },
  {
    title: "Mall Manager With a Clipboard",
    body:
      "The mall manager appears with lease maps, roof access codes, and a terrifyingly organized binder. Stoney mistrusts the binder because it contains tabs.",
    actions: [
      ["Use the binder and thank the manager publicly.", { safety: 10, confidence: 7, morale: 3, suspicion: -4, bullshit: -5 }, "The binder becomes the most qualified object at the scene."],
      ["Rename the binder the Tactical Rectangle.", { confidence: 4, media: 5, suspicion: 5, bullshit: 8 }, "The manager writes Tactical Rectangle in the notes, then underlines liability."],
      ["Ask the manager to coordinate family updates away from cameras.", { safety: 7, confidence: 4, media: -4, suspicion: -2 }, "A quiet room does more work than Stoney's last six sentences."],
    ],
  },
  {
    title: "The Live Shot Goes Sideways",
    body:
      "A national feed picks up the story. The anchor says Stoney's name correctly, which makes him dangerously confident. Someone hands him a fresh microphone.",
    actions: [
      ["Decline the spotlight and issue a short written update.", { safety: 5, confidence: 8, media: -7, suspicion: -3, bullshit: -6 }, "The written update contains facts, a shocking development."],
      ["Demonstrate a mall-safe hand signal invented seconds ago.", { confidence: 7, media: 12, suspicion: 9, morale: -3, bullshit: 12 }, "The signal is later mistaken for asking where the bathrooms are."],
      ["Put the deputy and negotiator on camera instead.", { safety: 7, confidence: 9, morale: 6, suspicion: -5, bullshit: -7 }, "Competence gets airtime. Stoney survives by standing near it."],
    ],
  },
  {
    title: "Resolution Window",
    body:
      "The negotiator reports movement toward a peaceful surrender. Families are updated. The mall manager has opened a service path. Stoney has one last chance to either help, posture, or become a permanent training slide.",
    actions: [
      ["Keep the perimeter quiet and let the plan finish.", { safety: 14, confidence: 8, morale: 6, media: -4, suspicion: -4, bullshit: -8 }, "The best command is suddenly the one that makes the least noise."],
      ["Rush to the cameras and declare pre-victory.", { safety: -8, confidence: 6, media: 13, suspicion: 12, bullshit: 14 }, "Pre-victory immediately becomes evidence."],
      ["Credit everyone else before anyone asks.", { safety: 7, confidence: 10, morale: 10, suspicion: -6, bullshit: -5 }, "Officers stare at Stoney with the haunted warmth of people seeing a miracle."],
    ],
  },
];

let meters = { ...initialMeters };
let sceneIndex = 0;
let lastDispatch = "Opening blotter: choose how Stoney enters the record.";

const titleNode = document.querySelector("[data-scene-title]");
const bodyNode = document.querySelector("[data-scene-body]");
const countNode = document.querySelector("[data-scene-count]");
const actionsNode = document.querySelector("[data-actions]");
const logNode = document.querySelector("[data-dispatch-log]");
const meterListNode = document.querySelector("[data-meter-list]");
const resetButton = document.querySelector("[data-reset-game]");

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function applyEffect(effect) {
  Object.entries(effect).forEach(([key, amount]) => {
    meters[key] = clamp((meters[key] || 0) + amount);
  });
}

function renderMeters() {
  meterListNode.replaceChildren();
  meterDefinitions.forEach(([key, label, hot]) => {
    const value = meters[key];
    const meter = document.createElement("div");
    meter.className = `meter ${hot ? "is-hot" : ""}`;

    const row = document.createElement("div");
    row.className = "meter__row";
    row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;

    const bar = document.createElement("div");
    bar.className = "meter__bar";
    const fill = document.createElement("div");
    fill.className = "meter__fill";
    fill.style.setProperty("--value", `${value}%`);
    bar.append(fill);

    meter.append(row, bar);
    meterListNode.append(meter);
  });
}

function endingForMeters() {
  if (meters.safety < 42) {
    return {
      title: "Ending: The Adults Take the Clipboard",
      body:
        "Hostage safety dipped too far, so the deputy, negotiator, and mall manager quietly move Stoney behind a pretzel warmer and finish the resolution without him. No one is seriously hurt, but the after-action report uses the phrase leadership humidity.",
    };
  }

  if (meters.suspicion >= 78 || meters.bullshit >= 88) {
    return {
      title: "Ending: Press Conference Collapse",
      body:
        "Suspicion outruns the story. Reporters compare Stoney's claims to the actual timeline and discover several tactical doctrines made of wet cardboard. The hostages get out safely, but Stoney is reassigned to ribbon-cutting preparedness.",
    };
  }

  if (meters.confidence >= 76 && meters.media >= 72) {
    return {
      title: "Ending: The Made-for-TV Chief",
      body:
        "Public confidence and media heat fuse into a terrible spotlight. The crisis ends peacefully, and Stoney becomes a regional television fixture explaining leadership near escalators. Experts frown. Viewers remain confused but entertained.",
    };
  }

  if (meters.morale <= 28) {
    return {
      title: "Ending: Mutiny by Sigh",
      body:
        "Officer morale bottoms out. Nobody disobeys exactly, but every radio reply arrives wrapped in a sigh. The trained staff still resolve the scene peacefully, then request a seminar titled Please Stop Inventing Commands.",
    };
  }

  if (meters.safety >= 78 && meters.suspicion < 58) {
    return {
      title: "Ending: Competence by Proximity",
      body:
        "The hostages are safe, the cameras never quite catch the fraud, and Stoney accidentally lets competent people work. Ballzatram files the case as a playable oddity and underlines accidentally three times.",
    };
  }

  return {
    title: "Ending: Under Review",
    body:
      "The scene resolves without disaster, but the paperwork smells like nacho cheese and unresolved questions. The paper prints a cautious headline: Local Chief Maybe Helped, Possibly Nearby.",
  };
}

function renderEnding() {
  const ending = endingForMeters();
  countNode.textContent = "Final clipping";
  titleNode.textContent = ending.title;
  bodyNode.textContent = ending.body;
  actionsNode.replaceChildren();

  const endingCard = document.createElement("div");
  endingCard.className = "ending-card";
  endingCard.textContent = "Case closed. Reset the case to try a different flavor of public nonsense.";
  actionsNode.append(endingCard);
  logNode.textContent = lastDispatch;
}

function renderScene() {
  renderMeters();
  if (sceneIndex >= scenes.length) {
    renderEnding();
    return;
  }

  const scene = scenes[sceneIndex];
  countNode.textContent = `Scene ${sceneIndex + 1} of ${scenes.length}`;
  titleNode.textContent = scene.title;
  bodyNode.textContent = scene.body;
  logNode.textContent = lastDispatch;
  actionsNode.replaceChildren();

  scene.actions.forEach(([label, effect, note]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      applyEffect(effect);
      lastDispatch = note;
      sceneIndex += 1;
      renderScene();
    });
    actionsNode.append(button);
  });
}

resetButton.addEventListener("click", () => {
  meters = { ...initialMeters };
  sceneIndex = 0;
  lastDispatch = "Opening blotter: choose how Stoney enters the record.";
  renderScene();
});

renderScene();
