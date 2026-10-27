import sharp from 'sharp';

// Offline orthographic render of the actual game mesh. A depth buffer is
// necessary: sorting whole triangles by their centres cuts through the relief.
export async function renderToken(mesh, size = 400) {
  const scale = 4, width = size * scale;
  const pixels = Buffer.alloc(width * width * 4);
  const depth = new Float64Array(width * width).fill(Infinity);
  const project = ([x, y, z]) => {
    x -= 8; y -= 8; z -= 7.5;
    return [(200 + (x * .95 + z * .31) * 21) * width / 400,
      (200 - (y * .98 - z * .16) * 21) * width / 400,
      z * .94 - x * .30 + y * .15];
  };
  const edge = (a, b, x, y) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  for (const face of mesh.faces) {
    const points = face.p.map(project), color = mesh.palette[face.material];
    for (let t = 1; t < points.length - 1; t++) {
      const a = points[0], b = points[t], c = points[t + 1];
      const area = edge(a, b, c[0], c[1]);
      if (Math.abs(area) < 1e-8) continue;
      const left = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
      const right = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const top = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
      const bottom = Math.min(width - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
        const u = edge(b, c, x + .5, y + .5) / area;
        const v = edge(c, a, x + .5, y + .5) / area;
        const w = 1 - u - v;
        if (Math.min(u, v, w) < -1e-9) continue;
        const z = u * a[2] + v * b[2] + w * c[2], i = y * width + x;
        if (z >= depth[i]) continue;
        depth[i] = z;
        pixels[i * 4] = (color >> 16) & 255;
        pixels[i * 4 + 1] = (color >> 8) & 255;
        pixels[i * 4 + 2] = color & 255;
        pixels[i * 4 + 3] = face.alpha ?? 255;
      }
    }
  }
  return sharp(pixels, {raw: {width, height: width, channels: 4}})
    .resize(size, size).png().toBuffer();
}
