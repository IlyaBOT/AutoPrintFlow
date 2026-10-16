export type Point = { x: number; y: number };

// Exact squared Euclidean distance transform; linear time and bounded memory.
function distanceLine(input: Float64Array, length: number) {
  const output = new Float64Array(length);
  const sites = new Int32Array(length);
  const limits = new Float64Array(length + 1);
  let k = 0;
  limits[0] = -Infinity;
  limits[1] = Infinity;
  for (let q = 1; q < length; q++) {
    let intersection =
      (input[q] + q * q - (input[sites[k]] + sites[k] * sites[k])) /
      (2 * q - 2 * sites[k]);
    while (intersection <= limits[k] && k > 0) {
      k--;
      intersection =
        (input[q] + q * q - (input[sites[k]] + sites[k] * sites[k])) /
        (2 * q - 2 * sites[k]);
    }
    sites[++k] = q;
    limits[k] = intersection;
    limits[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < length; q++) {
    while (limits[k + 1] < q) k++;
    output[q] = (q - sites[k]) ** 2 + input[sites[k]];
  }
  return output;
}
export function dilateMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
) {
  const distances = new Float64Array(mask.length);
  for (let y = 0; y < height; y++) {
    const row = Float64Array.from({ length: width }, (_, x) =>
      mask[y * width + x] ? 0 : 1e9,
    );
    distances.set(distanceLine(row, width), y * width);
  }
  const result = new Uint8Array(mask.length);
  for (let x = 0; x < width; x++) {
    const column = Float64Array.from(
      { length: height },
      (_, y) => distances[y * width + x],
    );
    const line = distanceLine(column, height);
    for (let y = 0; y < height; y++)
      result[y * width + x] = line[y] <= radius * radius ? 1 : 0;
  }
  return result;
}
function area(points: Point[]) {
  return (
    points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2
  );
}
function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;
  const first = points[0],
    last = points[points.length - 1];
  const dx = last.x - first.x,
    dy = last.y - first.y;
  let maxDistance = tolerance * tolerance,
    split = -1;
  for (let index = 1; index < points.length - 1; index++) {
    const p = points[index];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((p.x - first.x) * dx + (p.y - first.y) * dy) /
          (dx * dx + dy * dy || 1),
      ),
    );
    const distance =
      (p.x - first.x - t * dx) ** 2 + (p.y - first.y - t * dy) ** 2;
    if (distance > maxDistance) {
      maxDistance = distance;
      split = index;
    }
  }
  return split < 0
    ? [first, last]
    : [
        ...simplify(points.slice(0, split + 1), tolerance).slice(0, -1),
        ...simplify(points.slice(split), tolerance),
      ];
}
// Oriented pixel edges produce closed, separate outlines. Internal holes are deliberately excluded.
export function traceExternalContours(
  mask: Uint8Array,
  width: number,
  height: number,
  minArea = 12,
): Point[][] {
  type Edge = {
    x: number;
    y: number;
    nx: number;
    ny: number;
    direction: number;
    used: boolean;
  };
  const edges: Edge[] = [],
    starts = new Map<number, Edge[]>();
  const key = (x: number, y: number) => y * (width + 1) + x;
  const add = (
    x: number,
    y: number,
    nx: number,
    ny: number,
    direction: number,
  ) => {
    const edge = { x, y, nx, ny, direction, used: false };
    edges.push(edge);
    const id = key(x, y);
    starts.set(id, [...(starts.get(id) ?? []), edge]);
  };
  const filled = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (filled(x, y)) {
        if (!filled(x, y - 1)) add(x, y, x + 1, y, 0);
        if (!filled(x + 1, y)) add(x + 1, y, x + 1, y + 1, 1);
        if (!filled(x, y + 1)) add(x + 1, y + 1, x, y + 1, 2);
        if (!filled(x - 1, y)) add(x, y + 1, x, y, 3);
      }
  const contours: Point[][] = [];
  for (const start of edges) {
    if (start.used) continue;
    const points: Point[] = [];
    let edge: Edge | undefined = start;
    while (edge && !edge.used) {
      edge.used = true;
      points.push({ x: edge.x, y: edge.y });
      const direction: number = edge.direction;
      const candidates: Edge[] = (
        starts.get(key(edge.nx, edge.ny)) ?? []
      ).filter((candidate) => !candidate.used);
      edge = candidates.sort(
        (a, b) =>
          ((a.direction - direction + 3) % 4) -
          ((b.direction - direction + 3) % 4),
      )[0];
    }
    if (points.length < 4 || area(points) < minArea) continue;
    const middle = Math.floor(points.length / 2);
    const reduced = [
      ...simplify(points.slice(0, middle + 1), 0.6).slice(0, -1),
      ...simplify([...points.slice(middle), points[0]], 0.6).slice(0, -1),
    ];
    if (reduced.length >= 3) contours.push(reduced);
  }
  return contours;
}
export function contourPath(contours: Point[][], scale = 1, offset = 0) {
  const n = (value: number) => Number((value * scale + offset).toFixed(4));
  return contours
    .map(
      (points) =>
        points
          .map((p, index) => `${index ? "L" : "M"}${n(p.x)} ${n(p.y)}`)
          .join(" ") + " Z",
    )
    .join(" ");
}
