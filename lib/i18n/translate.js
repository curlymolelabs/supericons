import { DEFAULT_LOCALE } from './locales.js';

export function getMessage(catalogs, locale, key, params = {}) {
  const message = readPath(catalogs?.[locale], key)
    ?? readPath(catalogs?.[DEFAULT_LOCALE], key)
    ?? key;

  return interpolate(message, params);
}

export function createTranslator(catalogs, locale = DEFAULT_LOCALE) {
  return function translate(key, params = {}) {
    return getMessage(catalogs, locale, key, params);
  };
}

export function readPath(source, key) {
  return String(key).split('.').reduce((node, part) => (
    node && Object.hasOwn(node, part) ? node[part] : undefined
  ), source);
}

export function interpolate(message, params = {}) {
  return String(message).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => (
    Object.hasOwn(params, name) ? String(params[name]) : match
  ));
}
