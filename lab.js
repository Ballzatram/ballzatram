const LAB_FAVORITES_KEY = "ballzatram.labFavorites.v1";
const LAB_SUGGESTIONS_KEY = "ballzatram.labSuggestions.v1";
const LAB_VOTES_KEY = "ballzatram.labVotes.v1";

const fallbackInventory = [
  {
    id: "parcel",
    title: "Parcel",
    category: "Tool",
    href: "/tools/parcel/index.html",
    status: "Prototype",
    shortDescription: "A thesis-to-shortlist land research desk with source quality labels.",
    whyItExists: "To turn vague land searches into a structured diligence queue.",
  },
  {
    id: "ai-edit",
    title: "AI Edit",
    category: "AI Toy",
    href: "/ai-edit-factory/",
    status: "Backend Required",
    shortDescription: "A rights-gated short-form video edit factory.",
    whyItExists: "To help creators turn approved media into practical edit recipes and rendered clips.",
  },
  {
    id: "weather-desk",
    title: "Weather Desk",
    category: "Tool",
    href: "/weather-bot.html",
    status: "Under Review",
    shortDescription: "A weather-market research worksheet for risk-adjusted paper alerts.",
    whyItExists: "To practice settlement review, uncertainty, and paper sizing.",
  },
  {
    id: "quant-library",
    title: "Quant Library",
    category: "Tool",
    href: "/quant-library",
    status: "Prototype",
    shortDescription: "An explainable market analysis desk with teaching cards and risk prompts.",
    whyItExists: "To make macro research workflows visible, inspectable, and easier to question.",
  },
  {
    id: "stoney-bologna",
    title: "Stoney Bologna's Bullshit Simulator 7",
    category: "Game",
    href: "/games/stoney-bologna/index.html",
    status: "Playable Oddity",
    shortDescription: "A police-blotter text adventure about bluffing through a mall crisis without letting the cameras notice.",
    whyItExists: "To keep the living lab's public nonsense playable and honestly labeled.",
  },
  {
    id: "econ-arcade",
    title: "Econ Arcade",
    category: "Game",
    href: "/econ-arcade/index.html",
    status: "Playable Archive",
    shortDescription: "A cabinet of economics games, simulations, and learning labs.",
    whyItExists: "To teach economic intuition through interaction.",
  },
  {
    id: "strategy-studio",
    title: "Strategy Studio",
    category: "Simulation",
    href: "/econ-arcade/platform.html",
    status: "Playable Archive",
    shortDescription: "A strategy-learning map for rational choice, games, auctions, and bargaining.",
    whyItExists: "To let users poke at game theory without needing a textbook first.",
  },
  {
    id: "central-banker",
    title: "Central Banker",
    category: "Game",
    href: "/games/central-bank.html",
    status: "Prototype Relic",
    shortDescription: "A fictional central bank game about shocks, credibility, and policy lags.",
    whyItExists: "To make macro policy tradeoffs tangible.",
  },
  {
    id: "penitent-2",
    title: "The Penitent 2",
    category: "Writing/Story",
    href: "/penitent",
    status: "Back Issue",
    shortDescription: "A strange playable manuscript, relic archive, and rhythm-battle experiment.",
    whyItExists: "To keep Ballzatram weird and artifact-driven.",
  },
  {
    id: "signal-vs-noise",
    title: "Signal vs Noise",
    category: "Roadmap",
    href: "",
    status: "Roadmap",
    shortDescription: "A future lab about noisy indicators and forecast failure.",
    whyItExists: "To help users practice judging evidence before trusting a model.",
  },
  {
    id: "tariff-lab",
    title: "Tariff Lab",
    category: "Roadmap",
    href: "",
    status: "Roadmap",
    shortDescription: "A future lab for tariffs, retaliation, pass-through, and welfare loss.",
    whyItExists: "To make international tradeoffs playable.",
  },
];

const starterRoadmapIdeas = [
  { id: "spin-the-lab", title: "Spin the Lab discovery machine", category: "Utility", description: "A playful way to wander across the archive." },
  { id: "saved-favorites", title: "Saved favorites", category: "Utility", description: "A member shelf for tools and oddities worth revisiting." },
  { id: "member-only-drops", title: "Member-only drops", category: "Weird Experiment", description: "Monthly medleys from the workshop floor." },
  { id: "ai-edit-hardening", title: "AI Edit deployment hardening", category: "AI Toy", description: "Render reliability, queues, quotas, and storage policy." },
  { id: "econ-progress-saves", title: "Econ Arcade progress saves", category: "Game", description: "Save learning progress across games and labs." },
  { id: "quant-library-export-share", title: "Quant Library export/share", category: "Tool", description: "Cleaner report exports once storage and user scope exist." },
  { id: "parcel-source-verification", title: "Parcel source verification", category: "Tool", description: "Better source-quality checks without pretending links are truth." },
  { id: "strategy-journals", title: "Strategy journals", category: "Writing/Story", description: "A place to save debriefs, notes, and strange decisions." },
  { id: "monthly-weird-tool-drop", title: "Monthly weird-tool drop", category: "Weird Experiment", description: "A small odd machine shipped on a regular cadence." },
  { id: "penitent-2-expansion", title: "The Penitent 2 expansion", category: "Writing/Story", description: "More relics, hymns, and playable manuscript pages." },
  { id: "signal-vs-noise", title: "Signal vs Noise", category: "Simulation", description: "A lab for forecast uncertainty and evidence weighting." },
  { id: "tariff-lab", title: "Tariff Lab", category: "Simulation", description: "A trade-policy simulator with retaliation and pass-through." },
];

let labInventory = fallbackInventory;

function readStoredArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readStoredObject(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredObject(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function pickRandom(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function buildSpinMedley() {
  const tools = labInventory.filter((item) => item.category === "Tool" || item.category === "AI Toy" || item.category === "Utility");
  const games = labInventory.filter((item) => item.category === "Game" || item.category === "Simulation");
  const oddities = labInventory.filter((item) => item.category === "Weird Experiment" || item.category === "Writing/Story" || item.status === "Prototype" || item.status === "Backend Required");
  const roadmap = labInventory.filter((item) => item.status === "Roadmap" || item.category === "Roadmap");
  const selected = [pickRandom(tools), pickRandom(games), pickRandom(oddities)];

  if (Math.random() > 0.45) selected.push(pickRandom(roadmap));

  const remaining = labInventory.filter((item) => !selected.some((selectedItem) => selectedItem?.id === item.id));
  while (selected.filter(Boolean).length < 4 && remaining.length) {
    const next = pickRandom(remaining);
    selected.push(next);
    remaining.splice(remaining.indexOf(next), 1);
  }

  return uniqueById(selected.filter(Boolean)).slice(0, 5);
}

function favoriteIds() {
  return readStoredArray(LAB_FAVORITES_KEY);
}

function saveFavorite(id) {
  const ids = favoriteIds();
  if (!ids.includes(id)) {
    ids.push(id);
    writeStoredArray(LAB_FAVORITES_KEY, ids);
  }
  renderFavorites();
}

function removeFavorite(id) {
  writeStoredArray(LAB_FAVORITES_KEY, favoriteIds().filter((favoriteId) => favoriteId !== id));
  renderFavorites();
}

function createArtifactCard(item, options = {}) {
  const card = makeElement("article", "lab-result-card");
  const meta = makeElement("div", "lab-card-meta");
  meta.append(makeElement("span", "status-pill", item.status));
  meta.append(makeElement("span", "category-pill", item.category));

  const title = makeElement("h3", "", item.title);
  const description = makeElement("p", "", item.shortDescription);
  const why = makeElement("p", "why-line", item.whyItExists);
  const actions = makeElement("div", "lab-card-actions");

  if (item.href) {
    const openLink = makeElement("a", "secondary-button", "Open link");
    openLink.href = item.href;
    actions.append(openLink);
  } else {
    actions.append(makeElement("span", "roadmap-label", "Roadmap idea"));
  }

  const favoriteButton = makeElement("button", "secondary-button", options.remove ? "Remove favorite" : "Save favorite");
  favoriteButton.type = "button";
  favoriteButton.addEventListener("click", () => {
    if (options.remove) removeFavorite(item.id);
    else saveFavorite(item.id);
  });
  actions.append(favoriteButton);

  card.append(meta, title, description, why, actions);
  return card;
}

function renderSpinResults(items) {
  const results = document.querySelector("[data-spin-results]");
  if (!results) return;
  results.replaceChildren();
  items.forEach((item) => results.append(createArtifactCard(item)));
}

function renderFavorites() {
  const list = document.querySelector("[data-favorites-list]");
  if (!list) return;
  const ids = favoriteIds();
  const favorites = ids
    .map((id) => labInventory.find((item) => item.id === id))
    .filter(Boolean);

  list.replaceChildren();
  if (!favorites.length) {
    list.append(makeElement("p", "empty-note", "No favorites saved in this browser yet."));
    return;
  }

  favorites.forEach((item) => list.append(createArtifactCard(item, { remove: true })));
}

function bindSpinLab() {
  const button = document.querySelector("[data-spin-button]");
  if (!button) return;
  button.addEventListener("click", () => renderSpinResults(buildSpinMedley()));
  renderSpinResults(buildSpinMedley());

  const clearButton = document.querySelector("[data-clear-favorites]");
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      writeStoredArray(LAB_FAVORITES_KEY, []);
      renderFavorites();
    });
  }
  renderFavorites();
}

function roadmapIdeas() {
  return [...starterRoadmapIdeas, ...readStoredArray(LAB_SUGGESTIONS_KEY)];
}

function upvoteIdea(id) {
  const votes = readStoredObject(LAB_VOTES_KEY);
  votes[id] = Number(votes[id] || 0) + 1;
  writeStoredObject(LAB_VOTES_KEY, votes);
  renderRoadmap();
}

function createRoadmapItem(idea, votes) {
  const item = makeElement("article", "roadmap-item");
  const body = makeElement("div", "roadmap-item-body");
  const meta = makeElement("div", "lab-card-meta");
  meta.append(makeElement("span", "category-pill", idea.category));
  meta.append(makeElement("span", "status-pill", "Local votes: " + Number(votes[idea.id] || 0)));

  body.append(meta);
  body.append(makeElement("h3", "", idea.title));
  if (idea.description) body.append(makeElement("p", "", idea.description));

  const button = makeElement("button", "primary-button", "Upvote");
  button.type = "button";
  button.addEventListener("click", () => upvoteIdea(idea.id));

  item.append(body, button);
  return item;
}

function renderRoadmap() {
  const list = document.querySelector("[data-roadmap-list]");
  if (!list) return;
  const votes = readStoredObject(LAB_VOTES_KEY);
  list.replaceChildren();
  roadmapIdeas().forEach((idea) => list.append(createRoadmapItem(idea, votes)));
}

function bindCommunityForm() {
  const form = document.querySelector("[data-suggestion-form]");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const category = String(formData.get("category") || "Tool").trim();
    const description = String(formData.get("description") || "").trim();
    if (!title) return;

    const suggestions = readStoredArray(LAB_SUGGESTIONS_KEY);
    suggestions.unshift({
      id: "local-" + Date.now(),
      title,
      category,
      description,
    });
    writeStoredArray(LAB_SUGGESTIONS_KEY, suggestions.slice(0, 40));
    form.reset();
    renderRoadmap();
  });

  renderRoadmap();
}

async function loadInventory() {
  try {
    const response = await fetch("data/tool-inventory.json", { cache: "no-store" });
    if (!response.ok) throw new Error("inventory unavailable");
    const parsed = await response.json();
    if (Array.isArray(parsed) && parsed.length) labInventory = parsed;
  } catch {
    labInventory = fallbackInventory;
  }
}

loadInventory().then(() => {
  bindSpinLab();
  bindCommunityForm();
});
