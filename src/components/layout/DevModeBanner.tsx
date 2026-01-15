import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function DevModeBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 bg-warning/90 text-warning-foreground",
      "px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium"
    )}>
      <AlertTriangle className="w-4 h-4" />
      <span>Preview Mode – Authentication bypassed for development</span>
      <button
        onClick={() => setIsDismissed(true)}
        className="ml-4 p-1 hover:bg-warning-foreground/10 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
