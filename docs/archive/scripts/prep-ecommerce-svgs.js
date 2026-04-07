// Prepare MingCute SVGs for e-commerce collection
// Strips metadata, removes wrapper, converts fill, adds viewBox and animation hooks
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'node_modules', 'mingcute_icon', 'svg');
const DEST = path.join(__dirname, 'public', 'packs', 'e-commerce');

const icons = [
  { name: 'shopping-cart', src: 'business/shopping_cart_1_line.svg', hook: 'ec-cart' },
  { name: 'shopping-bag', src: 'business/shopping_bag_2_line.svg', hook: 'ec-bag' },
  { name: 'store', src: 'building/store_line.svg', hook: 'ec-store' },
  { name: 'tag', src: 'business/tag_line.svg', hook: 'ec-tag' },
  { name: 'coupon', src: 'business/coupon_line.svg', hook: 'ec-coupon' },
  { name: 'sale', src: 'business/sale_line.svg', hook: 'ec-sale' },
  { name: 'wallet', src: 'business/wallet_line.svg', hook: 'ec-wallet' },
  { name: 'bank-card', src: 'business/bank_card_line.svg', hook: 'ec-card' },
  { name: 'coin', src: 'business/coin_line.svg', hook: 'ec-coin' },
  { name: 'cash', src: 'business/cash_line.svg', hook: 'ec-cash' },
  { name: 'bill', src: 'file/bill_line.svg', hook: 'ec-bill' },
  { name: 'gift', src: 'business/gift_line.svg', hook: 'ec-gift' },
  { name: 'basket', src: 'business/basket_line.svg', hook: 'ec-basket' },
  { name: 'barcode', src: 'device/barcode_line.svg', hook: 'ec-barcode' },
  { name: 'qrcode', src: 'device/qrcode_line.svg', hook: 'ec-qrcode' },
  { name: 'truck', src: 'transport/truck_line.svg', hook: 'ec-truck' },
  { name: 'package', src: 'file/package_line.svg', hook: 'ec-package' },
  { name: 'percentage', src: 'editor/percentage_line.svg', hook: 'ec-percent' },
  { name: 'star', src: 'shape/star_line.svg', hook: 'ec-star' },
  { name: 'heart', src: 'shape/heart_line.svg', hook: 'ec-heart' },
];

function cleanSvg(raw, hook) {
  // Extract the visible path(s) - everything with fill="#09244B" or the second+ path
  // MingCute format: <svg ...><g fill="none" ...><path d="M24 0v24..."/><path fill="#09244B" d="..."/></g></svg>
  
  // Get all path elements
  const pathRegex = /<path[^>]*?d="([^"]*)"[^>]*?\/?>/g;
  const paths = [];
  let match;
  while ((match = pathRegex.exec(raw)) !== null) {
    const fullMatch = match[0];
    const d = match[1];
    // Skip the metadata path (starts with M24 0v24 or similar bounding box)
    if (d.startsWith('M24 0v24H0V0') || d.startsWith('M12.59')) continue;
    paths.push({ full: fullMatch, d });
  }

  // Build clean SVG
  const cleanPaths = paths.map(p => {
    // Replace fill="#09244B" with fill="currentColor" and add animation hook class
    let cleaned = p.full
      .replace(/fill="#09244B"/g, `fill="currentColor"`)
      .replace(/fill="#[0-9a-fA-F]{6}"/g, `fill="currentColor"`);
    
    // Add animation hook class
    if (cleaned.includes('class="')) {
      cleaned = cleaned.replace(/class="/, `class="${hook} `);
    } else {
      cleaned = cleaned.replace('<path', `<path class="${hook}"`);
    }
    return cleaned;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\n  ${cleanPaths.join('\n  ')}\n</svg>\n`;
}

let count = 0;
for (const icon of icons) {
  const srcPath = path.join(SRC, icon.src);
  if (!fs.existsSync(srcPath)) {
    console.error(`MISSING: ${icon.src}`);
    continue;
  }
  const raw = fs.readFileSync(srcPath, 'utf8');
  const clean = cleanSvg(raw, icon.hook);
  const destPath = path.join(DEST, `${icon.name}.svg`);
  fs.writeFileSync(destPath, clean);
  count++;
  console.log(`OK: ${icon.name}.svg`);
}
console.log(`\nDone: ${count}/${icons.length} icons prepared`);
