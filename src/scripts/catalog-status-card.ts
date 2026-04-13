const initializedRoots = new WeakSet<HTMLElement>();

function setupCatalogStatus(root: HTMLElement) {
  if (initializedRoots.has(root)) {
    return;
  }

  initializedRoots.add(root);

  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-catalog-status-tab]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-catalog-status-panel]'));
  const popovers = Array.from(root.querySelectorAll<HTMLDetailsElement>('[data-catalog-status-popover]'));
  const defaultTabId = root.dataset.defaultTab ?? 'configuration';

  if (buttons.length === 0 || panels.length === 0) {
    return;
  }

  const closePopovers = (exceptPopover?: HTMLDetailsElement) => {
    popovers.forEach((popover) => {
      if (popover !== exceptPopover) {
        popover.removeAttribute('open');
      }
    });
  };

  const applyTab = (tabId: string, options: { focusButton?: boolean } = {}) => {
    const { focusButton = false } = options;

    buttons.forEach((button) => {
      const isActive = button.dataset.tab === tabId;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
      button.tabIndex = isActive ? 0 : -1;

      if (isActive && focusButton) {
        button.focus();
      }
    });

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.tab !== tabId;
    });

    closePopovers();
  };

  const focusTabByIndex = (index: number) => {
    const nextButton = buttons[index];

    if (nextButton) {
      applyTab(nextButton.dataset.tab ?? defaultTabId, { focusButton: true });
    }
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      applyTab(button.dataset.tab ?? defaultTabId);
    });

    button.addEventListener('keydown', (event) => {
      const currentIndex = buttons.indexOf(button);

      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        focusTabByIndex((currentIndex + 1) % buttons.length);
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        focusTabByIndex((currentIndex - 1 + buttons.length) % buttons.length);
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        focusTabByIndex(0);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        focusTabByIndex(buttons.length - 1);
      }
    });
  });

  popovers.forEach((popover) => {
    const summary = popover.querySelector('summary');

    summary?.addEventListener('click', () => {
      closePopovers(popover);
    });
  });

  document.addEventListener('click', (event) => {
    const target = event.target;

    if (target instanceof Node) {
      popovers.forEach((popover) => {
        if (popover.open && !popover.contains(target)) {
          popover.removeAttribute('open');
        }
      });
    }
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePopovers();
    }
  });

  applyTab(defaultTabId);
}

function initCatalogStatusCards() {
  const roots = document.querySelectorAll<HTMLElement>('[data-catalog-status-root]');
  roots.forEach(setupCatalogStatus);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCatalogStatusCards, { once: true });
} else {
  initCatalogStatusCards();
}
