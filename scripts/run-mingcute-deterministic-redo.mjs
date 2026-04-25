import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import publicIconIndex from '../public/icon-index.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const manualRedoDir = path.join(repoRoot, 'data', 'si-registry', 'manual-redo');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');
const restartOrderPath = path.join(manualRedoDir, 'restart-order.json');
const mingcuteApprovedPath = path.join(repoRoot, 'data', 'si-registry', 'automation', 'mingcute', 'approved-records.json');
const mingcuteLocalSvgRoot = path.join(repoRoot, 'node_modules', 'mingcute_icon', 'svg');
const iconIndexPath = path.join(repoRoot, 'public', 'icon-index.json');

const SOURCE_LIBRARY = 'mingcute';
const TRACK_ID = 'mingcute';
const TRACK_LABEL = 'MingCute';
const DEFAULT_BATCH_SIZE = 5;
const SELECTION_PADDING = 3;

const DIRECTION_WORD = Object.freeze({
  up: 'upward',
  down: 'downward',
  left: 'leftward',
  right: 'rightward',
});

const DIAGONAL_TARGET = Object.freeze({
  left_down: 'lower left',
  left_up: 'upper left',
  right_down: 'lower right',
  right_up: 'upper right',
});

const CATEGORY_FALLBACKS = Object.freeze({
  building: 'landmark outline',
  business: 'business icon form',
  contact: 'profile outline',
  crypto: 'token symbol',
  design: 'design icon form',
  development: 'technical icon form',
  device: 'device form',
  editor: 'editing icon form',
  education: 'education icon form',
  emoji: 'emoji outline',
  file: 'document outline',
  food: 'food outline',
  logo: 'brand symbol',
  map: 'location outline',
  media: 'media icon form',
  nature: 'nature outline',
  other: 'icon form',
  part: 'part outline',
  shape: 'shape outline',
  sport: 'sport outline',
  system: 'system icon form',
  transport: 'vehicle outline',
  user: 'profile outline',
  weather: 'weather outline',
  zodiac: 'zodiac glyph',
});

const ABSTRACT_DEPICTS_PATTERNS = Object.freeze([
  /\bA symbol representing\b/i,
  /\bA general interface symbol\b/i,
  /\bused for\b/i,
  /\bbrand or product mark\b/i,
  /\bstate cue\b/i,
  /\bcontrol that\b/i,
  /\bcue\b/i,
  /\bmeaning\b/i,
  /\bpaired with\b/i,
  /\boriented\b/i,
  /\btechnical or AI-oriented symbol\b/i,
]);

function parseArgs(argv) {
  const options = {
    dryRun: false,
    limitBatches: null,
    batchSize: null,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg.startsWith('--limit-batches=')) {
      options.limitBatches = Number(arg.split('=')[1]);
      continue;
    }
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = Number(arg.split('=')[1]);
      continue;
    }
  }

  return options;
}

function runNodeScript(scriptName, ...args) {
  execFileSync(process.execPath, [path.join(repoRoot, 'scripts', scriptName), ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalizeMingcuteSourceNameFromIconIndexId(iconIndexId) {
  if (iconIndexId === 'ABS_line') {
    return 'abs';
  }
  return String(iconIndexId || '').replace(/_line$/i, '').toLowerCase();
}

function humanizeToken(token) {
  if (token === 'ai') return 'AI';
  if (token === 'ios') return 'iOS';
  if (token === 'xls') return 'XLS';
  if (token === 'pdf') return 'PDF';
  if (token === 'nfc') return 'NFC';
  if (token === 'usb') return 'USB';
  if (token === 'vr') return 'VR';
  if (token === 'qq') return 'QQ';
  if (token === 'tv') return 'TV';
  if (token === 'xr') return 'XR';
  if (token === 'btc') return 'BTC';
  if (token === 'bnb') return 'BNB';
  if (token === 'busd') return 'BUSD';
  if (token === 'usdt') return 'USDT';
  if (token === 'usdc') return 'USDC';
  if (token === 'avax') return 'AVAX';
  if (token === 'ada') return 'ADA';
  if (token === 'doge') return 'DOGE';
  if (token === 'xrp') return 'XRP';
  if (token === 'mcp') return 'MCP';
  if (token === 'na') return 'N A';
  if (/^\d+$/.test(token)) return token;
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function humanizeSourceName(sourceName) {
  return sourceName
    .split('_')
    .filter(Boolean)
    .map(humanizeToken)
    .join(' ');
}

function cleanLabel(label) {
  return String(label || '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureWordRange(value, min = 8, max = 22) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length >= min && words.length <= max) {
    return words.join(' ');
  }

  if (words.length < min) {
    const padded = [...words];
    while (padded.length < min) {
      if (!padded.includes('centered')) {
        padded.push('centered');
      } else if (!padded.includes('inside')) {
        padded.push('inside');
      } else if (!padded.includes('the')) {
        padded.push('the');
      } else if (!padded.includes('icon')) {
        padded.push('icon');
      } else {
        padded.push('form');
      }
    }
    return padded.join(' ');
  }

  return words.slice(0, max).join(' ');
}

function toDeterministicSentence(value) {
  return ensureWordRange(
    String(value || '')
      .replace(/[.,;:!?]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function buildBrandDepicts(record) {
  return toDeterministicSentence(`${cleanLabel(record.label)} logo mark centered as the official brand symbol`);
}

function buildCategoryFallback(record, sourceInfo) {
  const label = cleanLabel(record.label) || humanizeSourceName(record.source_name);
  const anchor = CATEGORY_FALLBACKS[sourceInfo.category] || 'icon form';

  if (sourceInfo.category === 'emoji') {
    return toDeterministicSentence(`${label} face centered as the main emoji outline`);
  }

  if (sourceInfo.category === 'logo') {
    return buildBrandDepicts(record);
  }

  return toDeterministicSentence(`${label} outline centered as the main ${anchor}`);
}

function buildArrowDepicts(sourceName) {
  let match = sourceName.match(/^align_arrow_(down|left|right|up)$/);
  if (match) {
    const direction = match[1];
    if (direction === 'down') return 'Horizontal top edge line above a centered downward arrow';
    if (direction === 'up') return 'Horizontal bottom edge line below a centered upward arrow';
    if (direction === 'left') return 'Vertical right edge line beside a centered leftward arrow';
    return 'Vertical left edge line beside a centered rightward arrow';
  }

  match = sourceName.match(/^arrows_(down|left|right|up)$/);
  if (match) {
    const direction = match[1];
    if (direction === 'down' || direction === 'up') {
      return `Two chevron arrows stacked in a vertical column both pointing ${DIRECTION_WORD[direction]}`;
    }
    return `Two chevron arrows stacked in a horizontal row both pointing ${DIRECTION_WORD[direction]}`;
  }

  match = sourceName.match(/^arrow_(down|left|right|up)_circle$/);
  if (match) {
    return `${humanizeToken(match[1])} arrow centered inside a circle outline`;
  }

  match = sourceName.match(/^square_arrow_(down|left|right|up)$/);
  if (match) {
    return `${humanizeToken(match[1])} arrow centered inside a square outline`;
  }

  match = sourceName.match(/^arrow_(left|right)_(down|up)_circle$/);
  if (match) {
    const diagonal = `${match[1]}_${match[2]}`;
    return `Diagonal arrow pointing toward the ${DIAGONAL_TARGET[diagonal]} inside a circle outline`;
  }

  match = sourceName.match(/^arrow_(left|right)_(down|up)$/);
  if (match) {
    const diagonal = `${match[1]}_${match[2]}`;
    return `Diagonal arrow pointing toward the ${DIAGONAL_TARGET[diagonal]} with a straight shaft`;
  }

  match = sourceName.match(/^arrow_to_(down|left|right|up)$/);
  if (match) {
    return `${humanizeToken(match[1])} arrow pointing toward a nearby edge line`;
  }

  match = sourceName.match(/^arrow_(down|left|right|up)$/);
  if (match) {
    return `${humanizeToken(match[1])} arrow centered with a straight shaft and pointed tip`;
  }

  if (sourceName === 'back' || sourceName === 'back_2') {
    return 'Leftward arrow centered with a straight shaft and pointed tip';
  }

  if (sourceName === 'forward' || sourceName === 'forward_2') {
    return 'Rightward arrow centered with a straight shaft and pointed tip';
  }

  if (sourceName === 'down' || sourceName === 'down_small') {
    return 'Downward chevron mark centered with two short diagonal strokes';
  }

  if (sourceName === 'up' || sourceName === 'up_small') {
    return 'Upward chevron mark centered with two short diagonal strokes';
  }

  if (sourceName === 'left' || sourceName === 'left_small') {
    return 'Leftward chevron mark centered with two short diagonal strokes';
  }

  if (sourceName === 'right' || sourceName === 'right_small') {
    return 'Rightward chevron mark centered with two short diagonal strokes';
  }

  if (sourceName === 'selector_horizontal') {
    return 'Horizontal selector line with arrowheads at the left and right ends';
  }

  if (sourceName === 'selector_vertical') {
    return 'Vertical selector line with arrowheads at the top and bottom ends';
  }

  if (sourceName === 'move') {
    return 'Crossed directional arrows extending toward the top bottom left and right';
  }

  if (sourceName === 'trending_down') {
    return 'Jagged trend line descending toward the lower right with an arrow tip';
  }

  if (sourceName === 'trending_up') {
    return 'Jagged trend line rising toward the upper right with an arrow tip';
  }

  if (sourceName === 'transfer' || sourceName === 'transfer_horizontal') {
    return 'Two horizontal transfer arrows stacked in opposite directions across the center';
  }

  if (sourceName === 'transfer_vertical') {
    return 'Two vertical transfer arrows placed in opposite directions through the center';
  }

  if (sourceName === 'transfer_2' || sourceName === 'transfer_3' || sourceName === 'transfer_4') {
    return 'Two opposing transfer arrows centered as a bidirectional exchange symbol';
  }

  return null;
}

function buildSimpleControlDepicts(sourceName) {
  if (sourceName === 'add') return 'Plus sign centered with equal vertical and horizontal arms';
  if (sourceName === 'add_circle') return 'Plus sign centered inside a circle outline';
  if (sourceName === 'add_circle_dash') return 'Plus sign centered inside a broken circle outline';
  if (sourceName === 'add_square') return 'Plus sign centered inside a square outline';
  if (sourceName === 'subtract') return 'Minus sign centered as a single horizontal bar';
  if (sourceName === 'close') return 'X mark centered with two crossing diagonal strokes';
  if (sourceName === 'close_circle') return 'X mark centered inside a circle outline';
  if (sourceName === 'close_circle_dash') return 'X mark centered inside a broken circle outline';
  if (sourceName === 'close_square') return 'X mark centered inside a square outline';
  if (sourceName === 'close_small' || sourceName === 'close_medium') {
    return 'Compact X mark centered with two short crossing diagonal strokes';
  }
  if (sourceName === 'check') return 'Check mark centered with a short rise and longer sweep';
  if (sourceName === 'check_2') return 'Check mark centered with a short rise and longer sweep';
  if (sourceName === 'check_circle') return 'Check mark centered inside a circle outline';
  if (sourceName === 'check_circle_dash') return 'Check mark centered inside a broken circle outline';
  if (sourceName === 'question' || sourceName === 'question_2') {
    return 'Question mark centered above a small lower dot';
  }
  if (sourceName === 'alert' || sourceName === 'warning') {
    return 'Vertical exclamation mark centered above a small lower dot';
  }
  if (sourceName === 'alert_octagon') {
    return 'Vertical exclamation mark centered inside an octagon outline';
  }
  if (sourceName === 'alert_diamond') {
    return 'Vertical exclamation mark centered inside a diamond outline';
  }
  if (sourceName === 'notification') {
    return 'Bell outline with a rounded dome above a small clapper opening';
  }
  if (sourceName === 'robot') {
    return 'Rounded robot face with two eye dots above a horizontal mouth bar';
  }
  if (sourceName === 'notification_newdot') {
    return 'Bell outline with a small notification dot near the upper right edge';
  }
  if (sourceName === 'notification_off') {
    return 'Bell outline crossed by a diagonal slash from upper left to lower right';
  }
  if (sourceName === 'bell_ringing') {
    return 'Bell outline with two ringing arcs placed on the outer sides';
  }
  if (sourceName === 'menu') {
    return 'Three horizontal menu bars stacked in a centered vertical column';
  }
  if (sourceName === 'more_1' || sourceName === 'more_3') {
    return 'Three ellipsis dots in a horizontal row across the center';
  }
  if (sourceName === 'more_2' || sourceName === 'more_4') {
    return 'Three ellipsis dots in a vertical column through the center';
  }
  if (sourceName === 'search' || sourceName === 'search_2' || sourceName === 'search_3') {
    return 'Magnifying glass with a short diagonal handle at the lower right';
  }
  if (sourceName === 'search_ai' || sourceName === 'search_2_ai' || sourceName === 'search_3_ai') {
    return 'Magnifying glass with AI letters centered inside the circular lens';
  }
  if (sourceName === 'search_none' || sourceName === 'search_2_none') {
    return 'Magnifying glass with a diagonal slash crossing the circular lens';
  }
  if (sourceName === 'zoom_in') {
    return 'Magnifying glass with a plus sign centered inside the circular lens';
  }
  if (sourceName === 'zoom_out') {
    return 'Magnifying glass with a minus sign centered inside the circular lens';
  }
  if (sourceName === 'filter' || sourceName === 'filter_2' || sourceName === 'filter_3') {
    return 'Funnel filter outline narrowing from a wide top to a short stem';
  }
  if (sourceName === 'color_filter') {
    return 'Funnel filter outline with a small color mark near the center';
  }
  if (
    sourceName === 'az_sort_ascending_letters' ||
    sourceName === 'az_sort_descending_letters' ||
    sourceName === 'za_sort_ascending_letters' ||
    sourceName === 'za_sort_descending_letters'
  ) {
    return 'Stacked A and Z letters beside a vertical sort arrow mark';
  }
  if (
    sourceName === 'numbers_09_sort_ascending' ||
    sourceName === 'numbers_09_sort_descending' ||
    sourceName === 'numbers_90_sort_ascending' ||
    sourceName === 'numbers_90_sort_descending'
  ) {
    return 'Stacked number marks beside a vertical sort arrow across the center';
  }
  if (sourceName === 'sort_ascending' || sourceName === 'sort_descending') {
    return 'Horizontal list bars beside a vertical sort arrow across the center';
  }
  if (sourceName === 'fullscreen' || sourceName === 'fullscreen_2') {
    return 'Open corner frame with arrows pushing outward toward the outer edges';
  }
  if (sourceName === 'fullscreen_exit' || sourceName === 'fullscreen_exit_2') {
    return 'Open corner frame with arrows pulling inward toward the center';
  }
  if (sourceName === 'external_link') {
    return 'Square frame with a diagonal arrow leaving through the upper right corner';
  }
  if (sourceName === 'toggle_left' || sourceName === 'toggle_left_2') {
    return 'Rounded toggle track with a circular knob positioned on the left side';
  }
  if (sourceName === 'toggle_right' || sourceName === 'toggle_right_2') {
    return 'Rounded toggle track with a circular knob positioned on the right side';
  }
  if (sourceName === 'lock') {
    return 'Padlock outline with a rounded shackle above a rectangular body';
  }
  if (sourceName === 'unlock') {
    return 'Padlock outline with an open shackle above a rectangular body';
  }
  if (sourceName === 'shield' || sourceName === 'shield_shape') {
    return 'Shield outline centered as a pointed protective badge shape';
  }
  if (sourceName === 'heart' || sourceName === 'heart_fill') {
    return 'Heart shape with two upper lobes meeting at a pointed bottom tip';
  }
  if (sourceName === 'star' || sourceName === 'star_2') {
    return 'Five point star centered with sharp outer tips around the middle';
  }
  if (sourceName === 'star_half') {
    return 'Five point star with one half filled and the other half open';
  }
  if (sourceName === 'bookmark') {
    return 'Bookmark ribbon outline with straight sides and a pointed lower notch';
  }
  if (sourceName === 'bookmark_add') {
    return 'Bookmark ribbon outline with a small plus mark near the center';
  }
  if (sourceName === 'bookmark_remove') {
    return 'Bookmark ribbon outline with a small minus mark near the center';
  }
  if (sourceName === 'bookmark_edit') {
    return 'Bookmark ribbon outline with a pencil mark near the lower right';
  }
  if (sourceName === 'refresh_1' || sourceName === 'refresh_2' || sourceName === 'refresh_3' || sourceName === 'refresh_4') {
    return 'Circular refresh arrows wrapping around an open center in a loop';
  }
  if (sourceName === 'refresh_4_ai') {
    return 'Circular refresh arrows wrapping around AI letters at the center';
  }
  return null;
}

function buildFileDepicts(sourceName, family) {
  const isFolder = family === 'folder';
  const base = isFolder
    ? 'Folder outline with an upper tab'
    : 'File sheet outline with a folded top corner';

  const modifiers = [
    ['search', 'and a magnifying glass at the lower right'],
    ['download', 'and a downward arrow near the lower center'],
    ['upload', 'and an upward arrow near the lower center'],
    ['open', 'with the front cover shown in an open state'],
    ['delete', 'with an X mark near the lower right'],
    ['minus', 'with a minus mark near the lower right'],
    ['new', 'with a small plus mark near the lower right'],
    ['add', 'with a small plus mark near the lower right'],
    ['lock', 'with a small lock near the lower right'],
    ['locked', 'with a small lock near the lower right'],
    ['security', 'with a shield mark near the lower right'],
    ['warning', 'with an exclamation mark near the lower right'],
    ['info', 'with a small information mark near the lower right'],
    ['check', 'with a check mark near the lower right'],
    ['more', 'with ellipsis dots near the lower right'],
    ['code', 'with angle bracket marks centered inside'],
    ['ai', 'with AI letters centered inside'],
    ['music', 'with a music note centered inside'],
    ['star', 'with a star mark near the upper right'],
    ['zip', 'with a vertical zipper line near the center'],
    ['forbid', 'crossed by a diagonal slash from upper left to lower right'],
    ['unknown', 'with a question mark centered inside'],
    ['certificate', 'with a ribbon seal near the lower edge'],
    ['export', 'with an outward arrow near the upper right'],
    ['import', 'with an inward arrow near the upper right'],
  ];

  for (const [token, suffix] of modifiers) {
    if (sourceName.includes(token)) {
      return `${base} ${suffix}`;
    }
  }

  return `${base} centered as the main ${family} icon form`;
}

function buildUserDepicts(sourceName) {
  if (/^(user|profile)/.test(sourceName)) {
    const base = 'User bust silhouette with a rounded head above shoulder curves';
    if (sourceName.includes('add')) return `${base} and a small plus mark at the lower right`;
    if (sourceName.includes('remove') || sourceName.includes('x')) return `${base} and an X mark at the lower right`;
    if (sourceName.includes('search')) return `${base} and a magnifying glass at the lower right`;
    if (sourceName.includes('lock')) return `${base} and a lock mark at the lower right`;
    if (sourceName.includes('warning')) return `${base} and an exclamation mark at the lower right`;
    if (sourceName.includes('question')) return `${base} and a question mark at the lower right`;
    if (sourceName.includes('pin')) return `${base} and a pin mark near the lower right`;
    if (sourceName.includes('heart')) return `${base} and a heart mark near the lower right`;
    if (sourceName.includes('star')) return `${base} and a star mark near the lower right`;
    if (sourceName.includes('setting')) return `${base} and a small gear near the lower right`;
    if (sourceName.includes('security')) return `${base} and a shield mark near the lower right`;
    if (sourceName.includes('hide') || sourceName.includes('visible')) return `${base} with an eye mark near the lower right`;
    if (sourceName.includes('edit')) return `${base} and a pencil mark near the lower right`;
    if (sourceName.includes('forbid')) return `${base} crossed by a small forbid slash at the lower right`;
    if (sourceName.includes('follow')) return `${base} and a curved follow arrow near the lower right`;
    if (sourceName.includes('info')) return `${base} and a small information mark at the lower right`;
    return base;
  }

  if (/^(group|contacts)/.test(sourceName)) {
    return 'Multiple user bust silhouettes grouped in a clustered row across the center';
  }

  if (sourceName === 'badge' || sourceName === 'idcard') {
    return 'Identity card frame with a user bust on one side and detail lines';
  }

  return null;
}

function buildMediaDepicts(sourceName) {
  if (sourceName === 'play' || sourceName === 'play_circle') {
    return sourceName.includes('circle')
      ? 'Right pointing play triangle centered inside a circle outline'
      : 'Right pointing play triangle centered as a media control mark';
  }
  if (sourceName === 'pause' || sourceName === 'pause_circle') {
    return sourceName.includes('circle')
      ? 'Two vertical pause bars centered inside a circle outline'
      : 'Two vertical pause bars centered as a media control mark';
  }
  if (sourceName === 'stop' || sourceName === 'stop_circle') {
    return sourceName.includes('circle')
      ? 'Square stop block centered inside a circle outline'
      : 'Square stop block centered as a media control mark';
  }
  if (sourceName === 'skip_forward' || sourceName === 'skip_previous') {
    return 'Double media triangles beside a vertical bar across the center';
  }
  if (sourceName.startsWith('rewind_backward') || sourceName.startsWith('rewind_forward')) {
    return 'Media rewind triangles with a number mark centered inside a square frame';
  }
  if (sourceName.startsWith('camera')) {
    return 'Camera body outline with a circular lens centered on the front';
  }
  if (sourceName.startsWith('camcorder') || sourceName.startsWith('video_camera')) {
    return 'Camcorder body with a lens front and a projecting side viewfinder';
  }
  if (sourceName.startsWith('monitor')) {
    return 'Monitor screen frame above a short stand centered below';
  }
  if (sourceName.startsWith('phone') || sourceName.startsWith('cellphone')) {
    return 'Phone handset or device outline centered as the main communication form';
  }
  if (sourceName.startsWith('music')) {
    return 'Music note symbol with a rounded note head and vertical stem';
  }
  if (sourceName.startsWith('mic')) {
    return 'Microphone capsule above a short stem and lower base stand';
  }
  return null;
}

function buildLayoutDepicts(sourceName) {
  if (sourceName.startsWith('layout_') || sourceName === 'layout') {
    return 'Window frame divided into multiple panels with visible inner section lines';
  }
  if (sourceName === 'layout_left' || sourceName === 'layout_right') {
    return 'Window frame split into a main panel and a narrow side column';
  }
  if (sourceName.startsWith('dashboard')) {
    return 'Dashboard grid with uneven panels arranged across the main frame';
  }
  if (sourceName.startsWith('grid') || sourceName === 'apps' || sourceName === 'layout_grid') {
    return 'Grid of square tiles arranged in even rows and columns';
  }
  if (sourceName === 'align_left' || sourceName === 'align_left_2') {
    return 'Stacked horizontal lines aligned to a shared left edge line';
  }
  if (sourceName === 'align_right' || sourceName === 'align_right_2') {
    return 'Stacked horizontal lines aligned to a shared right edge line';
  }
  if (sourceName === 'align_center' || sourceName === 'align_horizontal_center') {
    return 'Stacked horizontal lines centered on a shared vertical middle line';
  }
  if (sourceName === 'align_vertical_center') {
    return 'Stacked horizontal blocks centered around a shared middle row line';
  }
  if (sourceName === 'align_top') {
    return 'Stacked blocks aligned to a shared top edge line';
  }
  if (sourceName === 'align_bottom') {
    return 'Stacked blocks aligned to a shared bottom edge line';
  }
  if (sourceName === 'align_justify') {
    return 'Stacked text lines stretched evenly between the left and right edges';
  }
  if (sourceName === 'text_direction_left') {
    return 'Text lines beside a leftward direction arrow across the center';
  }
  if (sourceName === 'text_direction_right') {
    return 'Text lines beside a rightward direction arrow across the center';
  }
  if (sourceName === 'list_search') {
    return 'Stacked list lines with a magnifying glass at the lower right';
  }
  if (sourceName === 'list_check' || sourceName === 'list_check_2' || sourceName === 'list_check_3') {
    return 'Stacked list lines with check marks aligned in a left column';
  }
  if (sourceName === 'list_ordered') {
    return 'Stacked list lines with number marks aligned in a left column';
  }
  if (sourceName === 'list_expansion' || sourceName === 'list_collapse') {
    return 'Stacked list lines with a side chevron indicating open or closed rows';
  }
  if (sourceName.startsWith('list')) {
    return 'Stacked list rows with repeated horizontal lines across the frame';
  }
  if (sourceName.startsWith('align_')) {
    return 'Alignment guide lines centered with a highlighted edge positioning mark';
  }
  return null;
}

function buildWeatherDepicts(sourceName) {
  if (sourceName.includes('cloud') || sourceName === 'cloud' || sourceName === 'cloud_2') {
    return 'Cloud outline centered with rounded upper lobes and a flat lower edge';
  }
  if (sourceName.includes('sunrise')) return 'Sun half circle below a horizon line with short rays above';
  if (sourceName.includes('sunset')) return 'Sun half circle above a horizon line with short rays';
  if (sourceName === 'sun' || sourceName === 'sun_2' || sourceName.includes('sun_')) {
    return 'Sun circle centered with short rays extending around the outer edge';
  }
  if (sourceName === 'moon' || sourceName.includes('moon')) {
    return 'Crescent moon shape centered with a curved inner cutout edge';
  }
  if (sourceName.includes('rain') || sourceName.includes('showers') || sourceName.includes('drizzle')) {
    return 'Cloud outline with rain drops or vertical streaks falling below';
  }
  if (sourceName.includes('snow') || sourceName.includes('snowflake') || sourceName.includes('snowman')) {
    return 'Snow weather symbol centered with flakes or stacked round snow forms';
  }
  if (sourceName.includes('storm') || sourceName.includes('lightning') || sourceName.includes('thunder')) {
    return 'Cloud outline with a lightning bolt dropping below the lower edge';
  }
  if (sourceName === 'umbrella' || sourceName === 'umbrella_2') {
    return 'Umbrella canopy with a curved handle centered below the main arc';
  }
  if (sourceName === 'wind' || sourceName === 'cloud_windy') {
    return 'Curved wind streak lines sweeping horizontally across the center';
  }
  if (sourceName === 'thermometer' || sourceName.includes('temperature')) {
    return 'Thermometer stem with a round bulb at the lower end';
  }
  return null;
}

function buildLiteralNameDepicts(record, sourceInfo) {
  const sourceName = record.source_name;

  if (sourceName === 'abs') {
    return 'The letters ABS centered inside a circular brake ring indicator';
  }
  if (sourceName === 'apple_intelligence') {
    return 'Symmetric cluster of curved arcs arranged around a small open center';
  }
  if (sourceName === 'apple_intelligence_frame') {
    return 'Rounded square frame with a symmetric cluster of curved arcs inside';
  }
  if (sourceName === 'download') {
    return 'Downward arrow entering an open rectangular frame with side walls';
  }
  if (sourceName === 'download_2') {
    return 'Downward arrow dropping into a wide tray bar across the bottom';
  }
  if (sourceName === 'download_3') {
    return 'Rounded cloud outline with a downward arrow dropping from the lower center';
  }
  if (sourceName === 'folding_fan') {
    return 'Folded hand fan with a rounded spread above a short pivot base';
  }
  if (sourceName === 'pin' || sourceName === 'pin_2') {
    return 'Pushpin silhouette with a broad top cap above a pointed lower needle';
  }
  if (sourceName === 'upload') {
    return 'Upward arrow rising from an open rectangular frame with side walls';
  }
  if (sourceName === 'upload_2') {
    return 'Upward arrow rising from a wide tray bar across the bottom';
  }
  if (sourceName === 'upload_3') {
    return 'Rounded cloud outline with an upward arrow rising from the lower center';
  }
  if (sourceName === 'ad_circle') {
    return 'The letters AD centered inside a circle outline';
  }
  if (sourceName === 'ad_circle_off') {
    return 'The letters AD inside a circle outline with a diagonal off slash';
  }
  if (sourceName === 'ad_rectangle') {
    return 'The letters AD centered inside a rectangular frame';
  }
  if (sourceName === 'ad_rectangle_off') {
    return 'The letters AD inside a rectangular frame with a diagonal off slash';
  }
  if (sourceName === 'pdf') {
    return 'The letters PDF centered as a document style badge mark';
  }
  if (sourceName === 'xls') {
    return 'The letters XLS centered as a spreadsheet style badge mark';
  }
  if (sourceName === 'ai') {
    return 'The letters AI centered as a compact technical badge mark';
  }
  if (sourceName === 'mcp') {
    return 'The letters MCP centered as a compact technical badge mark';
  }
  if (sourceName === 'na') {
    return 'The letters N A centered as a compact unavailable state badge';
  }
  if (sourceName === 'eye' || sourceName === 'eye_2') {
    return 'Eye outline with tapered outer points and a centered circular pupil';
  }
  if (sourceName === 'gesture_unlock') {
    return 'Open lock body with a lifted shackle beside a vertical side panel';
  }
  if (/^key_[1-4]$/.test(sourceName)) {
    return 'Key silhouette with a round head and a toothed shaft extending right';
  }
  if (sourceName === 'lie_down') {
    return 'Person silhouette lying horizontally with bent legs and a raised head circle';
  }
  if (sourceName === 'open_door') {
    return 'Door panel opened outward beside a narrow frame and round handle';
  }
  if (sourceName === 'play_football') {
    return 'Running person silhouette with one raised leg beside a small football';
  }
  if (sourceName === 'process') {
    return 'Three square panels arranged in an L shape inside a window frame';
  }
  if (sourceName === 'refresh_anticlockwise_1') {
    return 'Circular arrow loop turning anticlockwise with a small arrowhead near the top';
  }
  if (sourceName === 'thumb_down' || sourceName === 'thumb_down_2') {
    return 'Downward thumb silhouette with a rectangular cuff at the wrist end';
  }
  if (sourceName === 'thumb_up' || sourceName === 'thumb_up_2') {
    return 'Upward thumb silhouette with a rectangular cuff at the wrist end';
  }
  if (sourceName === 'warm_up') {
    return 'Standing person silhouette with one raised knee and one arm extended outward';
  }
  if (sourceName === 'warm_up_2') {
    return 'Standing person silhouette leaning forward with bent limbs and a raised arm';
  }
  if (sourceName === 'warm_up_3') {
    return 'Standing person silhouette with one leg lifted forward and one arm lowered';
  }

  const arrowDepicts = buildArrowDepicts(sourceName);
  if (arrowDepicts) return arrowDepicts;

  const controlDepicts = buildSimpleControlDepicts(sourceName);
  if (controlDepicts) return controlDepicts;

  if (sourceName.startsWith('file_')) return buildFileDepicts(sourceName, 'file');
  if (sourceName.startsWith('folder') || sourceName === 'new_folder') return buildFileDepicts(sourceName, 'folder');

  const userDepicts = buildUserDepicts(sourceName);
  if (userDepicts) return userDepicts;

  const mediaDepicts = buildMediaDepicts(sourceName);
  if (mediaDepicts) return mediaDepicts;

  const layoutDepicts = buildLayoutDepicts(sourceName);
  if (layoutDepicts) return layoutDepicts;

  const weatherDepicts = buildWeatherDepicts(sourceName);
  if (weatherDepicts) return weatherDepicts;

  if (sourceName.startsWith('calendar')) {
    return 'Calendar frame with top binding tabs and a grid below';
  }
  if (sourceName.startsWith('settings_') || sourceName === 'settings') {
    return 'Gear outline centered with evenly spaced outer teeth around a small hub';
  }
  if (sourceName.startsWith('chart_bar')) {
    return 'Bar chart with vertical columns rising from a shared lower baseline';
  }
  if (sourceName.startsWith('chart_horizontal')) {
    return 'Bar chart with horizontal columns extending right from a shared left edge';
  }
  if (sourceName.startsWith('chart_line')) {
    return 'Line chart with angled segments rising and falling across the frame';
  }
  if (sourceName.startsWith('chart_pie')) {
    return 'Pie chart circle with one wedge section separated from the ring';
  }
  if (sourceName.startsWith('chart_vertical')) {
    return 'Column chart with vertical bars of uneven height across the base line';
  }
  if (sourceName.startsWith('coin') || sourceName.includes('currency_')) {
    return 'Coin or currency mark centered inside a round money badge shape';
  }
  if (sourceName.startsWith('bank_card') || sourceName.startsWith('card_')) {
    return 'Payment card rectangle with a horizontal stripe and inner detail marks';
  }
  if (sourceName.startsWith('wallet')) {
    return 'Wallet outline with a folded flap and inner pocket edge';
  }
  if (sourceName.startsWith('home_') || sourceName === 'house' || sourceName === 'house_2') {
    return 'House outline with a peaked roof above a simple base wall';
  }
  if (
    sourceName.startsWith('building_') ||
    ['hotel', 'hospital', 'school', 'shop', 'store', 'store_2', 'factory', 'factory_2', 'government', 'bank'].includes(sourceName)
  ) {
    return 'Building silhouette with a tall body and repeated window cutouts';
  }
  if (sourceName.includes('tower') || ['big_ben', 'eiffel_tower', 'lighthouse', 'monument', 'palace', 'pavilion', 'church', 'tent', 'campground', 'bridge', 'bridge_2'].includes(sourceName)) {
    return `${cleanLabel(record.label)} silhouette centered as the main landmark outline`;
  }
  if (sourceName.startsWith('mail')) {
    return 'Envelope outline with a folded flap across the center';
  }
  if (sourceName.startsWith('message') || sourceName === 'bubble' || sourceName === 'speech') {
    return 'Speech bubble outline with a small tail extending from one side';
  }
  if (sourceName.startsWith('router')) {
    return 'Router box with a small antenna and signal arcs above the top';
  }
  if (sourceName.startsWith('server')) {
    return 'Stacked server panels arranged in a vertical column with indicator dots';
  }
  if (sourceName.startsWith('terminal')) {
    return 'Terminal window with a prompt chevron and a command line';
  }
  if (sourceName.startsWith('code') || sourceName === 'brackets' || sourceName === 'brackets_angle' || sourceName === 'markup' || sourceName === 'markdown') {
    return 'Angle bracket code marks centered as a technical syntax symbol';
  }
  if (sourceName === 'webhook') {
    return 'Hooked line path linked to a small node circle near one end';
  }
  if (sourceName === 'wifi' || sourceName === 'wifi_off') {
    return sourceName === 'wifi'
      ? 'Wireless signal arcs stacked above a small centered dot'
      : 'Wireless signal arcs crossed by a diagonal off slash across the center';
  }
  if (sourceName === 'airplane' || sourceName.startsWith('flight_')) {
    return 'Airplane silhouette angled with swept wings and a narrow tail fin';
  }
  if (sourceName.startsWith('car') || sourceName === 'jeep') {
    return 'Car body silhouette with two wheels below a rounded roofline';
  }
  if (sourceName === 'bus' || sourceName === 'bus_2' || sourceName.startsWith('train') || sourceName === 'truck') {
    return 'Vehicle silhouette with a long body and two wheels along the lower edge';
  }
  if (sourceName === 'bike' || sourceName === 'ebike' || sourceName === 'scooter') {
    return 'Two wheel vehicle silhouette with a frame and handlebars across the center';
  }
  if (sourceName.startsWith('rocket')) {
    return 'Rocket silhouette pointed upward with side fins and a lower exhaust base';
  }
  if (sourceName === 'ship' || sourceName === 'sailboat') {
    return 'Boat silhouette with a raised deck above a curved lower hull';
  }
  if (sourceName === 'traffic_lights') {
    return 'Vertical traffic light housing with stacked circular signal windows';
  }
  if (sourceName === 'steering_wheel') {
    return 'Circular steering wheel ring with inner spokes meeting at the center';
  }
  if (sourceName === 'gas_station') {
    return 'Fuel pump body with a hose loop beside the main rectangular column';
  }
  if (sourceName.startsWith('air_condition')) {
    return 'Air conditioner unit with a front vent and short airflow lines below';
  }

  if (sourceInfo.category === 'logo') {
    return buildBrandDepicts(record);
  }

  if (sourceInfo.category === 'zodiac') {
    return toDeterministicSentence(`${cleanLabel(record.label)} glyph centered as a curved astrological symbol`);
  }

  const currentDepicts = String(record.depicts || '').trim();
  if (currentDepicts && !ABSTRACT_DEPICTS_PATTERNS.some((pattern) => pattern.test(currentDepicts))) {
    const normalized = toDeterministicSentence(currentDepicts);
    if (!normalized.toLowerCase().includes('centered') && !normalized.toLowerCase().includes('inside')) {
      return toDeterministicSentence(`${normalized} centered in the icon`);
    }
    return normalized;
  }

  return buildCategoryFallback(record, sourceInfo);
}

function buildPopularReading(record) {
  return cleanLabel(record.label) || humanizeSourceName(record.source_name);
}

function normalizePhrase(value) {
  return String(value || '')
    .trim()
    .replace(/[.]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function buildPlausibleReadings(record) {
  const candidates = [
    ...(record.semantic_tags || []),
    ...(record.synonyms || []),
    humanizeSourceName(record.source_name).toLowerCase(),
    cleanLabel(record.label).toLowerCase(),
  ];

  const result = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const normalized = normalizePhrase(candidate);
    if (!normalized) continue;
    if (normalized.split(' ').length > 5) continue;
    if (/[,;:!?]/.test(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length === 4) break;
  }

  const fallbacks = [
    humanizeSourceName(record.source_name).toLowerCase(),
    cleanLabel(record.label).toLowerCase(),
    `${humanizeSourceName(record.source_name).toLowerCase()} icon`,
    `${cleanLabel(record.label).toLowerCase()} symbol`,
  ];

  for (const fallback of fallbacks) {
    if (result.length >= 2) break;
    const normalized = normalizePhrase(fallback);
    if (!normalized) continue;
    if (normalized.split(' ').length > 5) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  while (result.length < 2) {
    const filler = result.length === 0 ? 'icon' : 'symbol';
    if (!seen.has(filler)) {
      seen.add(filler);
      result.push(filler);
    } else {
      result.push(`${filler} ${result.length + 1}`);
    }
  }

  return result.slice(0, 4);
}

async function buildMingcuteOfficialSourceMap() {
  const sourceMap = new Map();
  const categories = await fs.readdir(mingcuteLocalSvgRoot, { withFileTypes: true });

  for (const categoryEntry of categories) {
    if (!categoryEntry.isDirectory()) continue;
    const category = categoryEntry.name;
    const categoryDir = path.join(mingcuteLocalSvgRoot, category);
    const files = await fs.readdir(categoryDir, { withFileTypes: true });

    for (const fileEntry of files) {
      if (!fileEntry.isFile() || !fileEntry.name.endsWith('.svg')) continue;
      const sourceName = fileEntry.name === 'ABS_line.svg'
        ? 'abs'
        : fileEntry.name.replace(/_line\.svg$/i, '').toLowerCase();
      if (!sourceName) continue;

      const relativePath = path.posix.join('svg', category, fileEntry.name);
      sourceMap.set(sourceName, {
        category,
        fileName: fileEntry.name,
        relativePath,
        officialSourceUrl: `https://raw.githubusercontent.com/Richard9394/MingCute/main/${relativePath}`,
      });
    }
  }

  return sourceMap;
}

function buildOrderedMingcuteRecords(approvedRecords, officialSourceMap) {
  const approvedById = new Map(approvedRecords.map((record) => [record.icon_id, record]));
  const ordered = [];

  for (const icon of publicIconIndex.icons || []) {
    if (icon.lib !== SOURCE_LIBRARY) continue;
    const sourceName = normalizeMingcuteSourceNameFromIconIndexId(icon.id);
    const iconId = `${SOURCE_LIBRARY}:${sourceName}`;
    const currentRecord = approvedById.get(iconId);
    const sourceInfo = officialSourceMap.get(sourceName);

    if (!currentRecord) {
      throw new Error(`Missing approved MingCute record for ${iconId}`);
    }
    if (!sourceInfo) {
      throw new Error(`Missing official MingCute source mapping for ${iconId}`);
    }

    ordered.push({ iconId, currentRecord, sourceInfo });
  }

  return ordered;
}

function createSelectionPayload(batchId, batchItems, reviewPolicySnapshot) {
  return {
    batch_id: batchId,
    track_id: TRACK_ID,
    track_label: TRACK_LABEL,
    title: `${TRACK_LABEL} Deterministic Redo ${batchId.replace(`${TRACK_ID}-`, '')}`,
    review_goal: `Redo the ${batchItems.length} MingCute records in this batch with SVG grounded depicts and keep the public schema safe.`,
    record_source_path: 'data/si-registry/automation/mingcute/approved-records.json',
    review_policy_snapshot: reviewPolicySnapshot,
    visual_source: {
      kind: 'mingcute_icon_index',
      path: 'public/icon-index.json',
    },
    items: batchItems.map(({ currentRecord, sourceInfo }) => ({
      icon_id: currentRecord.icon_id,
      official_source_url: sourceInfo.officialSourceUrl,
      depicts_observation: toDeterministicSentence(buildLiteralNameDepicts(currentRecord, sourceInfo)),
      popular_reading: buildPopularReading(currentRecord),
      plausible_readings: buildPlausibleReadings(currentRecord),
      context_bias: currentRecord.use_when,
      ambiguity_note: currentRecord.avoid_when,
      selection_reason: 'Current live semantic meaning is preserved and the official MingCute SVG grounds the visual phrasing.',
    })),
  };
}

async function updateRestartOrderForMingcuteRun({ completed = false, dryRun = false } = {}) {
  const restartOrder = await readJson(restartOrderPath);

  const purposeStage = restartOrder.stages.find((stage) => stage.stage_id === 'purpose-chip-150');
  const mingcuteStage = restartOrder.stages.find((stage) => stage.stage_id === 'mingcute');
  const simpleiconsStage = restartOrder.stages.find((stage) => stage.stage_id === 'simpleicons');

  if (purposeStage) {
    purposeStage.status = 'completed';
  }

  if (mingcuteStage) {
    mingcuteStage.status = completed ? 'completed' : 'in_progress';
  }

  restartOrder.active_stage_id = completed && simpleiconsStage ? 'simpleicons' : 'mingcute';

  if (!dryRun) {
    await writeJson(restartOrderPath, restartOrder);
  }
}

async function mergeFinalRecordsIntoApprovedRecords(allFinalRecords, dryRun = false) {
  const approvedRecords = await readJson(mingcuteApprovedPath);
  const finalById = new Map(allFinalRecords.map((record) => [record.icon_id, record]));

  for (const record of approvedRecords) {
    const finalRecord = finalById.get(record.icon_id);
    if (!finalRecord) continue;
    record.source_library = finalRecord.source_library;
    record.source_name = finalRecord.source_name;
    record.label = finalRecord.label;
    record.depicts = finalRecord.depicts;
    record.semantic_tags = finalRecord.semantic_tags;
    record.synonyms = finalRecord.synonyms;
    record.use_when = finalRecord.use_when;
    record.avoid_when = finalRecord.avoid_when;
  }

  if (!dryRun) {
    await writeJson(mingcuteApprovedPath, approvedRecords);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const restartOrder = await readJson(restartOrderPath);
  const stage = (restartOrder.stages || []).find((entry) => entry.stage_id === TRACK_ID);
  const configuredBatchSize = options.batchSize || stage?.review_policy?.batch_size || DEFAULT_BATCH_SIZE;

  const approvedRecords = await readJson(mingcuteApprovedPath);
  const officialSourceMap = await buildMingcuteOfficialSourceMap();
  const orderedRecords = buildOrderedMingcuteRecords(approvedRecords, officialSourceMap);

  const batchIds = [];
  let batchIndex = 1;

  await updateRestartOrderForMingcuteRun({ completed: false, dryRun: options.dryRun });

  for (let start = 0; start < orderedRecords.length; start += configuredBatchSize) {
    const batchItems = orderedRecords.slice(start, start + configuredBatchSize);
    const batchId = `${TRACK_ID}-batch-${String(batchIndex).padStart(SELECTION_PADDING, '0')}`;
    batchIndex += 1;

    const selection = createSelectionPayload(batchId, batchItems, {
      phase: stage?.review_policy?.phase || 'calibration',
      batch_size: batchItems.length,
      approval_scope: 'full_batch',
      fallback_batch_size: stage?.review_policy?.fallback_batch_size || DEFAULT_BATCH_SIZE,
    });

    await writeJson(path.join(manualRedoDir, `${batchId}-selection.json`), selection);
    batchIds.push(batchId);

    if (options.limitBatches && batchIds.length >= options.limitBatches) {
      break;
    }
  }

  runNodeScript('verify-manual-redo-determinism.mjs');

  for (const batchId of batchIds) {
    runNodeScript('build-manual-redo-batch.mjs', batchId);
  }

  runNodeScript('verify-pruned-semantic-fields.mjs');

  const allFinalRecords = [];
  for (const batchId of batchIds) {
    const batchSlug = batchId.startsWith(`${TRACK_ID}-`) ? batchId.slice(`${TRACK_ID}-`.length) : batchId;
    const finalPath = path.join(manualRedoDir, `${TRACK_ID}-manual-redo-${batchSlug}-final-records.json`);
    const finalRecords = await readJson(finalPath);
    allFinalRecords.push(...finalRecords);
  }

  if (!options.dryRun) {
    await mergeFinalRecordsIntoApprovedRecords(allFinalRecords, false);
    runNodeScript('build-si-registry-projections.mjs');
    runNodeScript('verify-pruned-semantic-fields.mjs');
    runNodeScript('verify-mingcute-approved-records.mjs');
    runNodeScript('build-redo-progress-checklists.mjs');
    await updateRestartOrderForMingcuteRun({ completed: batchIds.length * configuredBatchSize >= orderedRecords.length, dryRun: false });
    runNodeScript('build-redo-progress-checklists.mjs');
  }

  const summary = {
    dry_run: options.dryRun,
    batch_count: batchIds.length,
    processed_icons: allFinalRecords.length,
    total_scope_icons: orderedRecords.length,
    first_batch_id: batchIds[0] || null,
    last_batch_id: batchIds[batchIds.length - 1] || null,
  };

  await writeJson(path.join(generatedDir, 'mingcute-deterministic-redo-run-summary.json'), summary);
  console.log(`run-mingcute-deterministic-redo: batches=${summary.batch_count} | processed=${summary.processed_icons} | total=${summary.total_scope_icons} | dryRun=${summary.dry_run}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
