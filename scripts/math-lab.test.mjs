import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../tools/math-lab/model.mjs';
import { lessons, chapters } from '../tools/math-lab/lessons.mjs';
import { experiments } from '../tools/math-lab/experiments.mjs';

const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);
test('every lesson has one complete, addressable experiment and one answer', () => {
  const ids = chapters.flatMap(([, labs]) => labs);
  assert.deepEqual(new Set(ids), new Set(Object.keys(experiments)));
  assert.deepEqual(new Set(ids), new Set(Object.keys(lessons)));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    const lab = experiments[id],
      lesson = lessons[id];
    assert.ok(lab.controls.every((c) => c.min <= c.start && c.start <= c.max && c.step > 0));
    assert.ok(lesson.quiz[1][lesson.quiz[2]] && lesson.formula && lesson.python);
    assert.ok(lab.sweep || lab.advance);
  }
});
test('hand-calculated residuals, gradient and downhill updates agree', () => {
  near(M.loss(1), 11);
  near(M.loss(2), 0.8);
  near(M.gradient(1), -21.2);
  near(M.nextWeight(1, 0.025), 1.53);
  for (const rate of [0.005, 0.025, 0.085]) {
    let w = 0;
    for (let i = 0; i < 170; i++) {
      const next = M.nextWeight(w, rate);
      assert.ok(M.loss(next) <= M.loss(w) + 1e-12);
      w = next;
    }
    near(w, 108 / 55, 1e-6);
  }
});
test('projected variance accounts for both orthogonal directions', () => {
  const total = M.mean(M.cloud.map((v) => M.dot(v, v)));
  for (const angle of [-65, 0, 45, 110]) {
    near(M.projectedVariance(angle) + M.projectedVariance(angle + 90), total);
    near(M.projectedVariance(angle), M.projectedVariance(angle + 180));
  }
});
test('base rates and cutoffs preserve the correct denominators', () => {
  const { hits, falseAlerts, precision } = M.bayes(1, 5);
  assert.equal(hits, 90);
  assert.equal(falseAlerts, 495);
  near(precision, 90 / 585);
  assert.deepEqual(M.confusion(0.5), { tp: 6, fp: 4, fn: 2, tn: 8 });
  assert.deepEqual(M.confusion(0.75), { tp: 4, fp: 1, fn: 4, tn: 11 });
  assert.equal(M.confusion(1).tp + M.confusion(1).fp, 0);
  assert.equal(M.confusion(0).fn + M.confusion(0).tn, 0);
});
test('sampling reproduces batches and the width change expected under independence', () => {
  assert.deepEqual(M.waitMeans(4, 1729), M.waitMeans(4, 1729));
  assert.notDeepEqual(M.waitMeans(4, 1729), M.waitMeans(4, 2736));
  const sd = (r) => Math.sqrt(M.mean(r.map((x) => (x - 4) ** 2)));
  near(sd(M.waitMeans(1, 42, 20000)) / sd(M.waitMeans(4, 42, 20000)), 2, 0.06);
  const a = M.intervals(4, 2, 19),
    b = M.intervals(16, 2, 19);
  near((a[0].hi - a[0].lo) / (b[0].hi - b[0].lo), 2);
  assert.ok(M.intervals(16, 3, 19).every((r, i) => r.lo <= b[i].lo && r.hi >= b[i].hi));
});
test('averaging can improve held-out error and calibration preserves all ranks', () => {
  near(M.knnLoss(M.training, 1), 0);
  assert.ok(M.knnLoss(M.holdout, 2) < M.knnLoss(M.holdout, 1));
  for (const sharp of [0.25, 1, 3]) {
    const scores = M.observedFractions.map((p) => M.calibrated(p, sharp));
    assert.deepEqual(
      [...scores].sort((a, b) => a - b),
      scores,
    );
  }
  near(M.calibrated(0.7, 1), 0.7);
  assert.ok(M.logLoss(0.7, 0.7) < M.logLoss(0.7, 0.99));
});
test('network derivatives and normalized attention agree with numerical checks', () => {
  for (const w of [-3, 0, 1]) {
    const e = 0.00001;
    near((M.network(w + e, 1.5) - M.network(w - e, 1.5)) / (2 * e), M.sensitivity(w, 1.5));
    near(M.sensitivity(w, 0), 0);
  }
  for (const angle of [-180, 0, 90, 180])
    for (const t of [0.1, 1, 2]) {
      const { weights, mixed } = M.attention(angle, t);
      near(
        weights.reduce((a, b) => a + b),
        1,
      );
      assert.ok(weights.every((w) => w > 0));
      assert.ok(mixed >= -1 && mixed <= 1);
    }
  assert.ok(M.attention(90, 0.1).weights[1] > M.attention(90, 1).weights[1]);
});
