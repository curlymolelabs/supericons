export function createStoreShellContract({ elements, callbacks }) {
  const setText = (node, value = '') => {
    if (node) node.textContent = value;
  };

  return {
    enterStoreView({
      title = '',
      meta = '',
      searchMode = 'icons',
      searchValue = '',
      panelSuppressed = false,
    } = {}) {
      elements.gridArea?.classList.add('store-active');
      if (elements.gridActions) {
        elements.gridActions.style.display = 'none';
      }
      setText(elements.gridTitle, title);
      setText(elements.gridMeta, meta);
      callbacks.resetPanelToPlaceholder?.();
      callbacks.setPanelSuppressed?.(Boolean(panelSuppressed));
      callbacks.setHeaderSearchMode?.(searchMode, { value: searchValue });
    },

    leaveStoreView({ title = 'All Icons', meta = '' } = {}) {
      elements.gridArea?.classList.remove('store-active');
      if (elements.gridActions) {
        elements.gridActions.style.display = '';
      }
      setText(elements.gridTitle, title);
      setText(elements.gridMeta, meta);
      callbacks.setPanelSuppressed?.(false);
    },

    setHeading(title, meta = '') {
      setText(elements.gridTitle, title);
      setText(elements.gridMeta, meta);
    },

    scrollShellToTop() {
      if (elements.gridArea) {
        elements.gridArea.scrollTop = 0;
        elements.gridArea.scrollLeft = 0;
      }
      globalThis.window?.scrollTo?.(0, 0);
    },
  };
}
