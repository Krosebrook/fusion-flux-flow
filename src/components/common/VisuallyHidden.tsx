import { ReactNode } from 'react';

/**
 * Visually hides content while keeping it accessible to screen readers.
 * Useful for providing context to assistive technologies.
 * 
 * @example
 * ```tsx
 * <Button>
 *   <Icon />
 *   <VisuallyHidden>Delete item</VisuallyHidden>
 * </Button>
 * ```
 */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
