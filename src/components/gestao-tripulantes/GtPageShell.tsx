'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Fills the MainLayout `<main>` pane (`flex-1 min-h-0 flex flex-col`).
 * Put filters/toolbar in `shrink-0` children; the primary table/grid in
 * `GT_PAGE_SCROLLPORT_CLASS` (`flex-1 min-h-0 overflow-auto`).
 *
 * Flush (Man Schedule): cancel `<main>` padding so the grade can use the full pane.
 * Height is `100%` of main plus `py-8` (spacing.16), not a viewport fudge.
 */
export const GT_PAGE_SHELL_CLASS =
  'flex flex-col flex-1 min-h-0 overflow-hidden';

export const GT_PAGE_SCROLLPORT_CLASS =
  'flex-1 min-h-0 overflow-auto overscroll-contain';

interface GtPageShellProps {
  children: React.ReactNode;
  className?: string;
  /** Edge-to-edge (Man Schedule). Default keeps MainLayout padding. */
  flush?: boolean;
}

export default function GtPageShell({ children, className, flush = false }: GtPageShellProps) {
  return (
    <div
      data-testid="gt-page-shell"
      className={cn(
        GT_PAGE_SHELL_CLASS,
        flush
          ? 'bg-white -mx-4 md:-mx-8 -my-8 h-[calc(100%+theme(spacing.16))]'
          : 'gap-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
