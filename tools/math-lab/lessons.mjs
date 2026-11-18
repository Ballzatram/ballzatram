export const chapters = [
  ['Learning from error', ['fit', 'gradient']],
  ['The geometry of data', ['projection', 'matrix', 'pca']],
  ['Reasoning under uncertainty', ['bayes', 'sampling', 'intervals']],
  ['Judging a model', ['neighbors', 'threshold', 'calibration', 'entropy']],
  ['Inside a neural network', ['chain', 'attention']],
];

// Each lesson starts with a concrete question. Formal notation stays in the optional reveal.
export const lessons = {
  fit: {
    title: 'Fit a line by eye',
    intro:
      'Five days at a coffee stand. More foot traffic tends to mean more orders. How much should one change your prediction of the other?',
    heading: 'One knob, five predictions',
    intuition:
      'Each dot is a day. The green line is your model. Its weight says how many extra orders to predict for every ten extra visitors. We’ve fixed the line at the origin so you can feel what one weight does.',
    challenge:
      'Start at a weight of 1. Before moving it, pick the day whose prediction you expect to change most. Slide to 2 and watch the dashed gaps.',
    quiz: [
      'You nudge the weight up. Which prediction moves the farthest?',
      ['10 extra visitors', '30 extra visitors', '50 extra visitors'],
      2,
      'At 50 visitors the model applies the same weight five times. A weight change of 0.1 adds half an order there, compared with a tenth of an order at 10 visitors.',
      'Trace the line back to its pivot at zero. Which dot is farthest from that pivot?',
    ],
    formula: 'ŷ = wx     L(w) = (1/n) Σᵢ (wxᵢ − yᵢ)²',
    terms:
      'x counts extra visitors in tens. w is the weight. ŷ (y-hat) is a prediction, and y is the observed number of extra orders. i identifies a day, n is the number of days, and Σ means add across them. L averages the squared vertical gaps. Squaring makes every miss count and gives larger misses more influence.',
    example:
      'At weight 1, the five misses have magnitudes 1, 3, 2, 5, and 4. Their squares sum to 55, so the mean squared error is 11 orders squared. At weight 2 the squared misses sum to 4, bringing the average down to 0.8.',
    python: `visitors = [1, 2, 3, 4, 5]  # groups of ten
orders = [2, 5, 5, 9, 9]
for weight in (1, 2, 3):
    misses = [weight*x - y for x, y in zip(visitors, orders)]
    print(weight, sum(e**2 for e in misses) / len(misses))`,
  },
  gradient: {
    title: 'Walk downhill on loss',
    intro:
      'Keep the same five observations. Now each point on the curve represents an entire candidate model. Can the slope tell you which weight to try next?',
    heading: 'Tilt tells you direction',
    intuition:
      'Stand on the dot and look a tiny distance to the right. If the ground falls away, a larger weight helps. If it rises, a smaller weight helps. The learning rate sets how far the model trusts that local slope.',
    challenge:
      'Reset, then take one step. Try again with the learning rate at 0.080. Watch whether the dot crosses the bottom, and whether crossing it actually increases the loss.',
    quiz: [
      'A step crosses the bottom of the bowl. What can you conclude?',
      ['Loss must have increased', 'Check the height after the step', 'Training is finished'],
      1,
      'Crossing the minimum tells you which side you landed on. The vertical height tells you whether the new weight fits better.',
      'Picture stepping from high on the left to just past the bottom on the right. Compare the two heights.',
    ],
    formula: 'g = dL/dw     w_next = w − ηg',
    terms:
      'L is the preceding lesson’s mean squared error. Its derivative g measures how quickly loss changes with weight w at your current position. η (eta) is the learning rate. Negative g makes the update increase w. In many dimensions, one derivative per weight forms the gradient.',
    example:
      'At weight 1 the slope is −21.2. A learning rate of 0.025 adds 0.53 to the weight, giving 1.53. On this bowl the slope approaches zero near 1.964. Other loss surfaces can have several valleys or nearly flat regions.',
    python: `rows = [(1, 2), (2, 5), (3, 5), (4, 9), (5, 9)]
w, rate = 1.0, 0.025
for step in range(5):
    g = sum(2*x*(w*x-y) for x, y in rows) / len(rows)
    w -= rate*g
    print(step + 1, round(w, 3))`,
  },
  projection: {
    title: 'Turn a vector into a score',
    intro:
      'Two cases can be large in very different ways. Give a scoring rule a direction, then see how much of a case points that way.',
    heading: 'Measure a shadow',
    intuition:
      'The mint arrow records two features of one case. Imagine shining a light perpendicular to the green axis. The signed position of the shadow measures alignment. A rule that values a different mix of features casts a different shadow.',
    challenge:
      'Turn the axis until the shadow lands at zero. Then keep turning until the score is as negative as you can make it. The case itself never moves.',
    quiz: [
      'If the scoring axis flips exactly 180°, what happens to the score?',
      ['It doubles', 'It becomes zero', 'Its sign flips'],
      2,
      'The projection lands the same distance from the origin. The positive direction has reversed, so the sign changes.',
      'Try 0° and 180°. Look at the arrowhead and at the signed readout.',
    ],
    formula: 'score = x · u = x₁u₁ + x₂u₂',
    terms:
      'x is the case vector and u is a direction of length one. The dot product multiplies corresponding coordinates and adds them. With unit-length u, the result is a signed projected length. With general weights the result also reflects the length of the weight vector.',
    example:
      'For the case (2, 1), the horizontal direction (1, 0) gives a score of 2. The vertical direction (0, 1) gives 1. The direction (−1, 0) gives −2. A linear model can use this same operation to combine dozens of features.',
    python: `from math import cos, sin, radians
case = (2, 1)
for angle in (0, 90, 180):
    u = (cos(radians(angle)), sin(radians(angle)))
    print(round(sum(x*w for x, w in zip(case, u)), 3))`,
  },
  matrix: {
    title: 'Move a whole grid',
    intro:
      'A single rule can move every point in a dataset. Slide the top of a unit square sideways and see which features of its shape survive.',
    heading: 'Follow the two unit steps',
    intuition:
      'A horizontal unit step stays where it was. A vertical unit step leans sideways. Once you know where those two steps land, you can rebuild the image of any point by adding scaled copies of the new steps.',
    challenge:
      'Set the shear to 1. Trace the bottom and the top of the square. Predict where a point two units above the origin would land before reading the formula.',
    quiz: [
      'With shear 1, where does (0, 2) land?',
      ['(1, 2)', '(2, 2)', '(0, 1)'],
      1,
      'Each vertical unit brings one horizontal unit along. Two vertical steps carry the point two units right.',
      'The horizontal shift scales with the height. Compare the grid one row up and two rows up.',
    ],
    formula: 'A = [[1, k], [0, 1]]     A(x, y) = (x + ky, y)',
    terms:
      'A is a matrix, an array of weights that produces several output coordinates together. Its columns tell you where the horizontal and vertical unit steps land. k controls the shear. Its determinant, the signed area multiplier, is 1 at every setting here.',
    example:
      'At shear 1 the top-right corner moves from (1, 1) to (2, 1). A point at (3, 2) lands at (5, 2). A dense neural-network layer uses a matrix to mix many inputs into many outputs, usually followed by a bias and a nonlinear operation.',
    python: `def transform(x, y, shear):
    return x + shear*y, y

for point in [(1, 0), (0, 1), (1, 1), (0, 2)]:
    print(point, transform(*point, shear=1))`,
  },
  pca: {
    title: 'Find the most revealing axis',
    intro:
      'You can keep only one number per observation. Which viewing angle preserves the most variation in a two-feature dataset?',
    heading: 'Compress the cloud',
    intuition:
      'Each observation drops onto the green axis. You keep its location on that axis and lose its sideways displacement. For these centered points, the direction with the most projected variance also minimizes the total squared distance discarded.',
    challenge:
      'Rotate until the dashed drops are collectively short. Then turn the axis a quarter-turn. Compare the fractions retained by those two views.',
    quiz: [
      'Which direction supplies the first principal component?',
      [
        'Largest spread after projection',
        'Longest single observation',
        'Highest mean after projection',
      ],
      0,
      'PCA scores the variance of all projected observations. A single long observation can influence the answer, but the whole cloud sets the direction.',
      'The cloud is centered, so every projected mean is zero. Watch how far apart the shadows spread.',
    ],
    formula: 'zᵢ = xᵢ · u     variance along u = (1/n) Σᵢ zᵢ²',
    terms:
      'xᵢ is a centered observation and u is a trial unit direction. zᵢ is the one-number representation. Since its mean is zero, averaging squared projected lengths gives population-form variance. The leading eigenvector of the covariance matrix maximizes it. Units and feature scaling affect the answer.',
    example:
      'For the four centered points (−2, −1), (−1, −0.5), (1, 0.5), and (2, 1), the x-axis keeps 80% of the variance. The diagonal running through all four keeps 100%. The sandbox adds scatter around the diagonal.',
    python: `rows = [(-2,-1), (-1,-.5), (1,.5), (2,1)]
total = sum(x*x + y*y for x,y in rows)
horizontal = sum(x*x for x,y in rows)
print(horizontal / total)  # 0.8`,
  },
  bayes: {
    title: 'Count what’s inside an alert',
    intro:
      'A detector catches nine out of ten true events. An alert just fired. How much evidence is that when the event itself is rare?',
    heading: 'Start with 10,000 cases',
    intuition:
      'Split the population into events and non-events first. Each group can produce alerts. Even a small false-alert rate can send a crowd through the much larger non-event door.',
    challenge:
      'Leave the detector unchanged. Raise the event rate from 1% to 10%. Predict which bar grows and what happens to the fraction of alerts that are real.',
    quiz: [
      'At a 1% event rate and a 5% false-alert rate, most alerts come from…',
      ['Actual events', 'Non-events'],
      1,
      'Among 10,000 cases there are 100 events. They generate 90 true alerts. The 9,900 non-events generate 495 false alerts.',
      'Apply each detector rate to its own starting group. Which group is 99 times larger?',
    ],
    formula: 'P(E | A) = sr / [sr + f(1 − r)]',
    terms:
      'E means an event and A means an alert. r is the base event rate. s is sensitivity, the alert rate among events. f is the alert rate among non-events. The vertical bar means “given.” The numerator is the share of everyone with both an event and an alert. The denominator is the share with any alert.',
    example:
      'With 90 true and 495 false alerts, 90 of 585 alerts are real, about 15.4%. “Caught 90% of events” and “15.4% of alerts were events” answer questions with different denominators.',
    python: `cases, base, sensitivity, false_rate = 10_000, .01, .9, .05
hits = cases * base * sensitivity
false = cases * (1-base) * false_rate
print(hits, false, hits / (hits + false))`,
  },
  sampling: {
    title: 'Average away some noise',
    intro:
      'A queue sometimes makes you wait much longer than usual. Take repeated samples and watch what happens to the distribution of their averages.',
    heading: 'One bar can represent many samples',
    intuition:
      'Each sample produces one average. Four hundred sample averages fill the histogram. Individual waits follow the same right-skewed distribution throughout. Increasing the number of waits in each average makes exceptionally long single waits less influential.',
    challenge:
      'Compare samples of size 1, 4, and 16. Before trying 16, predict how the width will change. Draw another batch to see how much the picture itself varies.',
    quiz: [
      'You want to halve the standard error. How many independent waits do you need?',
      ['Twice as many', 'Four times as many', 'Half as many'],
      1,
      'The standard error falls with the square root of sample size. To halve it, quadruple the number of independent observations.',
      'Look at the theoretical readout at 1, 4, and 16. Which pairs differ by a factor of two?',
    ],
    formula: 'SE(x̄) = σ / √n',
    terms:
      'x̄ is one sample mean, σ is the population standard deviation of individual waits, and n is the number of independent waits per sample. Standard error describes variation across sample means. With independent, identically distributed draws of finite variance, the standardized mean approaches a normal distribution as n grows.',
    example:
      'Here waits have an exponential distribution with mean 4 minutes and standard deviation 4 minutes. For samples of 1, 4, and 16 waits, the standard error of the mean is 4, 2, and 1 minute respectively. Adjacent time-series readings can be correlated, breaking the independence used here.',
    python: `from random import Random
from statistics import mean, pstdev
rng = Random(42)
for n in (1, 4, 16):
    averages = [mean(rng.expovariate(.25) for _ in range(n))
                for _ in range(400)]
    print(n, round(pstdev(averages), 2), 4/n**.5)`,
  },
  intervals: {
    title: 'What does 95% cover?',
    intro:
      'Draw twenty-four studies of one population. Each study produces an estimate and a range. Watch which ranges catch the fixed target.',
    heading: 'Repeat the procedure',
    intuition:
      'The vertical reference stays at the true mean. Each horizontal interval starts from a fresh sample estimate. A 95% confidence procedure catches the true mean in about 95% of repetitions under its assumptions. Any batch of 24 can land above or below that rate.',
    challenge:
      'Hold sample size still and compare 80% with 99%. Then hold confidence still and increase sample size. Notice which change buys coverage and which buys precision.',
    quiz: [
      'At fixed confidence, quadrupling sample size should…',
      ['Double each interval’s width', 'Halve each interval’s width', 'Guarantee coverage'],
      1,
      'Sampling uncertainty shrinks by a factor of two. The nominal coverage stays the same.',
      'Check the half-width at 16 and 64 observations with the confidence slider untouched.',
    ],
    formula: 'interval = x̄ ± z × σ / √n',
    terms:
      'x̄ is the sample mean, σ is the known population standard deviation of 3, and n is the sample size. z is a normal critical value chosen for the requested central coverage. The simulator draws sample means directly from their exact normal sampling distribution. Real applications often estimate σ and need a different interval.',
    example:
      'With 16 observations and 95% confidence, the half-width is about 1.47. A sample mean of 11.6 yields [10.13, 13.07], missing the true mean of 10. Such misses are expected to occur across repeated studies.',
    python: `from statistics import NormalDist
mean, sigma, n = 11.6, 3, 16
z = NormalDist().inv_cdf(.975)
half = z * sigma / n**.5
print(round(mean-half, 2), round(mean+half, 2))`,
  },
  neighbors: {
    title: 'Catch a model memorizing',
    intro:
      'One neighbor is enough to match every training label. See what happens when you judge that same rule on observations it never saw.',
    heading: 'Give the model a second exam',
    intuition:
      'Mint circles teach the model. Orange squares judge it. At each input the prediction averages the labels of the nearest training points. Widening the neighborhood smooths away local noise, and eventually smooths away real shape too.',
    challenge:
      'Start at one neighbor and note both errors. Try two neighbors, then all thirteen. Find a setting where training error gets worse while validation error gets better.',
    quiz: [
      'After picking the best setting on orange points, where should final performance be measured?',
      ['Those same orange points', 'A fresh untouched test set', 'The training points'],
      1,
      'Repeatedly consulting validation errors lets that data influence your choice. An untouched test set gives a cleaner estimate for the selected procedure.',
      'The orange points have already helped you make a modeling decision. Which observations have had no say?',
    ],
    formula: 'ŷ(x) = (1/k) Σᵢ∈Nₖ(x) yᵢ',
    terms:
      'Nₖ(x) contains the k training inputs closest to x. yᵢ is a training label. Smaller k gives a more flexible fit. Larger k reduces sensitivity to individual observations, potentially increasing bias. Here ties favor the smaller input. The two error readouts use the same squared-error calculation.',
    example:
      'With one neighbor, every training point predicts its own label, so training error is zero. In the sandbox, increasing to two neighbors raises training error to about 0.69 and lowers validation error from about 0.67 to 0.39. The best setting can change with another sample.',
    python: `rows = [(0, 2), (1, 5), (2, 3)]
def predict(x, k):
    nearest = sorted(rows, key=lambda p: (abs(p[0]-x), p[0]))[:k]
    return sum(y for _, y in nearest) / k

print(predict(1, 1), predict(1, 3))`,
  },
  threshold: {
    title: 'Move the decision cutoff',
    intro:
      'A model ranked twenty synthetic cases. You control which ones go to review. How many mistakes change when the scores stay exactly the same?',
    heading: 'A score becomes an action',
    intuition:
      'Each symbol is one labeled case. Cases on or to the right of the green line get flagged. Moving the line right removes cases from the queue. Whether that helps depends on the true labels of the cases you remove and the cost of each kind of error.',
    challenge:
      'Move the cutoff from 0.50 to 0.75. Count how many false positives disappear and how many additional events you miss. Could a team prefer either setting?',
    quiz: [
      'With all scores fixed, raising the cutoff can do what to false negatives?',
      ['Only decrease them', 'Increase them or leave them unchanged', 'Move them either way'],
      1,
      'Flagged cases can only leave the queue as the cutoff rises. Every true event that leaves becomes a false negative.',
      'Follow one actual event as the cutoff slides past it. Can an unflagged event enter the queue?',
    ],
    formula: 'recall = TP / (TP + FN)     precision = TP / (TP + FP)',
    terms:
      'TP and FP count true and false positives among flagged cases. FN counts missed events, and TN counts correctly unflagged non-events. Recall asks what share of all events you catch. Precision asks what share of flags are events. Precision is undefined for an empty queue.',
    example:
      'At 0.50, there are 6 true positives, 4 false positives, and 2 missed events. At 0.75, these become 4, 1, and 4. You save three false reviews at the cost of two more misses. The relative costs determine whether that is worthwhile.',
    python: `labels = [(0.9, 1), (0.7, 0), (0.5, 1), (0.2, 0)]
for cutoff in (.5, .75):
    tp = sum(s >= cutoff and y == 1 for s,y in labels)
    fp = sum(s >= cutoff and y == 0 for s,y in labels)
    fn = sum(s < cutoff and y == 1 for s,y in labels)
    print(cutoff, tp, fp, fn)`,
  },
  calibration: {
    title: 'Make 70% mean something',
    intro:
      'If a model gives one hundred cases a 70% chance of an event, how many events should you usually see? Compare confidence with observed frequency.',
    heading: 'Keep the ranking, bend the scale',
    intuition:
      'Each dot represents a group of 100 cases with the same forecast. Its height records the group’s actual event rate. Changing sharpness moves the forecasts horizontally. The diagonal marks agreement between forecast and frequency.',
    challenge:
      'Move sharpness from 2 to 1. Watch the highest-risk group, then the lowest. Both move closer to the diagonal even though no group overtakes another.',
    quiz: [
      'A monotone recalibration keeps the same top 100 cases. What happens to that fixed-size review queue?',
      ['It stays the same', 'It becomes more precise automatically', 'It shrinks'],
      0,
      'The ranking is unchanged, so the same top 100 cases enter the queue when ties are handled consistently. Using a fixed numeric cutoff instead can change who enters.',
      'Follow the order of the dots. Could two groups swap places under this increasing transformation?',
    ],
    formula: 'p′ = sigmoid(a × log(p / (1 − p)))',
    terms:
      'p is a group’s reference event probability, a is a positive sharpness control, and p′ is the displayed forecast. log denotes the natural logarithm. sigmoid(z) = 1/(1 + exp(−z)). At a = 1 the forecast equals p. These constructed groups have exactly their reference event rates. Fitting a real calibrator takes separate validation data.',
    example:
      'A group with 70 observed events out of 100 has a displayed score near 84.5% at sharpness 2. At sharpness 1 it reads 70%. The same cases stay in the group. With a fixed cutoff of 80%, the review decision changes.',
    python: `from math import log, exp
p = .70
for a in (2, 1, .5):
    forecast = 1 / (1 + exp(-a * log(p/(1-p))))
    print(round(forecast, 3))`,
  },
  entropy: {
    title: 'Price a confident mistake',
    intro:
      'A coin lands heads seven times out of ten in the long run. How much should a forecaster pay for calling the occasional tails nearly impossible?',
    heading: 'Surprise has a price',
    intuition:
      'Log loss charges a forecast according to the probability it assigned to the outcome that actually happened. A nearly impossible outcome is very expensive when it happens. The curve averages that cost across the coin’s real mix of heads and tails.',
    challenge:
      'Compare forecasts of 70%, 90%, and 99%. Notice how quickly the loss for one tails grows. Then find the forecast that minimizes average cost.',
    quiz: [
      'Where is expected log loss smallest for this coin?',
      ['50% heads', '70% heads', 'Almost 100% heads'],
      1,
      'At the true 70% rate, the long-run cost is minimized. Predicting heads more strongly saves a little on heads while making tails increasingly costly.',
      'Think about the 30 tails that show up in a typical hundred tosses. What does your forecast charge for each one?',
    ],
    formula: 'H(p, q) = −p log q − (1 − p) log(1 − q)',
    terms:
      'p is the coin’s true heads probability. q is your forecast. H(p, q) is their cross-entropy, the expected log loss under p. The minimum H(p, p) is the coin’s entropy. Natural logarithms measure information in nats. The excess cost is the KL divergence from p to q.',
    example:
      'A 70% forecast costs about 0.611 nats per toss on average. A 99% forecast costs about 1.389. For a single tails, the 99% forecaster pays −log(0.01), about 4.605 nats. Language models apply the same idea across many possible next tokens.',
    python: `from math import log
p = .7
for q in (.5, .7, .9, .99):
    print(q, round(-p*log(q) - (1-p)*log(1-q), 3))`,
  },
  chain: {
    title: 'Trace a change through a neuron',
    intro:
      'One weight changes a signal, a gate reshapes it, and a second weight scales it. Which link decides whether the first weight still matters?',
    heading: 'Each stage passes on part of a nudge',
    intuition:
      'The S-shaped gate responds strongly near its center and barely moves near its extremes. The output weight scales the change that makes it through. A locally flat gate can leave an early weight with a tiny learning signal.',
    challenge:
      'Set the first weight to zero and compare output weights +1.5, 0, and −1.5. Then keep +1.5 and move the first weight to 3. Watch the tangent and the sensitivity.',
    quiz: [
      'When the output weight is zero, what is the output’s sensitivity to the first weight?',
      ['Zero', 'One', 'It depends on the input'],
      0,
      'Whatever change reaches the final stage is multiplied by zero. Backpropagation carries this local sensitivity backward through the same chain.',
      'Trace a tiny change in the gate output through its final multiplication.',
    ],
    formula: 'h = sigmoid(wx)     y = bh     ∂y/∂w = b × h(1 − h) × x',
    terms:
      'x is the fixed input of 2, w is the first weight, h is the gate activation, b is the output weight, and y is the prediction. ∂y/∂w is the local sensitivity to w with other inputs held fixed. The chain rule multiplies local sensitivities along a path. At branches, contributions from separate paths add.',
    example:
      'With w = 0, h = 0.5. For b = 1.5 and x = 2, the sensitivity is 1.5 × 0.25 × 2 = 0.75. A nudge of 0.01 changes the output by about 0.0075. To train from loss, multiply by the loss’s sensitivity to y as well.',
    python: `from math import exp
def output(w):
    return 1.5 / (1 + exp(-2*w))
eps = .0001
print((output(eps) - output(-eps)) / (2*eps))`,
  },
  attention: {
    title: 'Mix information with attention',
    intro:
      'The word “bank” could sit beside a river or approve a loan. Give it a query direction and watch one attention head mix three candidate signals.',
    heading: 'Match, weight, then mix',
    intuition:
      'A query represents what to look for. Each token has a key for matching and a value to contribute. Better-aligned keys receive more weight. The output blends the values using those weights. This toy head uses hand-picked two-dimensional keys and one-number values so you can inspect every operation.',
    challenge:
      'Set the angle to 0°, then 90°. Watch the loan bar and the mixed value. Hold the angle at 90° and lower temperature. Which operation gets sharper?',
    quiz: [
      'If you change only the token values, what changes in this head?',
      ['The attention weights', 'The mixed output can change', 'The query direction'],
      1,
      'The query and keys determine the weights. Values supply the content that gets mixed using those weights.',
      'Think of looking up a record. Which field helped you find it, and which field do you read out afterward?',
    ],
    formula: 'sᵢ = (q · kᵢ) / (√d × T)     aᵢ = exp(sᵢ) / Σⱼ exp(sⱼ)     o = Σᵢ aᵢvᵢ',
    terms:
      'q is the query, kᵢ the key, vᵢ the value, and d the key dimension. The softmax converts scores sᵢ into positive weights aᵢ summing to one. o is the mixed output. T is an extra teaching control for sharpness. T = 1 recovers standard scaled dot-product attention. Real transformers learn projections that form queries, keys, and values.',
    example:
      'At 0° and temperature 0.5, river, loan, and shore receive about 50%, 12%, and 38%. Their values are −1, +1, and −0.5, giving a mixture near −0.568. A higher weight makes a token’s value count more. The values can have either sign.',
    python: `from math import exp, sqrt
keys = [(1, 0), (0, 1), (.8, -.2)]
values = [-1, 1, -.5]
scores = [x / (sqrt(2)*.5) for x, y in keys]  # query (1, 0)
e = [exp(s-max(scores)) for s in scores]
weights = [v/sum(e) for v in e]
print(weights, sum(a*v for a,v in zip(weights, values)))`,
  },
};
