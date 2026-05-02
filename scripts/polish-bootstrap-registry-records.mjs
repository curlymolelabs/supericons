import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const SOURCE_FILE = 'data/si-registry/source/libraries/bootstrap.json';
const WORKBENCH_FILE = 'data/si-registry/staging/library-workbench/bootstrap.json';

const BRAND_NAMES = new Set([
  'alipay', 'amd', 'android', 'anthropic', 'apple', 'behance', 'bluesky', 'bluetooth',
  'bootstrap', 'claude', 'css', 'discord', 'dribbble', 'dropbox', 'facebook', 'git',
  'github', 'gitlab', 'google', 'instagram', 'javascript', 'mastodon', 'medium',
  'messenger', 'meta', 'nvidia', 'paypal', 'perplexity', 'pinterest', 'playstation',
  'quora', 'reddit', 'signal', 'snapchat', 'sourceforge', 'spotify', 'steam',
  'strava', 'stripe', 'substack', 'telegram', 'threads', 'tiktok', 'trello',
  'twitch', 'typescript', 'ubuntu', 'unity', 'vimeo', 'wechat', 'whatsapp',
  'wikipedia', 'wordpress', 'yelp', 'youtube', 'x',
]);

const SUBJECT_DESCRIPTIONS = {
  airplane: 'airplane silhouette with wings and tail for flights and air travel',
  award: 'award ribbon or medal for achievements, prizes, and recognition',
  backpack: 'backpack bag for school, travel, or carried items',
  bank: 'bank building facade with columns for finance and institutions',
  basket: 'shopping or storage basket for goods, carts, or collections',
  battery: 'battery cell outline for charge level or power status',
  book: 'book volume for reading, documentation, or knowledge',
  bookmarks: 'stacked bookmark ribbons for saved pages or favorites',
  braces: 'curly braces for code blocks, JSON, or developer formatting',
  briefcase: 'briefcase bag for business, work, or professional items',
  brush: 'paint brush for styling, drawing, or visual customization',
  bug: 'bug shape for software defects, debugging, or issues',
  cake: 'layer cake with candle for birthdays, celebrations, or desserts',
  calendar: 'calendar page for dates, events, and schedules',
  camera: 'camera body with lens for photos, capture, or media input',
  capsule: 'medicine capsule for pharmacy, medication, or health treatment',
  cash: 'banknote shape for cash, money, and payments',
  clipboard: 'clipboard board for tasks, forms, or copied notes',
  coin: 'coin circle for currency, tokens, or payment value',
  command: 'command-key loop mark for keyboard shortcuts and commands',
  compass: 'compass dial and needle for direction, navigation, or orientation',
  cookie: 'round cookie with chips for cookies, snacks, or browser cookies',
  copy: 'overlapping document sheets for copy or duplicate actions',
  diamond: 'diamond shape for gems, tiers, or geometric markers',
  disc: 'round disc for media, storage, or optical discs',
  display: 'monitor screen for displays, desktop output, or devices',
  ear: 'ear shape for hearing, listening, or audio accessibility',
  egg: 'oval egg shape for food, incubation, or origin concepts',
  exclude: 'overlapping shapes for excluding, subtracting, or removing regions',
  exposure: 'exposure control mark for brightness, camera, or image adjustment',
  film: 'film strip for movies, video, and media production',
  fingerprint: 'fingerprint ridge pattern for identity, biometrics, or sign-in',
  fire: 'flame shape for heat, danger, popularity, or urgent activity',
  gift: 'wrapped present with ribbon for gifts, rewards, or promotions',
  globe: 'globe sphere for world, language, geography, or global settings',
  hammer: 'hammer tool for building, fixing, moderation, or construction',
  hexagon: 'six-sided polygon for geometry, badges, or token shapes',
  hospital: 'hospital building or medical cross for healthcare locations',
  house: 'house outline for home, residence, or main page navigation',
  inbox: 'inbox tray for received messages, tasks, or incoming items',
  intersect: 'overlapping shapes for intersection or shared areas',
  keyboard: 'keyboard rectangle for typing, shortcuts, or input devices',
  ladder: 'ladder shape for climbing, steps, or staged progress',
  laptop: 'open laptop for portable computing or workstation devices',
  layers: 'stacked sheets for layers, depth, or grouped content',
  leaf: 'leaf shape for nature, plants, sustainability, or growth',
  luggage: 'travel luggage for trips, baggage, or tourism',
  lungs: 'paired lung shape for breathing, health, or respiratory topics',
  magnet: 'horseshoe magnet for attraction, snapping, or magnetic behavior',
  map: 'folded map for locations, routes, and navigation',
  mic: 'microphone for voice recording, audio input, or speaking',
  moon: 'crescent moon for night mode, sleep, or dark appearance',
  mortarboard: 'graduation cap for education, learning, or achievement',
  mouse: 'computer mouse for pointer input or desktop interaction',
  octagon: 'eight-sided polygon often used for stop, warning, or geometry',
  palette: 'artist palette for colors, themes, and design choices',
  paragraph: 'paragraph mark for text blocks and document formatting',
  pen: 'pen nib or writing tool for editing and signing',
  pencil: 'pencil for writing, editing, or sketching',
  pentagon: 'five-sided polygon for geometry, badges, or shapes',
  phone: 'phone handset for calls, contact, or support',
  plugin: 'plug or extension shape for add-ons and integrations',
  plus: 'plus sign for adding, creating, or increasing',
  prescription: 'prescription mark for medicine orders or pharmacy',
  projector: 'projector device for presentations or display output',
  rainbow: 'arched rainbow for weather, color, or pride themes',
  recycle: 'recycling arrows for reuse, sustainability, or refresh cycles',
  repeat: 'looping arrows for repeat, replay, or recurring actions',
  save: 'floppy disk shape for saving changes or stored files',
  scissors: 'scissors for cutting, trimming, or editing',
  scooter: 'scooter vehicle for transport or mobility',
  screwdriver: 'screwdriver tool for repair, setup, or configuration',
  shop: 'storefront awning for shops, commerce, or retail locations',
  shuffle: 'crossing arrows for random order or shuffle playback',
  snow: 'snowflake for snow, cold weather, or winter state',
  speaker: 'speaker cone for audio output or sound',
  stopwatch: 'stopwatch timer for elapsed time or performance',
  subtract: 'minus or subtraction mark for removing or decreasing',
  suitcase: 'suitcase for travel, luggage, or trips',
  sun: 'sun disk with rays for daylight, brightness, or light mode',
  sunset: 'sun near horizon for sunset, evening, or daylight changes',
  table: 'table grid for rows, columns, or tabular data',
  tag: 'price tag shape for labels, categories, or discounts',
  thermometer: 'thermometer for temperature, heat, or weather readings',
  ticket: 'ticket stub for admission, events, or passes',
  tornado: 'spiral funnel for tornado weather or destructive motion',
  translate: 'language characters for translation or localization',
  tree: 'tree shape for nature, hierarchy, or branching structures',
  triangle: 'three-sided polygon for geometry, warning, or shape markers',
  truck: 'delivery truck for shipping, freight, or logistics',
  umbrella: 'umbrella canopy for rain protection or coverage',
  union: 'overlapping shapes for union, merge, or combined regions',
  usb: 'USB connector for ports, devices, or removable storage',
  virus: 'spiky virus particle for malware, infection, or health risk',
  wallet: 'wallet for payments, cards, and stored money',
  watch: 'wristwatch for time, schedules, or wearable devices',
  wind: 'flowing wind lines for windy weather or airflow',
  windows: 'window panes for operating systems, app windows, or layouts',
  box: 'box or package container for storage, shipping, or layout blocks',
  bricks: 'brick blocks for construction, layout, or building pieces',
  circle: 'simple circular outline for geometry, status, or selectable shapes',
  cloud: 'cloud shape for weather, sync, hosting, or online storage',
  eraser: 'eraser block for clearing, deleting, or removing marks',
  files: 'stacked file pages for multiple documents or file collections',
  flask: 'laboratory flask for experiments, testing, or science',
  lightning: 'lightning bolt for speed, power, flash, or energy',
  magic: 'magic wand or sparkle cue for automation and assisted actions',
  mailbox: 'mailbox for postal mail, inboxes, or message delivery',
  passport: 'passport booklet for travel identity and verification',
  radar: 'radar sweep for detection, scanning, or monitoring',
  rocket: 'rocket for launch, growth, speed, or startup activity',
  rss: 'RSS broadcast arcs for feeds and subscriptions',
  sunrise: 'sun rising over horizon for morning or start of day',
  aspect: 'aspect ratio frame for resizing, cropping, or screen proportions',
  at: 'at-sign spiral used for email addresses, handles, mentions, and contact identifiers',
  fan: 'fan blades for cooling, airflow, or ventilation',
  file: 'document page for files, records, or attachments',
  folder: 'folder tab for directories, collections, or grouped files',
  info: 'information mark for help, details, or explanatory status',
  line: 'straight line for divider, drawing, or stroke elements',
  link: 'chain link for URLs, relationships, or connected items',
  list: 'stacked list lines for menus, lists, or ordered content',
  lock: 'closed padlock for secured or restricted access',
  pin: 'map pin or fastening pin for locations and pinned items',
  question: 'question mark for help, unknown state, or support',
  search: 'magnifying glass for search, lookup, or finding content',
  shield: 'shield for security, protection, or verification',
  square: 'square outline for geometry, selection, or shape markers',
  stop: 'stop symbol for halt, end, or cancellation',
  terminal: 'terminal prompt window for command-line input or developer tools',
};

const BRAND_DISPLAY = {
  css: 'CSS',
  html5: 'HTML5',
  javascript: 'JavaScript',
  npm: 'npm',
  rss: 'RSS',
  x: 'X',
};

const STOP_WORDS = new Set([
  '90deg', 'add', 'arrow', 'arrows', 'bar', 'check', 'circle', 'compact',
  'dash', 'double', 'down', 'earmark', 'exclamation', 'fullscreen', 'gear',
  'heart', 'in', 'left', 'lightning', 'lock', 'music', 'off', 'play', 'plus',
  'right', 'short', 'slash', 'snow', 'square', 'text', 'up', 'x',
]);

function wordsFromName(name) {
  return name.split(/[_-]+/).filter(Boolean);
}

function titleCase(words) {
  return words.map((word) => (BRAND_DISPLAY[word] || word.charAt(0).toUpperCase() + word.slice(1))).join(' ');
}

function humanName(name) {
  return titleCase(wordsFromName(name));
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function directionFrom(words) {
  return ['down', 'up', 'left', 'right'].find((word) => words.includes(word));
}

function baseSubject(words) {
  return words.find((word) => !STOP_WORDS.has(word)) || words[0];
}

function hasAny(words, candidates) {
  return candidates.some((candidate) => words.includes(candidate));
}

function brandRecord(name) {
  const label = BRAND_DISPLAY[name] || humanName(name);
  return {
    depicts: `Logo-style mark associated with ${label} for identifying the ${label} service or platform.`,
    semantic_tags: unique([name, 'logo', 'service', 'platform', 'identity']),
    synonyms: unique([label, `${label} logo`, `${label} service`, `${label} platform`, `${label} integration`]),
    use_when: `Use when the interface needs to identify ${label}, connect to ${label}, or show ${label} as an external service.`,
    avoid_when: `Do not use for a generic service, social link, or integration when ${label} is not specifically meant.`,
  };
}

function iconDescriptor(name) {
  const words = wordsFromName(name);
  const label = humanName(name);
  const direction = directionFrom(words);

  if (BRAND_NAMES.has(name)) {
    return brandRecord(name);
  }

  if (name.startsWith('database')) {
    const modifier = words.slice(1).join(' ');
    return {
      depicts: `Stacked database cylinder${modifier ? ` with ${modifier.replace('x', 'x mark')} cue` : ''} for stored records and data operations.`,
      semantic_tags: unique(['database', 'data storage', 'records', ...words]),
      synonyms: unique([label, 'database', 'data store', 'stored records', `${label} data`]),
      use_when: `Use when the interface works with ${modifier || 'database'} operations, stored records, or persistent data.`,
      avoid_when: 'Do not use for generic files, spreadsheets, or unstructured document collections.',
    };
  }

  if (hasAny(words, ['arrow', 'arrows', 'caret', 'chevron'])) {
    const shape = words.includes('caret') ? 'caret' : words.includes('chevron') ? 'chevron' : 'arrow';
    const container = words.includes('circle') ? ' inside a circle' : words.includes('square') ? ' inside a square' : words.includes('bar') ? ' with a terminal bar' : '';
    return {
      depicts: `${label} ${shape}${container} indicating ${direction || 'directional'} movement or navigation.`,
      semantic_tags: unique([shape, 'navigation', direction, ...words]),
      synonyms: unique([label, `${direction || 'directional'} ${shape}`, `${direction || 'directional'} navigation`, `${shape} control`]),
      use_when: `Use when moving, navigating, ordering, expanding, or positioning content ${direction || 'in a direction'}.`,
      avoid_when: 'Do not use for analytics trends, file transfer, or feedback ratings unless that concept is specifically shown.',
    };
  }

  if (hasAny(words, ['download']) || name.includes('arrow_down') || name.includes('box_arrow_down') || name.includes('cloud_arrow_down')) {
    return {
      depicts: `${label} uses a downward transfer arrow for download, import, or receiving content.`,
      semantic_tags: unique(['download', 'transfer', 'import', 'receive', ...words]),
      synonyms: unique([label, 'download', 'import', 'receive file', 'data download']),
      use_when: 'Use when users download files, receive data, import content, or move data into the current system.',
      avoid_when: 'Do not use for scrolling down, ranking down, or negative analytics trends.',
    };
  }

  if (name.includes('arrow_up') || name.includes('box_arrow_up') || name.includes('cloud_arrow_up')) {
    return {
      depicts: `${label} uses an upward transfer arrow for upload, export, or sending content.`,
      semantic_tags: unique(['upload', 'transfer', 'export', 'send', ...words]),
      synonyms: unique([label, 'upload', 'export', 'send file', 'data upload']),
      use_when: 'Use when users upload files, send data, export content, or move data out of the current system.',
      avoid_when: 'Do not use for scrolling up, ranking up, or positive analytics trends.',
    };
  }

  if (hasAny(words, ['lock'])) {
    const subject = baseSubject(words) || 'access';
    return {
      depicts: `${label} combines ${subject} imagery with a lock to show protected or restricted access.`,
      semantic_tags: unique(['lock', 'secure', 'restricted', 'protected', subject, ...words]),
      synonyms: unique([label, 'locked access', `locked ${subject}`, 'restricted access', 'protected content']),
      use_when: `Use when ${subject} content, settings, identity, files, or access is locked or protected.`,
      avoid_when: 'Do not use for generic safety, verified status, or password entry when the locked subject is not relevant.',
    };
  }

  if (hasAny(words, ['search'])) {
    const subject = words.includes('heart') ? 'favorite or saved item' : 'content';
    return {
      depicts: `${label} shows a magnifying-glass cue for finding ${subject}.`,
      semantic_tags: unique(['search', 'find', 'lookup', subject, ...words]),
      synonyms: unique([label, 'search', 'find content', 'lookup', `${subject} search`]),
      use_when: `Use when users search, inspect, or look up ${subject}.`,
      avoid_when: 'Do not use for generic visibility, analytics, or filtering when search is not the main action.',
    };
  }

  if (hasAny(words, ['graph'])) {
    const trend = direction === 'down' ? 'decline or decreasing performance' : 'growth or increasing performance';
    return {
      depicts: `${label} chart line indicating ${trend}.`,
      semantic_tags: unique(['analytics', 'metrics', direction === 'down' ? 'decrease' : 'increase', ...words]),
      synonyms: unique([label, direction === 'down' ? 'trend down' : 'trend up', trend, 'metric change']),
      use_when: `Use when analytics, prices, stats, or performance show ${direction === 'down' ? 'a decrease' : 'an increase'}.`,
      avoid_when: 'Do not use for simple navigation, file transfer, or item ordering.',
    };
  }

  if (hasAny(words, ['thumbs'])) {
    const positive = words.includes('up');
    return {
      depicts: `${label} hand gesture for ${positive ? 'approval, like, or positive feedback' : 'dislike, rejection, or negative feedback'}.`,
      semantic_tags: unique([positive ? 'thumbs up' : 'thumbs down', positive ? 'approve' : 'reject', 'feedback', ...words]),
      synonyms: unique([label, positive ? 'like' : 'dislike', positive ? 'upvote' : 'downvote', positive ? 'positive feedback' : 'negative feedback']),
      use_when: `Use when users give ${positive ? 'positive' : 'negative'} feedback, vote, approve, or reject something.`,
      avoid_when: 'Do not use for directional navigation, scrolling, upload, or download.',
    };
  }

  if (hasAny(words, ['volume'])) {
    const state = words.includes('mute') || words.includes('off') ? 'muted or disabled sound' : direction === 'down' ? 'lower audio volume' : 'higher audio volume';
    return {
      depicts: `${label} speaker control showing ${state}.`,
      semantic_tags: unique(['audio', 'speaker', 'volume', state, ...words]),
      synonyms: unique([label, 'volume control', state, 'audio setting']),
      use_when: `Use when the interface changes or communicates ${state}.`,
      avoid_when: 'Do not use for notifications, voice input, or media playback controls without volume meaning.',
    };
  }

  if (hasAny(words, ['align'])) {
    return {
      depicts: `${label} alignment bars showing how an item or text block aligns inside a layout.`,
      semantic_tags: unique(['alignment', 'layout', 'formatting', ...words]),
      synonyms: unique([label, 'align content', 'layout alignment', 'format alignment']),
      use_when: 'Use when aligning text, objects, or layout elements in an editor or design surface.',
      avoid_when: 'Do not use for page navigation, sorting, or unrelated grid controls.',
    };
  }

  if (hasAny(words, ['calendar'])) {
    return {
      depicts: `${label} calendar page for dates, events, or schedule-specific state.`,
      semantic_tags: unique(['calendar', 'schedule', 'date', ...words]),
      synonyms: unique([label, 'calendar', 'schedule', 'date control']),
      use_when: 'Use when dates, events, weeks, months, or scheduled items are the main meaning.',
      avoid_when: 'Do not use for generic pages, files, or navigation without a calendar meaning.',
    };
  }

  if (hasAny(words, ['file', 'folder', 'journal'])) {
    const subject = hasAny(words, ['folder']) ? 'folder' : hasAny(words, ['journal']) ? 'journal' : 'file';
    return {
      depicts: `${label} ${subject} shape for document storage, records, or ${subject}-specific actions.`,
      semantic_tags: unique([subject, 'document', 'records', ...words]),
      synonyms: unique([label, subject, `${subject} action`, 'document record']),
      use_when: `Use when the interface works with ${subject}s, records, attachments, or document-specific actions.`,
      avoid_when: 'Do not use for generic navigation, abstract data, or actions unrelated to documents.',
    };
  }

  const subject = baseSubject(words);
  const describedSubject = SUBJECT_DESCRIPTIONS[name] || SUBJECT_DESCRIPTIONS[subject] || `${label.toLowerCase()} shape`;

  return {
    depicts: `${label} line drawing showing ${describedSubject}.`,
    semantic_tags: unique([subject, label.toLowerCase(), ...words, 'line drawing', 'outline', 'object']),
    synonyms: unique([label, label.toLowerCase(), `${subject} icon`, `${label} symbol`, `${subject} shape`]),
    use_when: `Use when the interface needs ${label.toLowerCase()} as the concrete object, tool, place, activity, or concept.`,
    avoid_when: `Do not use when another object, action, or specialized ${subject || 'concept'} icon communicates the meaning more clearly.`,
  };
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'));
}

async function writeJson(relativePath, value) {
  await fs.writeFile(path.join(repoRoot, relativePath), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const sourceRecords = await readJson(SOURCE_FILE);
const workbench = await readJson(WORKBENCH_FILE);
const queuedIds = new Set(workbench.reviewQueue.map((record) => record.icon_id));
let changed = 0;

for (const record of sourceRecords) {
  if (!queuedIds.has(record.icon_id)) continue;

  Object.assign(record, iconDescriptor(record.source_name));
  changed += 1;
}

await writeJson(SOURCE_FILE, sourceRecords);

console.log(JSON.stringify({
  script: 'polish-bootstrap-registry-records',
  sourceFile: SOURCE_FILE,
  queuedRecords: queuedIds.size,
  changed,
}, null, 2));
