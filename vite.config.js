import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// Plugin to remove individual premium SVG/CSS files from production build.
// Keeps:
//   - manifest.json (icon grid metadata)
//   - bundle.json per collection (grid rendering: CSS + all SVGs in one file)
// Removes:
//   - Individual .svg files (served from Supabase Storage via Edge Function)
//   - Individual .css files (CSS is embedded in bundle.json)
// This closes the "direct URL access" vector from the v3 protection plan.
function excludePremiumAssets() {
  return {
    name: 'exclude-premium-assets',
    apply: 'build',
    closeBundle() {
      const packsDir = path.resolve('dist', 'packs');
      if (!fs.existsSync(packsDir)) return;

      const collections = fs.readdirSync(packsDir).filter(
        f => fs.statSync(path.join(packsDir, f)).isDirectory()
      );

      let removedFiles = 0;
      for (const dir of collections) {
        const fullDir = path.join(packsDir, dir);
        const files = fs.readdirSync(fullDir);

        for (const file of files) {
          // Keep bundle.json, remove everything else (SVGs, CSS, subdirs)
          if (file === 'bundle.json') continue;
          const filePath = path.join(fullDir, file);
          if (fs.statSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
          removedFiles++;
        }
      }

      if (removedFiles > 0) {
        console.log(`[exclude-premium-assets] Removed ${removedFiles} individual files from dist/packs/ (bundles preserved)`);
      }
    },
  };
}

export default defineConfig({
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
  },
  plugins: [excludePremiumAssets()],
});
