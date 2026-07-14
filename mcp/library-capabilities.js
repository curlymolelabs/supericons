export function countIconsByLibrary(icons = []) {
  const counts = {};
  for (const icon of icons) {
    if (!icon?.lib) continue;
    counts[icon.lib] = (counts[icon.lib] || 0) + 1;
  }
  return counts;
}

export function buildLibraryCapability(
  id,
  {
    outlineCounts = {},
    solidCounts = {},
    materialUsesOutlineForSolid = false,
  } = {},
) {
  const outlineCount = Number(outlineCounts[id] || 0);
  const solidCount = id === 'material' && materialUsesOutlineForSolid
    ? outlineCount
    : Number(solidCounts[id] || 0);

  return {
    count: outlineCount,
    outlineCount,
    solidCount,
    supportedStyles: solidCount > 0 ? ['outline', 'solid'] : ['outline'],
  };
}
