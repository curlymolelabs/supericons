import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { searchIcons } from '../mcp/search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readJson(relativePath) {
  const absolutePath = path.join(__dirname, '..', relativePath);
  return JSON.parse(await fs.readFile(absolutePath, 'utf8'));
}

function iconId(icon) {
  return `${icon.lib}:${icon.id}`;
}

const { icons } = await readJson('public/icon-index.json');
const synonyms = await readJson('public/synonyms.json');

const fixtures = [
  {
    query: 'self-hosted',
    topN: 8,
    requiredFirst: 'heroicons:server-stack',
    requiredIncluded: [
      'lucide:server',
      'tabler:server',
      'material:home_storage',
    ],
  },
  {
    query: 'on-prem',
    topN: 8,
    requiredFirst: 'heroicons:server-stack',
    requiredIncluded: [
      'lucide:server',
      'tabler:server',
    ],
  },
  {
    query: 'self managed',
    topN: 8,
    requiredFirst: 'heroicons:server-stack',
    requiredIncluded: [
      'lucide:server',
    ],
  },
  {
    query: 'latency',
    topN: 8,
    requiredFirst: 'lucide:timer',
    requiredIncluded: [
      'material:network_ping',
      'tabler:gauge',
    ],
  },
  {
    query: 'hallucination',
    topN: 8,
    requiredFirst: 'lucide:bot-off',
    requiredIncluded: [
      'tabler:robot-off',
      'lucide:alert-triangle',
      'material:robot',
    ],
  },
  {
    query: 'hallucinate',
    topN: 8,
    requiredFirst: 'lucide:bot-off',
    requiredIncluded: [
      'tabler:robot-off',
      'lucide:alert-triangle',
    ],
  },
  {
    query: 'worktree',
    topN: 8,
    requiredFirst: 'lucide:folder-git-2',
    requiredIncluded: [
      'lucide:git-branch',
      'tabler:git-branch',
      'material:account_tree',
    ],
  },
  {
    query: 'ai drifting',
    topN: 8,
    requiredFirst: 'lucide:brain-circuit',
    requiredIncluded: [
      'material:compare_arrows',
      'material:model_training',
      'tabler:brain',
    ],
  },
];

let failed = false;

for (const fixture of fixtures) {
  const results = searchIcons(fixture.query, icons, synonyms, { limit: fixture.topN });
  const ids = results.map(iconId);

  if (ids[0] !== fixture.requiredFirst) {
    failed = true;
    console.error(`[FAIL] ${fixture.query}: expected first result ${fixture.requiredFirst}, got ${ids[0] || '(none)'}`);
  }

  const missing = fixture.requiredIncluded.filter((id) => !ids.includes(id));
  if (missing.length > 0) {
    failed = true;
    console.error(`[FAIL] ${fixture.query}: missing ${missing.join(', ')} in top ${fixture.topN}`);
    console.error(`       got: ${ids.join(', ')}`);
    continue;
  }

  console.log(`[PASS] ${fixture.query}: ${ids.join(', ')}`);
}

if (failed) process.exit(1);
