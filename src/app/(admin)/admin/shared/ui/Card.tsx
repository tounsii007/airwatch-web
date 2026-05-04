/**
 * Card primitive — shadcn/ui-style API on top of our admin design tokens.
 *
 * Composable container — Card / CardHeader / CardTitle / CardDescription /
 * CardContent / CardFooter — same surface area as shadcn/ui so anyone
 * familiar with that library can grok this immediately.
 *
 * Implementation notes:
 *   * Tailwind utility classes only — no inline styles, no per-instance
 *     class soup. Theming flows from the CSS variables exposed under
 *     @theme in admin.css.
 *   * `data-slot` attributes mirror shadcn/ui v3 so consumers can hang
 *     additional styles on specific slots if they need to.
 *   * Forwards refs so e.g. focus management or scroll-into-view works
 *     when a Card is the target.
 */

import * as React from 'react';

function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

/**
 * React 19 + Next.js 16 deprecate {@code React.forwardRef} in favour of
 * accepting {@code ref} as a regular prop on function components. This
 * also avoids the "Functions cannot be passed directly to Client
 * Components" build error that fires when a server component renders a
 * forwardRef'd child — server-component serialisation can't carry the
 * forwardRef wrapper across the boundary.
 */
type DivProps  = React.HTMLAttributes<HTMLDivElement>  & { ref?: React.Ref<HTMLDivElement> };
type HeadProps = React.HTMLAttributes<HTMLHeadingElement> & { ref?: React.Ref<HTMLHeadingElement> };
type ParaProps = React.HTMLAttributes<HTMLParagraphElement> & { ref?: React.Ref<HTMLParagraphElement> };

export function Card({ className, ref, ...props }: DivProps) {
  return (
    <div
      ref={ref}
      data-slot="card"
      className={cn(
        'rounded-md border border-border bg-surface text-text-primary shadow-sm',
        'transition-colors',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ref, ...props }: DivProps) {
  return (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn('flex flex-col gap-1 px-4 pt-4 pb-2', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ref, ...props }: HeadProps) {
  return (
    <h3
      ref={ref}
      data-slot="card-title"
      className={cn(
        'font-[var(--font-heading)] text-[0.7rem] font-bold tracking-[0.15em] uppercase text-text-secondary',
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ref, ...props }: ParaProps) {
  return (
    <p
      ref={ref}
      data-slot="card-description"
      className={cn('text-[0.8125rem] leading-snug text-text-muted', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ref, ...props }: DivProps) {
  return <div ref={ref} data-slot="card-content" className={cn('px-4 pb-4', className)} {...props} />;
}

export function CardFooter({ className, ref, ...props }: DivProps) {
  return (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn('flex items-center gap-2 px-4 pb-4 pt-0', className)}
      {...props}
    />
  );
}
