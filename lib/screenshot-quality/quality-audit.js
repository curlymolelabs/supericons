const BANNED_PHRASES = [
  'outline centered as the main',
  'main icon form',
  'official brand symbol',
  'logo mark centered as the official brand symbol',
];

const MODIFIER_REQUIREMENTS = [
  { pattern: /(^|_)off($|_)/, required: /(slash|off|diagonal|crossed|disabled)/i, code: 'missing_off_visual' },
  { pattern: /(^|_)add($|_)/, required: /(plus|add)/i, code: 'missing_add_visual' },
  { pattern: /(^|_)x($|_)/, required: /(x|cross|close|slash)/i, code: 'missing_x_visual' },
  { pattern: /(^|_)ai($|_)/, required: /(spark|star|ai|assistant)/i, code: 'missing_ai_visual' },
  { pattern: /(^|_)rotate($|_)/, required: /(rotate|circular arrow|arrow)/i, code: 'missing_rotate_visual' },
  { pattern: /(^|_)time($|_)/, required: /(clock|time|plus)/i, code: 'missing_time_visual' },
  { pattern: /(^|_)month($|_)/, required: /(dot|grid|month|row)/i, code: 'missing_month_visual' },
  { pattern: /(^|_)day($|_)/, required: /(day|card|panel|line|box|number)/i, code: 'missing_day_visual' },
  { pattern: /(^|_)week($|_)/, required: /(week|row|bar|line)/i, code: 'missing_week_visual' },
];

function issue({ severity = 'blocker', code, icon_id, message }) {
  return { severity, code, icon_id, message };
}

function baseFamily(sourceName) {
  return sourceName
    .replace(/_(add|off|x|ai|rotate|time|month|day|week)$/g, '')
    .replace(/_[0-9]+$/g, '');
}

export function auditFinalRecords({ records }) {
  const issues = [];

  for (const record of records) {
    const depicts = String(record.depicts || '').trim();
    const lowerDepicts = depicts.toLowerCase();

    if (!depicts) {
      issues.push(
        issue({
          code: 'missing_depicts',
          icon_id: record.icon_id,
          message: 'depicts is empty',
        })
      );
      continue;
    }

    if (depicts.length < 18) {
      issues.push(
        issue({
          code: 'too_short_depicts',
          icon_id: record.icon_id,
          message: 'depicts is too short to be visually useful',
        })
      );
    }

    for (const phrase of BANNED_PHRASES) {
      if (lowerDepicts.includes(phrase)) {
        issues.push(
          issue({
            code: 'banned_phrase',
            icon_id: record.icon_id,
            message: `depicts includes banned phrase "${phrase}"`,
          })
        );
      }
    }

    for (const rule of MODIFIER_REQUIREMENTS) {
      if (rule.pattern.test(record.source_name) && !rule.required.test(depicts)) {
        issues.push(
          issue({
            code: rule.code,
            icon_id: record.icon_id,
            message: `source_name contains a modifier but depicts does not mention the visible ${rule.code.replace('missing_', '').replace('_visual', '')} cue`,
          })
        );
      }
    }
  }

  const byDepicts = new Map();
  for (const record of records) {
    const key = String(record.depicts || '').trim().toLowerCase();
    if (!key) continue;
    if (!byDepicts.has(key)) {
      byDepicts.set(key, []);
    }
    byDepicts.get(key).push(record);
  }

  for (const sameDepictsRecords of byDepicts.values()) {
    if (sameDepictsRecords.length < 2) continue;
    const families = new Set(sameDepictsRecords.map((record) => baseFamily(record.source_name)));
    const hasModifier = sameDepictsRecords.some((record) =>
      /_(add|off|x|ai|rotate|time|month|day|week|[0-9]+)$/.test(record.source_name)
    );
    if (families.size === 1 && hasModifier) {
      for (const record of sameDepictsRecords) {
        issues.push(
          issue({
            code: 'duplicate_depicts_modifier_family',
            icon_id: record.icon_id,
            message: `depicts is repeated across modifier variants in the ${[...families][0]} family`,
          })
        );
      }
    }
  }

  return issues;
}
