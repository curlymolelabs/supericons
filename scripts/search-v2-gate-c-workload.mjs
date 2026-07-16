export const SEARCH_CASES = Object.freeze([
  Object.freeze({ id: 'settings-all', query: 'settings', library_mode: 'all', limit: 5, locale: 'en' }),
  Object.freeze({ id: 'hello-all', query: 'hello', library_mode: 'all', limit: 8, locale: 'en' }),
  Object.freeze({ id: 'cog-bootstrap-strict', query: 'cog', library: 'bootstrap', library_mode: 'strict', limit: 8, locale: 'en' }),
  Object.freeze({ id: 'combobox-bootstrap-prefer', query: 'combobox', library: 'bootstrap', library_mode: 'prefer', limit: 8, locale: 'en' }),
  Object.freeze({
    id: 'settings-zh-hans-expanded',
    query: 'settings',
    library_mode: 'all',
    limit: 5,
    locale: null,
    localized_query: '设置',
    localized_locale: 'zh-Hans',
  }),
]);

export const SEARCH_WARM_REPETITIONS = 5;
