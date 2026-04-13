import { describe, expect, it } from 'vitest';

import { getCatalogKindIconName, normalizeCatalogKind } from './catalog-kind-icon';

describe('catalog kind icons', () => {
  it('normalizes kind values before lookup', () => {
    expect(normalizeCatalogKind(' Service ')).toBe('service');
    expect(normalizeCatalogKind('IAC')).toBe('iac');
  });

  it('returns explicit icons for known kinds', () => {
    expect(getCatalogKindIconName('service')).toBe('kind/service');
    expect(getCatalogKindIconName('tool')).toBe('kind/tool');
    expect(getCatalogKindIconName('application')).toBe('kind/application');
    expect(getCatalogKindIconName('library')).toBe('kind/library');
    expect(getCatalogKindIconName('component')).toBe('kind/component');
    expect(getCatalogKindIconName('iac')).toBe('kind/iac');
  });

  it('falls back to the default icon for unknown kinds', () => {
    expect(getCatalogKindIconName('worker')).toBe('kind/default');
    expect(getCatalogKindIconName(undefined)).toBe('kind/default');
  });
});
