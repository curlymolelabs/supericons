import fs from 'node:fs';
import path from 'node:path';

import { Resvg } from '@resvg/resvg-js';
import {
  buildMaterialBrowserCaptureHtml,
  buildMaterialBrowserCaptureSpec,
  buildMaterialExceptionAssetIdSet,
  readMaterialExceptionManifest,
} from '../lib/screenshot-capture/material-browser-fallback.js';
import {
  MATERIAL_EXPORT_DEFAULT_AXES,
  buildMaterialOwnedStoragePath,
  buildMaterialUpstreamSnapshotUrl,
  normalizeMaterialSnapshotSvg,
} from '../material-export.js';

const repoRoot = process.cwd();

const MATERIAL_ICON_RENAMES = {
  access_alarm: 'alarm',
  access_alarms: 'alarm',
  access_time: 'schedule',
  add_alarm: 'alarm_add',
  add_ic_call: 'add_call',
  addchart: 'add_chart',
  announcement: 'campaign',
  app_settings_alt: 'settings',
  assistant_photo: 'motion_photos_on',
  audiotrack: 'music_note',
  auto_draw_solid: 'auto_fix_high',
  battery_std: 'battery_full',
  bluetooth_audio: 'bluetooth',
  browser_not_supported: 'browser_updated',
  business: 'domain',
  card_giftcard: 'redeem',
  class: 'school',
  clear: 'close',
  collections: 'photo_library',
  color_lens: 'palette',
  control_point: 'control_point_duplicate',
  create: 'edit',
  crop_din: 'crop',
  crop_original: 'crop',
  data_saver_off: 'data_saver_on',
  directions_transit: 'train',
  do_disturb: 'block',
  do_disturb_alt: 'block',
  do_disturb_off: 'do_not_disturb_off',
  do_disturb_on: 'do_not_disturb_on',
  do_not_disturb: 'notifications_off',
  do_not_disturb_alt: 'notifications_off',
  drawing_recognition: 'draw',
  drive_eta: 'departure_board',
  drive_fusiontable: 'table_chart',
  email: 'mail',
  emoji_emotions: 'mood',
  expension_panels: 'expand',
  face_unlock: 'face',
  fmd_good: 'location_on',
  free_breakfast: 'coffee',
  games: 'sports_esports',
  get_app: 'download',
  gpp_good: 'verified',
  gps_fixed: 'my_location',
  gps_not_fixed: 'location_searching',
  gps_off: 'location_disabled',
  handwriting_recognition: 'gesture',
  headset: 'headphones',
  highlight_alt: 'highlight',
  highlight_off: 'cancel',
  home_filled: 'home',
  https: 'lock',
  import_export: 'swap_vert',
  insert_comment: 'comment',
  insert_drive_file: 'description',
  insert_emoticon: 'mood',
  insert_invitation: 'event',
  insert_link: 'link',
  insert_photo: 'image',
  iso: 'iso',
  keep_pin: 'keep',
  label_important_outline: 'label_important',
  label_outline: 'label',
  laptop: 'laptop_mac',
  launch: 'open_in_new',
  lightbulb_outline: 'lightbulb',
  local_airport: 'flight',
  local_grocery_store: 'shopping_cart',
  local_hotel: 'hotel',
  local_movies: 'theaters',
  local_offer: 'sell',
  local_phone: 'call',
  local_play: 'local_activity',
  local_printshop: 'print',
  locator_tag: 'nfc',
  location_pin: 'location_on',
  loop: 'sync',
  maps_home_work: 'home_work',
  markunread: 'mark_email_unread',
  message: 'chat',
  mic_none: 'mic',
  missed_video_call_filled: 'missed_video_call',
  mode: 'edit',
  mode_edit: 'edit',
  money_off_csred: 'money_off',
  motion_photos_pause: 'motion_photos_off',
  movie_creation: 'movie',
  nightlight_round: 'nightlight',
  no_encryption_gmailerrorred: 'no_encryption',
  not_interested: 'block',
  notifications_none: 'notifications',
  ondemand_video: 'smart_display',
  outlined_flag: 'flag',
  payment: 'payments',
  people: 'group',
  people_alt: 'group',
  perm_identity: 'person',
  person_add_alt: 'person_add',
  person_outline: 'person',
  personal_video: 'live_tv',
  phone: 'call',
  phone_alt: 'call',
  phonelink: 'devices',
  photo_size_select_actual: 'image',
  pie_chart_filled: 'pie_chart',
  pie_chart_outlined: 'pie_chart',
  place: 'location_on',
  play_music: 'play_circle',
  plus_one: 'exposure_plus_1',
  poll: 'bar_chart',
  portrait: 'account_circle',
  query_builder: 'schedule',
  question_answer: 'forum',
  queue: 'queue_music',
  rate_review_rtl: 'rate_review',
  reminders_alt: 'reminder',
  remove_circle: 'do_not_disturb_on',
  remove_red_eye: 'visibility',
  report_gmailerrorred: 'report',
  report_problem: 'error',
  restore: 'history',
  room: 'location_on',
  save_alt: 'download',
  sd_storage: 'sd',
  sentiment_satisfied_alt: 'sentiment_satisfied',
  settings_input_composite: 'settings_input_component',
  security_update: 'security',
  shape_recognition: 'shapes',
  shop_2: 'store',
  star_border_purple500: 'star',
  star_purple500: 'star',
  store_mall_directory: 'store',
  tag_faces: 'mood',
  terrain: 'landscape',
  textsms: 'chat',
  thumb_down_alt: 'thumb_down',
  thumb_down_filled: 'thumb_down',
  thumb_down_off_alt: 'thumb_down',
  thumb_up_alt: 'thumb_up',
  thumb_up_filled: 'thumb_up',
  thumb_up_off_alt: 'thumb_up',
  time_to_leave: 'departure_board',
  turned_in: 'bookmark',
  turned_in_not: 'bookmark',
  unpin: 'push_pin',
  warning_amber: 'warning',
  watch_later: 'schedule',
  wb_cloudy: 'cloudy',
  work_off: 'work',
  workflow: 'account_tree',
  assessment: 'analytics',
  call_end_alt: 'call_end',
  camera_alt: 'photo_camera',
  closed_caption_off: 'closed_caption',
  communities_filled: 'communities',
  contact_phone_filled: 'contact_phone',
  filter_list_alt: 'filter_list',
};

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadCatalog(catalogPath) {
  const data = readJson(path.join(repoRoot, catalogPath));
  return new Map((data.icons || []).map((icon) => [`${icon.lib}:${icon.id}`, icon]));
}

function colorizeSvg(svg) {
  return svg.replace(/currentColor/g, '#000000');
}

function renderPng({ svg, outputPath, width }) {
  const resvg = new Resvg(colorizeSvg(svg), {
    fitTo: {
      mode: 'width',
      value: width,
    },
    background: 'rgba(0, 0, 0, 0)',
  });
  const pngData = resvg.render();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pngData.asPng());
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const pngSignature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== pngSignature) {
    throw new Error(`${filePath} is not a PNG file`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function buildTargets({ library, limit }) {
  const screenshotFolder = path.join(repoRoot, 'output', 'icon_screenshot', library);
  const mapping = readJson(path.join(screenshotFolder, 'screenshot-mapping.json'));
  const entries = mapping.entries || [];
  return entries.slice(0, limit || entries.length).map((entry) => ({
    library,
    asset_id: entry.asset_id,
    asset_style: entry.asset_style,
    asset_source_catalog: entry.asset_source_catalog,
    capture_mode: entry.capture_mode,
    material_fill: entry.material_fill,
    output: path.join(screenshotFolder, entry.recommended_screenshot_file_name),
  }));
}

function resolveMaterialIconId(assetId) {
  let baseId = assetId;

  if (baseId.endsWith('_filled')) {
    baseId = baseId.slice(0, -7);
  } else if (baseId.endsWith('_outline')) {
    baseId = baseId.slice(0, -8);
  } else if (baseId.endsWith('_outlined')) {
    baseId = baseId.slice(0, -9);
  } else if (baseId.endsWith('_border')) {
    baseId = baseId.slice(0, -7);
  }

  return MATERIAL_ICON_RENAMES[baseId] || baseId;
}

function resolveMaterialAxes(target) {
  if (target.capture_mode === 'material_fill_axis' && target.material_fill === 1) {
    return { fill: 1, wght: 400, grad: 0, opsz: 24 };
  }
  return { ...MATERIAL_EXPORT_DEFAULT_AXES };
}

async function resolveMaterialSvg(target) {
  const resolvedId = resolveMaterialIconId(target.asset_id);
  const axes = resolveMaterialAxes(target);
  const relPath = buildMaterialOwnedStoragePath(resolvedId, axes);
  const svgPath = path.join(repoRoot, 'public', 'material-export', relPath);

  if (fs.existsSync(svgPath)) {
    return normalizeMaterialSnapshotSvg(fs.readFileSync(svgPath, 'utf8'));
  }

  const url = buildMaterialUpstreamSnapshotUrl(resolvedId, axes);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const rawSvg = await response.text();
    const svg = normalizeMaterialSnapshotSvg(rawSvg);
    if (svg) {
      fs.mkdirSync(path.dirname(svgPath), { recursive: true });
      fs.writeFileSync(svgPath, `${svg}\n`, 'utf8');
    }
    return svg;
  } catch {
    return null;
  }
}

async function launchMaterialBrowser() {
  const { chromium } = await import('playwright');
  try {
    return await chromium.launch({ headless: true, channel: 'msedge' });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function renderMaterialBrowserFallback({
  target,
  width,
  height,
  outputPath,
  exceptionAssetIds,
  browser,
}) {
  const spec = buildMaterialBrowserCaptureSpec({ target, exceptionAssetIds });
  if (!spec) {
    return false;
  }

  const page = await browser.newPage({
    viewport: {
      width: spec.width,
      height: spec.height,
    },
    deviceScaleFactor: 1,
  });

  try {
    await page.setContent(buildMaterialBrowserCaptureHtml({ ...spec, width, height }));
    await page.evaluate(async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
    });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: outputPath,
      omitBackground: true,
    });
    return true;
  } finally {
    await page.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const library = options.library;
  if (!library) {
    throw new Error('Missing required option --library');
  }

  const limit = options.limit ? Number.parseInt(options.limit, 10) : null;
  const width = options.width ? Number.parseInt(options.width, 10) : 128;
  const height = options.height ? Number.parseInt(options.height, 10) : width;
  const targets = buildTargets({ library, limit });
  const issuePath = path.join(repoRoot, 'data', 'si-registry', 'generated', 'screenshot-capture-issues.json');
  const materialExceptionAssetIds =
    library === 'material'
      ? buildMaterialExceptionAssetIdSet(readMaterialExceptionManifest(repoRoot))
      : new Set();

  if (options['dry-run']) {
    console.log(
      JSON.stringify(
        {
          library,
          targets: targets.map((target) => ({
            ...target,
            output: path.relative(repoRoot, target.output).replaceAll(path.sep, '/'),
          })),
        },
        null,
        2
      )
    );
    return;
  }

  const catalogs = new Map();
  const issues = [];
  let materialBrowser = null;

  for (const target of targets) {
    if (!catalogs.has(target.asset_source_catalog)) {
      catalogs.set(target.asset_source_catalog, loadCatalog(target.asset_source_catalog));
    }
    const catalog = catalogs.get(target.asset_source_catalog);
    let svg = catalog.get(`${library}:${target.asset_id}`)?.svg;

    if (!svg && library === 'material') {
      svg = await resolveMaterialSvg(target);
    }

    if (!svg) {
      if (library === 'material') {
        materialBrowser ||= await launchMaterialBrowser();
        const browserRendered = await renderMaterialBrowserFallback({
          target,
          width,
          height,
          outputPath: target.output,
          exceptionAssetIds: materialExceptionAssetIds,
          browser: materialBrowser,
        });
        if (browserRendered) {
          const dimensions = readPngDimensions(target.output);
          if (dimensions.width !== width || dimensions.height !== height) {
            issues.push({
              asset_id: target.asset_id,
              code: 'unexpected_png_dimensions',
              expected: `${width}x${height}`,
              actual: `${dimensions.width}x${dimensions.height}`,
              output: path.relative(repoRoot, target.output).replaceAll(path.sep, '/'),
            });
          }
          continue;
        }
      }
      issues.push({
        asset_id: target.asset_id,
        code: 'missing_svg',
        source_catalog: target.asset_source_catalog,
      });
      continue;
    }
    renderPng({ svg, outputPath: target.output, width });
    const stat = fs.statSync(target.output);
    if (stat.size <= 0) {
      issues.push({
        asset_id: target.asset_id,
        code: 'empty_png',
        output: path.relative(repoRoot, target.output).replaceAll(path.sep, '/'),
      });
      continue;
    }

    const dimensions = readPngDimensions(target.output);
    if (dimensions.width !== width || dimensions.height !== height) {
      issues.push({
        asset_id: target.asset_id,
        code: 'unexpected_png_dimensions',
        expected: `${width}x${height}`,
        actual: `${dimensions.width}x${dimensions.height}`,
        output: path.relative(repoRoot, target.output).replaceAll(path.sep, '/'),
      });
    }
  }

  if (materialBrowser) {
    await materialBrowser.close();
  }

  if (issues.length > 0) {
    fs.mkdirSync(path.dirname(issuePath), { recursive: true });
    fs.writeFileSync(issuePath, `${JSON.stringify({ library, issues }, null, 2)}\n`, 'utf8');
  } else if (fs.existsSync(issuePath)) {
    fs.rmSync(issuePath);
  }

  console.log(
    JSON.stringify(
      {
        library,
        rendered: targets.length - issues.length,
        issues: issues.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
