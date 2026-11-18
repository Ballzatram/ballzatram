const NS = 'http://www.w3.org/2000/svg';
export const C = {
  line: '#d5ef83',
  point: '#a0ddd0',
  alt: '#ffae88',
  quiet: '#c2d0c5',
  grid: '#395346',
  ink: '#ecf0e6',
};
function element(tag, attrs, parent, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  parent.append(node);
  return node;
}
function ticks(lo, hi, count) {
  const raw = (hi - lo) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= raw - 1e-9) * power;
  const first = Math.ceil((lo - 1e-9) / step) * step;
  const output = [];
  for (let a = first; a <= hi + 1e-9; a += step) output.push(+a.toFixed(4));
  return output;
}
export function chart(svg, opt) {
  svg.replaceChildren();
  const width = Math.max(235, svg.clientWidth),
    height = Math.max(225, svg.clientHeight);
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  element('title', { id: 'chart-title' }, svg, opt.title);
  element('desc', { id: 'chart-desc' }, svg, opt.desc);
  const [xmin, xmax] = opt.x,
    [ymin, ymax] = opt.y;
  const left = opt.left ?? 43,
    right = 12,
    top = 12,
    bottom = 46;
  const w = width - left - right,
    h = height - top - bottom;
  const ux = w / (xmax - xmin),
    uy = h / (ymax - ymin),
    unit = Math.min(ux, uy);
  const sx = opt.equal ? unit : ux,
    sy = opt.equal ? unit : uy;
  const X = (x) => left + w / 2 + (x - (xmin + xmax) / 2) * sx;
  const Y = (y) => top + h / 2 - (y - (ymin + ymax) / 2) * sy;
  const defs = element('defs', {}, svg);
  const clip = element('clipPath', { id: 'fieldbook-clip' }, defs);
  element(
    'rect',
    {
      x: X(xmin) - 1,
      y: Y(ymax) - 1,
      width: (xmax - xmin) * sx + 2,
      height: (ymax - ymin) * sy + 2,
    },
    clip,
  );
  const grid = element('g', {}, svg);
  const layer = element('g', { 'clip-path': 'url(#fieldbook-clip)' }, svg);
  const text = (x, y, txt, anchor = 'middle', color = C.quiet) =>
    element(
      'text',
      {
        x,
        y,
        fill: color,
        'font-size': 11,
        'font-family': 'system-ui,sans-serif',
        'text-anchor': anchor,
      },
      grid,
      txt,
    );
  const rule = (x1, y1, x2, y2, color, width, parent, dash) =>
    element(
      'line',
      {
        x1,
        y1,
        x2,
        y2,
        stroke: color,
        'stroke-width': width,
        ...(dash ? { 'stroke-dasharray': dash } : {}),
      },
      parent,
    );
  for (const x of opt.xticks ?? ticks(xmin, xmax, width < 430 ? 4 : 7)) {
    rule(X(x), Y(ymin), X(x), Y(ymax), C.grid, 1, grid);
    text(X(x), Y(ymin) + 17, opt.xformat ? opt.xformat(x) : x);
  }
  for (const y of opt.yticks ?? ticks(ymin, ymax, 5)) {
    rule(X(xmin), Y(y), X(xmax), Y(y), C.grid, 1, grid);
    text(X(xmin) - 7, Y(y) + 4, opt.yformat ? opt.yformat(y) : y, 'end');
  }
  text((X(xmin) + X(xmax)) / 2, height - 3, opt.xlabel);
  const axisCenter = (Y(ymin) + Y(ymax)) / 2;
  const label = text(10, axisCenter, opt.ylabel);
  label.setAttribute('transform', 'rotate(-90 10 ' + axisCenter + ')');
  function line(x1, y1, x2, y2, color = C.line, weight = 2, dash) {
    rule(X(x1), Y(y1), X(x2), Y(y2), color, weight, layer, dash);
  }
  function point(x, y, color = C.point, size = 4, square = false) {
    const common = { fill: color, stroke: '#1b3026', 'stroke-width': 1.5 };
    if (square)
      element(
        'rect',
        { x: X(x) - size, y: Y(y) - size, width: size * 2, height: size * 2, ...common },
        layer,
      );
    else element('circle', { cx: X(x), cy: Y(y), r: size, ...common }, layer);
  }
  function path(points, color = C.line, weight = 2.5) {
    element(
      'polyline',
      {
        points: points.map(([x, y]) => X(x) + ',' + Y(y)).join(' '),
        fill: 'none',
        stroke: color,
        'stroke-width': weight,
        'stroke-linejoin': 'round',
      },
      layer,
    );
  }
  function curve(fn, start = xmin, end = xmax) {
    path(
      Array.from({ length: 241 }, (_, i) => {
        const x = start + ((end - start) * i) / 240;
        return [x, fn(x)];
      }),
    );
  }
  function rect(x1, y1, x2, y2, color = C.point) {
    element(
      'rect',
      {
        x: Math.min(X(x1), X(x2)),
        y: Math.min(Y(y1), Y(y2)),
        width: Math.abs(X(x2) - X(x1)),
        height: Math.abs(Y(y2) - Y(y1)),
        fill: color,
      },
      layer,
    );
  }
  function arrow(x, y, color = C.line) {
    line(0, 0, x, y, color, 2.8);
    const angle = Math.atan2(Y(y) - Y(0), X(x) - X(0));
    const ends = [angle + 0.46, angle - 0.46].map((a) => [
      X(x) - 10 * Math.cos(a),
      Y(y) - 10 * Math.sin(a),
    ]);
    element(
      'polygon',
      { points: [[X(x), Y(y)], ...ends].map((p) => p.join(',')).join(' '), fill: color },
      layer,
    );
  }
  return { line, point, path, curve, rect, arrow };
}
