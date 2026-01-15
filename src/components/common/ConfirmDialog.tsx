import { ReactNode, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
  /** Trigger element (usually a button) */
  trigger: ReactNode;
  /** Dialog title */
  title: string;
  /** Description/message */
  description: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Variant for styling */
  variant?: 'default' | 'destructive';
  /** Called when user confirms */
  onConfirm: () => void | Promise<void>;
  /** Called when user cancels */
  onCancel?: () => void;
  /** Whether the confirm action is loading */
  isLoading?: boolean;
}

/**
 * Accessible confirmation dialog for destructive or important actions.
 * 
 * @example
 * ```tsx
 * <ConfirmDialog
 *   trigger={<Button variant="destructive">Delete</Button>}
 *   title="Delete Product"
 *   description="Are you sure? This action cannot be undone."
 *   variant="destructive"
 *   onConfirm={handleDelete}
 * />
 * ```
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    setOpen(false);
  };

  const isActionLoading = isLoading || loading;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            {variant === 'destructive' && (
              <div 
                className="shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center"
                aria-hidden="true"
              >
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
            )}
            <div className="space-y-2">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isActionLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isActionLoading}
            className={cn(
              variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            )}
          >
            {isActionLoading ? 'Please wait...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Shorthand delete confirmation dialog.
 */
export function DeleteConfirmDialog({
  itemName,
  onConfirm,
  trigger,
  isLoading,
}: {
  itemName: string;
  onConfirm: () => void | Promise<void>;
  trigger?: ReactNode;
  isLoading?: boolean;
}) {
  return (
    <ConfirmDialog
      trigger={
        trigger || (
          <Button variant="ghost" size="icon">
            <Trash2 className="w-4 h-4 text-destructive" />
            <span className="sr-only">Delete {itemName}</span>
          </Button>
        )
      }
      title={`Delete ${itemName}?`}
      description={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}
