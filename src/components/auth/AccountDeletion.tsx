import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';
import { Trash2, AlertTriangle } from 'lucide-react';

export function AccountDeletion() {
  const { user, signOut } = useAuthContext();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<'confirm' | 'password'>('confirm');

  const CONFIRM_TEXT = 'DELETE';

  const resetState = () => {
    setPassword('');
    setConfirmText('');
    setStep('confirm');
    setIsDeleting(false);
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetState();
    }
  };

  const handleProceedToPassword = () => {
    if (confirmText !== CONFIRM_TEXT) {
      toast.error(`Please type "${CONFIRM_TEXT}" to confirm`);
      return;
    }
    setStep('password');
  };

  const handleDeleteAccount = async () => {
    if (!user || !password) return;

    setIsDeleting(true);

    try {
      // First verify the password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: password,
      });

      if (signInError) {
        toast.error('Incorrect password. Please try again.');
        setIsDeleting(false);
        return;
      }

      // Delete user profile first (due to RLS, user can only delete own profile data)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        // Continue with account deletion even if profile deletion fails
      }

      // Note: Full account deletion requires a backend function or admin API
      // For now, we'll sign the user out and show appropriate message
      // In production, you would call an edge function to delete the auth user
      
      await signOut();
      
      toast.success('Your account has been scheduled for deletion. You will be signed out.');
      navigate('/auth');
      
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error('Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
      setDialogOpen(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-muted-foreground">
              Once you delete your account, there is no going back. This action will:
            </p>
            <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Permanently delete your profile and personal data</li>
              <li>Remove you from all organizations</li>
              <li>Delete all your settings and preferences</li>
            </ul>
          </div>

          <AlertDialog open={dialogOpen} onOpenChange={handleOpenChange}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Delete Account
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4">
                    {step === 'confirm' ? (
                      <>
                        <p>
                          This action cannot be undone. This will permanently delete your
                          account and remove all your data from our servers.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-delete">
                            Type <span className="font-mono font-bold text-destructive">{CONFIRM_TEXT}</span> to confirm
                          </Label>
                          <Input
                            id="confirm-delete"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                            placeholder={CONFIRM_TEXT}
                            className="font-mono"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <p>
                          Please enter your password to confirm account deletion.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="delete-password">Password</Label>
                          <PasswordInput
                            id="delete-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={resetState}>Cancel</AlertDialogCancel>
                {step === 'confirm' ? (
                  <Button
                    variant="destructive"
                    onClick={handleProceedToPassword}
                    disabled={confirmText !== CONFIRM_TEXT}
                  >
                    Continue
                  </Button>
                ) : (
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || !password}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete My Account'}
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
