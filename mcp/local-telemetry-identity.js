import { randomUUID } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  unlink,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const INSTALL_FILE_VERSION = 1;
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_INSTALL_FILE_BYTES = 4096;
const CONCURRENT_READ_ATTEMPTS = 8;

export function resolveSupericonsConfigDir({
  env = process.env,
  platform = process.platform,
  home = homedir(),
} = {}) {
  const override = String(env.SUPERICONS_CONFIG_DIR || '').trim();
  if (override) return resolve(override);

  if (platform === 'win32') {
    const appData = String(env.APPDATA || '').trim();
    return resolve(appData || join(home, 'AppData', 'Roaming'), 'Supericons');
  }
  if (platform === 'darwin') {
    return resolve(home, 'Library', 'Application Support', 'Supericons');
  }
  const xdgConfigHome = String(env.XDG_CONFIG_HOME || '').trim();
  return resolve(xdgConfigHome || join(home, '.config'), 'supericons');
}

export function getLocalTelemetryInstallPath(options = {}) {
  return join(resolveSupericonsConfigDir(options), 'install.json');
}

function parseInstallFile(source) {
  if (Buffer.byteLength(source, 'utf8') > MAX_INSTALL_FILE_BYTES) return null;
  try {
    const value = JSON.parse(source);
    if (
      Number(value?.version) !== INSTALL_FILE_VERSION
      || !UUID_V4_PATTERN.test(String(value?.installation_id || ''))
    ) {
      return null;
    }
    return String(value.installation_id).toLowerCase();
  } catch {
    return null;
  }
}

async function readPersistedInstallationId(filePath) {
  try {
    const source = await readFile(filePath, 'utf8');
    return parseInstallFile(source);
  } catch {
    return null;
  }
}

export async function getOrCreateLocalTelemetryInstallationId({
  filePath = getLocalTelemetryInstallPath(),
  createUuid = randomUUID,
} = {}) {
  const existing = await readPersistedInstallationId(filePath);
  if (existing) return existing;

  const candidate = String(createUuid()).toLowerCase();
  if (!UUID_V4_PATTERN.test(candidate)) return null;

  let handle = null;
  let createdFile = false;
  try {
    await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
    handle = await open(filePath, 'wx', 0o600);
    createdFile = true;
    await handle.writeFile(`${JSON.stringify({
      version: INSTALL_FILE_VERSION,
      installation_id: candidate,
    }, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    return candidate;
  } catch (error) {
    if (handle) {
      try {
        await handle.close();
      } catch {
        // A failed close cannot affect search.
      }
    }
    if (createdFile) {
      try {
        await unlink(filePath);
      } catch {
        // A later run will safely retry or reject an incomplete file.
      }
      return null;
    }
    if (error?.code !== 'EEXIST') return null;
  }

  for (let attempt = 0; attempt < CONCURRENT_READ_ATTEMPTS; attempt += 1) {
    const winner = await readPersistedInstallationId(filePath);
    if (winner) return winner;
    await delay(10);
  }
  return null;
}
