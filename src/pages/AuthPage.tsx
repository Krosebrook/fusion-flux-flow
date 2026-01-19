import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { PasswordStrengthMeter, isPasswordStrong } from '@/components/auth/PasswordStrengthMeter';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { toast } from 'sonner';
import { Zap, Mail, Lock, User, CheckCircle } from 'lucide-react';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  fullName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const { signIn, signUp, isAuthenticated, isLoading } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateSignIn = () => {
    try {
      signInSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const validateSignUp = () => {
    try {
      signUpSchema.parse(formData);
      
      // Additional password strength check
      if (!isPasswordStrong(formData.password)) {
        setErrors({ password: 'Password does not meet strength requirements' });
        return false;
      }
      
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const getSignInErrorMessage = (error: Error) => {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
      return {
        title: 'Invalid credentials',
        description: 'The email or password you entered is incorrect. Please try again or reset your password.',
        showResetLink: true,
      };
    }
    if (message.includes('email not confirmed')) {
      return {
        title: 'Email not verified',
        description: 'Please check your inbox and verify your email address before signing in.',
        showResetLink: false,
      };
    }
    if (message.includes('too many requests') || message.includes('rate limit')) {
      return {
        title: 'Too many attempts',
        description: 'Please wait a few minutes before trying again.',
        showResetLink: false,
      };
    }
    return {
      title: 'Sign in failed',
      description: error.message || 'An unexpected error occurred. Please try again.',
      showResetLink: false,
    };
  };

  const getSignUpErrorMessage = (error: Error) => {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('already registered') || message.includes('user_already_exists')) {
      return {
        title: 'Account already exists',
        description: 'This email is already registered. Try signing in instead, or reset your password if you forgot it.',
        showSignInHint: true,
      };
    }
    if (message.includes('password') && message.includes('weak')) {
      return {
        title: 'Password too weak',
        description: 'Please choose a stronger password with at least 8 characters, including uppercase, lowercase, and numbers.',
        showSignInHint: false,
      };
    }
    if (message.includes('invalid email')) {
      return {
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        showSignInHint: false,
      };
    }
    return {
      title: 'Sign up failed',
      description: error.message || 'An unexpected error occurred. Please try again.',
      showSignInHint: false,
    };
  };

  const handleSignIn = async () => {
    if (!validateSignIn()) return;
    setIsSubmitting(true);
    const { error } = await signIn(formData.email, formData.password);
    setIsSubmitting(false);
    if (error) {
      const errorInfo = getSignInErrorMessage(error);
      toast.error(errorInfo.title, {
        description: errorInfo.description,
        action: errorInfo.showResetLink ? {
          label: 'Reset Password',
          onClick: () => window.location.href = '/forgot-password',
        } : undefined,
        duration: 6000,
      });
    } else {
      toast.success('Welcome back!');
    }
  };

  const handleSignUp = async () => {
    if (!validateSignUp()) return;
    setIsSubmitting(true);
    const { error } = await signUp(formData.email, formData.password, formData.fullName);
    setIsSubmitting(false);
    if (error) {
      const errorInfo = getSignUpErrorMessage(error);
      toast.error(errorInfo.title, {
        description: errorInfo.description,
        duration: 6000,
      });
    } else {
      toast.success('Account created!', {
        description: 'You can now sign in with your credentials.',
      });
    }
  };

  const passwordsMatch = formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordsDontMatch = formData.confirmPassword && formData.password !== formData.confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background glow */}
      <div className="absolute inset-0 bg-glow opacity-30 pointer-events-none" />
      
      <Card className="w-full max-w-md relative z-10" variant="glow">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-primary shadow-glow">
              <Zap className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">FlashFusion</CardTitle>
          <CardDescription>E-commerce Operations Hub</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <PasswordInput
                  id="signin-password"
                  placeholder="••••••••"
                  iconLeft={<Lock className="w-4 h-4" />}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                variant="glow"
                className="w-full mt-6"
                onClick={handleSignIn}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>

              <OAuthButtons />
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    className="pl-10"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <PasswordInput
                  id="signup-password"
                  placeholder="••••••••"
                  iconLeft={<Lock className="w-4 h-4" />}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                <PasswordStrengthMeter password={formData.password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                <PasswordInput
                  id="signup-confirm-password"
                  placeholder="••••••••"
                  iconLeft={<Lock className="w-4 h-4" />}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
                {passwordsMatch && (
                  <p className="text-xs text-success flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Passwords match
                  </p>
                )}
                {passwordsDontMatch && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
              <Button
                variant="glow"
                className="w-full mt-6"
                onClick={handleSignUp}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </Button>

              <OAuthButtons />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
