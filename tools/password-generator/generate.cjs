#!/usr/bin/env node
/**
 * Secure Password Generator - Terminal Edition
 * Uses Node.js crypto.randomBytes() (CSPRNG, same source as OpenSSL).
 * Zero npm dependencies. Nothing is written to disk. History dies on exit.
 * Run: node generate.js
 */

'use strict';

const crypto   = require('crypto');
const readline = require('readline');
const { execSync } = require('child_process');

// ─── Charsets ───────────────────────────────────────────────────────────────
const UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER   = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS  = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';

// ─── ANSI color helpers ──────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  // foreground
  white:  '\x1b[97m',
  cyan:   '\x1b[96m',
  green:  '\x1b[92m',
  yellow: '\x1b[93m',
  red:    '\x1b[91m',
  blue:   '\x1b[94m',
  magenta:'\x1b[95m',
  // background
  bgBlue: '\x1b[44m',
};

const dim  = (s) => `${C.dim}${s}${C.reset}`;
const bold = (s) => `${C.bold}${s}${C.reset}`;
const col  = (color, s) => `${color}${s}${C.reset}`;

// ─── CSPRNG with rejection sampling ─────────────────────────────────────────
function generatePassword(charset, length) {
  if (!charset.length) throw new Error('Empty charset');
  const charsetLen = charset.length;
  // Rejection boundary to eliminate modulo bias
  const limit = Math.floor(256 / charsetLen) * charsetLen;
  let result = '';
  // Over-generate buffer to minimize syscalls
  const bufSize = length * 4;
  while (result.length < length) {
    const buf = crypto.randomBytes(bufSize);
    for (let i = 0; i < buf.length && result.length < length; i++) {
      const byte = buf[i];
      if (byte < limit) {
        result += charset[byte % charsetLen];
      }
    }
  }
  return result;
}

// ─── Entropy & strength ──────────────────────────────────────────────────────
function entropyBits(charsetLen, length) {
  return Math.log2(Math.pow(charsetLen, length));
}

function crackTimeLabel(bits) {
  const sec = Math.pow(2, bits) / 1e12; // 1 trillion guesses/sec
  if (sec < 60)       return '<1 minute';
  if (sec < 3600)     return `${Math.round(sec / 60)} minutes`;
  if (sec < 86400)    return `${Math.round(sec / 3600)} hours`;
  if (sec < 31536e3)  return `${Math.round(sec / 86400)} days`;
  if (sec < 31536e6)  return `${Math.round(sec / 31536e3)} years`;
  if (sec < 31536e9)  return `${(sec / 31536e6).toFixed(0)}k years`;
  if (sec < 31536e12) return `${(sec / 31536e9).toFixed(0)}M years`;
  return '>> Universe age';
}

function strengthLabel(bits) {
  if (bits < 40)  return { label: 'VERY WEAK',   color: C.red };
  if (bits < 60)  return { label: 'WEAK',         color: C.yellow };
  if (bits < 80)  return { label: 'FAIR',         color: C.yellow };
  if (bits < 100) return { label: 'STRONG',       color: C.green };
  if (bits < 128) return { label: 'VERY STRONG',  color: C.cyan };
  return               { label: 'EXTREME',        color: C.magenta };
}

function strengthBar(bits) {
  const pct = Math.min(bits / 200, 1);
  const filled = Math.round(pct * 30);
  const bar = col(C.green, '█'.repeat(filled)) + col(C.dim, '░'.repeat(30 - filled));
  return `[${bar}]`;
}

// ─── Clipboard (Windows) ─────────────────────────────────────────────────────
function copyToClipboard(text) {
  try {
    // Use PowerShell Set-Clipboard - most reliable on Windows
    execSync(`powershell -NoProfile -Command "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"`);
    return true;
  } catch {
    try {
      // Fallback: pipe to clip.exe
      const { execFileSync } = require('child_process');
      const proc = require('child_process').spawnSync('clip', [], {
        input: text,
        encoding: 'utf8',
      });
      return proc.status === 0;
    } catch {
      return false;
    }
  }
}

// ─── Preset modes ────────────────────────────────────────────────────────────
const PRESETS = {
  1: {
    name:    'Custom',
    desc:    'You configure charset + length',
    charset: null,
    length:  32,
  },
  2: {
    name:    'Supabase-grade',
    desc:    'Upper + lower + digits + symbols, 32 chars (~197 bits)',
    charset: UPPER + LOWER + DIGITS + SYMBOLS,
    length:  32,
  },
  3: {
    name:    'Hex Secret',
    desc:    '64 hex chars = 256-bit (JWT signing key style)',
    charset: DIGITS + 'abcdef',
    length:  64,
  },
  4: {
    name:    'Base64url Secret',
    desc:    '43 Base64url chars ~= 256-bit (URL-safe token style)',
    charset: UPPER + LOWER + DIGITS + '-_',
    length:  43,
  },
  5: {
    name:    'Alphanumeric Only',
    desc:    'Upper + lower + digits, 32 chars (safe for env vars)',
    charset: UPPER + LOWER + DIGITS,
    length:  32,
  },
};

// ─── Display helpers ─────────────────────────────────────────────────────────
function clearScreen() {
  process.stdout.write('\x1Bc');
}

function printHeader() {
  console.log('');
  console.log(col(C.cyan, bold('  Secure Password Generator')));
  console.log(dim('  CSPRNG (crypto.randomBytes) -- zero network calls -- nothing written to disk'));
  console.log(col(C.dim, '  ' + '─'.repeat(60)));
}

function printPassword(pw, charset) {
  const bits = entropyBits(charset.length, pw.length);
  const st   = strengthLabel(bits);
  const bar  = strengthBar(bits);

  console.log('');
  console.log(col(C.dim, '  Generated password:'));
  console.log(col(C.cyan, bold(`  ${pw}`)));
  console.log('');
  console.log(`  ${bar}  ${col(st.color, bold(st.label))}`);
  console.log(dim(`  Entropy  : ${bits.toFixed(1)} bits`));
  console.log(dim(`  Charset  : ${charset.length} characters`));
  console.log(dim(`  Length   : ${pw.length} chars`));
  console.log(dim(`  Crack est: ${crackTimeLabel(bits)} @ 1T guesses/sec`));
  console.log('');
}

function printMenu() {
  console.log(col(C.dim, '  ' + '─'.repeat(60)));
  console.log(col(C.white, '  What would you like to do?'));
  console.log('');
  console.log(`  ${col(C.cyan, 'g')} ${dim('.')} Regenerate with same settings`);
  console.log(`  ${col(C.cyan, 'c')} ${dim('.')} Copy to clipboard`);
  console.log(`  ${col(C.cyan, 'n')} ${dim('.')} New password (choose preset)`);
  console.log(`  ${col(C.cyan, 'q')} ${dim('.')} Quit (history cleared)`);
  console.log('');
}

function printPresetMenu() {
  console.log('');
  console.log(col(C.white, '  Choose a preset:'));
  console.log('');
  for (const [key, preset] of Object.entries(PRESETS)) {
    const marker = key === '1' ? col(C.cyan, key) : col(C.cyan, key);
    console.log(`  ${marker}  ${bold(preset.name)}`);
    console.log(dim(`     ${preset.desc}`));
  }
  console.log('');
}

// ─── Custom charset builder ──────────────────────────────────────────────────
async function buildCustomCharset(rl) {
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log('');
  console.log(col(C.white, '  Configure your charset:'));

  const useUpper   = (await ask(`  Include uppercase A-Z? ${dim('[Y/n]')} `)).toLowerCase() !== 'n';
  const useLower   = (await ask(`  Include lowercase a-z? ${dim('[Y/n]')} `)).toLowerCase() !== 'n';
  const useDigits  = (await ask(`  Include digits 0-9?   ${dim('[Y/n]')} `)).toLowerCase() !== 'n';
  const useSymbols = (await ask(`  Include symbols?       ${dim('[Y/n]')} `)).toLowerCase() !== 'n';

  let charset = '';
  if (useUpper)   charset += UPPER;
  if (useLower)   charset += LOWER;
  if (useDigits)  charset += DIGITS;
  if (useSymbols) charset += SYMBOLS;

  if (!charset) {
    console.log(col(C.red, '  No charset selected. Defaulting to alphanumeric.'));
    charset = UPPER + LOWER + DIGITS;
  }

  const lenStr = await ask(`  Length (8-128)? ${dim('[32]')} `);
  let length = parseInt(lenStr, 10);
  if (isNaN(length) || length < 8)   length = 8;
  if (length > 128) length = 128;

  return { charset, length };
}

// ─── Main loop ───────────────────────────────────────────────────────────────
async function main() {
  clearScreen();
  printHeader();

  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
  });

  const ask = (q) => new Promise((res) => rl.question(q, res));

  let currentCharset = UPPER + LOWER + DIGITS + SYMBOLS;
  let currentLength  = 32;
  let currentPw      = '';

  // Initial preset selection
  printPresetMenu();
  const presetKey = await ask(`  ${col(C.cyan, 'Select preset')} ${dim('[2]')}: `);
  const preset = PRESETS[presetKey.trim() || '2'] || PRESETS[2];

  if (preset.charset) {
    currentCharset = preset.charset;
    currentLength  = preset.length;
  } else {
    const custom = await buildCustomCharset(rl);
    currentCharset = custom.charset;
    currentLength  = custom.length;
  }

  clearScreen();
  printHeader();

  // Generate first password
  currentPw = generatePassword(currentCharset, currentLength);
  printPassword(currentPw, currentCharset);

  // Action loop
  while (true) {
    printMenu();
    const action = (await ask(`  ${col(C.cyan, '>')} `)).trim().toLowerCase();

    if (action === 'q' || action === 'quit') {
      console.log('');
      console.log(dim('  Session ended. No passwords were saved to disk.'));
      console.log('');
      rl.close();
      process.exit(0);
    }

    if (action === 'g' || action === '') {
      currentPw = generatePassword(currentCharset, currentLength);
      clearScreen();
      printHeader();
      printPassword(currentPw, currentCharset);
      continue;
    }

    if (action === 'c') {
      const ok = copyToClipboard(currentPw);
      if (ok) {
        console.log(col(C.green, '  Copied to clipboard.'));
      } else {
        console.log(col(C.yellow, '  Could not copy. Please copy manually from above.'));
      }
      continue;
    }

    if (action === 'n') {
      clearScreen();
      printHeader();
      printPresetMenu();
      const newKey = await ask(`  ${col(C.cyan, 'Select preset')} ${dim('[2]')}: `);
      const newPreset = PRESETS[newKey.trim() || '2'] || PRESETS[2];

      if (newPreset.charset) {
        currentCharset = newPreset.charset;
        currentLength  = newPreset.length;
      } else {
        const custom = await buildCustomCharset(rl);
        currentCharset = custom.charset;
        currentLength  = custom.length;
      }

      currentPw = generatePassword(currentCharset, currentLength);
      clearScreen();
      printHeader();
      printPassword(currentPw, currentCharset);
      continue;
    }

    console.log(col(C.yellow, '  Unknown command. Use g, c, n, or q.'));
  }
}

main().catch((err) => {
  console.error(col(C.red, `\n  Error: ${err.message}\n`));
  process.exit(1);
});
