import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const SOURCE_FILE = 'data/si-registry/source/libraries/iconoir.json';
const WORKBENCH_FILE = 'data/si-registry/staging/library-workbench/iconoir.json';

const BRAND_NAMES = new Set([
  'apple',
  'asana',
  'behance',
  'bitbucket',
  'bluetooth',
  'discord',
  'dribbble',
  'facebook',
  'figma',
  'git',
  'github',
  'google',
  'html5',
  'instagram',
  'linear',
  'linux',
  'mastodon',
  'medium',
  'metro',
  'npm',
  'paypal',
  'peerlist',
  'pinterest',
  'safari',
  'snapchat',
  'spotify',
  'stackoverflow',
  'telegram',
  'threads',
  'tiktok',
  'trello',
  'unity',
  'whatsapp',
  'windows',
  'yelp',
  'youtube',
  'x',
]);

const SUBJECT_DESCRIPTIONS = {
  airplane: 'airplane silhouette with wings and tail for air travel',
  airplay: 'screen-and-triangle casting shape for wireless display sharing',
  album: 'album or media cover rectangle for saved collections',
  attachment: 'paperclip shape for attaching files or linked items',
  bank: 'bank building facade with columns for finance institutions',
  barcode: 'vertical barcode bars for scanning or product codes',
  basketball: 'round basketball with curved seam lines for sports',
  bed: 'bed frame with pillow for sleep or lodging',
  bold: 'bold letterform for heavier text styling',
  book: 'open book or bound volume for reading and documentation',
  brightness: 'sun-like brightness control for screen or light intensity',
  bug: 'insect-like bug shape for defects or debugging',
  bus: 'front-facing bus for public transport',
  calendar: 'calendar page with top binding for dates and schedules',
  camera: 'camera body with lens for photos or capture',
  car: 'side-view car body for driving or vehicles',
  cash: 'banknote shape for money or payments',
  church: 'church building with steeple for worship or landmark places',
  combine: 'overlapping shapes for combining or joining objects',
  compass: 'compass dial and pointer for direction or navigation',
  computer: 'desktop monitor for computing or workstation screens',
  cookie: 'round cookie shape with small chips for cookies or snacks',
  copy: 'overlapping document pages for duplicate or copy actions',
  copyright: 'circled C mark for copyright ownership',
  cube: 'three-dimensional cube for objects, packages, or 3D space',
  cylinder: 'cylindrical shape for volumes, containers, or database-like storage',
  desk: 'desk surface with legs for workspace furniture',
  drawer: 'drawer or storage unit for saved items',
  egg: 'oval egg shape for food or incubation',
  emoji: 'smiling face for emotion or reaction',
  exclude: 'overlapping shapes for excluding or subtracting regions',
  fingerprint: 'fingerprint ridge pattern for identity or biometrics',
  fish: 'fish profile with tail for aquatic life or seafood',
  flash: 'lightning bolt for flash, speed, or quick action',
  fog: 'horizontal haze lines for foggy weather or low visibility',
  football: 'football ball shape for sports',
  frame: 'corner frame marks for framing, crop, or boundaries',
  fridge: 'refrigerator cabinet for kitchen appliances',
  gift: 'wrapped present with ribbon for gifts or rewards',
  globe: 'globe sphere with latitude and longitude lines for world or language',
  group: 'clustered user silhouettes for teams or audiences',
  hammer: 'hammer tool for building, repair, or moderation',
  hashtag: 'hash sign for tags, topics, or channels',
  hat: 'hat shape for apparel, role, or style',
  hexagon: 'six-sided polygon for geometry or token shapes',
  hospital: 'hospital building or medical cross for healthcare locations',
  intersect: 'overlapping shapes for intersection or shared regions',
  italic: 'slanted letterform for italic text styling',
  laptop: 'open laptop computer for portable computing',
  leaf: 'leaf shape for nature, plants, or sustainability',
  magnet: 'horseshoe magnet for attraction or magnetic snapping',
  map: 'folded map panels for location or navigation',
  medal: 'award medal with ribbon for achievement or ranking',
  microphone: 'microphone capsule for voice recording or audio input',
  microscope: 'laboratory microscope for research or inspection',
  mirror: 'standing mirror shape for reflection or appearance',
  movie: 'film frame or cinema mark related to video and movies',
  octagon: 'eight-sided polygon for stop-like or geometric shapes',
  package: 'parcel box for shipping, products, or bundles',
  palette: 'paint palette with color wells for art or theme choices',
  parking: 'parking sign with P for parking areas',
  pentagon: 'five-sided polygon for geometry or badge shapes',
  percentage: 'percent sign for rates, discounts, or proportions',
  phone: 'telephone handset or mobile device for calls and contact',
  playlist: 'stacked media lines for playlists or queued tracks',
  plus: 'plus sign for add, create, or increase actions',
  rain: 'cloud and falling drops for rainy weather',
  repeat: 'looping arrows for repeat or replay actions',
  ruler: 'measuring ruler for size, layout, or dimensions',
  scarf: 'scarf shape for clothing or cold weather',
  screenshot: 'screen capture frame for screenshots',
  shirt: 'shirt outline for apparel or clothing',
  shop: 'storefront awning for shops or retail locations',
  shuffle: 'crossing arrows for shuffle or random order',
  skateboard: 'skateboard deck with wheels for skating',
  skateboarding: 'person on skateboard for skating activity',
  snow: 'snowflake or falling snow for cold weather',
  sofa: 'couch shape for seating or living spaces',
  strikethrough: 'letterform crossed by a line for strikethrough text',
  suitcase: 'travel suitcase for luggage or trips',
  swimming: 'swimmer or water movement for swimming activity',
  table: 'grid or table structure for tabular data',
  box: 'three-dimensional box or square container for storage, packaging, or layout blocks',
  brain: 'brain shape for thinking, cognition, learning, or intelligence',
  circle: 'simple circular outline for geometry, status, or selectable shapes',
  cloud: 'rounded cloud shape for weather, hosting, sync, or online storage',
  drag: 'drag handle or movement cue for rearranging interface items',
  drone: 'small flying drone with body and rotors for remote aircraft',
  edit: 'pencil or editing cue for changing, writing, or modifying content',
  female: 'female gender sign for gender, identity, or demographic labels',
  flask: 'laboratory flask vessel for experiments, testing, or science',
  flower: 'flower blossom shape for nature, plants, or decorative themes',
  forward: 'forward movement cue for advancing playback, steps, or navigation',
  male: 'male gender sign for gender, identity, or demographic labels',
  pin: 'pin marker shape for saving, fastening, or marking a location',
  text: 'text lines or letterform for writing and typography',
  thunderstorm: 'storm cloud with lightning for severe weather',
  train: 'front or side train shape for rail transport',
  translate: 'language translation marks for translating text',
  tree: 'tree shape for nature or hierarchy',
  triangle: 'three-sided polygon for geometry or warning shapes',
  truck: 'truck body for delivery or freight',
  tunnel: 'tunnel opening for passages or infrastructure',
  umbrella: 'umbrella canopy for rain protection',
  underline: 'letterform with underline for underlined text styling',
  union: 'overlapping shapes for union or merged regions',
  usb: 'USB connector symbol for ports or removable devices',
  voice: 'sound wave or spoken audio mark for voice features',
  wallet: 'wallet shape for money, cards, or payments',
  wind: 'flowing wind lines for windy weather or airflow',
  yoga: 'person in yoga pose for wellness or stretching',
};

const ACTION_WORDS = {
  down: ['downward', 'lower'],
  up: ['upward', 'higher'],
  left: ['leftward', 'previous'],
  right: ['rightward', 'next'],
};

function wordsFromName(name) {
  return name.split(/[_-]+/).filter(Boolean);
}

function titleCase(words) {
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function humanName(name) {
  return titleCase(wordsFromName(name));
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function hasAny(words, candidates) {
  return candidates.some((candidate) => words.includes(candidate));
}

function directionFrom(words) {
  return Object.keys(ACTION_WORDS).find((word) => words.includes(word));
}

function baseSubject(words) {
  return words.filter((word) => ![
    'arrow', 'arrows', 'circle', 'square', 'tag', 'from', 'line', 'lock', 'slash',
    'search', 'engine', 'window', 'up', 'down', 'left', 'right', 'fast', 'nav',
    'dot', 'data', 'transfer', 'page', 'calendar', 'shopping', 'bag', 'gesture',
    'two', 'fingers', 'structure', 'view', 'stats', 'stat', 'graph', 'priority',
    'temperature', 'transition', 'control', 'point', 'ease', 'in', 'out',
  ].includes(word))[0];
}

function iconDescriptor(name) {
  const words = wordsFromName(name);
  const label = humanName(name);
  const direction = directionFrom(words);

  if (BRAND_NAMES.has(name)) {
    return {
      depicts: `Logo-style mark associated with ${label} for identifying the ${label} service or platform.`,
      semantic_tags: [name, 'logo', 'service', 'platform', 'identity'],
      synonyms: [label, `${label} logo`, `${label} service`, `${label} platform`],
      use_when: `Use when the interface needs to identify ${label}, connect to ${label}, or show ${label} as an external service.`,
      avoid_when: `Do not use for a generic service, social link, or integration when ${label} is not specifically meant.`,
    };
  }

  if (name.startsWith('database')) {
    const suffix = words.slice(1).join(' ');
    const qualifier = suffix ? ` with ${suffix.replace('xmark', 'x mark')} cue` : '';
    return {
      depicts: `Stacked database cylinder${qualifier} for stored records and data operations.`,
      semantic_tags: unique(['database', 'data storage', 'records', ...words]),
      synonyms: unique([label, 'database', 'data store', 'stored records', `${label} data`]),
      use_when: `Use when the interface works with ${suffix || 'database'} operations, stored records, or persistent data.`,
      avoid_when: 'Do not use for generic files, spreadsheets, or unstructured document collections.',
    };
  }

  if (hasAny(words, ['git']) || name.startsWith('git_')) {
    return {
      depicts: `${label} branching-node symbol for version control history and source changes.`,
      semantic_tags: unique(['git', 'version control', 'source control', ...words]),
      synonyms: unique([label, 'git workflow', 'version control', 'source changes']),
      use_when: 'Use when the interface shows branches, commits, merge history, comparisons, or pull requests.',
      avoid_when: 'Do not use for generic sharing, folders, or navigation paths outside source control.',
    };
  }

  if (hasAny(words, ['arrow', 'arrows', 'nav', 'fast', 'dot'])) {
    const directionWords = direction ? ACTION_WORDS[direction].join(' or ') : 'directional';
    const container = words.includes('circle') ? ' inside a circle' : words.includes('square') ? ' inside a square' : words.includes('tag') ? ' paired with a tag shape' : '';
    return {
      depicts: `${label} arrow${container} indicating ${directionWords} movement or navigation.`,
      semantic_tags: unique(['arrow', 'navigation', direction, ...words]),
      synonyms: unique([label, `${direction || 'directional'} arrow`, `${direction || 'directional'} navigation`, `${direction || 'directional'} movement`]),
      use_when: `Use when moving, navigating, ordering, or positioning content ${direction || 'in a direction'}.`,
      avoid_when: 'Do not use for analytics trends, file transfer, or feedback ratings unless the icon specifically shows that concept.',
    };
  }

  if (hasAny(words, ['download']) || name === 'data_transfer_down') {
    return {
      depicts: 'Downward transfer arrow indicating download, import, or receiving data.',
      semantic_tags: unique(['download', 'transfer', 'data', 'receive', ...words]),
      synonyms: unique([label, 'download', 'data download', 'receive data', 'import']),
      use_when: 'Use when users download files, receive data, import content, or move data into the current system.',
      avoid_when: 'Do not use for scrolling down, ranking down, or negative trends.',
    };
  }

  if (name === 'data_transfer_up') {
    return {
      depicts: 'Upward transfer arrow indicating upload, export, or sending data.',
      semantic_tags: unique(['upload', 'transfer', 'data', 'send', ...words]),
      synonyms: unique([label, 'upload', 'data upload', 'send data', 'export']),
      use_when: 'Use when users upload files, send data, export content, or move data out of the current system.',
      avoid_when: 'Do not use for scrolling up, ranking up, or positive trends.',
    };
  }

  if (hasAny(words, ['lock'])) {
    const subject = words.includes('book') ? 'book' : words.includes('card') ? 'card' : words.includes('package') ? 'package' : words.includes('window') ? 'window' : words.includes('voice') ? 'voice control' : words.includes('fingerprint') ? 'fingerprint scan' : 'padlock';
    return {
      depicts: `${label} combines a ${subject} with a lock to show protected or restricted access.`,
      semantic_tags: unique(['lock', 'secure', 'restricted', 'protected', ...words]),
      synonyms: unique([label, 'locked access', `locked ${subject}`, 'restricted access', 'protected content']),
      use_when: `Use when ${subject} content, settings, identity, or access is locked or protected.`,
      avoid_when: 'Do not use for generic safety, verified status, or password entry when the locked subject is not relevant.',
    };
  }

  if (hasAny(words, ['search'])) {
    const subject = words.includes('area') ? 'selected area' : words.includes('bubble') ? 'message bubble' : words.includes('page') ? 'document page' : words.includes('shield') ? 'shield' : words.includes('window') ? 'browser window' : words.includes('engine') ? 'search engine page' : 'magnifying glass';
    return {
      depicts: `${label} shows a magnifying-glass search cue with ${subject}.`,
      semantic_tags: unique(['search', 'find', 'lookup', ...words]),
      synonyms: unique([label, 'search', 'find content', 'lookup', `${subject} search`]),
      use_when: `Use when users search, inspect, or look up ${subject === 'magnifying glass' ? 'content' : subject}.`,
      avoid_when: 'Do not use for generic visibility, analytics, or filtering when search is not the main action.',
    };
  }

  if (hasAny(words, ['graph', 'stat', 'stats', 'trending']) || name.includes('up_square') || name.includes('down_square')) {
    const trend = direction === 'down' ? 'decline or decreasing performance' : 'growth or increasing performance';
    return {
      depicts: `${label} chart or metric mark indicating ${trend}.`,
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

  if (hasAny(words, ['gesture', 'swipe'])) {
    return {
      depicts: `${label} touch gesture mark showing a ${direction || 'directional'} swipe interaction.`,
      semantic_tags: unique(['gesture', 'touch', 'swipe', direction, ...words]),
      synonyms: unique([label, `${direction || 'directional'} swipe`, 'touch gesture', 'gesture control']),
      use_when: 'Use when explaining or triggering touch gestures, swipe controls, or mobile interactions.',
      avoid_when: 'Do not use for keyboard navigation, file transfer, or analytics movement.',
    };
  }

  if (hasAny(words, ['calendar'])) {
    return {
      depicts: `${label} calendar page with ${direction || 'directional'} arrow for date movement or scheduling changes.`,
      semantic_tags: unique(['calendar', 'schedule', 'date', direction, ...words]),
      synonyms: unique([label, 'calendar movement', 'schedule change', `${direction || 'date'} navigation`]),
      use_when: 'Use when dates, events, or scheduled items move earlier, later, up, or down in a calendar flow.',
      avoid_when: 'Do not use for generic arrows or file transfers without a calendar meaning.',
    };
  }

  if (hasAny(words, ['temperature'])) {
    return {
      depicts: `${label} thermometer-style cue showing temperature moving ${direction || 'up or down'}.`,
      semantic_tags: unique(['temperature', 'weather', direction === 'down' ? 'cooling' : 'warming', ...words]),
      synonyms: unique([label, 'temperature change', direction === 'down' ? 'cool down' : 'heat up', 'weather temperature']),
      use_when: `Use when temperature, heat, cooling, or weather values move ${direction || 'up or down'}.`,
      avoid_when: 'Do not use for generic arrows, ranking, or analytics without temperature meaning.',
    };
  }

  if (hasAny(words, ['heart'])) {
    return {
      depicts: `${label} heart paired with a ${direction || 'directional'} arrow for preference or favorite movement.`,
      semantic_tags: unique(['heart', 'favorite', 'preference', direction, ...words]),
      synonyms: unique([label, 'favorite movement', 'heart action', `${direction || 'directional'} favorite`]),
      use_when: 'Use when favorite, like, or saved preference items move or change priority.',
      avoid_when: 'Do not use for medical heart rate or simple directional navigation.',
    };
  }

  if (hasAny(words, ['shopping', 'bag'])) {
    return {
      depicts: `${label} shopping bag with a ${direction || 'directional'} arrow for commerce item movement.`,
      semantic_tags: unique(['shopping bag', 'commerce', 'cart', direction, ...words]),
      synonyms: unique([label, 'shopping bag action', 'commerce movement', `${direction || 'directional'} cart action`]),
      use_when: 'Use when products, cart items, orders, or shopping bags move in a commerce workflow.',
      avoid_when: 'Do not use for generic arrows or non-commerce file transfer actions.',
    };
  }

  if (hasAny(words, ['align'])) {
    return {
      depicts: `${label} horizontal text lines arranged for paragraph alignment control.`,
      semantic_tags: unique(['text alignment', 'formatting', 'layout', ...words]),
      synonyms: unique([label, 'align text', 'text alignment', 'paragraph layout']),
      use_when: 'Use when formatting text alignment in an editor, document, or layout tool.',
      avoid_when: 'Do not use for page navigation, sorting, or unrelated layout grids.',
    };
  }

  const subject = baseSubject(words) || words[0];
  const describedSubject = SUBJECT_DESCRIPTIONS[name] || SUBJECT_DESCRIPTIONS[subject] || `${label.toLowerCase()} form`;

  return {
    depicts: `${label} line drawing showing ${describedSubject}.`,
    semantic_tags: unique([subject, label.toLowerCase(), ...words, 'line drawing', 'outline', 'object']),
    synonyms: unique([label, label.toLowerCase(), `${label} icon`, `${subject} symbol`]),
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

  const update = iconDescriptor(record.source_name);
  Object.assign(record, update);
  changed += 1;
}

await writeJson(SOURCE_FILE, sourceRecords);

console.log(JSON.stringify({
  script: 'polish-iconoir-registry-records',
  sourceFile: SOURCE_FILE,
  queuedRecords: queuedIds.size,
  changed,
}, null, 2));
