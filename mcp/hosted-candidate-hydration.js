function normalizeKeyPart(value) {
  return String(value || '').trim().toLowerCase();
}

function parseHostedIdentity(row) {
  if (!row?.icon_id) return null;
  const [libraryFromId, ...idParts] = String(row.icon_id).split(':');
  const library = row.library || row.source_library || libraryFromId;
  const id = idParts.join(':') || row.id || row.name;
  if (!library || !id) return null;
  return { library: String(library), id: String(id) };
}

export function createHostedIconHydrator(localIcons = []) {
  const iconsByIdentity = new Map();
  for (const icon of localIcons) {
    if (!icon?.lib || !icon?.id) continue;
    const key = `${normalizeKeyPart(icon.lib)}:${normalizeKeyPart(icon.id)}`;
    const matches = iconsByIdentity.get(key) || [];
    matches.push(icon);
    iconsByIdentity.set(key, matches);
  }

  return function buildHostedIcon(row) {
    const identity = parseHostedIdentity(row);
    if (!identity) return null;

    const key = `${normalizeKeyPart(identity.library)}:${normalizeKeyPart(identity.id)}`;
    const localMatches = iconsByIdentity.get(key) || [];
    const requestedStyle = normalizeKeyPart(row.style || 'outline');
    const localIcon = localMatches.find((icon) => normalizeKeyPart(icon.style) === requestedStyle)
      || localMatches.find((icon) => normalizeKeyPart(icon.style) === 'outline')
      || localMatches[0]
      || null;
    const svg = row.svg || localIcon?.svg || null;
    if (!svg && normalizeKeyPart(identity.library) !== 'material') return null;
    const resolvedStyle = row.svg
      ? row.style || localIcon?.style || 'outline'
      : localIcon?.style || row.style || 'outline';

    return {
      id: identity.id,
      name: row.name || localIcon?.name || identity.id.replace(/[-_]/g, ' '),
      lib: identity.library,
      type: row.icon_type || localIcon?.type || 'svg',
      style: resolvedStyle,
      svg,
      semantic: row.semantic || localIcon?.semantic || null,
      premium: false,
      hosted: true,
    };
  };
}
