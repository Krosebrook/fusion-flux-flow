import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains a number', test: (p) => /[0-9]/.test(p) },
  { label: 'Contains special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrengthMeter({ password, showRequirements = true }: PasswordStrengthMeterProps) {
  const { score, passedRequirements } = useMemo(() => {
    const passed = requirements.filter((req) => req.test(password));
    return {
      score: passed.length,
      passedRequirements: passed,
    };
  }, [password]);

  const getStrengthLabel = () => {
    if (password.length === 0) return '';
    if (score <= 1) return 'Weak';
    if (score <= 2) return 'Fair';
    if (score <= 3) return 'Good';
    if (score <= 4) return 'Strong';
    return 'Excellent';
  };

  const getStrengthColor = () => {
    if (score <= 1) return 'bg-destructive';
    if (score <= 2) return 'bg-warning';
    if (score <= 3) return 'bg-info';
    if (score <= 4) return 'bg-success';
    return 'bg-success';
  };

  if (password.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            'font-medium',
            score <= 1 && 'text-destructive',
            score === 2 && 'text-warning',
            score === 3 && 'text-info',
            score >= 4 && 'text-success'
          )}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300 rounded-full', getStrengthColor())}
            style={{ width: `${(score / requirements.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <ul className="grid grid-cols-1 gap-1.5 text-xs">
          {requirements.map((req) => {
            const passed = req.test(password);
            return (
              <li
                key={req.label}
                className={cn(
                  'flex items-center gap-2 transition-colors duration-200',
                  passed ? 'text-success' : 'text-muted-foreground'
                )}
              >
                {passed ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                {req.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function isPasswordStrong(password: string): boolean {
  return requirements.filter((req) => req.test(password)).length >= 4;
}
