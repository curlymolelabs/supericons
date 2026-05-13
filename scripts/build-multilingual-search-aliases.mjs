import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const localeFilesDir = path.join(rootDir, 'data', 'i18n', 'messages');
const sourcePath = path.join(rootDir, 'data', 'i18n', 'multilingual-search-aliases.json');
const publicPath = path.join(rootDir, 'public', 'multilingual-search-aliases.json');
const packagedPath = path.join(rootDir, 'mcp', 'public', 'multilingual-search-aliases.json');
const synonymsPath = path.join(rootDir, 'public', 'synonyms.json');

const locales = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th'];

const categoryConcepts = {
  'ai-agent-workflows': ['agent', 'llm', 'robot', 'workflow', 'orchestrator', 'prompt', 'neural', 'vector'],
  'navigation-wayfinding': ['navigate', 'map', 'pin', 'arrow', 'breadcrumb', 'globe'],
  'actions-controls': ['add', 'edit', 'save', 'trash', 'copy', 'share', 'download', 'upload', 'toggle', 'slider', 'menu'],
  'status-feedback': ['success', 'error', 'warning', 'info', 'loading', 'empty', 'disabled', 'online', 'offline', 'notifications', 'badge'],
  'people-accounts': ['user', 'contact', 'admin', 'permission', 'login', 'logout', 'signup', 'password'],
  communication: ['mail', 'chat', 'phone', 'reply', 'broadcast', 'meeting', 'videocall', 'voicemail', 'mention', 'thread'],
  'files-content': ['file', 'folder', 'image', 'attachment', 'template', 'version', 'presentation', 'spreadsheet', 'book', 'text'],
  'data-analytics': ['database', 'chart', 'dashboard', 'log', 'trace', 'observe', 'performance', 'spreadsheet'],
  'commerce-finance': ['cart', 'money', 'card', 'wallet', 'bank', 'store', 'checkout', 'invoice', 'receipt', 'refund', 'discount', 'subscription', 'shipping', 'tax', 'inventory', 'pricing'],
  'security-access': ['lock', 'key', 'shield', 'firewall', 'vpn', 'encrypt', 'breach', 'compliance', 'privacy', 'certificate', 'malware', 'permission', 'mfa'],
  'media-playback': ['video', 'music', 'playback', 'playlist', 'stream', 'record', 'fullscreen', 'mute', 'caption', 'podcast', 'thumbnail', 'equalizer'],
  'devices-hardware': ['cpu', 'memory', 'wifi', 'bluetooth', 'battery', 'print', 'laptop', 'desktop', 'tablet', 'smartwatch', 'television', 'headphone', 'speaker', 'microphone', 'keyboard', 'webcam'],
  'code-development': ['code', 'terminal', 'api', 'sdk', 'git', 'branch', 'deploy', 'pipeline', 'webhook', 'docker', 'test', 'migrate', 'package', 'environment'],
  'design-editing': ['palette', 'brush', 'crop', 'layout', 'layer', 'artboard', 'gradient', 'blur', 'opacity', 'align', 'pen', 'eyedropper', 'wireframe', 'component', 'typography'],
  'maps-places-travel': ['map', 'globe', 'pin', 'navigate', 'plane', 'car', 'truck', 'flight', 'hotel', 'itinerary', 'taxi', 'parking', 'metro', 'bicycle'],
  'time-calendar': ['clock', 'calendar', 'appointment'],
  'nature-weather-lifestyle': ['sun', 'moon', 'tree', 'leaf', 'water', 'mountain', 'fitness', 'food', 'coffee'],
  'brands-social': ['globe', 'share', 'link', 'bookmark', 'follow', 'unfollow', 'hashtag', 'reaction', 'vote', 'feed', 'community', 'invite'],
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildVariants(label) {
  const clean = String(label || '').trim();
  const variants = new Set();
  const split = clean
    .split(/[&,،、，/|]+/u)
    .map((part) => part.trim())
    .filter((part) => part && part !== clean);

  for (const part of split) variants.add(part);
  return [...variants];
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

const synonyms = await readJson(synonymsPath);
const synonymKeys = new Set(Object.keys(synonyms));

for (const [category, concepts] of Object.entries(categoryConcepts)) {
  const missing = concepts.filter((concept) => !synonymKeys.has(concept));
  if (missing.length) {
    throw new Error(`${category} maps to concepts missing from public synonyms: ${missing.join(', ')}`);
  }
}

const aliases = [];

for (const locale of locales) {
  const catalog = await readJson(path.join(localeFilesDir, `${locale}.json`));
  const categories = catalog?.filters?.categories || {};

  for (const [category, mapsTo] of Object.entries(categoryConcepts)) {
    const term = String(categories[category] || '').trim();
    if (!term) {
      throw new Error(`${locale} is missing filters.categories.${category}`);
    }

    aliases.push({
      locale,
      alias_type: 'category',
      category,
      term,
      variants: buildVariants(term),
      maps_to: unique(mapsTo),
      gate: 'auto_accept',
    });
  }
}

const payload = {
  version: 1,
  locales,
  alias_types: ['category'],
  aliases,
};

const raw = `${JSON.stringify(payload, null, 2)}\n`;

await fs.mkdir(path.dirname(sourcePath), { recursive: true });
await fs.mkdir(path.dirname(publicPath), { recursive: true });
await fs.mkdir(path.dirname(packagedPath), { recursive: true });
await fs.writeFile(sourcePath, raw, 'utf8');
await fs.writeFile(publicPath, raw, 'utf8');
await fs.writeFile(packagedPath, raw, 'utf8');

console.log(`build-multilingual-search-aliases: wrote ${aliases.length} aliases`);
