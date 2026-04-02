// Image-to-SVG Pipeline v2: Fixed coordinate handling
// The tracer outputs coordinates in the original image dimensions.
// We keep the tracer's native viewBox and let SVG scaling handle the rest.
import { vectorize, ColorMode, Hierarchical, PathSimplifyMode } from '@neplex/vectorizer';
import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\guanh\\.gemini\\antigravity\\brain\\a548c71c-3096-44c5-a79a-13b7ff814c33';
const outDir = path.join(process.cwd(), 'svg-traced');
fs.mkdirSync(outDir, { recursive: true });

const images = [
  { name: 'file-tree', file: 'ref_file_tree_1774271598054.png' },
  { name: 'lightbulb', file: 'ref_lightbulb_1774271611807.png' },
  { name: 'magic-wand', file: 'ref_magic_wand_1774271629206.png' },
];

for (const img of images) {
  const inputPath = path.join(brainDir, img.file);
  const buf = fs.readFileSync(inputPath);

  console.log(`Tracing ${img.name}...`);
  const svg = await vectorize(buf, {
    colorMode: ColorMode.Binary,
    hierarchical: Hierarchical.Stacked,
    mode: PathSimplifyMode.Spline,
    filterSpeckle: 8,
    colorPrecision: 8,
    layerDifference: 16,
    cornerThreshold: 60,
    lengthThreshold: 4.0,
    maxIterations: 10,
    spliceThreshold: 45,
    pathPrecision: 2,
  });

  // The tracer outputs width="640" height="640" with NO viewBox.
  // We need to ADD a proper viewBox matching the image dimensions
  // and set fill to currentColor
  const processed = svg
    .replace(/fill="#000000"/g, 'fill="currentColor"')
    .replace(/fill="#ffffff"[^/]*/g, '') // remove white background paths entirely
    .replace(/<path[^>]*fill=""[^/]*\/>/g, '') // remove empty fill paths
    .replace(/width="(\d+)" height="(\d+)"/, (match, w, h) => `width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"`);

  fs.writeFileSync(path.join(outDir, `${img.name}.svg`), processed, 'utf-8');

  // Also check file size for diagnostics
  const stats = fs.statSync(path.join(outDir, `${img.name}.svg`));
  console.log(`  -> ${img.name}.svg (${stats.size} bytes)`);
}

console.log('Done!');
