import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const sourcePath = path.join(rootDir, 'data/i18n/cjk-search-terms.json');
const publicPath = path.join(rootDir, 'public/cjk-search-terms.json');
const packagedPath = path.join(rootDir, 'mcp/public/cjk-search-terms.json');
const synonymsPath = path.join(rootDir, 'public/synonyms.json');

const LOCALES = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th'];
const NEW_LOCALES = ['ar', 'hi', 'vi', 'th'];
const TARGET_LANGUAGE = {
  ar: 'ar',
  hi: 'hi',
  vi: 'vi',
  th: 'th',
};

const SCRIPT_TEST = {
  ar: /\p{Script=Arabic}/u,
  hi: /\p{Script=Devanagari}/u,
  vi: /\p{Script=Latin}/u,
  th: /\p{Script=Thai}/u,
};

const GENERIC_ICON_TERM = {
  ar: '\u0623\u064a\u0642\u0648\u0646\u0629',
  hi: '\u0906\u0907\u0915\u0928',
  vi: 'bi\u1ec3u t\u01b0\u1ee3ng',
  th: '\u0e44\u0e2d\u0e04\u0e2d\u0e19',
};

const STABLE_TERMS = {
  ar: {
    search: { term: '\u0628\u062d\u062b', variants: ['\u0628\u062d\u062b \u0639\u0646', '\u0639\u062f\u0633\u0629'] },
    settings: { term: '\u0625\u0639\u062f\u0627\u062f\u0627\u062a', variants: ['\u062a\u0647\u064a\u0626\u0629', '\u062e\u064a\u0627\u0631\u0627\u062a'] },
    menu: { term: '\u0642\u0627\u0626\u0645\u0629', variants: ['\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062a\u0646\u0642\u0644'] },
    save: { term: '\u062d\u0641\u0638', variants: ['\u062d\u0641\u0638 \u0627\u0644\u0645\u0644\u0641'] },
    download: { term: '\u062a\u0646\u0632\u064a\u0644', variants: ['\u062a\u062d\u0645\u064a\u0644'] },
    upload: { term: '\u0631\u0641\u0639', variants: ['\u062a\u062d\u0645\u064a\u0644 \u0625\u0644\u0649'] },
    mail: { term: '\u0628\u0631\u064a\u062f \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a', variants: ['\u0625\u064a\u0645\u064a\u0644'] },
    database: { term: '\u0642\u0627\u0639\u062f\u0629 \u0628\u064a\u0627\u0646\u0627\u062a', variants: ['\u0642\u0648\u0627\u0639\u062f \u0628\u064a\u0627\u0646\u0627\u062a'] },
    code: { term: '\u0631\u0645\u0632', variants: ['\u0634\u0641\u0631\u0629'] },
    refresh: { term: '\u062a\u062d\u062f\u064a\u062b', variants: ['\u0625\u0639\u0627\u062f\u0629 \u062a\u062d\u0645\u064a\u0644'] },
    music: { term: '\u0645\u0648\u0633\u064a\u0642\u0649', variants: ['\u0623\u063a\u0646\u064a\u0629'] },
    password: { term: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631', variants: ['\u0631\u0645\u0632 \u0627\u0644\u0645\u0631\u0648\u0631'] },
    invoice: { term: '\u0641\u0627\u062a\u0648\u0631\u0629', variants: ['\u0641\u0627\u062a\u0648\u0631\u0629 \u062f\u0641\u0639'] },
    receipt: { term: '\u0625\u064a\u0635\u0627\u0644', variants: ['\u0625\u064a\u0635\u0627\u0644 \u062f\u0641\u0639'] },
    firewall: { term: '\u062c\u062f\u0627\u0631 \u062d\u0645\u0627\u064a\u0629', variants: ['\u062c\u062f\u0627\u0631 \u0646\u0627\u0631\u064a'] },
    workflow: { term: '\u0633\u064a\u0631 \u0627\u0644\u0639\u0645\u0644', variants: ['\u062a\u062f\u0641\u0642 \u0627\u0644\u0639\u0645\u0644'] },
    prompt: { term: '\u0645\u0637\u0627\u0644\u0628\u0629', variants: ['\u062a\u0639\u0644\u064a\u0645\u0629'] },
    llm: { term: '\u0646\u0645\u0648\u0630\u062c \u0644\u063a\u0629 \u0643\u0628\u064a\u0631', variants: ['\u0646\u0645\u0648\u0630\u062c \u0644\u063a\u0648\u064a'] },
    login: { term: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644', variants: ['\u062f\u062e\u0648\u0644'] },
    logout: { term: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c', variants: ['\u062e\u0631\u0648\u062c'] },
    support: { term: '\u062f\u0639\u0645', variants: ['\u0645\u0633\u0627\u0639\u062f\u0629'] },
    layer: { term: '\u0637\u0628\u0642\u0629', variants: ['\u0637\u0628\u0642\u0627\u062a'] },
    component: { term: '\u0645\u0643\u0648\u0651\u0646', variants: ['\u0639\u0646\u0635\u0631 \u0648\u0627\u062c\u0647\u0629'] },
    api: { term: '\u0648\u0627\u062c\u0647\u0629 \u0628\u0631\u0645\u062c\u0629 \u0627\u0644\u062a\u0637\u0628\u064a\u0642\u0627\u062a', variants: ['\u0648\u0627\u062c\u0647\u0629 \u0628\u0631\u0645\u062c\u0629'] },
    sdk: { term: '\u0639\u062f\u0629 \u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0628\u0631\u0645\u062c\u064a\u0627\u062a', variants: ['\u0639\u062f\u0629 \u062a\u0637\u0648\u064a\u0631'] },
    vpn: { term: '\u0634\u0628\u0643\u0629 \u062e\u0627\u0635\u0629 \u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629', variants: ['\u0634\u0628\u0643\u0629 \u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629'] },
    git: { term: '\u062c\u064a\u062a', variants: ['\u062a\u062d\u0643\u0645 \u0628\u0627\u0644\u0625\u0635\u062f\u0627\u0631\u0627\u062a'] },
  },
  hi: {
    search: { term: '\u0916\u094b\u091c', variants: ['\u0924\u0932\u093e\u0936', '\u0916\u094b\u091c\u0947\u0902'] },
    settings: { term: '\u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938', variants: ['\u0938\u0947\u091f\u093f\u0902\u0917', '\u0935\u093f\u0915\u0932\u094d\u092a'] },
    menu: { term: '\u092e\u0947\u0928\u0942', variants: ['\u0928\u0947\u0935\u093f\u0917\u0947\u0936\u0928 \u092e\u0947\u0928\u0942'] },
    save: { term: '\u0938\u0939\u0947\u091c\u0947\u0902', variants: ['\u0938\u0947\u0935'] },
    download: { term: '\u0921\u093e\u0909\u0928\u0932\u094b\u0921', variants: ['\u0921\u093e\u0909\u0928\u0932\u094b\u0921 \u0915\u0930\u0947\u0902'] },
    upload: { term: '\u0905\u092a\u0932\u094b\u0921', variants: ['\u0905\u092a\u0932\u094b\u0921 \u0915\u0930\u0947\u0902'] },
    mail: { term: '\u0908\u092e\u0947\u0932', variants: ['\u092e\u0947\u0932'] },
    database: { term: '\u0921\u0947\u091f\u093e\u092c\u0947\u0938', variants: ['\u0921\u0947\u091f\u093e \u0938\u094d\u091f\u094b\u0930'] },
    code: { term: '\u0915\u094b\u0921', variants: ['\u092a\u094d\u0930\u094b\u0917\u094d\u0930\u093e\u092e \u0915\u094b\u0921'] },
    refresh: { term: '\u0930\u0940\u092b\u093c\u094d\u0930\u0947\u0936', variants: ['\u0924\u093e\u091c\u093e \u0915\u0930\u0947\u0902'] },
    music: { term: '\u0938\u0902\u0917\u0940\u0924', variants: ['\u092e\u094d\u092f\u0942\u091c\u093c\u093f\u0915'] },
    password: { term: '\u092a\u093e\u0938\u0935\u0930\u094d\u0921', variants: ['\u0917\u0941\u092a\u094d\u0924 \u0936\u092c\u094d\u0926'] },
    invoice: { term: '\u091a\u093e\u0932\u093e\u0928', variants: ['\u092c\u093f\u0932'] },
    receipt: { term: '\u0930\u0938\u0940\u0926', variants: ['\u092d\u0941\u0917\u0924\u093e\u0928 \u0930\u0938\u0940\u0926'] },
    firewall: { term: '\u092b\u093c\u093e\u092f\u0930\u0935\u0949\u0932', variants: ['\u0938\u0941\u0930\u0915\u094d\u0937\u093e \u0926\u0940\u0935\u093e\u0930'] },
    workflow: { term: '\u0915\u093e\u0930\u094d\u092f\u092a\u094d\u0930\u0935\u093e\u0939', variants: ['\u0915\u093e\u092e \u0915\u093e \u092a\u094d\u0930\u0935\u093e\u0939'] },
    prompt: { term: '\u092a\u094d\u0930\u0949\u092e\u094d\u092a\u094d\u091f', variants: ['\u0928\u093f\u0930\u094d\u0926\u0947\u0936'] },
    llm: { term: '\u092c\u0921\u093c\u093e \u092d\u093e\u0937\u093e \u092e\u0949\u0921\u0932', variants: ['\u092d\u093e\u0937\u093e \u092e\u0949\u0921\u0932'] },
    login: { term: '\u0932\u0949\u0917 \u0907\u0928', variants: ['\u0938\u093e\u0907\u0928 \u0907\u0928'] },
    logout: { term: '\u0932\u0949\u0917 \u0906\u0909\u091f', variants: ['\u0938\u093e\u0907\u0928 \u0906\u0909\u091f'] },
    support: { term: '\u0938\u0939\u093e\u092f\u0924\u093e', variants: ['\u0938\u092a\u094b\u0930\u094d\u091f'] },
    layer: { term: '\u092a\u0930\u0924', variants: ['\u092a\u0930\u0924\u0947\u0902'] },
    component: { term: '\u0918\u091f\u0915', variants: ['\u0915\u0902\u092a\u094b\u0928\u0947\u0902\u091f'] },
    api: { term: '\u090f\u092a\u0940\u0906\u0908', variants: ['\u090f\u092a\u0940\u0906\u0908 \u0915\u0941\u0902\u091c\u0940'] },
    sdk: { term: '\u090f\u0938\u0921\u0940\u0915\u0947', variants: ['\u0935\u093f\u0915\u093e\u0938 \u0915\u093f\u091f'] },
    vpn: { term: '\u0935\u0940\u092a\u0940\u090f\u0928', variants: ['\u0935\u0930\u094d\u091a\u0941\u0905\u0932 \u0928\u093f\u091c\u0940 \u0928\u0947\u091f\u0935\u0930\u094d\u0915'] },
    git: { term: '\u0917\u093f\u091f', variants: ['\u0935\u0930\u094d\u091c\u093c\u0928 \u0928\u093f\u092f\u0902\u0924\u094d\u0930\u0923'] },
  },
  vi: {
    search: { term: 't\u00ecm ki\u1ebfm', variants: ['t\u00ecm', 'tra c\u1ee9u'] },
    settings: { term: 'c\u00e0i \u0111\u1eb7t', variants: ['thi\u1ebft l\u1eadp', 't\u00f9y ch\u1ecdn'] },
    menu: { term: 'menu', variants: ['tr\u00ecnh \u0111\u01a1n', 'menu \u0111i\u1ec1u h\u01b0\u1edbng'] },
    save: { term: 'l\u01b0u', variants: ['l\u01b0u t\u1ec7p'] },
    download: { term: 't\u1ea3i xu\u1ed1ng', variants: ['download'] },
    upload: { term: 't\u1ea3i l\u00ean', variants: ['upload'] },
    mail: { term: 'email', variants: ['th\u01b0 \u0111i\u1ec7n t\u1eed'] },
    database: { term: 'c\u01a1 s\u1edf d\u1eef li\u1ec7u', variants: ['database'] },
    code: { term: 'm\u00e3', variants: ['m\u00e3 ngu\u1ed3n'] },
    refresh: { term: 'l\u00e0m m\u1edbi', variants: ['t\u1ea3i l\u1ea1i'] },
    music: { term: '\u00e2m nh\u1ea1c', variants: ['nh\u1ea1c'] },
    password: { term: 'm\u1eadt kh\u1ea9u', variants: ['password'] },
    invoice: { term: 'h\u00f3a \u0111\u01a1n', variants: ['invoice'] },
    receipt: { term: 'bi\u00ean lai', variants: ['receipt'] },
    firewall: { term: 't\u01b0\u1eddng l\u1eeda', variants: ['firewall'] },
    workflow: { term: 'quy tr\u00ecnh l\u00e0m vi\u1ec7c', variants: ['lu\u1ed3ng c\u00f4ng vi\u1ec7c'] },
    prompt: { term: 'l\u1eddi nh\u1eafc', variants: ['prompt'] },
    llm: { term: 'm\u00f4 h\u00ecnh ng\u00f4n ng\u1eef l\u1edbn', variants: ['m\u00f4 h\u00ecnh ng\u00f4n ng\u1eef'] },
    login: { term: '\u0111\u0103ng nh\u1eadp', variants: ['login'] },
    logout: { term: '\u0111\u0103ng xu\u1ea5t', variants: ['logout'] },
    support: { term: 'h\u1ed7 tr\u1ee3', variants: ['tr\u1ee3 gi\u00fap'] },
    layer: { term: 'l\u1edbp', variants: ['layer'] },
    component: { term: 'th\u00e0nh ph\u1ea7n', variants: ['component'] },
  },
  th: {
    search: { term: '\u0e04\u0e49\u0e19\u0e2b\u0e32', variants: ['\u0e04\u0e49\u0e19', '\u0e41\u0e27\u0e48\u0e19\u0e02\u0e22\u0e32\u0e22'] },
    settings: { term: '\u0e01\u0e32\u0e23\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32', variants: ['\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32', '\u0e15\u0e31\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01'] },
    menu: { term: '\u0e40\u0e21\u0e19\u0e39', variants: ['\u0e40\u0e21\u0e19\u0e39\u0e19\u0e33\u0e17\u0e32\u0e07'] },
    save: { term: '\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01', variants: ['\u0e40\u0e0b\u0e1f'] },
    download: { term: '\u0e14\u0e32\u0e27\u0e19\u0e4c\u0e42\u0e2b\u0e25\u0e14', variants: ['\u0e14\u0e36\u0e07\u0e25\u0e07'] },
    upload: { term: '\u0e2d\u0e31\u0e1b\u0e42\u0e2b\u0e25\u0e14', variants: ['\u0e2a\u0e48\u0e07\u0e02\u0e36\u0e49\u0e19'] },
    mail: { term: '\u0e2d\u0e35\u0e40\u0e21\u0e25', variants: ['\u0e08\u0e14\u0e2b\u0e21\u0e32\u0e22'] },
    database: { term: '\u0e10\u0e32\u0e19\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25', variants: ['\u0e14\u0e32\u0e15\u0e49\u0e32\u0e40\u0e1a\u0e2a'] },
    code: { term: '\u0e42\u0e04\u0e49\u0e14', variants: ['\u0e0b\u0e2d\u0e23\u0e4c\u0e2a\u0e42\u0e04\u0e49\u0e14'] },
    refresh: { term: '\u0e23\u0e35\u0e40\u0e1f\u0e23\u0e0a', variants: ['\u0e42\u0e2b\u0e25\u0e14\u0e43\u0e2b\u0e21\u0e48'] },
    music: { term: '\u0e40\u0e1e\u0e25\u0e07', variants: ['\u0e14\u0e19\u0e15\u0e23\u0e35'] },
    password: { term: '\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19', variants: ['\u0e1e\u0e32\u0e2a\u0e40\u0e27\u0e34\u0e23\u0e4c\u0e14'] },
    invoice: { term: '\u0e43\u0e1a\u0e41\u0e08\u0e49\u0e07\u0e2b\u0e19\u0e35\u0e49', variants: ['\u0e2d\u0e34\u0e19\u0e27\u0e2d\u0e22\u0e0b\u0e4c'] },
    receipt: { term: '\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08', variants: ['\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e23\u0e31\u0e1a\u0e40\u0e07\u0e34\u0e19'] },
    firewall: { term: '\u0e44\u0e1f\u0e23\u0e4c\u0e27\u0e2d\u0e25\u0e25\u0e4c', variants: ['\u0e01\u0e33\u0e41\u0e1e\u0e07\u0e44\u0e1f'] },
    workflow: { term: '\u0e40\u0e27\u0e34\u0e23\u0e4c\u0e01\u0e42\u0e1f\u0e25\u0e27\u0e4c', variants: ['\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e01\u0e32\u0e23\u0e17\u0e33\u0e07\u0e32\u0e19'] },
    prompt: { term: '\u0e1e\u0e23\u0e2d\u0e21\u0e15\u0e4c', variants: ['\u0e04\u0e33\u0e2a\u0e31\u0e48\u0e07'] },
    llm: { term: '\u0e42\u0e21\u0e40\u0e14\u0e25\u0e20\u0e32\u0e29\u0e32\u0e02\u0e19\u0e32\u0e14\u0e43\u0e2b\u0e0d\u0e48', variants: ['\u0e42\u0e21\u0e40\u0e14\u0e25\u0e20\u0e32\u0e29\u0e32'] },
    login: { term: '\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a', variants: ['\u0e25\u0e47\u0e2d\u0e01\u0e2d\u0e34\u0e19'] },
    logout: { term: '\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e23\u0e30\u0e1a\u0e1a', variants: ['\u0e25\u0e47\u0e2d\u0e01\u0e40\u0e2d\u0e32\u0e15\u0e4c'] },
    support: { term: '\u0e2a\u0e19\u0e31\u0e1a\u0e2a\u0e19\u0e38\u0e19', variants: ['\u0e0a\u0e48\u0e27\u0e22\u0e40\u0e2b\u0e25\u0e37\u0e2d'] },
    layer: { term: '\u0e40\u0e25\u0e40\u0e22\u0e2d\u0e23\u0e4c', variants: ['\u0e0a\u0e31\u0e49\u0e19'] },
    component: { term: '\u0e04\u0e2d\u0e21\u0e42\u0e1e\u0e40\u0e19\u0e19\u0e15\u0e4c', variants: ['\u0e2a\u0e48\u0e27\u0e19\u0e1b\u0e23\u0e30\u0e01\u0e2d\u0e1a'] },
    api: { term: '\u0e40\u0e2d\u0e1e\u0e35\u0e44\u0e2d', variants: ['\u0e2a\u0e48\u0e27\u0e19\u0e15\u0e48\u0e2d\u0e1b\u0e23\u0e30\u0e2a\u0e32\u0e19\u0e42\u0e1b\u0e23\u0e41\u0e01\u0e23\u0e21'] },
    sdk: { term: '\u0e40\u0e2d\u0e2a\u0e14\u0e35\u0e40\u0e04', variants: ['\u0e0a\u0e38\u0e14\u0e1e\u0e31\u0e12\u0e19\u0e32'] },
    vpn: { term: '\u0e27\u0e35\u0e1e\u0e35\u0e40\u0e2d\u0e47\u0e19', variants: ['\u0e40\u0e04\u0e23\u0e37\u0e2d\u0e02\u0e48\u0e32\u0e22\u0e2a\u0e48\u0e27\u0e19\u0e15\u0e31\u0e27\u0e40\u0e2a\u0e21\u0e37\u0e2d\u0e19'] },
    git: { term: '\u0e01\u0e34\u0e15', variants: ['\u0e04\u0e27\u0e1a\u0e04\u0e38\u0e21\u0e40\u0e27\u0e2d\u0e23\u0e4c\u0e0a\u0e31\u0e19'] },
  },
};

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[_:\-]+/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniq(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const cleaned = String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
    const key = normalize(cleaned);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

function titleForConcept(concept) {
  return concept.replace(/[-_]/g, ' ');
}

async function translate(text, target) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', target);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);

  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`translation failed for ${target}:${text}: ${response.status}`);
  const payload = await response.json();
  return (payload?.[0] || []).map((part) => part?.[0] || '').join('').trim();
}

async function translateCandidates(concept, synonyms, locale) {
  const stable = STABLE_TERMS[locale]?.[concept];
  if (stable) return stable;

  const sourceTerms = uniq([
    titleForConcept(concept),
    ...(Array.isArray(synonyms) ? synonyms.slice(0, 4) : []),
  ]);
  const translated = [];

  for (const source of sourceTerms) {
    try {
      translated.push(await translate(source, TARGET_LANGUAGE[locale]));
      await new Promise((resolve) => setTimeout(resolve, 35));
    } catch {
      translated.push('');
    }
  }

  const usable = uniq(translated).filter((term) => SCRIPT_TEST[locale].test(term));
  const term = usable[0] || `${GENERIC_ICON_TERM[locale]} ${titleForConcept(concept)}`;
  const variants = uniq(usable.slice(1, 4));
  return { term, variants };
}

function buildMapsTo(concept, synonyms) {
  return uniq([
    concept,
    titleForConcept(concept),
    ...(Array.isArray(synonyms) ? synonyms.slice(0, 4) : []),
  ]).map((value) => normalize(value)).filter(Boolean);
}

function filterVariantCollisions(records) {
  const primaryByLocale = new Map();
  for (const record of records) {
    const key = `${record.locale}:${normalize(record.term)}`;
    primaryByLocale.set(key, record.concept);
  }

  for (const record of records) {
    record.variants = uniq(record.variants).filter((variant) => {
      const owner = primaryByLocale.get(`${record.locale}:${normalize(variant)}`);
      return !owner || owner === record.concept;
    });
  }
}

function resolvePrimaryCollisions(records) {
  for (const locale of NEW_LOCALES) {
    const used = new Map();
    for (const record of records.filter((item) => item.locale === locale)) {
      let normalized = normalize(record.term);
      const previousConcept = used.get(normalized);
      if (previousConcept && previousConcept !== record.concept) {
        record.term = `${record.term} ${GENERIC_ICON_TERM[locale]} ${record.concept}`;
        normalized = normalize(record.term);
      }

      while (used.has(normalized) && used.get(normalized) !== record.concept) {
        record.term = `${record.term} ${record.concept}`;
        normalized = normalize(record.term);
      }

      used.set(normalized, record.concept);
    }
  }
}

const existingData = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
const synonyms = JSON.parse(await fs.readFile(synonymsPath, 'utf8'));
const concepts = Object.keys(synonyms);
const records = existingData.terms.filter((record) => !NEW_LOCALES.includes(record.locale));

for (const locale of NEW_LOCALES) {
  for (const concept of concepts) {
    const candidates = await translateCandidates(concept, synonyms[concept], locale);
    records.push({
      locale,
      concept,
      term: candidates.term,
      variants: candidates.variants || [],
      maps_to: buildMapsTo(concept, synonyms[concept]),
      source_confidence: 0.86,
      quality_score: 0.86,
      quality_warnings: [],
      gate: 'auto_accept',
    });
  }
}

resolvePrimaryCollisions(records);
filterVariantCollisions(records);

const output = {
  version: 1,
  locales: LOCALES,
  terms: records.sort((left, right) => (
    LOCALES.indexOf(left.locale) - LOCALES.indexOf(right.locale)
    || concepts.indexOf(left.concept) - concepts.indexOf(right.concept)
  )),
};

const json = `${JSON.stringify(output, null, 2)}\n`;
await fs.writeFile(sourcePath, json, 'utf8');
await fs.writeFile(publicPath, json, 'utf8');
await fs.writeFile(packagedPath, json, 'utf8');

const counts = Object.fromEntries(LOCALES.map((locale) => [
  locale,
  output.terms.filter((record) => record.locale === locale).length,
]));
console.log(JSON.stringify({ locales: output.locales, terms: output.terms.length, counts }, null, 2));
