import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label for screen readers */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show centered in container */
  centered?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4 border',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

/**
 * Accessible loading spinner component with screen reader support.
 * 
 * @example
 * ```tsx
 * <LoadingSpinner size="md" label="Loading data..." />
 * ```
 */
export function LoadingSpinner({
  size = 'md',
  label = 'Loading...',
  className,
  centered = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={cn(
        'rounded-full border-primary border-t-transparent animate-spin',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </div>
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Full page loading state with optional message.
 */
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen bg-background gap-4"
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="lg" label={message} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Skeleton loading placeholder for content.
 */
export function ContentSkeleton({ 
  lines = 3,
  className 
}: { 
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3 animate-pulse', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={cn(
            'h-4 bg-muted rounded',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )} 
        />
      ))}
    </div>
  );
}
