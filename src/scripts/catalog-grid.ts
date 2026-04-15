// Handles view toggle (list/cards), kind filter, and platform grouping for the catalog index.
// Runs once per [data-catalog-view-root] found on the page.

const storageKey = 'servdir:catalog-view';

function setupCatalogGrid(root: HTMLElement): void {
  const viewButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-catalog-view-button]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-catalog-view-panel]'));
  const kindButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-kind-filter-btn]'));
  const platformToggle = root.querySelector<HTMLButtonElement>('[data-platform-group-toggle]');
  const countEl = root.querySelector<HTMLElement>('[data-catalog-count]');

  let activeKind: string | null = null;
  let platformGrouped = false;

  // --- Platform view helpers ---

  const activePlatformViews = (): HTMLElement[] => {
    // Return the [data-platform-view] elements that are currently visible
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

  // --- Kind filter ---

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
    // When kind filter is active in grouped view, hide sections where all items are hidden
    root.querySelectorAll<HTMLElement>('[data-platform-section]').forEach((section) => {
      const items = Array.from(section.querySelectorAll<HTMLElement>('[data-service-kind]'));
      if (items.length === 0) return;
      const allHidden = items.every((el) => el.hidden);
      section.hidden = allHidden;
    });
  };

  const applyKindFilter = (kind: string | null): void => {
    activeKind = kind;

    kindButtons.forEach((btn) => {
      const active = btn.dataset.kindFilterBtn === kind;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    // Apply to ALL [data-service-kind] items in the root (both flat and grouped views)
    const allItems = Array.from(root.querySelectorAll<HTMLElement>('[data-service-kind]'));
    allItems.forEach((item) => {
      const match = !kind || item.dataset.serviceKind === kind;
      item.hidden = !match;
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

  kindButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyKindFilter(activeKind === btn.dataset.kindFilterBtn ? null : (btn.dataset.kindFilterBtn ?? null));
    });
  });

  platformToggle?.addEventListener('click', () => {
    applyPlatformView(!platformGrouped);
    // Re-apply kind filter visibility in the new view
    applyKindFilter(activeKind);
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
