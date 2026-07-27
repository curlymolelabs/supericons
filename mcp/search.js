import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { searchIcons as searchSharedIcons } from './runtime/search-pipeline.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagedCjkTermsPath = join(__dirname, 'public', 'cjk-search-terms.json');
const repoCjkTermsPath = join(__dirname, '..', 'data', 'i18n', 'cjk-search-terms.json');
const cjkTermsPath = existsSync(packagedCjkTermsPath) ? packagedCjkTermsPath : repoCjkTermsPath;
const cjkSearchTerms = existsSync(cjkTermsPath)
  ? JSON.parse(readFileSync(cjkTermsPath, 'utf8')).terms || []
  : [];
const packagedMultilingualAliasesPath = join(__dirname, 'public', 'multilingual-search-aliases.json');
const repoMultilingualAliasesPath = join(__dirname, '..', 'data', 'i18n', 'multilingual-search-aliases.json');
const multilingualAliasesPath = existsSync(packagedMultilingualAliasesPath)
  ? packagedMultilingualAliasesPath
  : repoMultilingualAliasesPath;
const multilingualSearchAliases = existsSync(multilingualAliasesPath)
  ? JSON.parse(readFileSync(multilingualAliasesPath, 'utf8')).aliases || []
  : [];
const multilingualExpansionTerms = [...cjkSearchTerms, ...multilingualSearchAliases];

export function searchIcons(query, icons, synonyms, options = {}) {
  return searchSharedIcons(query, icons, synonyms, {
    ...options,
    multilingualExpansionTerms: options.multilingualExpansionTerms || multilingualExpansionTerms,
  });
}
