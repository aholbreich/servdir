export const catalogKindIconNames = {
  service: 'kind/service',
  tool: 'kind/tool',
  application: 'kind/application',
  library: 'kind/library',
  component: 'kind/component',
  iac: 'kind/iac',
} as const;

export function normalizeCatalogKind(kind: string | undefined): string {
  return kind?.trim().toLowerCase() ?? '';
}

export function getCatalogKindIconName(kind: string | undefined): string {
  return catalogKindIconNames[normalizeCatalogKind(kind) as keyof typeof catalogKindIconNames] ?? 'kind/default';
}
