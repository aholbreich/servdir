import { cn } from '@/lib/utils';

export interface KVItem {
  label: string;
  value?: string;
  href?: string;
  text?: string;
}

interface Props {
  items: KVItem[];
  className?: string;
}

export function KeyValueList({ items, className }: Props) {
  return (
    <ul className={cn('grid list-none gap-3 p-0 leading-6', className)}>
      {items
        .filter((item) => item.value || item.href)
        .map((item, i) => (
          <li key={i}>
            <strong className="font-semibold text-foreground">{item.label}:</strong>
            <br />
            {item.href ? (
              <a href={item.href} target="_blank" rel="noreferrer">
                {item.text ?? item.href}
              </a>
            ) : (
              item.value
            )}
          </li>
        ))}
    </ul>
  );
}
