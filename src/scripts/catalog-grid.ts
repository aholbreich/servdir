// Handles view toggle (list/cards), kind filter, search, and platform grouping for the catalog index.
// Runs once per [data-catalog-view-root] found on the page.

const storageKey = 'servdir:catalog-view';

function setupCatalogGrid(root: HTMLElement): void {
  const viewButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-catalog-view-button]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-catalog-view-panel]'));
  const kindButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-kind-filter-btn]'));
  const platformToggle = root.querySelector<HTMLButtonElement>('[data-platform-group-toggle]');
  const searchInput = root.querySelector<HTMLInputElement>('[data-catalog-search]');
  const countEl = root.querySelector<HTMLElement>('[data-catalog-count]');

  let activeKind: string | null = null;
  let searchQuery = '';
  let platformGrouped = false;

  // --- Platform view helpers ---

  const activePlatformViews = (): HTMLElement[] => {
    const activePanel = panels.find((p) => !p.hidden);
    if (!activePanel) return [];
    const mode = platformGrouped ? 'grouped' : 'flat';
    return Array.from(activePanel.querySelectorAll<HTMLElement>(`[data-platform-view="${mode}"]`));
  };

  const applyPlatformView = (grouped: boolean): void => {
    platformGrouped = grouped;
    panels.forEach((panel) => {
      const flat = panel.querySelector<HTMLElement>('[data-platform-view="flat"]');
      const grp = panel.querySelector<HTMLElement>('[data-platform-view="grouped"]');
      if (flat) flat.hidden = grouped;
      if (grp) grp.hidden = !grouped;
    });
    if (platformToggle) {
      platformToggle.classList.toggle('is-active', grouped);
      platformToggle.setAttribute('aria-pressed', String(grouped));
    }
  };

  // --- Combined filter logic ---

  const itemVisible = (el: HTMLElement): boolean => {
    const kindMatch = !activeKind || el.dataset.serviceKind === activeKind;
    const q = searchQuery.trim().toLowerCase();
    const searchMatch =
      !q ||
      (el.dataset.serviceName ?? '').includes(q) ||
      (el.dataset.serviceId ?? '').includes(q);
    return kindMatch && searchMatch;
  };

  const updateCount = (): void => {
    if (!countEl) return;
    const views = activePlatformViews();
    const items = views.flatMap((v) =>
      Array.from(v.querySelectorAll<HTMLElement>('[data-service-kind]')),
    );
    const visible = items.filter((el) => !el.hidden).length;
    countEl.textContent = `Showing ${visible} service${visible === 1 ? '' : 's'}`;
  };

  const updatePlatformSectionVisibility = (): void => {
    root.querySelectorAll<HTMLElement>('[data-platform-section]').forEach((section) => {
      const items = Array.from(section.querySelectorAll<HTMLElement>('[data-service-kind]'));
      if (items.length === 0) return;
      section.hidden = items.every((el) => el.hidden);
    });
  };

  const applyFilters = (): void => {
    // Update kind button state
    kindButtons.forEach((btn) => {
      const active = btn.dataset.kindFilterBtn === activeKind;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    // Apply visibility to ALL items in both views
    const allItems = Array.from(root.querySelectorAll<HTMLElement>('[data-service-kind]'));
    allItems.forEach((item) => {
      item.hidden = !itemVisible(item);
    });

    updatePlatformSectionVisibility();
    updateCount();
  };

  // --- View toggle ---

  const applyView = (view: string): void => {
    viewButtons.forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.view !== view;
    });

    updateCount();
  };

  // --- Wire up events ---

  searchInput?.addEventListener('input', () => {
    searchQuery = searchInput.value;
    applyFilters();
  });

  kindButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeKind = activeKind === btn.dataset.kindFilterBtn ? null : (btn.dataset.kindFilterBtn ?? null);
      applyFilters();
    });
  });

  platformToggle?.addEventListener('click', () => {
    applyPlatformView(!platformGrouped);
    applyFilters();
  });

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view === 'list' ? 'list' : 'cards';
      window.localStorage.setItem(storageKey, view);
      applyView(view);
    });
  });

  // Restore the last saved view. Default to list so the page reads well before JS runs.
  const savedView = window.localStorage.getItem(storageKey);
  applyView(savedView === 'cards' ? 'cards' : 'list');
}

function initCatalogGrids(): void {
  document.querySelectorAll<HTMLElement>('[data-catalog-view-root]').forEach(setupCatalogGrid);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCatalogGrids, { once: true });
} else {
  initCatalogGrids();
}
