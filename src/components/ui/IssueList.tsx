import type { ValidationIssue } from '@/lib/catalog';
import { cn } from '@/lib/utils';

interface Props {
  issues: ValidationIssue[];
  className?: string;
}

export function IssueList({ issues, className }: Props) {
  return (
    <ul className={cn('grid gap-2 pl-[18px] leading-6', className)}>
      {issues.map((issue, i) => (
        <li
          key={i}
          className={issue.level === 'error' ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'}
        >
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
