import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Main title text */
  title: string;
  /** Description text */
  description: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional content */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show as a card */
  variant?: 'default' | 'card' | 'dashed';
}

/**
 * Consistent empty state component for lists and data views.
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Package}
 *   title="No products yet"
 *   description="Add your first product to get started"
 *   action={{ label: "Add Product", onClick: () => {} }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div 
        className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6"
        aria-hidden="true"
      >
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button variant="glow" onClick={action.onClick}>
              {action.icon && <action.icon className="w-4 h-4 mr-2" aria-hidden="true" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      
      {children}
    </div>
  );

  if (variant === 'card' || variant === 'dashed') {
    return (
      <Card className={cn(variant === 'dashed' && 'border-dashed', className)}>
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    );
  }

  return <div className={className}>{content}</div>;
}
