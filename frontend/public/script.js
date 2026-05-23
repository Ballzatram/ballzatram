// ===============================
// CLOUDS
// ===============================

const INITIAL_CLOUDS = 10;
const SPAWN_INTERVAL_MS = 5200;
const MIN_DURATION = 70;
const MAX_DURATION = 120;

const sky = document.getElementById("sky");

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randomTopPercent() {
  const r = Math.random();

  if (r < 0.65) {
    return randomRange(18, 58);
  }

  return randomRange(58, 88);
}

function createCloud({ initial = false } = {}) {
  const cloud = document.createElement("div");
  cloud.classList.add("cloud");

  if (Math.random() < 0.5) {
    cloud.classList.add("layer-back");
  } else {
    cloud.classList.add("layer-front");
  }

  const baseWidth = randomRange(150, 340);
  const height = baseWidth * 0.48;

  cloud.style.width = `${baseWidth}px`;
  cloud.style.height = `${height}px`;
  cloud.style.top = `${randomTopPercent()}%`;

  const duration = randomRange(MIN_DURATION, MAX_DURATION);
  cloud.style.animationDuration = `${duration}s`;

  if (initial) {
    cloud.style.animationDelay = `${-randomRange(0, duration)}s`;
  }

  cloud.addEventListener("animationend", () => {
    cloud.remove();
  });

  sky.appendChild(cloud);
}

for (let i = 0; i < INITIAL_CLOUDS; i += 1) {
  createCloud({ initial: true });
}

setInterval(() => {
  createCloud({ initial: false });
}, SPAWN_INTERVAL_MS);