// Handles view toggle (list/cards) and kind filter behaviour for the catalog index.
// Runs once per [data-catalog-view-root] found on the page.

const storageKey = 'servdir:catalog-view';

function setupCatalogGrid(root: HTMLElement): void {
  const viewButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-catalog-view-button]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-catalog-view-panel]'));
  const kindButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-kind-filter-btn]'));
  const countEl = root.querySelector<HTMLElement>('[data-catalog-count]');
  let activeKind: string | null = null;

  const applyView = (view: string): void => {
    viewButtons.forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.view !== view;
    });
  };

  const applyKindFilter = (kind: string | null): void => {
    activeKind = kind;

    kindButtons.forEach((btn) => {
      const active = btn.dataset.kindFilterBtn === kind;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-service-kind]'));
    let visible = 0;
    items.forEach((item) => {
      const match = !kind || item.dataset.serviceKind === kind;
      item.hidden = !match;
      if (match) visible++;
    });

    if (countEl) {
      countEl.textContent = `Showing ${visible} service${visible === 1 ? '' : 's'}`;
    }
  };

  kindButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyKindFilter(activeKind === btn.dataset.kindFilterBtn ? null : (btn.dataset.kindFilterBtn ?? null));
    });
  });

  // Restore the last saved view. We default to list so the page reads well
  // before JS runs — list is the SSR-rendered initial state.
  const savedView = window.localStorage.getItem(storageKey);
  applyView(savedView === 'cards' ? 'cards' : 'list');

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view === 'list' ? 'list' : 'cards';
      window.localStorage.setItem(storageKey, view);
      applyView(view);
    });
  });
}

function initCatalogGrids(): void {
  document.querySelectorAll<HTMLElement>('[data-catalog-view-root]').forEach(setupCatalogGrid);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCatalogGrids, { once: true });
} else {
  initCatalogGrids();
}
