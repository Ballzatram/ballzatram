// ===============================
//  CONFIG
// ===============================

// TARGET DROP TIME
// Set this to your real drop datetime (local time) in ISO format.
const DROP_TARGET = new Date("2025-12-31T23:59:00"); // <-- change me

// CLOUD SETTINGS — tuned for “not too much, not too little”
const INITIAL_CLOUDS = 16;      // how many visible on first paint
const SPAWN_INTERVAL_MS = 4500; // new cloud every 4.5 seconds
const MIN_DURATION = 55;        // seconds
const MAX_DURATION = 100;       // seconds

// ===============================
//  CLOUDS
// ===============================

const sky = document.getElementById("sky");

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Bias more clouds into the upper part of the sky, but keep some lower
function randomTopPercent() {
  const r = Math.random();
  if (r < 0.7) {
    // ~70% of clouds in upper band: 5%–60%
    return randomRange(5, 60);
  } else {
    // remaining ~30% in lower band: 60%–90%
    return randomRange(60, 90);
  }
}

function createCloud({ initial = false } = {}) {
  const cloud = document.createElement("div");
  cloud.classList.add("cloud");

  // Randomly choose layer (some in front, some behind Ballzatram)
  if (Math.random() < 0.4) {
    cloud.classList.add("layer-back");
  } else {
    cloud.classList.add("layer-front");
  }

  // Random size
  const baseWidth = randomRange(130, 280);
  const height = baseWidth * 0.5;
  cloud.style.width = `${baseWidth}px`;
  cloud.style.height = `${height}px`;

  // Vertical position
  const topPercent = randomTopPercent();
  cloud.style.top = `${topPercent}%`;

  // Duration of the drift
  const duration = randomRange(MIN_DURATION, MAX_DURATION);
  cloud.style.animationDuration = `${duration}s`;

  // For initial clouds we "time-shift" them with a negative delay
  // so they appear already mid-flight across the screen.
  if (initial) {
    const offset = randomRange(0, duration);
    cloud.style.animationDelay = `${-offset}s`;
  }

  // When animation finishes, remove cloud from DOM
  cloud.addEventListener("animationend", () => {
    cloud.remove();
  });

  sky.appendChild(cloud);
}

// Create initial clouds mid-flight so the sky isn't empty
for (let i = 0; i < INITIAL_CLOUDS; i++) {
  createCloud({ initial: true });
}

// Keep spawning new clouds from the left forever
setInterval(() => {
  createCloud({ initial: false });
}, SPAWN_INTERVAL_MS);

// ===============================
//  COUNTDOWN
// ===============================

const countdownEl = document.getElementById("countdown-timer");

function formatTimePart(value) {
  return value.toString().padStart(2, "0");
}

function updateCountdown() {
  const now = new Date();
  const diffMs = DROP_TARGET - now;

  if (diffMs <= 0) {
    countdownEl.textContent = "DROP LIVE";
    clearInterval(countdownInterval);
    return;
  }

  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const d = formatTimePart(days);
  const h = formatTimePart(hours);
  const m = formatTimePart(minutes);
  const s = formatTimePart(seconds);

  countdownEl.textContent = `${d}:${h}:${m}:${s}`;
}

// Initial draw
updateCountdown();
// Tick every second
const countdownInterval = setInterval(updateCountdown, 1000);
