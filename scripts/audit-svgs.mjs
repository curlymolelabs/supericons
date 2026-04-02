import { readFileSync } from 'fs';

const d = JSON.parse(readFileSync('./public/icon-index.json', 'utf8'));

const libs = ['lucide', 'tabler', 'heroicons', 'feather', 'iconoir', 'ionicons'];

libs.forEach(lib => {
  const icons = d.icons.filter(i => i.lib === lib && i.svg);
  const sample = icons[0];
  console.log(`\n=== ${lib} (${sample.id}) ===`);
  console.log(sample.svg.substring(0, 600));
  console.log('');
  
  // Check if stroke-width is hardcoded in the SVG element or path elements
  const hasHardcodedSW = sample.svg.match(/stroke-width="[^"]*"/g);
  console.log('Hardcoded stroke-width attrs:', hasHardcodedSW);
  
  // Check SVG root attributes
  const svgTag = sample.svg.match(/<svg[^>]*>/);
  console.log('SVG tag:', svgTag ? svgTag[0] : 'N/A');
});
