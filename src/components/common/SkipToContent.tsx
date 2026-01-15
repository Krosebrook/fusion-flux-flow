/**
 * Skip to content link for keyboard navigation accessibility.
 * Should be the first focusable element on the page.
 * 
 * @example
 * ```tsx
 * // In App.tsx or layout
 * <SkipToContent />
 * <header>...</header>
 * <main id="main-content">...</main>
 * ```
 */
export function SkipToContent({ 
  href = '#main-content',
  label = 'Skip to main content' 
}: { 
  href?: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {label}
    </a>
  );
}
