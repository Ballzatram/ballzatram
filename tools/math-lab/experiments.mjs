import * as M from './model.mjs';
import { chart, C } from './plot.mjs';
const fixed = (x, n = 2) => x.toFixed(n);
const pct = (x) => Math.round(100 * x) + '%';
const range = (key, label, min, max, step, start, display = String) => ({
  key,
  label,
  min,
  max,
  step,
  start,
  display,
});
const wControl = (start) =>
  range('weight', 'Weight · orders per 10 visitors', 0, 4, 0.01, start, (x) => fixed(x));
const angleControl = (label, start = 20) =>
  range('angle', label, -180, 180, 1, start, (x) => x + '°');
const onPlane = {
  x: [-3.5, 3.5],
  y: [-3.5, 3.5],
  equal: true,
  xticks: [-2, 0, 2],
  yticks: [-2, 0, 2],
};
const caseDirection = [2, 1];
const percentTick = (x) => Math.round(x * 100) + '%';
const shiftedSeed = (s) => {
  s.seed += 997;
};
export const experiments = {
  fit: {
    controls: [wControl(1)],
    series: [
      ['point', 'Observed orders'],
      ['line', 'Model prediction'],
      ['dash', 'Error'],
    ],
    plotTitle: 'Model fit',
    play: 'Sweep weight',
    step: 'Nudge weight',
    sweep: ['weight', 4, 0.1],
    render(svg, s) {
      const w = s.weight,
        mse = M.loss(w);
      const text =
        'At 40 extra visitors, the model predicts ' +
        fixed(4 * w, 1) +
        ' extra orders. The observation is 9. Across all five days, mean squared error is ' +
        fixed(mse) +
        '.';
      const p = chart(svg, {
        title: 'Predicted and observed extra orders',
        desc: text,
        x: [0, 5.3],
        y: [0, 20],
        xlabel: 'Extra visitors (tens)',
        ylabel: 'Extra orders',
        xticks: [0, 1, 2, 3, 4, 5],
      });
      M.orders.forEach(([x, y]) => p.line(x, w * x, x, y, C.alt, 2, '4 3'));
      p.line(0, 0, 5.3, 5.3 * w);
      M.orders.forEach(([x, y]) => p.point(x, y, C.point, 5));
      return [text, 'Mean squared error ' + fixed(mse)];
    },
  },
  gradient: {
    controls: [
      wControl(0.3),
      range('rate', 'Learning rate', 0.005, 0.085, 0.005, 0.025, (x) => fixed(x, 3)),
    ],
    series: [
      ['line', 'Loss curve'],
      ['point', 'Current weight'],
      ['dash', 'Next update'],
    ],
    plotTitle: 'Loss landscape',
    play: 'Run descent',
    step: 'Take one step',
    advance(s) {
      s.weight = M.nextWeight(s.weight, s.rate);
      return Math.abs(M.gradient(s.weight)) > 0.02;
    },
    render(svg, s) {
      const w = s.weight,
        n = M.nextWeight(w, s.rate),
        g = M.gradient(w);
      const text =
        'Here the loss changes by about ' +
        fixed(g, 1) +
        ' per unit of weight for a tiny move to the right. One update moves the weight from ' +
        fixed(w, 3) +
        ' to ' +
        fixed(n, 3) +
        '.';
      const p = chart(svg, {
        title: 'Loss against weight',
        desc: text,
        x: [0, 4],
        y: [0, 50],
        xticks: [0, 1, 2, 3, 4],
        xlabel: 'Weight (orders per 10 visitors)',
        ylabel: 'Mean squared error',
      });
      p.curve(M.loss);
      p.line(w, M.loss(w), n, M.loss(n), C.alt, 2, '4 3');
      p.point(n, M.loss(n), C.alt, 3, true);
      p.point(w, M.loss(w), C.point, 6);
      return [text, 'Loss ' + fixed(M.loss(w))];
    },
  },
  projection: {
    controls: [angleControl('Direction of the scoring rule', 0)],
    series: [
      ['point', 'Case vector'],
      ['line', 'Scoring direction'],
      ['dash', 'Perpendicular drop'],
    ],
    plotTitle: 'Vector projection',
    play: 'Rotate direction',
    step: 'Turn 1°',
    sweep: ['angle', 180, 2],
    render(svg, s) {
      const d = M.direction(s.angle),
        v = M.dot(caseDirection, d);
      const text =
        'The case has coordinates (2, 1). Along the selected unit direction its signed length is ' +
        fixed(v) +
        '. Turning past a right angle from the case makes the score negative.';
      const p = chart(svg, {
        ...onPlane,
        title: 'A case projected on a scoring axis',
        desc: text,
        xlabel: 'Standardized feature A',
        ylabel: 'Standardized feature B',
      });
      p.line(-4 * d[0], -4 * d[1], 4 * d[0], 4 * d[1], C.quiet, 1, '2 5');
      p.arrow(2, 1, C.point);
      p.point(2, 1);
      p.arrow(d[0], d[1]);
      p.line(2, 1, v * d[0], v * d[1], C.alt, 2, '4 3');
      p.point(v * d[0], v * d[1], C.alt, 4, true);
      return [text, 'Projection ' + fixed(v)];
    },
  },
  matrix: {
    controls: [range('shear', 'Horizontal shear', -1.5, 1.5, 0.05, 0.4, (x) => fixed(x))],
    series: [
      ['dash', 'Original square'],
      ['line', 'Transformed square'],
      ['point', 'Moved top-right corner'],
    ],
    plotTitle: 'A linear transformation',
    play: 'Shear the square',
    step: 'Nudge shear',
    sweep: ['shear', 1.5, 0.05],
    render(svg, s) {
      const k = s.shear,
        corner = 1 + k;
      const text =
        'The point (1, 1) moves to (' +
        fixed(corner) +
        ', 1). Every point on the horizontal axis stays put. The base and height each stay one unit, so the area stays one.';
      const p = chart(svg, {
        ...onPlane,
        title: 'A square transformed by a shear',
        desc: text,
        xlabel: 'Horizontal coordinate',
        ylabel: 'Vertical coordinate',
      });
      for (let n = -3; n <= 3; n++) {
        p.line(n - 3 * k, -3, n + 3 * k, 3, C.quiet, 1);
        p.line(-3, n, 3, n, C.grid, 1);
      }
      [
        [0, 0, 1, 0],
        [1, 0, 1, 1],
        [1, 1, 0, 1],
        [0, 1, 0, 0],
      ].forEach((v) => p.line(...v, C.alt, 2, '3 4'));
      p.path(
        [
          [0, 0],
          [1, 0],
          [1 + k, 1],
          [k, 1],
          [0, 0],
        ],
        C.line,
        3,
      );
      p.point(corner, 1);
      return [text, 'Area 1.00'];
    },
  },
  pca: {
    controls: [angleControl('Angle of the measuring axis', -35)],
    series: [
      ['point', 'Centered observations'],
      ['line', 'Measuring axis'],
      ['dash', 'Discarded distance'],
    ],
    plotTitle: 'Compression to one dimension',
    play: 'Rotate axis',
    step: 'Turn 1°',
    sweep: ['angle', 145, 2],
    render(svg, s) {
      const d = M.direction(s.angle),
        v = M.projectedVariance(s.angle);
      const total = M.mean(M.cloud.map((p) => M.dot(p, p)));
      const text =
        'The projected points retain ' +
        pct(v / total) +
        ' of the original variance. The discarded fraction is ' +
        pct(1 - v / total) +
        '. A half-turn reverses the signs and preserves exactly the same information here.';
      const p = chart(svg, {
        ...onPlane,
        title: 'A centered point cloud projected onto one axis',
        desc: text,
        xlabel: 'Centered feature A',
        ylabel: 'Centered feature B',
      });
      p.line(-5 * d[0], -5 * d[1], 5 * d[0], 5 * d[1]);
      M.cloud.forEach(([x, y]) => {
        const t = x * d[0] + y * d[1];
        p.line(x, y, t * d[0], t * d[1], C.alt, 1.4, '3 3');
        p.point(t * d[0], t * d[1], C.line, 2.8);
        p.point(x, y);
      });
      return [text, 'Variance retained ' + pct(v / total)];
    },
  },
  bayes: {
    controls: [
      range('base', 'True event rate (%)', 1, 20, 1, 1, (x) => x + '%'),
      range('fpr', 'False alert rate on non-events (%)', 1, 15, 1, 5, (x) => x + '%'),
    ],
    series: [
      ['bar', 'True alerts'],
      ['square', 'False alerts'],
    ],
    plotTitle: 'Where the alerts come from',
    play: 'Raise event rate',
    step: 'Raise 1 point',
    sweep: ['base', 20, 1],
    render(svg, s) {
      const a = M.bayes(s.base, s.fpr);
      const text =
        'Out of 10,000 cases, expect ' +
        Math.round(a.hits) +
        ' true alerts and ' +
        Math.round(a.falseAlerts) +
        ' false alerts. Among the alerts, ' +
        fixed(100 * a.precision, 1) +
        '% are true events.';
      const p = chart(svg, {
        title: 'Expected counts of true and false alerts',
        desc: text,
        x: [0.4, 2.6],
        y: [0, 2000],
        xticks: [1, 2],
        xformat: (x) => (x === 1 ? 'True alerts' : 'False alerts'),
        xlabel: 'Alert type',
        ylabel: 'Expected cases',
        left: 53,
      });
      p.rect(0.72, 0, 1.28, a.hits);
      p.rect(1.72, 0, 2.28, a.falseAlerts, C.alt);
      return [text, 'Precision ' + fixed(100 * a.precision, 1) + '%'];
    },
  },
  sampling: {
    controls: [range('n', 'Observations per sample', 1, 40, 1, 1)],
    series: [
      ['bar', 'Sample averages'],
      ['dash', 'Population mean'],
    ],
    plotTitle: 'Sampling distribution',
    play: 'Grow sample size',
    step: 'Draw new samples',
    sweep: ['n', 40, 1],
    stepAction: shiftedSeed,
    render(svg, s) {
      const means = M.waitMeans(s.n, s.seed),
        bins = Array(25).fill(0);
      means.forEach((x) => bins[Math.min(24, Math.floor(2 * x))]++);
      const average = M.mean(means),
        upper = Math.max(160, Math.ceil(Math.max(...bins) / 20) * 20);
      const text =
        'Each bar counts averages from 400 samples of ' +
        s.n +
        ' wait' +
        (s.n === 1 ? '' : 's') +
        '. Their simulated standard deviation is ' +
        fixed(Math.sqrt(M.mean(means.map((x) => (x - average) ** 2)))) +
        ' minutes. The theoretical standard error is ' +
        fixed(4 / Math.sqrt(s.n)) +
        ' minutes. The last bin includes all means of 12 minutes or more.';
      const p = chart(svg, {
        title: 'Histogram of sample means',
        desc: text,
        x: [0, 12.5],
        y: [0, upper],
        xlabel: 'Average wait (minutes)',
        ylabel: 'Samples in bin',
        xticks: [0, 2, 4, 6, 8, 10, 12],
        xformat: (x) => (x === 12 ? '12+' : x),
      });
      bins.forEach((v, i) => p.rect(i / 2, 0, i / 2 + 0.47, v));
      p.line(4, 0, 4, upper, C.alt, 2, '4 3');
      return [text, '400 samples'];
    },
  },
  intervals: {
    controls: [
      range('n', 'Observations per sample', 4, 64, 1, 16),
      range('level', 'Nominal confidence', 0, 3, 1, 2, (i) => M.levels[i] + '%'),
    ],
    series: [
      ['point', 'Covers true mean'],
      ['square', 'Misses true mean'],
      ['dash', 'True mean'],
    ],
    plotTitle: 'Repeated confidence intervals',
    play: 'Draw 12 batches',
    step: 'New batch',
    stepAction: shiftedSeed,
    advance(s) {
      shiftedSeed(s);
      return ++s.frame < 12;
    },
    render(svg, s) {
      const rows = M.intervals(s.n, s.level, s.seed),
        cover = rows.filter((r) => r.covers).length;
      const text =
        cover +
        ' of these 24 intervals contain the fixed mean of 10. Every interval has half-width ' +
        fixed((M.critical[s.level] * 3) / Math.sqrt(s.n)) +
        '. The ' +
        M.levels[s.level] +
        '% target describes coverage over many repeated samples under the stated normal model.';
      const p = chart(svg, {
        title: 'Twenty-four intervals around fresh sample means',
        desc: text,
        x: [0, 20],
        y: [0, 25],
        xticks: [0, 5, 10, 15, 20],
        yticks: [1, 12, 24],
        xlabel: 'Estimated mean',
        ylabel: 'Sample index',
      });
      p.line(10, 0, 10, 25, C.alt, 1.5, '4 4');
      rows.forEach((r, i) => {
        const color = r.covers ? C.point : C.alt;
        p.line(r.lo, i + 1, r.hi, i + 1, color, 2);
        p.point(r.center, i + 1, color, 2.5, !r.covers);
      });
      return [text, cover + ' / 24 cover'];
    },
  },
  neighbors: {
    controls: [range('k', 'Neighbors averaged', 1, 13, 1, 1)],
    series: [
      ['point', 'Training data'],
      ['square', 'Validation data'],
      ['line', 'Prediction'],
    ],
    plotTitle: 'Fit versus generalization',
    play: 'Widen neighborhood',
    step: 'Add a neighbor',
    sweep: ['k', 13, 1],
    render(svg, s) {
      const train = M.knnLoss(M.training, s.k),
        test = M.knnLoss(M.holdout, s.k);
      const text =
        'With ' +
        s.k +
        ' neighbor' +
        (s.k === 1 ? '' : 's') +
        ', training error is ' +
        fixed(train) +
        ' and validation error is ' +
        fixed(test) +
        '. Both are mean squared errors. The same observations stay in each set as you adjust the model.';
      const p = chart(svg, {
        title: 'Neighbor regression on training and held-out observations',
        desc: text,
        x: [-0.15, 12.15],
        y: [0, 6.8],
        xlabel: 'Input feature',
        ylabel: 'Response',
      });
      p.curve((x) => M.knn(x, s.k), 0, 12);
      M.training.forEach(([x, y]) => p.point(x, y));
      M.holdout.forEach(([x, y]) => p.point(x, y, C.alt, 3.5, true));
      return [text, 'Validation MSE ' + fixed(test)];
    },
  },
  threshold: {
    controls: [range('cut', 'Flag scores at or above', 0, 1, 0.05, 0.5, (x) => fixed(x))],
    series: [
      ['point', 'Actual event'],
      ['square', 'Actual non-event'],
      ['line', 'Cutoff'],
    ],
    plotTitle: 'Who gets flagged?',
    play: 'Raise cutoff',
    step: 'Raise cutoff',
    sweep: ['cut', 1, 0.05],
    render(svg, s) {
      const c = M.confusion(s.cut),
        flagged = c.tp + c.fp;
      const text =
        c.tp +
        ' true positives, ' +
        c.fp +
        ' false positives, ' +
        c.fn +
        ' false negatives, and ' +
        c.tn +
        ' true negatives. Recall is ' +
        pct(c.tp / (c.tp + c.fn)) +
        '. ' +
        (flagged
          ? 'Precision is ' + pct(c.tp / flagged) + '.'
          : 'Precision is undefined because there are no flagged cases.');
      const p = chart(svg, {
        title: 'Actual events and non-events by score',
        desc: text,
        x: [-0.025, 1.025],
        y: [0, 3],
        yticks: [1, 2],
        yformat: (y) => (y === 2 ? 'Event' : 'Other'),
        xticks: [0, 0.25, 0.5, 0.75, 1],
        xlabel: 'Model score (flagged to the right)',
        ylabel: 'Actual class',
        left: 58,
      });
      p.rect(s.cut, 0.1, 1.025, 2.9, '#344f3b');
      p.line(s.cut, 0.15, s.cut, 2.85);
      M.scores.forEach(([score, y]) => p.point(score, y + 1, y ? C.point : C.alt, 4, !y));
      return [text, flagged + ' / 20 flagged'];
    },
  },
  calibration: {
    controls: [range('sharp', 'Score sharpness', 0.25, 3, 0.05, 2, (x) => fixed(x))],
    series: [
      ['point', 'Groups of 100 cases'],
      ['pale', 'Perfect agreement'],
    ],
    plotTitle: 'Reliability diagram',
    play: 'Sharpen scores',
    step: 'Nudge sharpness',
    sweep: ['sharp', 3, 0.05],
    render(svg, s) {
      const err = M.mean(M.observedFractions.map((p) => Math.abs(M.calibrated(p, s.sharp) - p)));
      const text =
        'The highest-risk group has 90 events per 100 cases. Its forecast is ' +
        fixed(100 * M.calibrated(0.9, s.sharp), 1) +
        '%. All five groups keep their rank. The mean absolute calibration gap is ' +
        fixed(100 * err, 1) +
        ' percentage points.';
      const p = chart(svg, {
        title: 'Forecast probability versus observed event frequency',
        desc: text,
        x: [0, 1],
        y: [0, 1],
        xticks: [0, 0.25, 0.5, 0.75, 1],
        yticks: [0, 0.25, 0.5, 0.75, 1],
        xformat: percentTick,
        yformat: percentTick,
        xlabel: 'Forecast probability',
        ylabel: 'Observed frequency',
        left: 58,
      });
      p.line(0, 0, 1, 1, C.quiet, 1.5, '3 4');
      M.observedFractions.forEach((frac) => p.point(M.calibrated(frac, s.sharp), frac, C.point, 5));
      return [text, 'Gap ' + fixed(100 * err, 1) + ' pp'];
    },
  },
  entropy: {
    controls: [
      range('forecast', 'Forecast probability of heads', 0.01, 0.99, 0.01, 0.5, (x) => pct(x)),
    ],
    series: [
      ['line', 'Expected log loss'],
      ['point', 'Your forecast'],
    ],
    plotTitle: 'The price of confidence',
    play: 'Sweep forecast',
    step: 'Raise forecast',
    sweep: ['forecast', 0.99, 0.02],
    render(svg, s) {
      const value = M.logLoss(0.7, s.forecast);
      const text =
        'This coin lands heads 70% of the time. Your long-run average log loss is ' +
        fixed(value, 3) +
        ' nats. If the next toss is tails, that single loss will be ' +
        fixed(-Math.log(1 - s.forecast), 3) +
        ' nats.';
      const p = chart(svg, {
        title: 'Expected log loss for a biased coin',
        desc: text,
        x: [0, 1],
        y: [0, 3.4],
        xticks: [0, 0.25, 0.5, 0.75, 1],
        xformat: percentTick,
        xlabel: 'Forecast probability of heads',
        ylabel: 'Average log loss (nats)',
      });
      p.curve((x) => M.logLoss(0.7, x), 0.01, 0.99);
      p.point(s.forecast, value, C.point, 6);
      return [text, 'Log loss ' + fixed(value, 3)];
    },
  },
  chain: {
    controls: [
      range('w', 'First weight', -3, 3, 0.05, 0, (x) => fixed(x)),
      range('gain', 'Output weight', -2, 2, 0.1, 1.5, (x) => fixed(x, 1)),
    ],
    series: [
      ['line', 'Network output'],
      ['dash', 'Local tangent'],
      ['point', 'Current setting'],
    ],
    plotTitle: 'A signal through a network',
    play: 'Sweep first weight',
    step: 'Nudge weight',
    sweep: ['w', 3, 0.05],
    render(svg, s) {
      const y = M.network(s.w, s.gain),
        slope = M.sensitivity(s.w, s.gain);
      const text =
        'An input of 2 passes through the first weight and an S-shaped gate. The gate outputs ' +
        fixed(M.activation(s.w), 3) +
        '. After the output weight, the prediction is ' +
        fixed(y, 3) +
        '. A small increase of 0.01 in the first weight changes the prediction by about ' +
        fixed(0.01 * slope, 4) +
        '.';
      const p = chart(svg, {
        title: 'Output of a one-neuron network and its tangent',
        desc: text,
        x: [-3, 3],
        y: [-2.2, 2.2],
        xlabel: 'First weight',
        ylabel: 'Network output',
      });
      p.curve((x) => M.network(x, s.gain));
      p.line(s.w - 0.8, y - 0.8 * slope, s.w + 0.8, y + 0.8 * slope, C.alt, 2, '4 3');
      p.point(s.w, y, C.point, 5);
      return [text, 'Sensitivity ' + fixed(slope, 3)];
    },
  },
  attention: {
    controls: [
      angleControl('Query direction', 0),
      range('temp', 'Attention temperature', 0.1, 2, 0.05, 0.5, (x) => fixed(x)),
    ],
    series: [['bar', 'Share of attention']],
    plotTitle: 'One attention head',
    play: 'Rotate query',
    step: 'Turn 1°',
    sweep: ['angle', 180, 2],
    render(svg, s) {
      const a = M.attention(s.angle, s.temp);
      const shares = a.weights
        .map((w, i) => M.tokens[i] + ' ' + fixed(w * 100, 1) + '%')
        .join(', ');
      const text =
        'The query assigns ' +
        shares +
        '. Mixing token values −1, +1, and −0.5 with these weights gives ' +
        fixed(a.mixed, 3) +
        '. The keys and values stay fixed as you rotate the query.';
      const p = chart(svg, {
        title: 'Attention weights for three tokens',
        desc: text,
        x: [0.4, 3.6],
        y: [0, 1],
        xticks: [1, 2, 3],
        xformat: (x) => M.tokens[x - 1],
        yticks: [0, 0.25, 0.5, 0.75, 1],
        yformat: percentTick,
        xlabel: 'Token key',
        ylabel: 'Attention weight',
        left: 58,
      });
      a.weights.forEach((w, i) => p.rect(i + 0.72, 0, i + 1.28, w));
      return [text, 'Mixed value ' + fixed(a.mixed, 3)];
    },
  },
};
