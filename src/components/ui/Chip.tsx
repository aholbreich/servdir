import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const chipVariants = cva(
  'inline-flex items-center transition-colors',
  {
    variants: {
      variant: {
        label:
          'gap-1.5 rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-meta',
        count:
          'rounded-full border border-border bg-muted px-1.5 py-0.5 text-xs leading-none text-muted-foreground',
        'icon-button':
          'size-7 justify-center rounded-full border border-border bg-background/72 text-muted-foreground hover:bg-primary/8 hover:text-foreground aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-primary',
        'icon-link':
          'size-9 justify-center rounded-full border border-border/40 bg-background/90 text-muted-foreground hover:border-primary/20 hover:bg-primary/5 hover:text-primary',
      },
    },
    defaultVariants: {
      variant: 'label',
    },
  },
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof chipVariants> {
  asChild?: boolean;
}

export function Chip({ className, variant, asChild = false, ...props }: ChipProps) {
  const Comp = asChild ? Slot.Root : 'span';
  return (
    <Comp
      data-slot="chip"
      data-variant={variant ?? 'label'}
      className={cn(chipVariants({ variant }), className)}
      {...props}
    />
  );
}
