import { Chip } from '@/components/ui/Chip';
import { SvgIcon, type IconName } from '@/components/ui/SvgIcon';
import type { ServiceCardLinkKind } from '@/lib/service-card-links';

const iconNames: Record<ServiceCardLinkKind, IconName> = {
  repository: 'card-link/repository',
  runbook: 'card-link/runbook',
  openapi: 'card-link/openapi',
  delivery: 'card-link/delivery',
};

interface Props {
  kind: ServiceCardLinkKind;
  href: string;
  label: string;
}

export function ServiceCardLinkIcon({ kind, href, label }: Props) {
  return (
    <Chip variant="icon-link" asChild>
      <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}>
        <SvgIcon name={iconNames[kind]} size={16} />
      </a>
    </Chip>
  );
}
