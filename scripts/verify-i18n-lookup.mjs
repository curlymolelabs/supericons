import assert from 'node:assert/strict';

import {
  DEFAULT_LOCALE,
  LOCALE_METADATA,
  detectPreferredLocale,
  normalizeLocale,
} from '../lib/i18n/locales.js';
import { createTranslator, getMessage, interpolate, readPath } from '../lib/i18n/translate.js';

const catalogs = {
  en: {
    app: {
      title: 'Showing {count} icons',
      nested: {
        label: 'Search icons',
      },
    },
  },
  es: {
    app: {
      title: 'Mostrando {count} iconos',
    },
  },
};

assert.equal(readPath(catalogs.en, 'app.nested.label'), 'Search icons');
assert.equal(interpolate('Hello {name}', { name: 'Supericons' }), 'Hello Supericons');
assert.equal(getMessage(catalogs, 'es', 'app.title', { count: 12 }), 'Mostrando 12 iconos');
assert.equal(getMessage(catalogs, 'es', 'app.nested.label'), 'Search icons');
assert.equal(getMessage(catalogs, 'ja', 'missing.key'), 'missing.key');

const t = createTranslator(catalogs, 'es');
assert.equal(t('app.title', { count: 3 }), 'Mostrando 3 iconos');

assert.equal(normalizeLocale('zh-TW'), 'zh-Hant');
assert.equal(normalizeLocale('pt-BR'), 'pt');
assert.equal(normalizeLocale('fr-FR'), DEFAULT_LOCALE);
assert.equal(detectPreferredLocale(['fr-FR', 'de-DE']), 'de');
assert.equal(detectPreferredLocale(['fr-FR', 'zh-HK', 'de-DE']), 'zh-Hant');
assert.equal(detectPreferredLocale(['fr-FR', 'it-IT']), DEFAULT_LOCALE);
assert.equal(LOCALE_METADATA.ja.nativeLabel, '日本語');
assert.equal(LOCALE_METADATA.ar.nativeLabel, 'العربية');

console.log('verify-i18n-lookup: ok');
