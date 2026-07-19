const STYLE_TOKENS = new Map([
  ['solid', 'solid'],
  ['filled', 'solid'],
  ['fill', 'solid'],
  ['outline', 'outline'],
  ['outlined', 'outline'],
]);

const CONSTRAINT_PATTERNS = [
  {
    pattern: /\bvisually\s+distinct\b/gi,
    label: 'visually distinct',
  },
  {
    pattern: /\b\d+(?:\.\d+)?\s*(?:px|pt|rem|em)\b/gi,
    label: 'size',
  },
];

function cleanQuery(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^[,;:.\s]+|[,;:.\s]+$/g, '')
    .trim();
}

export function normalizeSearchQueryRequest(query, style = 'any') {
  const originalQuery = cleanQuery(query);
  let normalizedQuery = originalQuery;
  const removedConstraints = [];

  for (const { pattern, label } of CONSTRAINT_PATTERNS) {
    if (!pattern.test(normalizedQuery)) continue;
    pattern.lastIndex = 0;
    normalizedQuery = normalizedQuery.replace(pattern, ' ');
    removedConstraints.push(label);
  }

  let normalizedStyle = style;
  let inferredStyle = null;
  normalizedQuery = normalizedQuery.replace(/\b(solid|filled|fill|outline|outlined)\b/gi, (match, token, offset, source) => {
    const lowerToken = String(token).toLowerCase();
    if (
      lowerToken === 'solid'
      && /\bsolid\s+state\b/i.test(source.slice(Math.max(0, offset - 1), offset + match.length + 7))
    ) {
      return match;
    }
    const candidateStyle = STYLE_TOKENS.get(lowerToken);
    if (!inferredStyle) inferredStyle = candidateStyle;
    return ' ';
  });

  normalizedQuery = cleanQuery(normalizedQuery);
  if (normalizedStyle === 'any' && inferredStyle) normalizedStyle = inferredStyle;
  const constraintOnly = !normalizedQuery && Boolean(originalQuery);
  if (constraintOnly) normalizedQuery = originalQuery;

  return {
    original_query: originalQuery,
    query: normalizedQuery,
    style: normalizedStyle,
    inferred_style: style === 'any' ? inferredStyle : null,
    removed_constraints: removedConstraints,
    constraint_only: constraintOnly,
    changed: normalizedQuery !== originalQuery || normalizedStyle !== style,
  };
}
