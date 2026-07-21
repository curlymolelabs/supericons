import {
  buildPublicSemanticPayload,
  getSemanticRecordForIcon,
  scoreSemanticAlignment,
} from './semantic-registry.js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  expandCjkQuery,
  normalizeCjkSearchText,
} from './runtime/cjk-search-core.js';
import {
  buildIntentQueryVariants,
  buildSearchIntentProfile,
  getIntentCandidateAdjustment,
} from './runtime/search-intent-core.js';
import { buildSearchQueryFrame } from './runtime/search-query-frame.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cjkTermsPath = join(__dirname, 'public', 'cjk-search-terms.json');
const multilingualAliasesPath = join(__dirname, 'public', 'multilingual-search-aliases.json');
const cjkSearchTerms = existsSync(cjkTermsPath)
  ? JSON.parse(readFileSync(cjkTermsPath, 'utf8')).terms || []
  : [];
const multilingualSearchAliases = existsSync(multilingualAliasesPath)
  ? JSON.parse(readFileSync(multilingualAliasesPath, 'utf8')).aliases || []
  : [];
const multilingualExpansionTerms = [...cjkSearchTerms, ...multilingualSearchAliases];
const SLOT_SEARCH_CONCURRENCY = 2;
const SLOT_QUERY_CONCURRENCY = 1;
const SUPPORTED_LOCALIZED_RECOMMENDATION_LOCALES = new Set([
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

export function getRecommendationQueryVariantLimit(locale) {
  const normalizedLocale = String(locale || '').trim();
  return SUPPORTED_LOCALIZED_RECOMMENDATION_LOCALES.has(normalizedLocale) ? 8 : 4;
}

const GENERIC_SLOT_WORDS = new Set([
  'action',
  'button',
  'buttons',
  'control',
  'controls',
  'icon',
  'icons',
  'item',
  'items',
  'nav',
  'navigation',
  'slot',
  'tab',
  'tabs',
  'ui',
  'view',
]);

const BRAND_LOGO_WORDS = new Set([
  'brand',
  'brands',
  'logo',
  'logos',
  'mark',
  'wordmark',
]);

const BRAND_LOGO_GENERIC_WORDS = new Set([
  ...GENERIC_SLOT_WORDS,
  ...BRAND_LOGO_WORDS,
  'app',
  'application',
  'company',
  'hero',
  'page',
  'product',
  'site',
  'title',
  'website',
]);

const VARIANT_PENALTIES = Object.freeze([
  { token: 'circle', pattern: /circle/i, penalty: 12 },
  { token: 'square', pattern: /square/i, penalty: 12 },
  { token: 'dash', pattern: /dash/i, penalty: 5 },
  { token: 'badge', pattern: /badge/i, penalty: 4 },
  { token: 'brand', pattern: /\bbrand\b/i, penalty: 30 },
  { token: 'off', pattern: /\boff\b/i, penalty: 18 },
  { token: 'slash', pattern: /slash/i, penalty: 8 },
  { token: 'warning', pattern: /warning/i, penalty: 5 },
  { token: 'ai', pattern: /\bai\b/i, penalty: 18 },
  { token: 'add', pattern: /\badd\b/i, penalty: 12 },
  { token: 'plus', pattern: /\bplus\b/i, penalty: 18 },
  { token: 'edit', pattern: /\bedit\b/i, penalty: 12 },
  { token: 'remove', pattern: /\bremove\b/i, penalty: 12 },
  { token: 'delete', pattern: /\bdelete\b/i, penalty: 12 },
  { token: 'minus', pattern: /\bminus\b/i, penalty: 24 },
  { token: 'cancel', pattern: /\bcancel\b/i, penalty: 30 },
  { token: 'x', pattern: /\bx\b/i, penalty: 30 },
  { token: 'exclamation', pattern: /\bexclamation\b/i, penalty: 24 },
  { token: 'discount', pattern: /\bdiscount\b/i, penalty: 24 },
  { token: 'heart', pattern: /\bheart\b/i, penalty: 18 },
  { token: 'zap', pattern: /\bzap\b/i, penalty: 30 },
  { token: 'bolt', pattern: /\bbolt\b/i, penalty: 18 },
  { token: 'wifi', pattern: /\bwifi\b/i, penalty: 12 },
  { token: 'align', pattern: /\balign\b/i, penalty: 12 },
  { token: 'fruit', pattern: /\bfruit\b/i, penalty: 12 },
  { token: 'open', pattern: /\bopen\b/i, penalty: 28 },
  { token: 'unlock', pattern: /\bunlock(?:ed)?\b/i, penalty: 28 },
  { token: 'ban', pattern: /\bban\b/i, penalty: 24 },
  { token: 'blocked', pattern: /\bblocked\b/i, penalty: 24 },
  { token: 'rupee', pattern: /\brupee\b/i, penalty: 18 },
  { token: 'ruble', pattern: /\bruble\b/i, penalty: 18 },
  { token: 'franc', pattern: /\bfranc\b/i, penalty: 18 },
  { token: 'lira', pattern: /\blira\b/i, penalty: 18 },
  { token: 'bitcoin', pattern: /\bbitcoin\b/i, penalty: 18 },
  { token: 'dollar', pattern: /\bdollar\b/i, penalty: 18 },
  { token: 'cent', pattern: /\bcent\b/i, penalty: 18 },
  { token: 'yen', pattern: /\byen\b/i, penalty: 18 },
  { token: 'yuan', pattern: /\byuan\b/i, penalty: 18 },
  { token: 'euro', pattern: /\beuro\b/i, penalty: 18 },
  { token: 'pound', pattern: /\bpound\b/i, penalty: 18 },
  { token: 'down', pattern: /\bdown\b/i, penalty: 8 },
  { token: 'left', pattern: /\bleft\b/i, penalty: 8 },
  { token: 'up', pattern: /\bup\b/i, penalty: 8 },
  { token: 'corner', pattern: /\bcorner\b/i, penalty: 12 },
  { token: 'break', pattern: /\bbreak\b/i, penalty: 18 },
  { token: 'broken', pattern: /\bbroken\b/i, penalty: 18 },
  { token: 'locked', pattern: /\blocked\b/i, penalty: 18 },
  { token: 'orange', pattern: /\borange\b/i, penalty: 12 },
]);

const VARIANT_TOKENS = new Set(VARIANT_PENALTIES.map((rule) => rule.token));

const REQUESTED_VARIANT_ALIASES = Object.freeze({
  off: ['disabled', 'disable', 'muted', 'mute', 'off', 'broken'],
  brand: ['brand', 'logo'],
  open: ['open', 'unlock', 'unlocked'],
  unlock: ['open', 'unlock', 'unlocked'],
  ban: ['ban', 'banned', 'block', 'blocked'],
  blocked: ['ban', 'banned', 'block', 'blocked'],
  add: ['add', 'create', 'plus'],
  plus: ['add', 'create', 'plus'],
  edit: ['edit', 'editing', 'modify', 'pencil'],
  remove: ['remove', 'removed', 'delete', 'minus'],
  delete: ['delete', 'remove', 'trash'],
  minus: ['minus', 'remove', 'removed', 'delete'],
  cancel: ['cancel', 'canceled', 'cancelled', 'disabled', 'remove'],
  x: ['x', 'close', 'remove', 'delete', 'blocked', 'broken', 'off'],
  exclamation: ['alert', 'warning', 'exclamation'],
  discount: ['discount', 'coupon', 'coupons', 'promo', 'promotion', 'deal'],
  heart: ['heart', 'favorite', 'favourite', 'liked', 'wishlist'],
  ai: ['ai', 'smart', 'assistant', 'automation'],
  break: ['break', 'broken'],
  broken: ['break', 'broken'],
  locked: ['lock', 'locked', 'secure', 'security'],
  ruble: ['ruble', 'rouble', 'rub'],
  franc: ['franc', 'chf'],
  lira: ['lira'],
  bitcoin: ['bitcoin', 'btc'],
  dollar: ['dollar', 'usd'],
  yuan: ['yuan', 'cny'],
});

const DIRECT_LOCALIZED_INTENT_RULES = Object.freeze([
  {
    pattern: /\u901a\u77e5|\u304a\u77e5\u3089\u305b|\uc54c\ub9bc|notificaciones?|benachrichtigungen?|notifica(?:\u00e7|c)[a\u00e3]o|notifica(?:\u00e7|c)[o\u00f5]es?|notificacoes?/iu,
    terms: ['notification', 'notifications'],
  },
  {
    pattern: /\u5173\u95ed|\u95dc\u9589|\u30aa\u30d5|\uaebc\uc9d0|\ub044\uae30|desactivad[ao]s?|apagad[ao]s?|aus\b|deaktiviert|disabled|muted|mute|off/iu,
    terms: ['off', 'disabled'],
  },
]);

const COMMON_SLOT_PREFERENCE_RULES = Object.freeze([
  {
    slotPatterns: [/\busers\b/i, /team/i, /members?/i],
    queryVariants: ['users', 'team', 'user group', 'people'],
    iconPreferences: [
      { pattern: /^users(?:_|-|$)|(?:_|-)users(?:_|-|$)|users-group|user-group|user_circle|user-circle/i, bonus: 66 },
      { pattern: /^user(?:_|-|$)|(?:_|-)user(?:_|-|$)/i, bonus: 18 },
    ],
  },
  {
    slotPatterns: [
      /profile/i,
      /account/i,
      /\buser\b/i,
      /\busers\b/i,
      /avatar/i,
      /\u8d26\u6237|\u5e10\u6237|\u5e33\u6236|\u500b\u4eba\u8cc7\u6599|\u4e2a\u4eba\u8d44\u6599|\u7528\u6237|\u4f7f\u7528\u8005/u,
      /\u30a2\u30ab\u30a6\u30f3\u30c8|\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb|\u30e6\u30fc\u30b6\u30fc/u,
      /\uacc4\uc815|\ud504\ub85c\ud544|\uc0ac\uc6a9\uc790/u,
      /cuenta|perfil|usuario/i,
      /konto|profil|benutzer/i,
      /conta|perfil|usu[aá]rio|utilizador/i,
      /\u0627\u0644\u062d\u0633\u0627\u0628|\u0645\u0644\u0641\s+\u0634\u062e\u0635\u064a|\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645/u,
      /\u0916\u093e\u0924\u093e|\u092a\u094d\u0930\u094b\u092b\u093c\u093e\u0907\u0932|\u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932|\u0909\u092a\u092f\u094b\u0917\u0915\u0930\u094d\u0924\u093e/u,
      /t[aà]i kho[aả]n|tai khoan|h[oồ] s[oơ]|ho so|ng[uư][oờ]i d[uù]ng|nguoi dung/i,
      /\u0e1a\u0e31\u0e0d\u0e0a\u0e35|\u0e42\u0e1b\u0e23\u0e44\u0e1f\u0e25\u0e4c|\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49/u,
    ],
    queryVariants: ['user profile', 'account user', 'avatar person', 'user'],
    iconPreferences: [
      { pattern: /^user(?:_|-|$)|(?:_|-)user(?:_|-|$)|users|profile|avatar|circle-user|user-circle/i, bonus: 42 },
      { pattern: /person|contact/i, bonus: 12 },
    ],
  },
  {
    slotPatterns: [
      /\bhome\b/i,
      /\bmain\b/i,
      /\u9996\u9875|\u9996\u9801|\u4e3b\u9875|\u4e3b\u9801/u,
      /\u30db\u30fc\u30e0|\u30e1\u30a4\u30f3/u,
      /\ud648|\uba54\uc778/u,
      /inicio|principal/i,
      /startseite|hauptseite/i,
      /\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629|\u0627\u0644\u0635\u0641\u062d\u0629\s+\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629/u,
      /\u0e2b\u0e19\u0e49\u0e32\u0e2b\u0e25\u0e31\u0e01/u,
    ],
    queryVariants: ['home', 'house'],
    iconPreferences: [
      { pattern: /^home(?:_|-|$)|(?:_|-)home(?:_|-|$)|house/i, bonus: 40 },
    ],
  },
  {
    slotPatterns: [
      /alerts?/i,
      /notifications?/i,
      /bell/i,
      /\u901a\u77e5|\u63d0\u9192/u,
      /\u30a2\u30e9\u30fc\u30c8|\u304a\u77e5\u3089\u305b|\u901a\u77e5/u,
      /\uc54c\ub9bc/u,
      /notificaci[oó]n|notificaciones|alerta/i,
      /benachrichtigung|benachrichtigungen/i,
      /notifica(?:ç|c)[aã]o|notifica(?:ç|c)[oõ]es|notificacoes|alerta/i,
      /\u0627\u0644\u0625\u0634\u0639\u0627\u0631|\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a/u,
      /\u0938\u0942\u091a\u0928\u093e|\u0938\u0942\u091a\u0928\u093e\u090f\u0901|\u0905\u0927\u093f\u0938\u0942\u091a\u0928\u093e/u,
      /th[oô]ng b[aá]o|thong bao|c[aả]nh b[aá]o|canh bao/i,
      /\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19|\u0e01\u0e32\u0e23\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19/u,
    ],
    queryVariants: ['notification', 'bell', 'alert', 'alarm'],
    iconPreferences: [
      { pattern: /notification|bell/i, bonus: 46 },
      { pattern: /alarm|alert/i, bonus: 18 },
    ],
  },
  {
    priority: 90,
    slotPatterns: [/notifications?\s+off/i, /disabled notifications?/i, /muted notifications?/i, /notification\s+off/i],
    queryVariants: ['bell slash', 'bell off', 'notification off', 'muted bell'],
    iconPreferences: [
      { pattern: /^bell[_-]?(off|slash)$|^bell[_-]?simple[_-]?slash$|notification[_-]?off|notifications?[_-]?off/i, bonus: 180 },
      { pattern: /bell|notification/i, bonus: 22 },
    ],
  },
  {
    slotPatterns: [
      /privacy/i,
      /security/i,
      /private/i,
      /safe/i,
      /protection/i,
      /\u9690\u79c1|\u96b1\u79c1|\u5b89\u5168/u,
      /\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc|\u30bb\u30ad\u30e5\u30ea\u30c6\u30a3|\u5b89\u5168/u,
      /\uac1c\uc778\uc815\ubcf4|\uac1c\uc778\s+\uc815\ubcf4|\ubcf4\uc548|\uc548\uc804/u,
      /privacidad|seguridad/i,
      /datenschutz|sicherheit/i,
      /privacidade|seguran[cç]a|seguranca/i,
      /\u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629|\u0627\u0644\u0623\u0645\u0627\u0646|\u0627\u0644\u0627\u0645\u0627\u0646|\u0627\u0644\u0623\u0645\u0646|\u0627\u0644\u0627\u0645\u0646/u,
      /\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e|\u0938\u0941\u0930\u0915\u094d\u0937\u093e/u,
      /quy[eề]n ri[eê]ng t[uư]|quyen rieng tu|b[aả]o m[aậ]t|bao mat|an to[aà]n|an toan/i,
      /\u0e04\u0e27\u0e32\u0e21\u0e40\u0e1b\u0e47\u0e19\u0e2a\u0e48\u0e27\u0e19\u0e15\u0e31\u0e27|\u0e04\u0e27\u0e32\u0e21\u0e1b\u0e25\u0e2d\u0e14\u0e20\u0e31\u0e22/u,
    ],
    queryVariants: ['shield lock', 'lock', 'shield', 'privacy security', 'security'],
    iconPreferences: [
      { pattern: /^shield$|^shield[_-]?check$|shield-check|shield_check/i, bonus: 82 },
      { pattern: /shield.*lock|lock.*shield|shield/i, bonus: 58 },
      { pattern: /^lock$|^lock[_-]?keyhole$|(?:_|-)lock(?:_|-|$)|key|fingerprint/i, bonus: 34 },
      { pattern: /open|unlock|ban|minus|off|slash/i, bonus: -54 },
    ],
  },
  {
    priority: 120,
    slotPatterns: [/unlock/i, /open account/i, /unlocked account/i],
    queryVariants: ['lock open', 'unlock', 'lock keyhole open'],
    iconPreferences: [
      { pattern: /^lock[_-]?open$|^lock[_-]?keyhole[_-]?open$|^unlock(?:[_-]?keyhole)?$/i, bonus: 160 },
      { pattern: /lock.*open|open.*lock|unlock/i, bonus: 80 },
      { pattern: /^user(?:_|-|$)|(?:_|-)user(?:_|-|$)|file-user/i, bonus: -70 },
    ],
  },
  {
    priority: 120,
    slotPatterns: [/blocked user/i, /banned user/i, /user blocked/i, /user banned/i],
    queryVariants: ['user x', 'user minus', 'ban user', 'blocked user'],
    iconPreferences: [
      { pattern: /^user[_-]?x$|^user[_-]?minus$|user-round-x|user-round-minus|shield-ban|ban/i, bonus: 150 },
      { pattern: /^user(?:_|-|$)|(?:_|-)user(?:_|-|$)/i, bonus: 24 },
      { pattern: /^file-user$|^user-2$/i, bonus: -80 },
    ],
  },
  {
    slotPatterns: [
      /appearance/i,
      /theme/i,
      /color/i,
      /palette/i,
      /dark mode/i,
      /light mode/i,
      /\u5916\u89c2|\u5916\u89c0|\u4e3b\u9898|\u4e3b\u984c|\u989c\u8272|\u984f\u8272/u,
      /\u5916\u89b3|\u30c6\u30fc\u30de|\u8868\u793a|\u914d\u8272/u,
      /\uc678\uad00|\ud14c\ub9c8|\uc0c9\uc0c1|\ud654\uba74/u,
      /apariencia|tema|colou?r|modo/i,
      /erscheinungsbild|design|darstellung|thema/i,
      /apar[eê]ncia|tema|cor/i,
      /\u0627\u0644\u0645\u0638\u0647\u0631|\u0627\u0644\u0633\u0645\u0629|\u0627\u0644\u0648\u0636\u0639|\u0627\u0644\u0623\u0644\u0648\u0627\u0646/u,
      /\u0930\u0942\u092a|\u0925\u0940\u092e|\u0926\u093f\u0916\u093e\u0935\u091f|\u0930\u0902\u0917/u,
      /giao di[eệ]n|giao dien|ch[uủ] \u0111[eề]|chu de|m[aà]u|mau/i,
      /\u0e23\u0e39\u0e1b\u0e25\u0e31\u0e01\u0e29\u0e13\u0e4c|\u0e18\u0e35\u0e21|\u0e2a\u0e35|\u0e2b\u0e19\u0e49\u0e32\u0e15\u0e32/u,
    ],
    queryVariants: ['palette', 'moon', 'theme', 'sun moon', 'appearance'],
    iconPreferences: [
      { pattern: /^palette$|paint|brush|color|swatch/i, bonus: 54 },
      { pattern: /^moon$|sun-moon|sun|theme/i, bonus: 28 },
    ],
  },
  {
    slotPatterns: [
      /language/i,
      /locale/i,
      /translate/i,
      /translation/i,
      /\u8bed\u8a00/u,
      /\u8a9e\u8a00/u,
      /\u8a00\u8a9e/u,
      /\uc5b8\uc5b4/u,
      /idioma/i,
      /sprache/i,
      /l[ií]ngua/i,
      /langue/i,
      /\u0627\u0644\u0644\u063a\u0629|\u0644\u063a\u0629/u,
      /\u092d\u093e\u0937\u093e/u,
      /ng[oô]n ng[uữ]|ngon ngu/i,
      /\u0e20\u0e32\u0e29\u0e32/u,
    ],
    queryVariants: ['globe', 'languages', 'translate', 'language'],
    iconPreferences: [
      { pattern: /^globe$|^languages?$|^translate$|(?:_|-)(globe|languages?|translate)(?:_|-|$)/i, bonus: 70 },
      { pattern: /globe|language|translate/i, bonus: 28 },
    ],
  },
  {
    slotPatterns: [
      /language/i,
      /locale/i,
      /translate/i,
      /translation/i,
      /语言/u,
      /語言/u,
      /言語/u,
      /언어/u,
      /idioma/i,
      /sprache/i,
      /língua/i,
      /langue/i,
      /اللغة/u,
      /भाषा/u,
      /ngôn ngữ/i,
      /ภาษา/u,
    ],
    queryVariants: ['globe', 'languages', 'translate', 'language'],
    iconPreferences: [
      { pattern: /^globe$|^languages?$|^translate$|(?:_|-)(globe|languages?|translate)(?:_|-|$)/i, bonus: 70 },
      { pattern: /globe|language|translate/i, bonus: 28 },
    ],
  },
  {
    slotPatterns: [/create/i, /\badd\b/i, /\bplus\b/i, /compose/i, /new item/i],
    queryVariants: ['add', 'plus', 'create new', 'compose'],
    iconPreferences: [
      { pattern: /^(add|plus)(?:_|-|$)/i, bonus: 48 },
      { pattern: /(?:_|-)(add|plus)(?:_|-|$)/i, bonus: 18 },
      { pattern: /compose|edit|pencil/i, bonus: 8 },
    ],
  },
  {
    slotPatterns: [/archive/i],
    queryVariants: ['archive', 'archive box', 'box archive'],
    iconPreferences: [
      { pattern: /^archive(?:_|-|$)|(?:_|-)archive(?:_|-|$)/i, bonus: 40 },
      { pattern: /box|tray/i, bonus: 8 },
    ],
  },
  {
    slotPatterns: [/alerts?/i, /notifications?/i, /bell/i, /通知/u, /알림/u, /通知/u],
    queryVariants: ['notification', 'bell', 'alert', 'alarm'],
    iconPreferences: [
      { pattern: /notification|bell/i, bonus: 42 },
      { pattern: /alarm|alert/i, bonus: 16 },
    ],
  },
  {
    slotPatterns: [/profile/i, /account/i, /\buser\b/i, /\busers\b/i, /avatar/i],
    queryVariants: ['user profile', 'account user', 'avatar person'],
    iconPreferences: [
      { pattern: /^user(?:_|-|$)|(?:_|-)user(?:_|-|$)|users|profile|avatar|circle-user|user-circle/i, bonus: 36 },
      { pattern: /person|contact/i, bonus: 10 },
    ],
  },
  {
    slotPatterns: [/model/i, /\bai\b/i, /\bml\b/i, /machine learning/i],
    queryVariants: ['brain circuit', 'brain cog', 'neural network', 'model'],
    iconPreferences: [
      { pattern: /brain-circuit|brain_circuit/i, bonus: 44 },
      { pattern: /brain|circuit|nodes/i, bonus: 24 },
    ],
  },
  {
    priority: 120,
    slotPatterns: [/\bai search\b/i, /smart search/i, /semantic search/i, /assistant search/i],
    queryVariants: ['search ai', 'ai search', 'smart search'],
    iconPreferences: [
      { pattern: /^search.*ai|ai.*search|search[_-]?[23]?[_-]?ai/i, bonus: 150 },
      { pattern: /^search(?:_|-|$)|(?:_|-)search(?:_|-|$)/i, bonus: 34 },
      { pattern: /brain|robot|spark/i, bonus: 24 },
    ],
  },
  {
    priority: 90,
    slotPatterns: [/automation/i, /workflow/i, /automate/i, /smart action/i],
    queryVariants: ['automation', 'workflow', 'robot', 'refresh', 'sparkles'],
    iconPreferences: [
      { pattern: /workflow|automation|robot|sparkles?|refresh|settings|adjustments/i, bonus: 90 },
      { pattern: /hand|finger|train/i, bonus: -90 },
    ],
  },
  {
    slotPatterns: [/prompt/i],
    queryVariants: ['message text', 'text input', 'terminal', 'text cursor'],
    iconPreferences: [
      { pattern: /message.*text|text.*input|text-cursor-input|terminal/i, bonus: 36 },
      { pattern: /text|prompt|keyboard/i, bonus: 14 },
    ],
  },
  {
    slotPatterns: [/dataset/i, /\bdata\b/i, /table/i],
    queryVariants: ['database', 'data table', 'grid rows columns', 'table'],
    iconPreferences: [
      { pattern: /^database$|^table-2$|^table_2$|table-cells|table-columns|table-rows/i, bonus: 36 },
      { pattern: /database|table|grid/i, bonus: 18 },
    ],
  },
  {
    slotPatterns: [/evaluation/i, /benchmark/i, /score/i, /metrics?/i],
    queryVariants: ['bar chart', 'metrics chart', 'gauge', 'checklist', 'benchmark'],
    iconPreferences: [
      { pattern: /bar-chart-3|chart-bar|bar-chart|gauge|clipboard-check|list-check/i, bonus: 38 },
      { pattern: /chart|metrics|check/i, bonus: 16 },
    ],
  },
  {
    slotPatterns: [/deployment/i, /deploy/i, /release/i, /ship/i, /publish/i],
    queryVariants: ['cloud upload', 'upload', 'rocket launch', 'server upload', 'send'],
    iconPreferences: [
      { pattern: /cloud-upload|upload-cloud|rocket|send/i, bonus: 40 },
      { pattern: /upload|server|package/i, bonus: 18 },
    ],
  },
  {
    slotPatterns: [/monitoring/i, /monitor/i, /observability/i, /telemetry/i, /activity/i],
    queryVariants: ['chart line', 'activity', 'pulse', 'gauge', 'signal'],
    iconPreferences: [
      { pattern: /chart-line|line-chart|activity|pulse|gauge/i, bonus: 42 },
      { pattern: /chart|signal|radar/i, bonus: 16 },
    ],
  },
  {
    slotPatterns: [/billing/i, /payment/i, /invoice/i, /subscription/i],
    queryVariants: ['credit card', 'receipt', 'invoice', 'payment', 'wallet'],
    iconPreferences: [
      { pattern: /credit-card|receipt|wallet|invoice/i, bonus: 44 },
      { pattern: /card|banknote|currency|dollar/i, bonus: 18 },
      { pattern: /ruble|franc|lira|bitcoin|yuan/i, bonus: -70 },
    ],
  },
  {
    priority: 90,
    slotPatterns: [/storefront/i, /\bstore\b/i, /\bshop\b/i],
    queryVariants: ['store', 'shop', 'building store', 'shopping bag'],
    iconPreferences: [
      { pattern: /^store$|^storefront$|building-store|shop[_-]?line|store[_-]?\d?[_-]?line|shopping-bag/i, bonus: 120 },
      { pattern: /brand-appstore|restore|cancel|\bx\b|off|discount|heart|exclamation|minus|plus|search|share|star|question|bolt|code|copy|dollar|down|up|pin|pause/i, bonus: -120 },
    ],
  },
  {
    priority: 130,
    slotPatterns: [/(store|shop|storefront)\s+(off|disabled|closed|cancelled|canceled)/i, /(off|disabled|closed|cancelled|canceled)\s+(store|shop|storefront)/i],
    queryVariants: ['store off', 'shopping bag x', 'shopping cart off', 'store disabled'],
    iconPreferences: [
      { pattern: /(store|shop|shopping|bag|cart).*(off|\bx\b|cancel|disabled)|(off|\bx\b|cancel|disabled).*(store|shop|shopping|bag|cart)/i, bonus: 220 },
      { pattern: /^building-store$|^store$|^shopping-bag$/i, bonus: -70 },
    ],
  },
  {
    priority: 90,
    slotPatterns: [/checkout/i],
    queryVariants: ['shopping cart', 'credit card', 'payment', 'receipt checkout'],
    iconPreferences: [
      { pattern: /^shopping[_-]?cart$|shopping-cart$|credit-card|card-pay|payment|receipt/i, bonus: 140 },
      { pattern: /fork|knife|git|branch|merge|forklift|grill|cancel|\bx\b|off|discount|heart|exclamation|minus|plus|search|share|star|question|bolt|code|copy|dollar|down|up|pin|pause/i, bonus: -140 },
    ],
  },
  {
    priority: 120,
    slotPatterns: [/^cart$/i, /shopping cart/i, /\bbasket\b/i],
    queryVariants: ['shopping cart', 'cart', 'basket'],
    iconPreferences: [
      { pattern: /^shopping[_-]?cart$|^basket$/i, bonus: 220 },
      { pattern: /shopping-cart-(cog|x|off|discount|dollar|exclamation|heart|minus|pause|plus|question|share|star|bolt|copy|down|up|search|pin)/i, bonus: -260 },
      { pattern: /basket-(cog|x|off|discount|dollar|exclamation|heart|minus|pause|plus|question|share|star|bolt|copy|down|up|search|pin)/i, bonus: -180 },
      { pattern: /garden-cart/i, bonus: -180 },
    ],
  },
  {
    priority: 90,
    slotPatterns: [/customers?/i, /shoppers?/i, /buyers?/i],
    queryVariants: ['users', 'customers', 'user group'],
    iconPreferences: [
      { pattern: /^users(?:_|-|$)|(?:_|-)users(?:_|-|$)|users-group|user-group|user-circle|user_circle|^user(?:_|-|$)/i, bonus: 110 },
      { pattern: /ticket|plane|caret|cancel|\bx\b|off|discount|heart|exclamation|minus|plus|search|share|star|question|bolt|code|copy|dollar|down|up|pin|pause/i, bonus: -120 },
    ],
  },
  {
    priority: 90,
    slotPatterns: [/coupons?/i, /discounts?/i, /promo/i, /promotion/i],
    queryVariants: ['coupon', 'tag percent', 'discount', 'percentage'],
    iconPreferences: [
      { pattern: /coupon|ticket-percent|badge-percent|percent|percentage|tag|shopping-cart-discount|shopping-bag-discount|seal-percent/i, bonus: 120 },
      { pattern: /^percentage-\d+$|bean|candy|cannabis|off|slash|disabled|alert/i, bonus: -180 },
    ],
  },
  {
    priority: 130,
    slotPatterns: [/(cancel|cancelled|canceled|remove|delete)\s+orders?/i, /orders?\s+(cancel|cancelled|canceled|remove|delete)/i],
    queryVariants: ['shopping cart cancel', 'basket cancel', 'cancel order', 'order x'],
    iconPreferences: [
      { pattern: /cancel|\bx\b|remove|delete|minus|trash/i, bonus: 220 },
      { pattern: /shopping|cart|basket|package|receipt|clipboard|list/i, bonus: 20 },
    ],
  },
  {
    priority: 90,
    slotPatterns: [/orders?/i, /purchases?/i],
    queryVariants: ['package', 'receipt', 'clipboard list', 'shopping bag', 'ordered list'],
    iconPreferences: [
      { pattern: /^package$|packages|receipt|shopping-bag$|clipboard|list-ordered|file-invoice|file-text/i, bonus: 115 },
      { pattern: /border|sort|align|cancel|\bx\b|off|discount|heart|exclamation|minus|plus|search|share|star|question|bolt|code|copy|dollar|down|up|pin|pause/i, bonus: -130 },
    ],
  },
  {
    priority: 120,
    slotPatterns: [/shipping/i, /delivery/i, /fulfillment/i, /dispatch/i],
    queryVariants: ['truck delivery', 'delivery', 'shipping', 'package delivery'],
    iconPreferences: [
      { pattern: /^truck[_-]?delivery$/i, bonus: 260 },
      { pattern: /^truck$|package[_-]?export|package[_-]?import/i, bonus: 180 },
      { pattern: /^truck[_-]?return$/i, bonus: -120 },
      { pattern: /cloud-upload|upload|ship-off|cloud|arrow-up/i, bonus: -220 },
    ],
  },
  {
    priority: 120,
    slotPatterns: [/returns?/i, /refunds?/i, /reverse logistics/i],
    queryVariants: ['return', 'refund', 'truck return', 'receipt refund'],
    iconPreferences: [
      { pattern: /^truck[_-]?return$|receipt[_-]?refund|credit-card[_-]?refund|arrow-back|cash.*move.*back/i, bonus: 220 },
      { pattern: /player|chevron|stack|upload|cloud|ship-off/i, bonus: -160 },
    ],
  },
  {
    priority: 90,
    slotPatterns: [/products?/i, /catalog/i, /inventory/i],
    queryVariants: ['package', 'box', 'tag', 'shopping bag', 'products'],
    iconPreferences: [
      { pattern: /^package$|packages|package[_-]?\d?|^box$|boxes|tag$|shopping-bag$|warehouse|building-warehouse/i, bonus: 115 },
      { pattern: /brand-producthunt|brand-stocktwits|border|sort|cancel|\bx\b|off|discount|heart|exclamation|minus|plus|search|share|star|question|bolt|code|copy|dollar|down|up|pin|pause/i, bonus: -130 },
    ],
  },
  {
    slotPatterns: [/reports?/i, /analytics/i, /insights?/i],
    queryVariants: ['bar chart', 'file chart', 'analytics chart', 'report document'],
    iconPreferences: [
      { pattern: /file-.*chart|chart-bar|bar-chart-3|bar-chart|chart-line|line-chart/i, bonus: 40 },
      { pattern: /chart|report|analytics/i, bonus: 16 },
    ],
  },
  {
    priority: 100,
    slotPatterns: [/^quotes?$/i, /blockquote/i, /quotation/i, /citation/i],
    queryVariants: ['quotes', 'quotation', 'quote', 'blockquote'],
    iconPreferences: [
      { pattern: /^quotes?$|quotation|blockquote/i, bonus: 180 },
      { pattern: /indent|text-align|receipt|ticket/i, bonus: -120 },
    ],
  },
  {
    slotPatterns: [/settings?/i, /preferences?/i, /configure/i],
    queryVariants: ['settings', 'cog', 'sliders'],
    iconPreferences: [
      { pattern: /^settings$|^cog$|settings-2|sliders/i, bonus: 34 },
      { pattern: /settings|cog|adjustments/i, bonus: 16 },
    ],
  },
  {
    priority: 90,
    slotPatterns: [/permissions?/i, /access control/i, /roles?/i],
    queryVariants: ['user key', 'shield lock', 'key', 'settings permissions'],
    iconPreferences: [
      { pattern: /user-key|user-lock|user-check|key|lock|shield|adjustments|settings/i, bonus: 120 },
      { pattern: /free-rights|premium-rights|icons$/i, bonus: -100 },
    ],
  },
  {
    slotPatterns: [/database/i, /storage/i],
    queryVariants: ['database', 'server database', 'data storage'],
    iconPreferences: [
      { pattern: /^database$|database-stack/i, bonus: 36 },
      { pattern: /database|server/i, bonus: 16 },
    ],
  },
  {
    slotPatterns: [/search/i, /find/i, /lookup/i],
    queryVariants: ['search', 'find', 'magnifier', 'magnifying glass'],
    iconPreferences: [
      { pattern: /^search$/i, bonus: 140 },
      { pattern: /^search(?:_|-|$)|(?:_|-)search(?:_|-|$)/i, bonus: 64 },
      { pattern: /magnifier|magnifying/i, bonus: 36 },
      { pattern: /file-search|folder-search|scan-search|mail-search|calendar-search/i, bonus: -90 },
    ],
  },
  {
    priority: 115,
    slotPatterns: [/\b(add|new|create)\s+bookmark\b/i, /\bbookmark\s+(add|new|create)\b/i],
    queryVariants: ['bookmark add', 'add bookmark', 'bookmark plus'],
    iconPreferences: [
      { pattern: /^bookmark[_-]?(add|plus)(?:_|-|$)|(?:_|-)bookmark[_-]?(add|plus)(?:_|-|$)/i, bonus: 220 },
      { pattern: /^bookmarks?(?:_|-|$)|(?:_|-)bookmarks?(?:_|-|$)/i, bonus: 46 },
      { pattern: /^(add|plus)(?:_|-|$)/i, bonus: -80 },
    ],
  },
  {
    priority: 115,
    slotPatterns: [/\bedit\s+bookmark\b/i, /\bbookmark\s+edit\b/i],
    queryVariants: ['bookmark edit', 'edit bookmark', 'bookmark pencil'],
    iconPreferences: [
      { pattern: /^bookmark[_-]?edit(?:_|-|$)|(?:_|-)bookmark[_-]?edit(?:_|-|$)/i, bonus: 190 },
      { pattern: /^bookmarks?(?:_|-|$)|(?:_|-)bookmarks?(?:_|-|$)/i, bonus: 46 },
      { pattern: /^edit(?:_|-|$)|pencil/i, bonus: -70 },
    ],
  },
  {
    priority: 115,
    slotPatterns: [/\b(remove|delete)\s+bookmark\b/i, /\bbookmark\s+(remove|delete)\b/i],
    queryVariants: ['bookmark remove', 'remove bookmark', 'bookmark minus'],
    iconPreferences: [
      { pattern: /^bookmark[_-]?(remove|minus|x)(?:_|-|$)|(?:_|-)bookmark[_-]?(remove|minus|x)(?:_|-|$)/i, bonus: 190 },
      { pattern: /^bookmarks?(?:_|-|$)|(?:_|-)bookmarks?(?:_|-|$)/i, bonus: 46 },
      { pattern: /^(remove|delete|minus)(?:_|-|$)/i, bonus: -70 },
    ],
  },
  {
    slotPatterns: [/bookmark/i, /saved?/i, /save article/i],
    queryVariants: ['bookmark', 'saved', 'save'],
    iconPreferences: [
      { pattern: /^bookmarks?(?:_|-|$)|(?:_|-)bookmarks?(?:_|-|$)/i, bonus: 66 },
      { pattern: /save|favorite|star/i, bonus: 14 },
    ],
  },
  {
    slotPatterns: [/share/i, /send article/i, /forward/i],
    queryVariants: ['share', 'send', 'forward'],
    iconPreferences: [
      { pattern: /^share(?:_|-|$)|(?:_|-)share(?:_|-|$)/i, bonus: 58 },
      { pattern: /send|forward/i, bonus: 18 },
    ],
  },
  {
    priority: 110,
    slotPatterns: [/previous page/i, /previous/i, /\bback\b/i, /go back/i],
    queryVariants: ['arrow left', 'chevron left', 'back arrow', 'previous'],
    iconPreferences: [
      { pattern: /^arrow[_-]?left$|^chevron[_-]?left$|^caret[_-]?left$|arrow[_-]?back$|back[_-]?line|arrow[_-]?to[_-]?left|left(?:_|-|$)/i, bonus: 140 },
      { pattern: /skip-back|step-back/i, bonus: 48 },
      { pattern: /send-to-back|file|archive|audio|floppy|cash|banknote|brand|copy/i, bonus: -140 },
    ],
  },
  {
    priority: 90,
    slotPatterns: [/read more/i, /more link/i, /continue/i, /open article/i, /next page/i, /^next$/i],
    queryVariants: ['arrow right', 'move right', 'chevron right', 'read more', 'next'],
    iconPreferences: [
      { pattern: /^arrow[_-]?right$|^move[_-]?right$|arrow[_-]?to[_-]?right|chevron[_-]?right|right(?:_|-|$)/i, bonus: 90 },
      { pattern: /square|circle|corner|up|down|left|banknote|archive/i, bonus: -70 },
    ],
  },
  {
    slotPatterns: [/categor(?:y|ies)/i, /chips?/i, /filter/i, /topics?/i, /tags?/i],
    queryVariants: ['filter', 'category', 'tag', 'grid'],
    iconPreferences: [
      { pattern: /^filter(?:_|-|$)|(?:_|-)filter(?:_|-|$)/i, bonus: 56 },
      { pattern: /^tag(?:_|-|$)|(?:_|-)tag(?:_|-|$)|category|grid/i, bonus: 26 },
    ],
  },
  {
    slotPatterns: [/trending/i, /popular/i, /top stories/i, /hot/i],
    queryVariants: ['trending up', 'chart up', 'fire', 'popular'],
    iconPreferences: [
      { pattern: /^trending[_-]?up(?:_|-|$)|chart.*up|up.*chart/i, bonus: 62 },
      { pattern: /^fire(?:_|-|$)|flame|hot/i, bonus: 22 },
    ],
  },
  {
    slotPatterns: [/news/i, /article/i, /headline/i, /story/i, /publisher/i, /logo/i, /title/i],
    queryVariants: ['news', 'article', 'newspaper', 'headline'],
    iconPreferences: [
      { pattern: /^news(?:_|-|$)|(?:_|-)news(?:_|-|$)|newspaper|article/i, bonus: 66 },
      { pattern: /file|document|paper/i, bonus: 16 },
    ],
  },
  {
    slotPatterns: [/dashboard/i],
    queryVariants: ['dashboard', 'layout dashboard', 'grid dashboard'],
    iconPreferences: [
      { pattern: /^dashboard$|layout-dashboard|dashboard/i, bonus: 50 },
      { pattern: /grid|layout/i, bonus: 12 },
    ],
  },
  {
    slotPatterns: [/projects?/i],
    queryVariants: ['folder', 'folders', 'project folder'],
    iconPreferences: [
      { pattern: /^folders?$|(?:_|-)folders?(?:_|-|$)/i, bonus: 56 },
      { pattern: /briefcase|project/i, bonus: 12 },
    ],
  },
  {
    slotPatterns: [/tasks?/i, /todo/i, /to do/i, /checklist/i],
    queryVariants: ['list check', 'checklist', 'checkbox', 'task'],
    iconPreferences: [
      { pattern: /list-check|list_check|checkbox|checklist|clipboard-check/i, bonus: 56 },
      { pattern: /check|task/i, bonus: 16 },
    ],
  },
  {
    slotPatterns: [/team/i, /\busers\b/i, /members?/i],
    queryVariants: ['users', 'team', 'user group'],
    iconPreferences: [
      { pattern: /^users(?:_|-|$)|(?:_|-)users(?:_|-|$)|user-group|user_circle|user-circle/i, bonus: 64 },
      { pattern: /^user(?:_|-|$)|(?:_|-)user(?:_|-|$)/i, bonus: 18 },
    ],
  },
  {
    slotPatterns: [/calendar/i, /schedule/i, /events?/i],
    queryVariants: ['calendar', 'calendar event', 'schedule'],
    iconPreferences: [
      { pattern: /^calendar(?:_|-|$)|(?:_|-)calendar(?:_|-|$)/i, bonus: 54 },
      { pattern: /event|schedule/i, bonus: 18 },
    ],
  },
  {
    slotPatterns: [/\bbold\b/i],
    queryVariants: ['text b', 'bold', 'text bold'],
    iconPreferences: [
      { pattern: /^text[_-]?b$|text-bold|bold/i, bonus: 66 },
    ],
  },
  {
    slotPatterns: [/italic/i],
    queryVariants: ['text italic', 'italic'],
    iconPreferences: [
      { pattern: /^text[_-]?italic$|italic/i, bonus: 66 },
    ],
  },
  {
    priority: 130,
    slotPatterns: [/broken\s+link/i, /link\s+(broken|break|disabled|off)/i],
    queryVariants: ['broken link', 'link break', 'link slash'],
    iconPreferences: [
      { pattern: /link.*(break|broken|slash|off)|(break|broken|slash|off).*link/i, bonus: 180 },
      { pattern: /^link(?:_|-|$)|(?:_|-)link(?:_|-|$)/i, bonus: 10 },
    ],
  },
  {
    priority: 130,
    slotPatterns: [/(broken|disabled|off)\s+(image|photo|picture)/i, /(image|photo|picture)\s+(broken|disabled|off)/i],
    queryVariants: ['photo off', 'image off', 'broken image', 'image broken'],
    iconPreferences: [
      { pattern: /(image|photo|picture).*(broken|off|slash)|(broken|off|slash).*(image|photo|picture)/i, bonus: 240 },
      { pattern: /^image(?:_|-|$)|(?:_|-)image(?:_|-|$)|picture|photo/i, bonus: 10 },
    ],
  },
  {
    priority: 130,
    slotPatterns: [/(comments?|chat|discussion)\s+(off|disabled|muted|slash)/i, /(off|disabled|muted|slash)\s+(comments?|chat|discussion)/i],
    queryVariants: ['chat slash', 'comment off', 'comments off', 'message slash'],
    iconPreferences: [
      { pattern: /(chat|comment|message).*(slash|off|x)|(slash|off|x).*(chat|comment|message)/i, bonus: 180 },
      { pattern: /chat|comment|message/i, bonus: 10 },
    ],
  },
  {
    slotPatterns: [/\blink\b/i, /hyperlink/i],
    queryVariants: ['link', 'link simple', 'hyperlink'],
    iconPreferences: [
      { pattern: /^link(?:_|-|$)|(?:_|-)link(?:_|-|$)/i, bonus: 56 },
      { pattern: /chain/i, bonus: 14 },
      { pattern: /break|broken|slash|unlink|brand/i, bonus: -120 },
    ],
  },
  {
    slotPatterns: [/image/i, /photo/i, /picture/i],
    queryVariants: ['image', 'picture', 'photo'],
    iconPreferences: [
      { pattern: /^image(?:_|-|$)|(?:_|-)image(?:_|-|$)|picture|photo/i, bonus: 56 },
      { pattern: /broken|off|slash|brand/i, bonus: -120 },
    ],
  },
  {
    priority: 80,
    slotPatterns: [/comments?/i, /chat/i, /discussion/i],
    queryVariants: ['chat text', 'comments', 'message dots'],
    iconPreferences: [
      { pattern: /chat|comment|message/i, bonus: 76 },
      { pattern: /slash|off|x$|brand/i, bonus: -120 },
    ],
  },
  {
    slotPatterns: [/undo/i],
    queryVariants: ['undo', 'arrow counter clockwise', 'rotate left'],
    iconPreferences: [
      { pattern: /^undo$|arrow-counter-clockwise|arrow_counter_clockwise|rotate.*left/i, bonus: 66 },
      { pattern: /^redo$|^arrows?[_-]clockwise$|clock[_-]clockwise|arrow_clockwise|rotate.*right/i, bonus: -120 },
    ],
  },
  {
    slotPatterns: [/redo/i],
    queryVariants: ['redo', 'arrow clockwise', 'rotate right'],
    iconPreferences: [
      { pattern: /^redo$|arrow-clockwise|arrow_clockwise|rotate.*right/i, bonus: 66 },
      { pattern: /^undo$|^arrows?[_-]counter[_-]clockwise$|clock[_-]counter[_-]clockwise|arrow_counter_clockwise|rotate.*left/i, bonus: -120 },
    ],
  },
]);

const SLOT_PREFERENCE_RULES = Object.freeze({
  lucide: [
    {
      slotPatterns: [/\b(add|new|create)\s+bookmark\b/i, /\bbookmark\s+(add|new|create)\b/i],
      iconPreferences: [
        { pattern: /^bookmark-plus$/i, bonus: 500 },
        { pattern: /^bookmark$/i, bonus: 40 },
        { pattern: /waves-ladder|map-pin/i, bonus: -220 },
      ],
    },
    {
      slotPatterns: [/users/i, /team/i],
      iconPreferences: [
        { pattern: /^users$/i, bonus: 28 },
        { pattern: /^users-2$/i, bonus: 20 },
        { pattern: /^user-2$/i, bonus: -12 },
      ],
    },
    {
      slotPatterns: [/database/i, /storage/i],
      iconPreferences: [
        { pattern: /^database$/i, bonus: 48 },
        { pattern: /^database-(backup|search)$/i, bonus: 28 },
        { pattern: /^database-zap$/i, bonus: -34 },
      ],
    },
    {
      slotPatterns: [/security/i, /privacy/i, /safe/i, /protection/i],
      iconPreferences: [
        { pattern: /^shield$/i, bonus: 80 },
        { pattern: /^shield-check$/i, bonus: 76 },
        { pattern: /^lock$/i, bonus: 52 },
        { pattern: /^lock-keyhole$/i, bonus: 48 },
        { pattern: /open|unlock|ban|minus|off|slash/i, bonus: -80 },
      ],
    },
  ],
  mingcute: [
    {
      slotPatterns: [/home/i],
      iconPreferences: [
        { pattern: /^home_3_line$/i, bonus: 160 },
        { pattern: /^home_2_line$/i, bonus: 8 },
        { pattern: /^home_1_line$/i, bonus: 4 },
        { pattern: /^home_wifi_line$/i, bonus: -24 },
      ],
    },
    {
      slotPatterns: [/create/i, /add/i, /plus/i, /compose/i],
      iconPreferences: [
        { pattern: /^add_line$/i, bonus: 42 },
        { pattern: /^plus_line$/i, bonus: 10 },
        { pattern: /^add_circle_line$/i, bonus: 6 },
      ],
    },
    {
      slotPatterns: [/alerts?/i, /notification/i],
      iconPreferences: [
        { pattern: /^notification_line$/i, bonus: 36 },
        { pattern: /^notification_off_line$/i, bonus: -28 },
      ],
    },
    {
      slotPatterns: [/profile/i, /user/i, /account/i],
      iconPreferences: [
        { pattern: /^user_1_line$/i, bonus: 44 },
        { pattern: /^user_4_line$/i, bonus: -16 },
      ],
    },
    {
      slotPatterns: [/search/i],
      iconPreferences: [
        { pattern: /^search_line$/i, bonus: 70 },
        { pattern: /^search_[23]_line$/i, bonus: 18 },
        { pattern: /^search_.*_ai_line$/i, bonus: -70 },
      ],
    },
    {
      slotPatterns: [/bookmark/i, /saved?/i],
      iconPreferences: [
        { pattern: /^bookmark_line$/i, bonus: 34 },
        { pattern: /^bookmarks_line$/i, bonus: 28 },
        { pattern: /^bookmark_(add|edit|remove)_line$/i, bonus: -20 },
      ],
    },
    {
      slotPatterns: [/trending/i, /popular/i, /top stories/i],
      iconPreferences: [
        { pattern: /^trending_up_line$/i, bonus: 150 },
        { pattern: /^trending_down_line$/i, bonus: -30 },
      ],
    },
    {
      slotPatterns: [/read more/i, /continue/i, /open article/i],
      iconPreferences: [
        { pattern: /^arrow_right_line$/i, bonus: 72 },
        { pattern: /^arrow_to_right_line$/i, bonus: 40 },
        { pattern: /^align_arrow_right_line$/i, bonus: -30 },
      ],
    },
    {
      slotPatterns: [/categor(?:y|ies)/i, /chips?/i, /filter/i, /topics?/i],
      iconPreferences: [
        { pattern: /^filter_line$/i, bonus: 34 },
        { pattern: /^filter_[23]_line$/i, bonus: 22 },
        { pattern: /^tag_line$/i, bonus: 16 },
      ],
    },
    {
      slotPatterns: [/news/i, /article/i, /headline/i, /logo/i, /title/i],
      iconPreferences: [
        { pattern: /^news_line$/i, bonus: 76 },
        { pattern: /^news_2_line$/i, bonus: 46 },
        { pattern: /^appstore_line$/i, bonus: -44 },
        { pattern: /^apple_fruit_line$/i, bonus: -44 },
      ],
    },
    {
      slotPatterns: [/projects?/i],
      iconPreferences: [
        { pattern: /^folder_locked_line$/i, bonus: -70 },
      ],
    },
  ],
});

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_:]+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeToken(token) {
  const value = String(token || '').toLowerCase();
  if (value.length > 4 && value.endsWith('ies')) return `${value.slice(0, -3)}y`;
  if (value.length > 3 && value.endsWith('es')) return value.slice(0, -2);
  if (value.length > 3 && value.endsWith('s')) return value.slice(0, -1);
  return value;
}

function tokenizeText(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  const tokens = normalized.split(' ');
  return dedupe([...tokens, ...tokens.map(normalizeToken)]);
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

function stripBrandLogoWords(value) {
  return tokenizeText(value)
    .filter((token) => !BRAND_LOGO_WORDS.has(token))
    .join(' ');
}

function hasSpecificBrandTerms(value) {
  return tokenizeText(stripBrandLogoWords(value))
    .some((token) => !BRAND_LOGO_GENERIC_WORDS.has(token));
}

function isBrandLogoRecommendation(task, slot, library) {
  if (library === 'si') return true;
  const text = normalizeText(`${slot} ${task}`);
  const namesLogoOrBrand = /\b(logos?|brands?|wordmark|mark)\b/.test(text);
  return namesLogoOrBrand && hasSpecificBrandTerms(slot);
}

function buildBrandLogoQueryVariants(task, slot, library) {
  if (!isBrandLogoRecommendation(task, slot, library)) return [];

  const rawSlot = String(slot || '').trim();
  const normalizedSlot = normalizeText(slot);
  const strippedSlot = stripBrandLogoWords(slot);
  const usefulTokens = tokenizeText(strippedSlot)
    .filter((token) => !BRAND_LOGO_GENERIC_WORDS.has(token));

  return dedupe([
    rawSlot,
    normalizedSlot,
    strippedSlot,
    ...usefulTokens,
  ]);
}

function buildDirectLocalizedIntentTerms(value) {
  const text = String(value || '');
  return DIRECT_LOCALIZED_INTENT_RULES
    .filter((rule) => rule.pattern.test(text))
    .flatMap((rule) => rule.terms);
}

function buildRequestedTermSet(intentTerms = []) {
  return new Set(intentTerms.map(normalizeToken).filter(Boolean));
}

function isVariantTokenRequested(token, requestedTerms) {
  const normalizedToken = normalizeToken(token);
  if (requestedTerms.has(normalizedToken)) return true;
  const aliases = REQUESTED_VARIANT_ALIASES[normalizedToken] || [];
  return aliases.some((alias) => requestedTerms.has(normalizeToken(alias)));
}

function isIconVariantExplicitlyRequested(icon, intentTerms = []) {
  const requestedTerms = buildRequestedTermSet(intentTerms);
  return tokenizeText(icon.id).some((token) => (
    VARIANT_TOKENS.has(normalizeToken(token)) &&
    isVariantTokenRequested(token, requestedTerms)
  ));
}

function buildLocalizedVariants(value, locale) {
  if (!locale) return [];
  const expanded = expandCjkQuery(value, {
    locale,
    terms: multilingualExpansionTerms,
  });
  const variants = expanded.matched.length > 0 ? expanded.variants.slice(1) : [];
  const normalizedValue = normalizeCjkSearchText(value);
  const containedMatches = [];

  if (normalizedValue) {
    for (const record of multilingualExpansionTerms) {
      if (record.locale !== locale || record.gate !== 'auto_accept') continue;

      const recordValues = [record.term, ...(record.variants || [])]
        .map((term) => normalizeCjkSearchText(term))
        .filter(Boolean);
      const isContainedMatch = recordValues.some((term) => (
        term.length >= 2
        && (normalizedValue.includes(term) || term.includes(normalizedValue))
      ));
      if (!isContainedMatch) continue;

      const firstIndex = Math.min(
        ...recordValues
          .map((term) => normalizedValue.indexOf(term))
          .filter((index) => index >= 0)
      );
      containedMatches.push({
        index: Number.isFinite(firstIndex) ? firstIndex : Number.MAX_SAFE_INTEGER,
        concepts: record.maps_to || [],
      });
    }
  }

  containedMatches
    .sort((left, right) => left.index - right.index)
    .forEach((match) => {
      for (const concept of match.concepts) {
        const normalizedConcept = normalizeCjkSearchText(concept);
        if (normalizedConcept) variants.push(normalizedConcept);
      }
    });

  return dedupe(variants);
}

function buildSlotIntentTerms(task, slot, locale = null) {
  const taskTokens = tokenizeText(task);
  const slotTokens = tokenizeText(slot);
  const usefulSlotTokens = slotTokens.filter((token) => !GENERIC_SLOT_WORDS.has(token));
  const localizedSlotTokens = buildLocalizedVariants(slot, locale).flatMap(tokenizeText);
  const localizedTaskTokens = buildLocalizedVariants(task, locale).flatMap(tokenizeText);
  const directSlotTokens = buildDirectLocalizedIntentTerms(slot);

  const expanded = [...usefulSlotTokens];

  const usefulTaskTokens = taskTokens.filter((token) => !GENERIC_SLOT_WORDS.has(token));
  expanded.push(...usefulTaskTokens);
  expanded.push(...localizedSlotTokens);
  expanded.push(...localizedTaskTokens);
  expanded.push(...directSlotTokens);

  const variants = buildIntentQueryVariants(`${slot} ${task}`, {
    baseQuery: slot,
    maxVariants: 8,
  });
  for (const variant of variants) {
    expanded.push(...tokenizeText(variant));
  }

  const slotRuleTerms = dedupe([...usefulSlotTokens, ...localizedSlotTokens, ...directSlotTokens]);
  for (const rule of getMatchingSlotRules(slot, slotRuleTerms)) {
    for (const variant of rule.queryVariants || []) {
      expanded.push(...tokenizeText(variant));
    }
  }

  return dedupe(expanded);
}

function buildSlotQueryVariants(task, slot, locale = null) {
  const localizedSlotVariants = buildLocalizedVariants(slot, locale);
  const localizedVariants = [
    ...localizedSlotVariants,
    ...buildLocalizedVariants(`${slot} ${task}`, locale),
  ];
  const variants = buildIntentQueryVariants(`${slot} ${task}`, {
    baseQuery: slot,
    maxVariants: 8,
  });
  variants.unshift(...localizedVariants);
  const usefulSlotTokens = tokenizeText(slot).filter((token) => !GENERIC_SLOT_WORDS.has(token));
  variants.push(...usefulSlotTokens);
  const slotRuleTerms = [
    ...tokenizeText(`${slot} ${localizedSlotVariants.join(' ')}`),
    ...buildDirectLocalizedIntentTerms(slot),
  ]
    .filter((token) => !GENERIC_SLOT_WORDS.has(token));
  const ruleVariants = getMatchingSlotRules(slot, slotRuleTerms)
    .flatMap((rule) => rule.queryVariants || []);
  variants.unshift(...ruleVariants);
  return dedupe(variants).slice(0, 12);
}

function scoreLexicalFit(icon, intentTerms, slotLabel, taskLabel = '') {
  const tokens = new Set([
    ...tokenizeText(icon.id),
    ...tokenizeText(icon.name),
    ...tokenizeText(`${icon.lib}:${icon.id}`),
  ]);
  const normalizedId = normalizeText(icon.id);
  const normalizedName = normalizeText(icon.name);
  const normalizedSlot = normalizeText(slotLabel);
  const slotTerms = tokenizeText(slotLabel).filter((token) => !GENERIC_SLOT_WORDS.has(token));
  const taskTerms = tokenizeText(taskLabel).filter((token) => !GENERIC_SLOT_WORDS.has(token));

  let score = 0;
  for (const term of slotTerms) {
    if (tokens.has(term)) score += 22;
    else if (normalizedId.includes(term) || normalizedName.includes(term)) score += 14;

    if (normalizedId === term || normalizedName === term) {
      score += 24;
    }
  }

  for (const term of intentTerms) {
    if (tokens.has(term)) score += 12;
    else if (normalizedId.includes(term) || normalizedName.includes(term)) score += 7;

    if (normalizedId === term || normalizedName === term) {
      score += 14;
    }
  }

  for (const term of taskTerms) {
    if (tokens.has(term)) score += 3;
  }

  if (normalizedSlot && (normalizedId === normalizedSlot || normalizedName === normalizedSlot)) {
    score += 26;
  }

  return score;
}

function collectBrandCandidateTexts(icon, semanticRecord) {
  const semanticValues = semanticRecord ? [
    semanticRecord.label,
    semanticRecord.source_name,
    semanticRecord.slug,
    semanticRecord.name,
    semanticRecord.meaning,
    semanticRecord.purpose,
    ...(semanticRecord.aliases || []),
    ...(semanticRecord.synonyms || []),
    ...(semanticRecord.search_terms || []),
    ...(semanticRecord.semantic_tags || []),
  ] : [];

  return dedupe([
    icon.id,
    icon.name,
    `${icon.lib}:${icon.id}`,
    ...(icon.aliases || []),
    ...(icon.synonyms || []),
    ...(icon.searchTerms || []),
    ...(icon.semanticTags || []),
    ...(icon.semantic?.aliases || []),
    ...(icon.semantic?.synonyms || []),
    ...(icon.semantic?.search_terms || []),
    ...(icon.semantic?.semantic_tags || []),
    ...semanticValues,
  ].map((value) => normalizeText(value)).filter(Boolean));
}

function getBrandLogoMatchBonus(icon, semanticRecord, slotLabel, taskLabel, library) {
  if (!isBrandLogoRecommendation(taskLabel, slotLabel, library)) return 0;

  const slotCandidates = buildBrandLogoQueryVariants(taskLabel, slotLabel, library)
    .map((value) => normalizeText(value))
    .filter((value) => value.length >= 2);
  const iconCandidates = collectBrandCandidateTexts(icon, semanticRecord);
  const iconTokens = new Set(iconCandidates.flatMap(tokenizeText));
  const meaningfulSlotTokens = dedupe(
    slotCandidates
      .flatMap(tokenizeText)
      .filter((token) => !BRAND_LOGO_GENERIC_WORDS.has(token))
  );

  let best = 0;
  for (const slotCandidate of slotCandidates) {
    for (const iconCandidate of iconCandidates) {
      if (slotCandidate === iconCandidate) {
        best = Math.max(best, 360);
      } else if (slotCandidate.length >= 3 && iconCandidate.includes(slotCandidate)) {
        best = Math.max(best, 260);
      } else if (iconCandidate.length >= 3 && slotCandidate.includes(iconCandidate)) {
        best = Math.max(best, 180);
      }
    }
  }

  const overlapCount = meaningfulSlotTokens.filter((token) => iconTokens.has(token)).length;
  if (meaningfulSlotTokens.length > 0 && overlapCount === meaningfulSlotTokens.length) {
    best = Math.max(best, 220 + overlapCount * 20);
  } else {
    best = Math.max(best, overlapCount * 30);
  }

  return best;
}

function getVariantPenalty(icon, intentTerms = []) {
  const normalizedId = normalizeText(icon.id);
  const requestedTerms = buildRequestedTermSet(intentTerms);
  let penalty = 0;
  for (const rule of VARIANT_PENALTIES) {
    if (!rule.pattern.test(normalizedId)) continue;
    if (isVariantTokenRequested(rule.token, requestedTerms)) continue;
    penalty += rule.penalty;
  }
  return penalty;
}

function getBrandPenalty(icon, intentTerms = []) {
  const requestedTerms = buildRequestedTermSet(intentTerms);
  if (isVariantTokenRequested('brand', requestedTerms)) return 0;
  return icon.lib === 'simpleicons' ? 80 : 0;
}

function getMatchingSlotRules(slotLabel, intentTerms = []) {
  const rawSlotText = String(slotLabel || '');
  const slotText = normalizeText(slotLabel);
  const intentText = normalizeText(intentTerms.join(' '));
  return COMMON_SLOT_PREFERENCE_RULES
    .filter((rule) => {
      const directSlotMatch = rule.slotPatterns.some((pattern) => (
        pattern.test(slotText) ||
        pattern.test(rawSlotText)
      ));
      if (directSlotMatch) return true;

      return rule.matchIntentTerms === true &&
        rule.slotPatterns.some((pattern) => pattern.test(intentText));
    })
    .sort((left, right) => (right.priority || 0) - (left.priority || 0));
}

function scoreSlotPreferenceRules(icon, rules = [], intentTerms = []) {
  let bonus = 0;
  const explicitlyRequestedVariant = isIconVariantExplicitlyRequested(icon, intentTerms);

  for (const rule of rules) {
    for (const preference of rule.iconPreferences) {
      if (preference.pattern.test(icon.id)) {
        if (preference.bonus < 0 && explicitlyRequestedVariant) continue;
        bonus += preference.bonus;
      }
    }
  }

  return bonus;
}

function getSlotPreferenceBonus(icon, slotLabel, intentTerms, library, requestedVariantTerms = intentTerms) {
  const slotText = `${slotLabel} ${requestedVariantTerms.join(' ')}`;
  const commonRules = getMatchingSlotRules(slotLabel, requestedVariantTerms);
  const libraryRules = (SLOT_PREFERENCE_RULES[library] || [])
    .filter((rule) => rule.slotPatterns.some((pattern) => pattern.test(slotText)));

  return scoreSlotPreferenceRules(icon, commonRules, requestedVariantTerms) +
    scoreSlotPreferenceRules(icon, libraryRules, requestedVariantTerms);
}

function summarizeSemanticFit(slotLabel, semanticRecord, intentTerms) {
  if (semanticRecord?.depicts && semanticRecord?.use_when) {
    return `Strong fit for ${slotLabel}: visually reads as ${String(semanticRecord.depicts).toLowerCase()}. ${semanticRecord.use_when}`;
  }
  if (semanticRecord?.depicts) {
    return `Good fit for ${slotLabel}: visually reads as ${String(semanticRecord.depicts).toLowerCase()}.`;
  }
  if (semanticRecord?.use_when) {
    return `Strong fit for ${slotLabel}: ${semanticRecord.use_when}`;
  }
  if (intentTerms.length > 0) {
    return `Best lexical match for ${slotLabel} from the current library.`;
  }
  return `Best available match for ${slotLabel}.`;
}

function buildWhySelected(slotLabel, semanticRecord, iconResult) {
  const label = semanticRecord?.label || iconResult.name;
  if (semanticRecord?.depicts) {
    return `${label} matches ${slotLabel} and visually reads as ${String(semanticRecord.depicts).toLowerCase()}.`;
  }
  if (semanticRecord?.use_when) {
    return `${label} matches ${slotLabel}. ${semanticRecord.use_when}`;
  }
  return `${label} is the clearest match for ${slotLabel} from the current library.`;
}

function buildCandidatePayload(
  slotLabel,
  iconResult,
  semanticRecord,
  intentTerms,
  responseMode = 'plan',
  includeSvg = false,
  includeReason = true
) {
  const payload = {
    id: iconResult.id,
    library: iconResult.library,
    name: iconResult.name,
    style: iconResult.style || 'outline',
    label: semanticRecord?.label || iconResult.semantic?.label || iconResult.name,
  };

  if (includeReason) {
    payload.semantic_fit = summarizeSemanticFit(slotLabel, semanticRecord, intentTerms);
    payload.why_selected = buildWhySelected(slotLabel, semanticRecord, iconResult);
  }

  if (includeSvg) {
    payload.svg = iconResult.svg;
  }

  if (responseMode === 'full') {
    payload.semantic = buildPublicSemanticPayload(semanticRecord) || iconResult.semantic || null;
  }

  return payload;
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function getConfidence(topScore, nextScore = 0) {
  if (topScore >= 90 && topScore - nextScore >= 20) {
    return { level: 'high', score: topScore };
  }
  if (topScore >= 45) {
    return { level: 'medium', score: topScore };
  }
  return { level: 'low', score: topScore };
}

function buildLowConfidenceHint(slotLabel, queriesUsed) {
  return `Low confidence for ${slotLabel}. Try search_icons with: ${queriesUsed.slice(0, 3).join(', ')}.`;
}

function buildClarificationHint(slotLabel) {
  return `Choose the intended meaning for ${slotLabel}, then request recommendations again with that context.`;
}

function normalizeResponseMode(responseMode) {
  if (responseMode === 'assets' || responseMode === 'full') return responseMode;
  return 'plan';
}

const MAX_GROUPED_RECOMMENDATION_QUERIES = 40;

function buildGroupedRecommendationQueryKey(request) {
  return JSON.stringify([
    String(request.query || '').trim().toLowerCase(),
    String(request.library || '').trim().toLowerCase(),
    String(request.style || 'any').trim().toLowerCase(),
    Number(request.limit) || 0,
    String(request.locale || '').trim().toLowerCase(),
  ]);
}

function isNoisyAlternative(entry) {
  return entry.variantPenalty >= 12 || entry.brandPenalty >= 12 || entry.slotPreferenceBonus < 0;
}

export async function recommendIconsForTask({
  task,
  library,
  style = 'any',
  locale = null,
  slots,
  limitPerSlot = 3,
  responseMode = 'plan',
  includeQueryFrame = false,
  searchIconsForQuery,
  searchIconsForQueries = null,
  buildIconResult,
  semanticMap,
}) {
  const normalizedResponseMode = normalizeResponseMode(responseMode);
  const taskQueryFrame = includeQueryFrame ? buildSearchQueryFrame(task, { locale }) : null;
  const groupedVariantLimit = typeof searchIconsForQueries === 'function'
    ? Math.max(1, Math.floor(MAX_GROUPED_RECOMMENDATION_QUERIES / Math.max(1, slots.length)))
    : null;
  const slotPlans = slots.map((slotLabel, slotIndex) => {
    const interpretationFrame = buildSearchQueryFrame(slotLabel, { locale, context: task });
    if (interpretationFrame.needs_clarification) {
      return {
        slotIndex,
        slot: slotLabel,
        queries_used: [],
        intentTerms: [],
        requestedVariantTerms: [],
        interpretationFrame,
        queryFrame: includeQueryFrame ? interpretationFrame : null,
      };
    }
    const intentTerms = buildSlotIntentTerms(task, slotLabel, locale);
    const requestedVariantTerms = dedupe([
      ...tokenizeText(slotLabel),
      ...buildLocalizedVariants(slotLabel, locale).flatMap(tokenizeText),
      ...buildDirectLocalizedIntentTerms(slotLabel),
    ]);
    const defaultVariantLimit = getRecommendationQueryVariantLimit(locale);
    const queryVariantLimit = groupedVariantLimit === null
      ? defaultVariantLimit
      : Math.min(defaultVariantLimit, groupedVariantLimit);
    const queryVariants = dedupe([
      ...buildBrandLogoQueryVariants(task, slotLabel, library),
      ...buildSlotQueryVariants(task, slotLabel, locale),
    ]).slice(0, queryVariantLimit);

    return {
      slotIndex,
      slot: slotLabel,
      queries_used: queryVariants,
      intentTerms,
      requestedVariantTerms,
      interpretationFrame,
      queryFrame: includeQueryFrame ? interpretationFrame : null,
    };
  });

  const groupedResultsBySlot = new Map();
  if (typeof searchIconsForQueries === 'function') {
    const groupedRequests = [];
    const groupedLocations = [];
    const groupedRequestIndexes = new Map();
    for (const plan of slotPlans) {
      if (plan.interpretationFrame.needs_clarification) continue;
      for (const [variantIndex, query] of plan.queries_used.entries()) {
        const request = {
          query,
          library,
          style,
          limit: Math.max(limitPerSlot * 5, 10),
          locale,
        };
        const requestKey = buildGroupedRecommendationQueryKey(request);
        let requestIndex = groupedRequestIndexes.get(requestKey);
        if (requestIndex === undefined) {
          requestIndex = groupedRequests.length;
          groupedRequestIndexes.set(requestKey, requestIndex);
          groupedRequests.push(request);
        }
        groupedLocations.push({ slotIndex: plan.slotIndex, variantIndex, requestIndex });
      }
    }

    let groupedResults = [];
    if (groupedRequests.length > 0) {
      const received = await searchIconsForQueries(groupedRequests);
      if (!Array.isArray(received) || received.length !== groupedRequests.length) {
        const error = new Error('Grouped recommendation search returned an incomplete response.');
        error.code = 'grouped_recommendation_invalid_response';
        error.status = 502;
        error.retryable = true;
        throw error;
      }
      groupedResults = received;
    }

    for (const plan of slotPlans) {
      groupedResultsBySlot.set(
        plan.slotIndex,
        Array.from({ length: plan.queries_used.length }, () => []),
      );
    }
    for (const location of groupedLocations) {
      const slotGroups = groupedResultsBySlot.get(location.slotIndex);
      slotGroups[location.variantIndex] = Array.isArray(groupedResults[location.requestIndex])
        ? groupedResults[location.requestIndex]
        : [];
    }
  }

  const scoredSlotResults = await mapWithConcurrency(slotPlans, SLOT_SEARCH_CONCURRENCY, async (plan) => {
    const {
      slot: slotLabel,
      queries_used: queryVariants,
      intentTerms,
      requestedVariantTerms,
      interpretationFrame,
      queryFrame,
    } = plan;
    if (interpretationFrame.needs_clarification) {
      return {
        slot: slotLabel,
        queries_used: [],
        intentTerms: [],
        requestedVariantTerms: [],
        interpretationFrame,
        queryFrame,
        scored: [],
      };
    }

    const pooledIcons = [];
    const seen = new Set();
    const resultGroups = typeof searchIconsForQueries === 'function'
      ? groupedResultsBySlot.get(plan.slotIndex)
      : await mapWithConcurrency(queryVariants, SLOT_QUERY_CONCURRENCY, async (queryVariant) => {
        try {
          return await searchIconsForQuery({
            query: queryVariant,
            library,
            style,
            limit: Math.max(limitPerSlot * 5, 10),
            locale,
          });
        } catch {
          return [];
        }
      });

    for (const results of resultGroups) {
      for (const icon of results) {
        const key = `${icon.lib}:${icon.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pooledIcons.push(icon);
      }
    }

    const scored = pooledIcons
      .map((icon, index) => {
        const semanticRecord = getSemanticRecordForIcon(semanticMap, icon);
        const semanticQuery = queryVariants.join(' ');
        const semanticScore = semanticRecord ? scoreSemanticAlignment(semanticQuery, semanticRecord) * 3 : 0;
        const lexicalScore = scoreLexicalFit(icon, intentTerms, slotLabel, task);
        const brandLogoMatchBonus = getBrandLogoMatchBonus(icon, semanticRecord, slotLabel, task, library);
        const semanticBonus = semanticRecord ? 6 : 0;
        const variantPenalty = getVariantPenalty(icon, requestedVariantTerms);
        const brandPenalty = getBrandPenalty(icon, requestedVariantTerms);
        const slotPreferenceBonus = getSlotPreferenceBonus(icon, slotLabel, intentTerms, library, requestedVariantTerms);
        const intentProfile = buildSearchIntentProfile(`${slotLabel} ${task}`);
        const intentAdjustment = getIntentCandidateAdjustment(icon, intentProfile);

        return {
          icon,
          index,
          semanticRecord,
          variantPenalty,
          brandPenalty,
          slotPreferenceBonus,
          totalScore:
            semanticScore +
            lexicalScore +
            brandLogoMatchBonus +
            semanticBonus +
            slotPreferenceBonus +
            intentAdjustment.boost -
            intentAdjustment.penalty -
            variantPenalty -
            brandPenalty,
        };
      })
      .filter((entry) => entry.totalScore > 0)
      .sort((left, right) => {
        if (right.totalScore !== left.totalScore) return right.totalScore - left.totalScore;
        if (right.slotPreferenceBonus !== left.slotPreferenceBonus) {
          return right.slotPreferenceBonus - left.slotPreferenceBonus;
        }
        return left.index - right.index;
      })
      .slice(0, Math.max(limitPerSlot * 3, 8));

    return {
      slot: slotLabel,
      queries_used: queryVariants,
      intentTerms,
      requestedVariantTerms,
      interpretationFrame,
      queryFrame,
      scored,
    };
  });

  const usedIconKeys = new Set();
  const slotResults = [];
  for (const slotResult of scoredSlotResults) {
    if (slotResult.interpretationFrame.needs_clarification) {
      const slotPayload = {
        slot: slotResult.slot,
        confidence: { level: 'low' },
        recommended: null,
        alternatives: [],
        needs_clarification: true,
        interpretations: slotResult.interpretationFrame.interpretations,
        guidance: buildClarificationHint(slotResult.slot),
      };
      if (includeQueryFrame && slotResult.queryFrame) {
        slotPayload.query_frame = slotResult.queryFrame;
      }
      slotResults.push(slotPayload);
      continue;
    }

    const sorted = [...slotResult.scored].sort((left, right) => {
      const leftKey = `${left.icon.lib}:${left.icon.id}`;
      const rightKey = `${right.icon.lib}:${right.icon.id}`;
      const leftDuplicatePenalty = usedIconKeys.has(leftKey) ? 80 : 0;
      const rightDuplicatePenalty = usedIconKeys.has(rightKey) ? 80 : 0;
      const leftScore = left.totalScore - leftDuplicatePenalty;
      const rightScore = right.totalScore - rightDuplicatePenalty;

      if (rightScore !== leftScore) return rightScore - leftScore;
      return left.index - right.index;
    });
    const selectedEntries = [];
    const primaryEntry = sorted.find((entry) => (
      !isNoisyAlternative(entry) &&
      !usedIconKeys.has(`${entry.icon.lib}:${entry.icon.id}`)
    )) || sorted.find((entry) => !isNoisyAlternative(entry)) || sorted[0];
    if (primaryEntry) {
      selectedEntries.push(primaryEntry);
    }
    for (const entry of sorted) {
      if (selectedEntries.length >= limitPerSlot) break;
      if (selectedEntries.includes(entry)) continue;
      if (isNoisyAlternative(entry)) continue;
      selectedEntries.push(entry);
    }
    const preparedCandidates = [];
    const preparedEntries = [];
    for (const [candidateIndex, entry] of selectedEntries.entries()) {
      const iconResult = await buildIconResult(entry.icon, { style });
      if (!iconResult?.svg) continue;
      const includeSvg = normalizedResponseMode === 'full' || (normalizedResponseMode === 'assets' && candidateIndex === 0);
      preparedCandidates.push(buildCandidatePayload(
        slotResult.slot,
        iconResult,
        entry.semanticRecord,
        slotResult.intentTerms,
        normalizedResponseMode,
        includeSvg,
        normalizedResponseMode !== 'plan' || candidateIndex === 0
      ));
      preparedEntries.push(entry);
    }
    const chosen = preparedEntries[0] || primaryEntry || null;
    if (chosen) {
      usedIconKeys.add(`${chosen.icon.lib}:${chosen.icon.id}`);
    }
    const confidence = chosen
      ? getConfidence(chosen.totalScore, sorted[1]?.totalScore || 0)
      : { level: 'low', score: 0 };

    const slotPayload = {
      slot: slotResult.slot,
      confidence,
      recommended: preparedCandidates[0] || null,
      alternatives: preparedCandidates.slice(1),
    };
    if (includeQueryFrame && slotResult.queryFrame) {
      slotPayload.query_frame = slotResult.queryFrame;
    }
    if (confidence.level === 'low') {
      slotPayload.guidance = buildLowConfidenceHint(slotResult.slot, slotResult.queries_used);
    }
    if (normalizedResponseMode !== 'plan') {
      slotPayload.queries_used = slotResult.queries_used;
    }
    slotResults.push(slotPayload);
  }

  const lowConfidenceSlots = slotResults
    .filter((slot) => !slot.recommended || slot.confidence?.level === 'low')
    .map((slot) => slot.slot);
  const clarificationSlots = slotResults
    .filter((slot) => slot.needs_clarification)
    .map((slot) => slot.slot);
  const allSlotsResolved = slotResults.every((slot) => Boolean(slot.recommended) && !slot.needs_clarification);

  const payload = {
    task,
    library: library || 'all',
    style,
    response_mode: normalizedResponseMode,
    slot_count: slots.length,
    all_slots_resolved: allSlotsResolved,
    needs_clarification: clarificationSlots.length > 0,
    clarification_slots: clarificationSlots,
    low_confidence_slots: lowConfidenceSlots,
    fallback_recommended: !allSlotsResolved || lowConfidenceSlots.length > 0,
    results: slotResults,
  };

  if (includeQueryFrame && taskQueryFrame) {
    payload.query_frame = taskQueryFrame;
  }

  return payload;
}
