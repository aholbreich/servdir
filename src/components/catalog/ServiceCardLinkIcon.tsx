import { SvgIcon, type IconName } from '@/components/ui/SvgIcon';
import type { ServiceCardLinkKind } from '@/lib/service-card-links';
import { cn } from '@/lib/utils';

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
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full border text-muted-foreground transition-colors',
        'border-border/40 bg-background/90 hover:border-primary/20 hover:bg-primary/5 hover:text-primary',
      )}
    >
      <SvgIcon name={iconNames[kind]} size={16} />
    </a>
  );
}
