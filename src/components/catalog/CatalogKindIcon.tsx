import { SvgIcon, type IconName } from '@/components/ui/SvgIcon';
import { getCatalogKindIconName } from '@/lib/catalog-kind-icon';

interface Props {
  kind: string | undefined;
  size?: number | string;
  className?: string;
}

export function CatalogKindIcon({ kind, size = 14, className }: Props) {
  return (
    <SvgIcon
      name={getCatalogKindIconName(kind) as IconName}
      size={size}
      className={className}
    />
  );
}
