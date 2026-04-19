import assert from 'node:assert/strict';

import { createStoreShellContract } from '../lib/store-shell-contract.js';

function makeClassList() {
  const names = new Set();
  return {
    add(name) {
      names.add(name);
    },
    remove(name) {
      names.delete(name);
    },
    toggle(name, force) {
      if (force === undefined ? !names.has(name) : force) {
        names.add(name);
      } else {
        names.delete(name);
      }
    },
    contains(name) {
      return names.has(name);
    },
  };
}

const originalWindow = globalThis.window;
const scrollCalls = [];
globalThis.window = {
  scrollTo(...args) {
    scrollCalls.push(args);
  },
};

const elements = {
  gridArea: {
    classList: makeClassList(),
    scrollTop: 90,
    scrollLeft: 20,
  },
  gridTitle: { textContent: '' },
  gridMeta: { textContent: '' },
  gridActions: { style: { display: '' } },
};

const calls = [];
const shell = createStoreShellContract({
  elements,
  callbacks: {
    resetPanelToPlaceholder: () => calls.push('resetPanelToPlaceholder'),
    setHeaderSearchMode: (mode, options = {}) => {
      calls.push(['setHeaderSearchMode', mode, options.value ?? '']);
    },
    setPanelSuppressed: (value) => calls.push(['setPanelSuppressed', value]),
  },
});

shell.enterStoreView({
  title: 'Pricing',
  meta: '',
  searchMode: 'icons',
  searchValue: 'agent',
  panelSuppressed: true,
});

assert.equal(elements.gridArea.classList.contains('store-active'), true);
assert.equal(elements.gridTitle.textContent, 'Pricing');
assert.equal(elements.gridMeta.textContent, '');
assert.equal(elements.gridActions.style.display, 'none');
assert.deepEqual(calls, [
  'resetPanelToPlaceholder',
  ['setPanelSuppressed', true],
  ['setHeaderSearchMode', 'icons', 'agent'],
]);

shell.scrollShellToTop();
assert.equal(elements.gridArea.scrollTop, 0);
assert.equal(elements.gridArea.scrollLeft, 0);
assert.deepEqual(scrollCalls, [[0, 0]]);

shell.leaveStoreView();
assert.equal(elements.gridArea.classList.contains('store-active'), false);
assert.equal(elements.gridTitle.textContent, 'All Icons');
assert.equal(elements.gridMeta.textContent, '');
assert.equal(elements.gridActions.style.display, '');
assert.deepEqual(calls.at(-1), ['setPanelSuppressed', false]);

globalThis.window = originalWindow;

console.log('verify-store-shell-contract: ok');
