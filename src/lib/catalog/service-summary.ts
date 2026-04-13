import type { ServiceRecord } from './types';

/**
 * Keep summary extraction in one place so card/list views present the same fallback copy.
 */
export function getServiceSummary(service: Pick<ServiceRecord, 'body' | 'data'>): string {
  const description = service.data.description?.trim();

  if (description) {
    return description;
  }

  const firstContentLine = service.body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#'));

  return firstContentLine ?? 'No description provided.';
}
