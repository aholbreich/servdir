import { ServiceCard } from '@/components/ui/ServiceCard';
import type { ServiceRecord } from '@/lib/catalog';
import { normalizeCatalogKind } from '@/lib/catalog-kind-icon';
import { cn } from '@/lib/utils';

interface Props {
  services: ServiceRecord[];
  grouped?: boolean;
}

export function ServiceCardGrid({ services, grouped = false }: Props) {
  return (
    <ul className={cn('grid list-none md:grid-cols-2 lg:grid-cols-3', grouped ? 'gap-3 lg:gap-3.5' : 'gap-4')}>
      {services.map((service) => (
        <li
          key={service.slug}
          data-service-kind={normalizeCatalogKind(service.data.kind) || 'service'}
          data-service-name={service.data.name.toLowerCase()}
          data-service-id={service.data.id.toLowerCase()}
        >
          <ServiceCard service={service} />
        </li>
      ))}
    </ul>
  );
}
