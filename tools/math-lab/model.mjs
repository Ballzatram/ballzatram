// Fixed teaching fixtures. Every input, label and score is synthetic.
export const orders = [
  [1, 2],
  [2, 5],
  [3, 5],
  [4, 9],
  [5, 9],
];
export const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
export const loss = (w) => mean(orders.map(([x, y]) => (w * x - y) ** 2));
export const gradient = (w) => mean(orders.map(([x, y]) => 2 * x * (w * x - y)));
export const nextWeight = (w, rate) => w - rate * gradient(w);
export const rad = (degrees) => (degrees * Math.PI) / 180;
export const direction = (degrees) => [Math.cos(rad(degrees)), Math.sin(rad(degrees))];
export const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
export const cloud = [
  [-2.6, -1.5],
  [-2, -0.5],
  [-1.2, -1.4],
  [-0.7, 0.2],
  [-0.2, -0.5],
  [0.2, 0.5],
  [0.7, -0.2],
  [1.2, 1.4],
  [2, 0.5],
  [2.6, 1.5],
];
export function projectedVariance(angle) {
  const d = direction(angle);
  return mean(cloud.map((v) => dot(v, d) ** 2));
}
export function bayes(base, falseRate) {
  const positive = (10000 * base) / 100;
  const hits = positive * 0.9;
  const falseAlerts = ((10000 - positive) * falseRate) / 100;
  return { hits, falseAlerts, precision: hits / (hits + falseAlerts) };
}
export function generator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state + 0.5) / 4294967296;
  };
}
export function waitMeans(n, seed, repeats = 400) {
  const random = generator(seed);
  return Array.from({ length: repeats }, () => {
    let total = 0;
    for (let i = 0; i < n; i++) total += -4 * Math.log(random());
    return total / n;
  });
}
export const levels = [80, 90, 95, 99];
export const critical = [1.281552, 1.644854, 1.959964, 2.575829];
export function intervals(n, level, seed) {
  const random = generator(seed);
  const se = 3 / Math.sqrt(n);
  const margin = critical[level] * se;
  return Array.from({ length: 24 }, () => {
    // The mean of n independent Normal(10, 3²) draws is exactly Normal(10, 3²/n).
    const center = 10 + se * Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());
    return {
      center,
      lo: center - margin,
      hi: center + margin,
      covers: Math.abs(center - 10) <= margin,
    };
  });
}
const signal = (x) => 3 + 1.3 * Math.sin(x * 0.55);
export const training = [0, 1.1, -0.6, 1.4, -0.5, 0.9, -1.2, 0.8, -0.4, 0.4, -0.9, 0.5, 0.2].map(
  (noise, x) => [x, signal(x) + noise],
);
export const holdout = [-0.1, 0.9, -0.7, 0.4, -0.8, 0.3, 0.5, -0.4, 0.6, 0.2, -0.5, 0.7].map(
  (noise, i) => [i + 0.5, signal(i + 0.5) + noise],
);
export function knn(x, k) {
  const ordered = [...training].sort(
    (a, b) => Math.abs(a[0] - x) - Math.abs(b[0] - x) || a[0] - b[0],
  );
  return mean(ordered.slice(0, k).map((p) => p[1]));
}
export const knnLoss = (data, k) => mean(data.map(([x, y]) => (knn(x, k) - y) ** 2));
export const scores = [
  [0.95, 1],
  [0.9, 1],
  [0.85, 0],
  [0.8, 1],
  [0.75, 1],
  [0.7, 0],
  [0.65, 1],
  [0.6, 0],
  [0.55, 1],
  [0.5, 0],
  [0.45, 0],
  [0.4, 1],
  [0.35, 0],
  [0.3, 0],
  [0.25, 0],
  [0.2, 0],
  [0.15, 0],
  [0.1, 0],
  [0.05, 1],
  [0.02, 0],
];
export function confusion(cutoff) {
  const counts = { tp: 0, fp: 0, tn: 0, fn: 0 };
  for (const [score, y] of scores) {
    if (score >= cutoff) counts[y ? 'tp' : 'fp']++;
    else counts[y ? 'fn' : 'tn']++;
  }
  return counts;
}
export const logit = (p) => Math.log(p / (1 - p));
export const sigmoid = (z) => 1 / (1 + Math.exp(-z));
export const observedFractions = [0.1, 0.3, 0.5, 0.7, 0.9];
export const calibrated = (p, sharpness) => sigmoid(logit(p) * sharpness);
export function logLoss(truth, forecast) {
  return -(truth * Math.log(forecast) + (1 - truth) * Math.log(1 - forecast));
}
export const activation = (w) => sigmoid(2 * w);
export const network = (w, gain) => gain * activation(w);
export const sensitivity = (w, gain) => 2 * gain * activation(w) * (1 - activation(w));
export const tokens = ['river', 'loan', 'shore'];
export const keys = [
  [1, 0],
  [0, 1],
  [0.8, -0.2],
];
export const values = [-1, 1, -0.5];
export function attention(angle, temperature) {
  const q = direction(angle);
  const logits = keys.map((k) => dot(q, k) / (Math.sqrt(2) * temperature));
  const unnormalized = logits.map((z) => Math.exp(z - Math.max(...logits)));
  const total = unnormalized.reduce((a, b) => a + b, 0);
  const weights = unnormalized.map((z) => z / total);
  return { weights, mixed: dot(weights, values) };
}
