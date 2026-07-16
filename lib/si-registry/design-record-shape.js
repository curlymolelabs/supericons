// Design-record shape for the icon design workflow (Ring 0 of the v2 plan).
// A design record is the pre-registry artifact for an icon: it carries the
// reasoning between `purpose` and `depicts` (mind map, communication contract,
// distinctness constraints, construction recipe) plus the community staging
// pool. On promotion, its public fields project into a registry record
// (see record-shape.js); gated fields stay behind the paid tier.

export const DESIGN_STATES = Object.freeze([
  'metaphor_proposed',
  'metaphor_approved',
  'shape_drawn',
  'shape_approved',
  'render_approved',
]);

export const REQUIRED_DESIGN_FIELDS = Object.freeze([
  'icon_id',
  'label',
  'pack_id',
  'version',
  'design_state',
  'face',
  'soul',
  'pulse',
]);

export const OPTIONAL_DESIGN_FIELDS = Object.freeze([
  'hands',
  'wallet',
  'construction',
  'external_comments',
  'evidence',
  'editorial_notes',
]);

// Tier projection: which parts of a design record each audience sees.
// public: the free core (discovery, search, basic use).
// gated: the paid design-intelligence extension (adapt, remix, rebuild).
// internal: never projected; raw staging data awaiting distillation.
export const PUBLIC_DESIGN_PATHS = Object.freeze([
  'icon_id', 'label', 'pack_id', 'version', 'design_state',
  'face.depicts', 'face.variants[].depicts', 'face.style_renders',
  'soul.purpose', 'soul.semantic_tags', 'soul.mindmap.synonyms',
  'pulse.motion.has_motion', 'pulse.motion.behavior',
]);

export const GATED_DESIGN_PATHS = Object.freeze([
  'soul.must_communicate', 'soul.mindmap.associations',
  'soul.mindmap.metaphor_candidates', 'soul.mindmap.anti_associations',
  'soul.distinct_from', 'construction', 'pulse.motion.spec',
  'hands', 'wallet',
]);

export const INTERNAL_DESIGN_PATHS = Object.freeze([
  'external_comments', 'evidence', 'editorial_notes',
]);

function fail(msg) { throw new Error(msg); }

function assertNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) fail(`Missing or invalid ${field}`);
}

function assertStringArray(value, field) {
  if (!Array.isArray(value) || value.length === 0 || value.some((v) => typeof v !== 'string' || v.trim().length === 0)) {
    fail(`Missing or invalid ${field}`);
  }
}

function assertObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`Missing or invalid ${field}`);
}

const METAPHOR_KINDS = Object.freeze(['human_convention', 'device_convention', 'agent_native']);
const METAPHOR_VERDICTS = Object.freeze(['chosen', 'candidate', 'rejected', 'reserved']);
const COMMENT_STATUSES = Object.freeze(['raw', 'distilled', 'promoted', 'discarded']);

export function validateDesignRecord(record) {
  assertObject(record, 'design record');

  for (const field of REQUIRED_DESIGN_FIELDS) {
    if (!(field in record)) fail(`Missing required field: ${field}`);
  }
  for (const field of ['icon_id', 'label', 'pack_id', 'version', 'design_state']) {
    assertNonEmptyString(record[field], field);
  }
  if (!record.icon_id.startsWith('si:')) fail(`icon_id must start with "si:": ${record.icon_id}`);
  if (!DESIGN_STATES.includes(record.design_state)) fail(`Invalid design_state: ${record.design_state}`);

  // face: the visual. Either a single depicts or variants awaiting a pick.
  assertObject(record.face, 'face');
  const hasDepicts = typeof record.face.depicts === 'string' && record.face.depicts.trim().length > 0;
  const hasVariants = Array.isArray(record.face.variants) && record.face.variants.length > 0;
  if (!hasDepicts && !hasVariants) fail('face requires depicts or variants');
  if (hasVariants) {
    for (const v of record.face.variants) {
      assertObject(v, 'face.variants[]');
      assertNonEmptyString(v.id, 'face.variants[].id');
      assertNonEmptyString(v.depicts, 'face.variants[].depicts');
    }
  }
  if ('style_renders' in record.face) assertStringArray(record.face.style_renders, 'face.style_renders');

  // soul: purpose, communication contract, mind map, distinctness.
  assertObject(record.soul, 'soul');
  assertNonEmptyString(record.soul.purpose, 'soul.purpose');
  assertStringArray(record.soul.semantic_tags, 'soul.semantic_tags');
  assertObject(record.soul.must_communicate, 'soul.must_communicate');
  for (const field of ['actor', 'action', 'direction', 'intensity']) {
    assertNonEmptyString(record.soul.must_communicate[field], `soul.must_communicate.${field}`);
  }
  assertObject(record.soul.mindmap, 'soul.mindmap');
  assertStringArray(record.soul.mindmap.synonyms, 'soul.mindmap.synonyms');
  assertStringArray(record.soul.mindmap.associations, 'soul.mindmap.associations');
  assertStringArray(record.soul.mindmap.anti_associations, 'soul.mindmap.anti_associations');
  if (!Array.isArray(record.soul.mindmap.metaphor_candidates) || record.soul.mindmap.metaphor_candidates.length === 0) {
    fail('Missing or invalid soul.mindmap.metaphor_candidates');
  }
  let chosenCount = 0;
  for (const c of record.soul.mindmap.metaphor_candidates) {
    assertObject(c, 'metaphor_candidates[]');
    if (!METAPHOR_KINDS.includes(c.kind)) fail(`Invalid metaphor kind: ${c.kind}`);
    assertNonEmptyString(c.idea, 'metaphor_candidates[].idea');
    if (!METAPHOR_VERDICTS.includes(c.verdict)) fail(`Invalid metaphor verdict: ${c.verdict}`);
    assertNonEmptyString(c.reason, 'metaphor_candidates[].reason');
    if (c.verdict === 'chosen') chosenCount += 1;
  }
  const pastMetaphorGate = record.design_state !== 'metaphor_proposed';
  if (pastMetaphorGate && chosenCount !== 1) {
    fail(`design_state ${record.design_state} requires exactly one chosen metaphor, found ${chosenCount}`);
  }
  if (!Array.isArray(record.soul.distinct_from)) fail('Missing or invalid soul.distinct_from');
  for (const d of record.soul.distinct_from) {
    assertObject(d, 'distinct_from[]');
    assertNonEmptyString(d.icon_id, 'distinct_from[].icon_id');
    assertNonEmptyString(d.differentiator, 'distinct_from[].differentiator');
  }

  // pulse: state and motion.
  assertObject(record.pulse, 'pulse');
  assertObject(record.pulse.motion, 'pulse.motion');
  if (typeof record.pulse.motion.has_motion !== 'boolean') fail('Invalid pulse.motion.has_motion');

  // staging pool.
  if ('external_comments' in record) {
    if (!Array.isArray(record.external_comments)) fail('Invalid external_comments');
    for (const c of record.external_comments) {
      assertObject(c, 'external_comments[]');
      assertNonEmptyString(c.author, 'external_comments[].author');
      assertNonEmptyString(c.date, 'external_comments[].date');
      assertNonEmptyString(c.body, 'external_comments[].body');
      if (!COMMENT_STATUSES.includes(c.status)) fail(`Invalid comment status: ${c.status}`);
    }
  }

  if ('evidence' in record) assertStringArray(record.evidence, 'evidence');

  if ('revision_history' in record) {
    if (!Array.isArray(record.revision_history)) fail('Invalid revision_history');
    for (const rev of record.revision_history) {
      assertObject(rev, 'revision_history[]');
      if (typeof rev.round !== 'number') fail('Invalid revision_history[].round');
      assertNonEmptyString(rev.change, 'revision_history[].change');
      assertNonEmptyString(rev.verdict, 'revision_history[].verdict');
      assertNonEmptyString(rev.taught_us, 'revision_history[].taught_us');
    }
  }

  return record;
}

// ---------------------------------------------------------------------------
// Pack design record: the shared law (grammar, territory, style, motion,
// craft rules) that individual icon records inherit. See docs/si-v2.

export const REQUIRED_PACK_FIELDS = Object.freeze([
  'pack_id',
  'name',
  'version',
  'status',
  'member_ids',
  'design_language',
]);

const PACK_STATUSES = Object.freeze(['draft', 'active', 'retired']);

export function validatePackRecord(pack) {
  assertObject(pack, 'pack record');
  for (const field of REQUIRED_PACK_FIELDS) {
    if (!(field in pack)) fail(`Missing required pack field: ${field}`);
  }
  for (const field of ['pack_id', 'name', 'version', 'status']) {
    assertNonEmptyString(pack[field], field);
  }
  if (!PACK_STATUSES.includes(pack.status)) fail(`Invalid pack status: ${pack.status}`);
  assertStringArray(pack.member_ids, 'member_ids');

  const dl = pack.design_language;
  assertObject(dl, 'design_language');

  assertObject(dl.grammar, 'design_language.grammar');
  if (!Array.isArray(dl.grammar.tokens) || dl.grammar.tokens.length === 0) fail('Missing grammar.tokens');
  for (const t of dl.grammar.tokens) {
    assertObject(t, 'grammar.tokens[]');
    assertNonEmptyString(t.rule, 'grammar.tokens[].rule');
    assertNonEmptyString(t.meaning, 'grammar.tokens[].meaning');
  }

  assertObject(dl.territory_map, 'design_language.territory_map');
  if (!Array.isArray(dl.territory_map.claims) || dl.territory_map.claims.length === 0) fail('Missing territory_map.claims');
  for (const c of dl.territory_map.claims) {
    assertObject(c, 'territory_map.claims[]');
    assertNonEmptyString(c.zone, 'territory_map.claims[].zone');
    assertNonEmptyString(c.owner_si_id, 'territory_map.claims[].owner_si_id');
  }

  assertObject(dl.style_tokens, 'design_language.style_tokens');
  assertObject(dl.motion_language, 'design_language.motion_language');

  if (!Array.isArray(dl.craft_rules) || dl.craft_rules.length === 0) fail('Missing craft_rules');
  for (const r of dl.craft_rules) {
    assertObject(r, 'craft_rules[]');
    assertNonEmptyString(r.id, 'craft_rules[].id');
    assertNonEmptyString(r.rule, 'craft_rules[].rule');
    assertNonEmptyString(r.origin, 'craft_rules[].origin');
  }

  return pack;
}
