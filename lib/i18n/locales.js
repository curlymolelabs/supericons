export const SUPPORTED_LOCALES = Object.freeze([
  'en',
  'zh-Hans',
  'zh-Hant',
  'ja',
  'ko',
  'es',
  'de',
  'pt',
  'ar',
  'hi',
  'vi',
  'th',
]);

export const DEFAULT_LOCALE = 'en';

export const LOCALE_METADATA = Object.freeze({
  en: { label: 'English', nativeLabel: 'English', dir: 'ltr', fallback: [] },
  'zh-Hans': { label: 'Chinese (Simplified)', nativeLabel: '简体中文', dir: 'ltr', fallback: ['en'] },
  'zh-Hant': { label: 'Chinese (Traditional)', nativeLabel: '繁體中文', dir: 'ltr', fallback: ['en'] },
  ja: { label: 'Japanese', nativeLabel: '日本語', dir: 'ltr', fallback: ['en'] },
  ko: { label: 'Korean', nativeLabel: '한국어', dir: 'ltr', fallback: ['en'] },
  es: { label: 'Spanish', nativeLabel: 'Español', dir: 'ltr', fallback: ['en'] },
  de: { label: 'German', nativeLabel: 'Deutsch', dir: 'ltr', fallback: ['en'] },
  pt: { label: 'Portuguese', nativeLabel: 'Português', dir: 'ltr', fallback: ['en'] },
  ar: { label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl', fallback: ['en'] },
  hi: { label: 'Hindi', nativeLabel: 'हिन्दी', dir: 'ltr', fallback: ['en'] },
  vi: { label: 'Vietnamese', nativeLabel: 'Tiếng Việt', dir: 'ltr', fallback: ['en'] },
  th: { label: 'Thai', nativeLabel: 'ไทย', dir: 'ltr', fallback: ['en'] },
});

const LOCALE_ALIASES = Object.freeze({
  zh: 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  'zh-hans': 'zh-Hans',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  'zh-mo': 'zh-Hant',
  'zh-hant': 'zh-Hant',
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  ja: 'ja',
  'ja-jp': 'ja',
  ko: 'ko',
  'ko-kr': 'ko',
  es: 'es',
  de: 'de',
  pt: 'pt',
  'pt-br': 'pt',
  'pt-pt': 'pt',
  ar: 'ar',
  hi: 'hi',
  vi: 'vi',
  th: 'th',
});

export function isSupportedLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

export function getLocaleDirection(locale) {
  return LOCALE_METADATA[locale]?.dir || LOCALE_METADATA[DEFAULT_LOCALE].dir;
}

export function normalizeLocale(locale) {
  return matchSupportedLocale(locale) || DEFAULT_LOCALE;
}

export function detectPreferredLocale(locales) {
  const candidates = Array.isArray(locales) ? locales : [locales];
  for (const locale of candidates) {
    const supported = matchSupportedLocale(locale);
    if (supported) return supported;
  }

  return DEFAULT_LOCALE;
}

function matchSupportedLocale(locale) {
  const value = String(locale || '').trim();
  if (isSupportedLocale(value)) return value;

  const lower = value.toLowerCase();
  const alias = LOCALE_ALIASES[lower];
  if (alias) return alias;

  const baseLanguage = lower.split('-')[0];
  return LOCALE_ALIASES[baseLanguage];
}
