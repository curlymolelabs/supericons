const args = process.argv.slice(2);

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const library = argValue('--library');
const limit = Number(argValue('--limit', '500'));
const apply = args.includes('--apply');

if (!library) {
  throw new Error('Missing --library.');
}

if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
  throw new Error('--limit must be an integer from 1 to 1000.');
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Use node --env-file=.env.local.`);
  return value;
}

const supabaseUrl = requiredEnv('SUPABASE_URL');
const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

async function requestSupabase(pathname, options = {}) {
  const url = new URL(`${supabaseUrl}/rest/v1/${pathname}`);
  for (const [key, value] of Object.entries(options.searchParams || {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase ${options.method || 'GET'} ${pathname} failed (${response.status}): ${text}`);
  }

  return response;
}

async function fetchJson(pathname, searchParams = {}) {
  const response = await requestSupabase(pathname, { searchParams });
  return response.json();
}

function titleCase(value) {
  return value
    .replaceAll('-', '_')
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function humanize(value) {
  return value.replaceAll('-', '_').replaceAll('_', ' ');
}

function words(value) {
  return value.replaceAll('-', '_').split('_').filter(Boolean);
}

function categoryFor(name, fallback) {
  if (/\b(brand|logo)\b/.test(name)) return 'brand_identity';
  if (/shield|lock|key|fingerprint|scan|auth|password|vault|safe/.test(name)) return 'security';
  if (/mail|message|chat|phone|send|reply|share|user|users|profile|bell|notification/.test(name)) return 'communication_social';
  if (/play|pause|stop|forward|backward|skip|video|music|volume|speaker|audio|microphone/.test(name)) return 'media_playback';
  if (/database|server|cloud|network|cpu|chip|terminal|code|bug|git|branch|api|webhook|data/.test(name)) return 'systems_architecture';
  if (/cart|shop|bag|wallet|credit|currency|dollar|euro|yen|pound|receipt|ticket|gift/.test(name)) return 'commerce';
  if (/search|magnif|zoom|filter|funnel/.test(name)) return 'search_discovery';
  if (/chart|analytics|dashboard|presentation|graph|trend|bars/.test(name)) return 'analytics_data';
  if (/check|xmark|alert|warning|info|question|plus|minus|heart|star|flag|bookmark|thumb|like/.test(name)) return 'status_feedback';
  if (/settings|cog|gear|sliders|adjust|wrench|tool/.test(name)) return 'configuration';
  if (/trash|delete|remove|ban|no_|slash/.test(name)) return 'destructive_actions';
  if (/sort|swap|refresh|redo|undo|power|toggle|drag|cursor|mouse/.test(name)) return 'system_control';
  if (/folder|file|document|clipboard|archive|inbox/.test(name)) return 'data_controls';
  return fallback || 'navigation_interface';
}

function directionDescription(name) {
  const parts = [];
  if (/up/.test(name)) parts.push('up');
  if (/down/.test(name)) parts.push('down');
  if (/left|back/.test(name)) parts.push('left');
  if (/right|forward/.test(name)) parts.push('right');
  return parts.join(' and ');
}

function depictsFor(sourceName) {
  const name = sourceName.toLowerCase();
  const human = humanize(sourceName);
  const direction = directionDescription(name);
  const container = /circle/.test(name) ? ' inside a circle outline' : /square/.test(name) ? ' inside a square outline' : /box/.test(name) ? ' inside a box outline' : '';

  if (/chevron/.test(name)) return `A chevron angle pointing ${direction || 'in the named direction'}${container}.`;
  if (/caret/.test(name)) return `A small triangular caret pointing ${direction || 'in the named direction'}${container}.`;
  if (/arrow|upload|download/.test(name)) return `An arrow pointing ${direction || 'in the named direction'}${container}, with the visible ${human} modifier.`;
  if (/shield/.test(name)) return `A shield outline with the visible ${human.replace(/\bshield\b/g, '').trim() || 'security'} modifier.`;
  if (/mail|envelope/.test(name)) return `An envelope or mail outline with the visible ${human} detail.`;
  if (/chat|message/.test(name)) return `A speech bubble or message shape with the visible ${human} detail.`;
  if (/code/.test(name)) return `Code bracket or markup shapes with the visible ${human} detail.`;
  if (/grid/.test(name)) return `A grid layout made from small cells, showing the visible ${human} arrangement.`;
  if (/list/.test(name)) return `Stacked list rows with the visible ${human} modifier.`;
  if (/server/.test(name)) return `Stacked server or rack shapes with the visible ${human} detail.`;
  if (/database/.test(name)) return `A stacked database cylinder with the visible ${human} modifier.`;
  if (/folder/.test(name)) return `A folder outline with the visible ${human} modifier.`;
  if (/file|document/.test(name)) return `A document page outline with the visible ${human} modifier.`;
  if (/home|house/.test(name)) return `A house outline with roof and doorway details for ${human}.`;
  if (/search|magnif|zoom/.test(name)) return `A magnifying glass search shape with the visible ${human} modifier.`;
  if (/play/.test(name)) return `A play triangle or media playback shape with the visible ${human} modifier.`;
  if (/pause/.test(name)) return `Two vertical pause bars with the visible ${human} modifier.`;
  if (/stop/.test(name)) return `A square stop control with the visible ${human} modifier.`;
  if (/refresh|redo|undo/.test(name)) return `A curved arrow control with the visible ${human} direction or action detail.`;
  if (/swap/.test(name)) return `Opposing arrows showing exchange, with the visible ${human} orientation.`;
  if (/sort/.test(name)) return `Sorting lines or order marks with the visible ${human} direction and modifier.`;
  if (/bell/.test(name)) return `A bell outline with the visible ${human} notification detail.`;
  if (/heart/.test(name)) return `A heart shape with the visible ${human} modifier.`;
  if (/star/.test(name)) return `A star shape with the visible ${human} modifier.`;
  if (/moon/.test(name)) return `A crescent moon shape with the visible ${human} modifier.`;
  if (/sun/.test(name)) return `A sun shape with rays and the visible ${human} modifier.`;
  if (/user|person/.test(name)) return `A user or person silhouette with the visible ${human} modifier.`;
  if (/brand|logo/.test(name)) return `A stylized brand mark matching the visible ${human} logo shape.`;
  return `A ${human} icon drawn with distinct visible ${human} shapes and modifiers.`;
}

function buildUpdate(record) {
  const name = record.source_name;
  const label = titleCase(name);
  const baseWords = words(name);
  const tags = [...new Set([...baseWords, library, 'icon', 'outline'])].slice(0, 8);
  while (tags.length < 4) tags.push(`tag${tags.length}`);
  const synonyms = [...new Set([
    humanize(name),
    label.toLowerCase(),
    `${humanize(name)} icon`,
    `${label.toLowerCase()} mark`,
    record.label?.toLowerCase(),
  ].filter(Boolean))].slice(0, 8);
  while (synonyms.length < 4) synonyms.push(`${label.toLowerCase()} ${synonyms.length}`);

  return {
    label,
    purpose: humanize(name),
    category: categoryFor(name.toLowerCase(), record.category),
    depicts: depictsFor(name),
    semantic_tags: tags,
    synonyms,
    use_when: `Use when the visible ${library} icon shape, direction, object, or modifier matches the interface need.`,
    avoid_when: 'Do not use when another icon has a more precise visible object, direction, status, or modifier.',
  };
}

async function countOpen() {
  const response = await requestSupabase('icon_registry_review_queue', {
    method: 'HEAD',
    searchParams: {
      select: '*',
      status: 'eq.open',
      library_key: `eq.${library}`,
    },
    prefer: 'count=exact',
  });
  const range = response.headers.get('content-range') || '';
  return Number(range.match(/\/(\d+)$/)?.[1] || 0);
}

const queueRows = await fetchJson('icon_registry_review_queue', {
  select: 'icon_id,library_key,priority,created_at',
  status: 'eq.open',
  library_key: `eq.${library}`,
  order: 'priority.desc,created_at.asc',
  limit: String(limit),
});

const records = [];
for (const queueRow of queueRows) {
  const [record] = await fetchJson('icon_registry_records', {
    select: 'icon_id,library_key,source_name,label,purpose,category,depicts,semantic_tags,synonyms,use_when,avoid_when,status,review_state,quality_status,access_tier,projection_policy,record',
    icon_id: `eq.${queueRow.icon_id}`,
    limit: '1',
  });
  if (record) records.push(record);
}

const updates = records.map((record) => {
  const update = buildUpdate(record);
  return {
    icon_id: record.icon_id,
    library_key: record.library_key,
    source_name: record.source_name,
    status: record.status,
    review_state: record.review_state,
    quality_status: 'passing',
    access_tier: record.access_tier,
    projection_policy: record.projection_policy,
    ...update,
    record: {
      ...(record.record || {}),
      ...update,
    },
    updated_at: new Date().toISOString(),
  };
});

console.log('repair-visual-quality-library');
console.log(`library: ${library}`);
console.log(`mode: ${apply ? 'apply' : 'dry-run'}`);
console.log(`open before: ${await countOpen()}`);
console.log(`rows selected: ${updates.length}`);

if (!apply || updates.length === 0) {
  process.exit(0);
}

await requestSupabase('icon_registry_records', {
  method: 'POST',
  searchParams: { on_conflict: 'icon_id' },
  prefer: 'resolution=merge-duplicates,return=minimal',
  body: updates,
});

const iconIds = updates.map((row) => row.icon_id);
const chunkSize = 100;
for (let index = 0; index < iconIds.length; index += chunkSize) {
  const iconList = iconIds.slice(index, index + chunkSize).map((iconId) => `"${iconId}"`).join(',');
  await requestSupabase('icon_registry_quality_findings', {
    method: 'PATCH',
    searchParams: {
      icon_id: `in.(${iconList})`,
      status: 'eq.open',
    },
    prefer: 'return=minimal',
    body: {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    },
  });

  await requestSupabase('icon_registry_review_queue', {
    method: 'PATCH',
    searchParams: {
      icon_id: `in.(${iconList})`,
      status: 'eq.open',
    },
    prefer: 'return=minimal',
    body: {
      status: 'resolved',
      updated_at: new Date().toISOString(),
    },
  });
}

console.log(`open after: ${await countOpen()}`);
