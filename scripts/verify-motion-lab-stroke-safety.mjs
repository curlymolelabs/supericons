import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildMotionLabAnimatedSvg,
  buildMotionLabExternalCss,
} from '../lib/motion-lab-workflow.js';
import { MOTION_LAB_PRESET_IDS, MOTION_LAB_PRESETS } from '../lib/motion-lab-presets.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicIconIndex = JSON.parse(await fs.readFile(path.join(repoRoot, 'public/icon-index.json'), 'utf8'));

const strokeCases = [
  {
    library: 'tabler',
    icon: 'robot',
    file: 'node_modules/@tabler/icons/icons/outline/robot.svg',
    baseStrokeWidth: '2',
  },
  {
    library: 'lucide',
    icon: 'bot',
    file: 'node_modules/lucide-static/icons/bot.svg',
    baseStrokeWidth: '2',
  },
  {
    library: 'heroicons-outline',
    icon: 'academic-cap',
    file: 'node_modules/heroicons/24/outline/academic-cap.svg',
    baseStrokeWidth: '1.5',
  },
  {
    library: 'iconoir',
    icon: 'accessibility',
    file: 'node_modules/iconoir/icons/regular/accessibility.svg',
    baseStrokeWidth: '1.5',
  },
  {
    library: 'ionicons',
    icon: 'accessibility-outline',
    publicIcon: { lib: 'ionicons', id: 'accessibility-outline' },
    baseStrokeWidth: '32',
  },
];

const fillCases = [
  {
    library: 'bootstrap',
    icon: 'alarm',
    file: 'node_modules/bootstrap-icons/icons/alarm.svg',
  },
  {
    library: 'phosphor',
    icon: 'robot',
    file: 'node_modules/@phosphor-icons/core/assets/regular/robot.svg',
  },
  {
    library: 'simpleicons',
    icon: 'github',
    file: 'node_modules/simple-icons/icons/github.svg',
  },
  {
    library: 'mingcute',
    icon: 'robot_line',
    file: 'node_modules/mingcute_icon/svg/development/robot_line.svg',
  },
];

const presetBuckets = {
  scale: ['reason', 'shockwave', 'bloom', 'pulse', 'scaleUp', 'scaleDown'],
  translate: ['bounce', 'slideRight', 'slideUp', 'float'],
  rotate: ['spin', 'wobble', 'vortex', 'shrinkSpin'],
  filter: ['neonglow', 'sparkle', 'supernova', 'blackHole'],
  clip: ['trace', 'typing', 'sweep', 'fingerprint'],
  opacity: ['fadeOut', 'dissolve', 'blinkOut'],
};

const clickTriggerBuckets = new Set(['translate', 'rotate', 'opacity']);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stripStyle(svg) {
  return svg.replace(/<style>[\s\S]*?<\/style>/g, '');
}

function presetUsesScale(presetId) {
  return MOTION_LAB_PRESETS[presetId].keyframes.some((kf) => {
    return /\bscale(?:X|Y)?\(/.test(kf.props?.transform || '');
  });
}

async function readCaseSvg(testCase) {
  if (testCase.publicIcon) {
    const icon = publicIconIndex.icons.find((entry) => (
      entry.lib === testCase.publicIcon.lib && entry.id === testCase.publicIcon.id
    ));
    assert(icon?.svg, `Missing public SVG fixture ${testCase.publicIcon.lib}/${testCase.publicIcon.id}`);
    return icon.svg;
  }
  return fs.readFile(path.join(repoRoot, testCase.file), 'utf8');
}

function verifyStrokeSvg({ output, testCase, presetId }) {
  const markup = stripStyle(output);
  assert(!output.includes('mlPreview'), `${testCase.library}/${testCase.icon}/${presetId} leaked preview container id`);
  assert(!markup.includes('data-ml-anim-target'), `${testCase.library}/${testCase.icon}/${presetId} leaked preview wrapper marker`);
  assert(!output.includes('vector-effect'), `${testCase.library}/${testCase.icon}/${presetId} still contains vector-effect`);
  assert(markup.includes('data-ml-stroke-compensate="true"'), `${testCase.library}/${testCase.icon}/${presetId} missing stroke compensation marker`);
  assert(markup.includes(`--ml-base-stroke-width:${testCase.baseStrokeWidth}`), `${testCase.library}/${testCase.icon}/${presetId} missing base stroke width ${testCase.baseStrokeWidth}`);
  assert(output.includes('stroke-width: calc(var(--ml-base-stroke-width, 1) * var(--ml-stroke-comp, 1));'), `${testCase.library}/${testCase.icon}/${presetId} missing stroke compensation CSS`);
  if (presetUsesScale(presetId)) {
    assert(output.includes('    --ml-stroke-comp:'), `${testCase.library}/${testCase.icon}/${presetId} missing scale keyframe stroke compensation`);
  }
}

function verifyFillSvg({ output, testCase, presetId }) {
  const markup = stripStyle(output);
  assert(!output.includes('mlPreview'), `${testCase.library}/${testCase.icon}/${presetId} leaked preview container id`);
  assert(!markup.includes('data-ml-anim-target'), `${testCase.library}/${testCase.icon}/${presetId} leaked preview wrapper marker`);
  assert(!output.includes('vector-effect'), `${testCase.library}/${testCase.icon}/${presetId} still contains vector-effect`);
  assert(!markup.includes('data-ml-stroke-compensate'), `${testCase.library}/${testCase.icon}/${presetId} should not mark fill paths for stroke compensation`);
  assert(!markup.includes('--ml-base-stroke-width'), `${testCase.library}/${testCase.icon}/${presetId} should not add base stroke width to fill paths`);
}

function verifyExternalCss(presetId) {
  for (const trigger of ['loop', 'hover', 'click']) {
    const css = buildMotionLabExternalCss({ presetId, trigger, durationMs: 700, intensityPercent: 125 });
    assert(!css.includes('mlPreview'), `external CSS for ${presetId}/${trigger} leaked preview container id`);
    assert(!css.includes('animated-icon'), `external CSS for ${presetId}/${trigger} leaked standalone selector`);
    assert(!css.includes('vector-effect'), `external CSS for ${presetId}/${trigger} contains vector-effect`);
    assert(css.includes('[data-ml-stroke-compensate="true"]'), `external CSS for ${presetId}/${trigger} missing stroke compensation selector`);
    if (presetUsesScale(presetId)) {
      assert(css.includes('    --ml-stroke-comp:'), `external CSS for ${presetId}/${trigger} missing scale keyframe stroke compensation`);
    }
    if (trigger === 'hover') {
      assert(css.includes('#icon-container svg:hover'), `external CSS for ${presetId}/hover missing hover selector`);
    }
    if (trigger === 'click') {
      assert(css.includes('#icon-container svg:active') && css.includes('#icon-container svg.active'), `external CSS for ${presetId}/click missing active selectors`);
    }
  }
}

for (const presetIds of Object.values(presetBuckets)) {
  for (const presetId of presetIds) {
    verifyExternalCss(presetId);
  }
}

for (const testCase of strokeCases) {
  const svg = await readCaseSvg(testCase);
  for (const [bucket, presetIds] of Object.entries(presetBuckets)) {
    for (const presetId of presetIds) {
      const triggers = bucket === 'scale' ? ['loop', 'hover', 'click'] : [clickTriggerBuckets.has(bucket) ? 'click' : 'loop'];
      for (const trigger of triggers) {
        const output = buildMotionLabAnimatedSvg({
          svg,
          presetId,
          trigger,
          durationMs: 700,
          intensityPercent: 125,
          color: '#ff5c00',
        });
        verifyStrokeSvg({ output, testCase, presetId });
        if (trigger === 'click') {
          assert(output.includes('svg.si-animated-icon:active') && output.includes('svg.si-animated-icon.active'), `${testCase.library}/${testCase.icon}/${presetId} missing click selectors`);
        }
      }
    }
  }
}

for (const testCase of fillCases) {
  const svg = await readCaseSvg(testCase);
  for (const presetId of presetBuckets.scale) {
    const output = buildMotionLabAnimatedSvg({
      svg,
      presetId,
      trigger: 'loop',
      durationMs: 700,
      intensityPercent: 125,
      color: '#ff5c00',
    });
    verifyFillSvg({ output, testCase, presetId });
  }
}

for (const testCase of [strokeCases[0]]) {
  const svg = await readCaseSvg(testCase);
  for (const presetId of MOTION_LAB_PRESET_IDS) {
    const output = buildMotionLabAnimatedSvg({
      svg,
      presetId,
      trigger: 'loop',
      durationMs: 700,
      intensityPercent: 100,
      color: '#ff5c00',
    });
    verifyStrokeSvg({ output, testCase, presetId });
  }
}

for (const testCase of [fillCases[0]]) {
  const svg = await readCaseSvg(testCase);
  for (const presetId of MOTION_LAB_PRESET_IDS) {
    const output = buildMotionLabAnimatedSvg({
      svg,
      presetId,
      trigger: 'loop',
      durationMs: 700,
      intensityPercent: 100,
      color: '#ff5c00',
    });
    verifyFillSvg({ output, testCase, presetId });
  }
}

const publicMingcuteWithoutViewBox = publicIconIndex.icons.find((entry) => (
  entry.lib === 'mingcute' && entry.svg && !/\sviewBox=/i.test(entry.svg)
));
assert(publicMingcuteWithoutViewBox, 'Expected at least one public Mingcute SVG without a viewBox fixture');
const mingcuteOutput = buildMotionLabAnimatedSvg({
  svg: publicMingcuteWithoutViewBox.svg,
  presetId: 'pulse',
  trigger: 'loop',
  durationMs: 700,
  intensityPercent: 100,
  color: '#ff5c00',
});
assert(/\sviewBox="0 0 24 24"/i.test(mingcuteOutput), 'Mingcute no-viewBox export did not receive a fallback viewBox');

for (const malformedSvg of ['not svg', '<svg><path', '<div></div>']) {
  try {
    buildMotionLabAnimatedSvg({
      svg: malformedSvg,
      presetId: 'pulse',
      trigger: 'loop',
      durationMs: 700,
      intensityPercent: 100,
      color: '#ff5c00',
    });
    throw new Error(`Malformed SVG unexpectedly rendered: ${malformedSvg}`);
  } catch (error) {
    assert(
      error.message.includes('valid inline SVG markup'),
      `Malformed SVG returned unexpected error: ${error.message}`
    );
  }
}

console.log('Motion Lab stroke safety smoke passed.');
