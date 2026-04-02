// encode-mp4.js
// Runs ffmpeg to encode captured PNG frames into an MP4
// Usage: node supericons/scripts/encode-mp4.js

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(__dirname, 'tmp-frames');
const outputDir = path.resolve(__dirname, '../public/packs/ai-agentic/previews');
const outputFile = path.join(outputDir, 'agent-workflow.mp4');

// Use full path since winget may not have updated PATH yet
const FFMPEG = 'C:\\Users\\guanh\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe';

if (!existsSync(framesDir)) {
  console.error('ERROR: tmp-frames/ not found. Run capture-icon.js first.');
  process.exit(1);
}

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

console.log('Encoding frames to MP4...');
const cmd = [
  `"${FFMPEG}"`,
  `-y`,                             // overwrite if exists
  `-framerate 60`,
  `-i "${path.join(framesDir, 'frame-%03d.png')}"`,
  `-vf "scale=56:56,format=yuv420p"`,
  `-c:v libx264`,
  `-crf 22`,                        // quality: lower = better (18-28 range)
  `-movflags +faststart`,           // streaming-optimized
  `-an`,                            // no audio
  `"${outputFile}"`
].join(' ');

console.log(`Running: ${cmd}\n`);
execSync(cmd, { stdio: 'inherit' });

// Report file size
const { statSync } = await import('fs');
const stats = statSync(outputFile);
const sizeKB = (stats.size / 1024).toFixed(1);
console.log(`\nDone! ${outputFile}`);
console.log(`File size: ${sizeKB} KB`);
