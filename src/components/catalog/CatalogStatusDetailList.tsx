import { cn } from '@/lib/utils';
import type { CSSProperties, ReactNode } from 'react';

export interface DetailItem {
  label: string;
  value: string;
  asCode?: boolean;
}

interface Props {
  items: DetailItem[];
  className?: string;
  children?: ReactNode;
}

export function CatalogStatusDetailList({ items, className, children }: Props) {
  return (
    <dl
      className={cn('grid gap-x-4 gap-y-2 text-[0.95rem] leading-6', className)}
      style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' } as CSSProperties}
    >
      {items.map((item) => (
        <>
          <dt key={`${item.label}-dt`} className="text-muted-foreground font-medium">{item.label}</dt>
          <dd key={`${item.label}-dd`} className="min-w-0 break-words text-foreground">
            {item.asCode ? <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{item.value}</code> : item.value}
          </dd>
        </>
      ))}
      {children}
    </dl>
  );
}
