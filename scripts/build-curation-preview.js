import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const icons = [
  // BATCH 1 (approved 20)
  { name: 'circle-check', cat: 'state', desc: 'Success / Done' },
  { name: 'circle-x', cat: 'state', desc: 'Error / Failed' },
  { name: 'alert-triangle', cat: 'state', desc: 'Warning / Caution' },
  { name: 'info-circle', cat: 'state', desc: 'Info / Tip' },
  { name: 'help-circle', cat: 'state', desc: 'Help / Question' },
  { name: 'ban', cat: 'state', desc: 'Blocked / Forbidden' },
  { name: 'clock', cat: 'progress', desc: 'Pending / Scheduled' },
  { name: 'hourglass', cat: 'progress', desc: 'Processing / Waiting' },
  { name: 'loader-2', cat: 'progress', desc: 'Loading / Spinning' },
  { name: 'refresh', cat: 'progress', desc: 'Retry / Sync' },
  { name: 'progress-check', cat: 'progress', desc: 'Progress Complete' },
  { name: 'bell', cat: 'notification', desc: 'Alert / Notification' },
  { name: 'eye', cat: 'visibility', desc: 'Visible / Public' },
  { name: 'eye-off', cat: 'visibility', desc: 'Hidden / Private' },
  { name: 'thumb-up', cat: 'feedback', desc: 'Approve / Like' },
  { name: 'thumb-down', cat: 'feedback', desc: 'Reject / Dislike' },
  { name: 'star', cat: 'feedback', desc: 'Favorite / Rate' },
  { name: 'shield-check', cat: 'trust', desc: 'Verified / Secure' },
  { name: 'trophy', cat: 'achievement', desc: 'Win / Achievement' },
  { name: 'sparkles', cat: 'special', desc: 'New / Featured' },
  // BATCH 2 (30 more)
  { name: 'power', cat: 'control', desc: 'On / Off / Shutdown' },
  { name: 'toggle-right', cat: 'control', desc: 'Enabled / Active' },
  { name: 'bookmark', cat: 'action', desc: 'Saved / Bookmarked' },
  { name: 'pinned', cat: 'action', desc: 'Pinned / Sticky' },
  { name: 'flag', cat: 'action', desc: 'Flagged / Reported' },
  { name: 'archive', cat: 'action', desc: 'Archived / Stored' },
  { name: 'trash', cat: 'action', desc: 'Deleted / Removed' },
  { name: 'send', cat: 'action', desc: 'Sent / Submitted' },
  { name: 'cloud-check', cat: 'system', desc: 'Cloud Synced / Saved' },
  { name: 'wifi', cat: 'system', desc: 'Connected / Online' },
  { name: 'bolt', cat: 'system', desc: 'Instant / Flash' },
  { name: 'flame', cat: 'system', desc: 'Hot / Trending' },
  { name: 'heart', cat: 'feedback', desc: 'Loved / Favorite' },
  { name: 'link', cat: 'system', desc: 'Linked / Connected' },
  { name: 'lock', cat: 'access', desc: 'Locked / Restricted' },
  { name: 'lock-open', cat: 'access', desc: 'Unlocked / Open' },
  { name: 'mail-check', cat: 'communication', desc: 'Email Confirmed' },
  { name: 'message-check', cat: 'communication', desc: 'Message Sent' },
  { name: 'mood-smile', cat: 'sentiment', desc: 'Positive / Satisfied' },
  { name: 'mood-sad', cat: 'sentiment', desc: 'Negative / Unhappy' },
  { name: 'arrow-up', cat: 'delta', desc: 'Increase / Upgrade' },
  { name: 'arrow-down', cat: 'delta', desc: 'Decrease / Downgrade' },
  { name: 'trending-up', cat: 'delta', desc: 'Growth / Rising' },
  { name: 'trending-down', cat: 'delta', desc: 'Decline / Falling' },
  { name: 'list-check', cat: 'validation', desc: 'Tasks Complete' },
  { name: 'clipboard-check', cat: 'validation', desc: 'Copied / Verified' },
  { name: 'filter', cat: 'data', desc: 'Filtered / Refined' },
  { name: 'sort-ascending', cat: 'data', desc: 'Sorted / Ordered' },
  { name: 'circle-dot', cat: 'state', desc: 'Active / Recording' },
  { name: 'rosette-discount-check', cat: 'trust', desc: 'Certified / Badge' },
];

const dir = path.join(__dirname, '..', 'node_modules', '@tabler', 'icons', 'icons', 'outline');

let approvedCells = '';
let newCells = '';

icons.forEach((icon, i) => {
  let svg = fs.readFileSync(path.join(dir, icon.name + '.svg'), 'utf-8');
  svg = svg.replace(/\s*width="24"\s*/g, ' ').replace(/\s*height="24"\s*/g, ' ');
  const batchClass = i < 20 ? 'approved' : 'new';
  const cell = `<div class="cell ${batchClass}">
    <span class="num">${i + 1}</span>
    <span class="cat">${icon.cat}</span>
    ${svg}
    <span class="name">${icon.name}</span>
    <span class="desc">${icon.desc}</span>
  </div>`;
  if (i < 20) approvedCells += cell + '\n';
  else newCells += cell + '\n';
});

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Status &amp; Feedback: Full 50 Icon Curation</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; color: #e0e0e0; font-family: 'Inter', sans-serif; padding: 32px; }
  h1 { font-size: 22px; margin-bottom: 4px; color: #fff; }
  .subtitle { color: #888; font-size: 14px; margin-bottom: 8px; }
  .legend { color: #666; font-size: 12px; margin-bottom: 24px; }
  .legend span { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
  .legend .dot-approved { background: #333366; }
  .legend .dot-new { background: #1a3a2e; }
  .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; max-width: 900px; }
  .cell {
    position: relative;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 18px 10px 12px;
    border-radius: 10px;
    transition: all 0.2s ease;
  }
  .cell.approved { background: #252545; border: 1px solid #333366; }
  .cell.new { background: #1a2e2a; border: 1px solid #2a4a3e; }
  .cell:hover { border-color: #ffffff; background: #2a2a4a; }
  .cell svg { width: 32px; height: 32px; color: #ffffff; }
  .cell .name { font-size: 10px; color: #ccc; text-align: center; }
  .cell .cat { font-size: 8px; color: #777; text-transform: uppercase; letter-spacing: 0.5px; }
  .cell .desc { font-size: 8px; color: #555; text-align: center; line-height: 1.3; }
  .cell .num { position: absolute; top: 5px; left: 7px; font-size: 8px; color: #555; }
  .divider { grid-column: 1 / -1; border-top: 1px dashed #333; margin: 8px 0; position: relative; }
  .divider::after { content: 'NEW (30 additional icons)'; position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background: #1a1a2e; padding: 0 12px; font-size: 10px; color: #4a8a6a; }
</style>
</head>
<body>
<h1>Status &amp; Feedback: Full 50 Icon Curation (Tabler)</h1>
<p class="subtitle">Complete collection for SaaS dashboards, notifications, and app state feedback.</p>
<p class="legend"><span class="dot-approved"></span> Approved (1-20) &nbsp;&nbsp; <span class="dot-new"></span> New (21-50)</p>
<div class="grid">
${approvedCells}
<div class="divider"></div>
${newCells}
</div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '..', 'public', 'preview-status-curation.html'), html);
console.log('Done: ' + icons.length + ' icons inlined into preview HTML');
