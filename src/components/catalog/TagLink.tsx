import { toAppPath } from '@/lib/paths';
import { cn } from '@/lib/utils';

function toTagSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
}

interface Props {
  tag: string;
  className?: string;
}

export function TagLink({ tag, className }: Props) {
  const slug = toTagSlug(tag);
  return (
    <a
      href={toAppPath(`/tags/${slug}`)}
      className={cn('font-medium text-sky-700 dark:text-sky-400 hover:underline', className)}
    >
      #{tag}
    </a>
  );
}
