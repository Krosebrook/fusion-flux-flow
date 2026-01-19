import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, ShieldCheck, ShieldOff, Copy, CheckCircle, Loader2, QrCode, Key } from 'lucide-react';

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

export function TwoFactorSetup() {
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<{
    id: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [copied, setCopied] = useState(false);

  const is2FAEnabled = factors.some(f => f.status === 'verified');

  useEffect(() => {
    fetchMFAFactors();
  }, []);

  const fetchMFAFactors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors(data?.totp || []);
    } catch (error) {
      console.error('Error fetching MFA factors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEnrollment = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });
      if (error) throw error;
      setEnrollmentData({
        id: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (error: any) {
      toast.error('Failed to start 2FA setup', {
        description: error.message,
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const verifyEnrollment = async () => {
    if (!enrollmentData || verifyCode.length !== 6) return;
    
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollmentData.id,
        code: verifyCode,
      });
      if (error) throw error;
      
      toast.success('Two-factor authentication enabled!', {
        description: 'Your account is now more secure.',
      });
      setEnrollmentData(null);
      setVerifyCode('');
      await fetchMFAFactors();
    } catch (error: any) {
      toast.error('Verification failed', {
        description: 'Invalid code. Please try again.',
      });
      setVerifyCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const disable2FA = async (factorId: string) => {
    setIsDisabling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });
      if (error) throw error;
      
      toast.success('Two-factor authentication disabled');
      await fetchMFAFactors();
    } catch (error: any) {
      toast.error('Failed to disable 2FA', {
        description: error.message,
      });
    } finally {
      setIsDisabling(false);
    }
  };

  const copySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Secret copied to clipboard');
    }
  };

  const cancelEnrollment = async () => {
    if (enrollmentData) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: enrollmentData.id });
      } catch (e) {
        // Ignore errors when canceling
      }
    }
    setEnrollmentData(null);
    setVerifyCode('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </div>
          <Badge variant={is2FAEnabled ? 'default' : 'secondary'} className="gap-1">
            {is2FAEnabled ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                Enabled
              </>
            ) : (
              <>
                <ShieldOff className="w-3.5 h-3.5" />
                Disabled
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {enrollmentData ? (
          <div className="space-y-6">
            <Alert>
              <QrCode className="w-4 h-4" />
              <AlertDescription>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </AlertDescription>
            </Alert>

            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-lg">
                <img src={enrollmentData.qr} alt="2FA QR Code" className="w-48 h-48" />
              </div>

              <div className="w-full max-w-sm space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Or enter this secret manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 text-xs bg-muted rounded font-mono break-all">
                    {enrollmentData.secret}
                  </code>
                  <Button variant="outline" size="icon" onClick={copySecret}>
                    {copied ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <Label className="text-sm font-medium">Enter verification code</Label>
                <InputOTP
                  maxLength={6}
                  value={verifyCode}
                  onChange={setVerifyCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={cancelEnrollment}>
                  Cancel
                </Button>
                <Button
                  onClick={verifyEnrollment}
                  disabled={verifyCode.length !== 6 || isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : is2FAEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
              <ShieldCheck className="w-8 h-8 text-success" />
              <div>
                <p className="font-medium text-success">2FA is active</p>
                <p className="text-sm text-muted-foreground">
                  Your account is protected with two-factor authentication
                </p>
              </div>
            </div>

            {factors.filter(f => f.status === 'verified').map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{factor.friendly_name || 'Authenticator App'}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(factor.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => disable2FA(factor.id)}
                  disabled={isDisabling}
                >
                  {isDisabling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication adds an additional layer of security to your account by requiring a code from your authenticator app when signing in.
            </p>
            <Button onClick={startEnrollment} disabled={isEnrolling} className="gap-2">
              {isEnrolling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Enable Two-Factor Authentication
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
