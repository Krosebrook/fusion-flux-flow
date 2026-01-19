import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PasswordStrengthMeter, isPasswordStrong } from '@/components/auth/PasswordStrengthMeter';
import { toast } from 'sonner';
import { User, Lock, Users, Crown, UserCheck, Eye, Trash2, Plus, Mail } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, currentOrg, currentOrgRole, orgs } = useAuthContext();
  
  // Profile form state
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  
  // Team member invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'operator' | 'viewer'>('viewer');
  const [isInviting, setIsInviting] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSavingProfile(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    
    setIsSavingProfile(false);
    
    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully');
    }
  };

  const handleChangePassword = async () => {
    if (!isPasswordStrong(newPassword)) {
      toast.error('New password does not meet strength requirements');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsSavingPassword(true);
    
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    setIsSavingPassword(false);
    
    if (error) {
      toast.error(error.message || 'Failed to update password');
    } else {
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleInviteMember = async () => {
    if (!currentOrg || !inviteEmail) return;
    
    setIsInviting(true);
    
    // For now, show a toast that invitation system requires email service
    // In a full implementation, this would send an invitation email
    toast.info('Invitation system requires email service configuration. Coming soon!');
    
    setIsInviting(false);
    setInviteEmail('');
  };

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-3.5 h-3.5" />;
      case 'operator': return <UserCheck className="w-3.5 h-3.5" />;
      default: return <Eye className="w-3.5 h-3.5" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'operator': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Profile & Settings"
        description="Manage your account and organization settings"
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="w-4 h-4" />
            Team
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-xl bg-primary/20 text-primary">
                    {getInitials(fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="avatar-url">Avatar URL</Label>
                  <Input
                    id="avatar-url"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a URL for your profile picture
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="opacity-60"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Your current organization membership</CardDescription>
            </CardHeader>
            <CardContent>
              {currentOrg ? (
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{currentOrg.name}</p>
                    <p className="text-sm text-muted-foreground">@{currentOrg.slug}</p>
                  </div>
                  <Badge variant={getRoleBadgeVariant(currentOrgRole || '')} className="gap-1">
                    {getRoleIcon(currentOrgRole || '')}
                    {currentOrgRole}
                  </Badge>
                </div>
              ) : (
                <p className="text-muted-foreground">No organization selected</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput
                  id="new-password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <PasswordStrengthMeter password={newPassword} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <PasswordInput
                  id="confirm-new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="text-xs text-success">Passwords match</p>
                )}
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleChangePassword} 
                  disabled={isSavingPassword || !newPassword || newPassword !== confirmPassword}
                >
                  {isSavingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          {currentOrgRole === 'owner' && (
            <Card>
              <CardHeader>
                <CardTitle>Invite Team Member</CardTitle>
                <CardDescription>Add new members to your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="colleague@example.com"
                        className="pl-10"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={inviteRole === 'operator' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInviteRole('operator')}
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        Operator
                      </Button>
                      <Button
                        type="button"
                        variant={inviteRole === 'viewer' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInviteRole('viewer')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Viewer
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleInviteMember} disabled={isInviting || !inviteEmail}>
                    <Plus className="w-4 h-4 mr-2" />
                    {isInviting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>People with access to {currentOrg?.name || 'this organization'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Current user always shown */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {getInitials(profile?.full_name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{profile?.full_name || user?.email}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(currentOrgRole || '')} className="gap-1">
                      {getRoleIcon(currentOrgRole || '')}
                      {currentOrgRole}
                    </Badge>
                    <span className="text-xs text-muted-foreground">(You)</span>
                  </div>
                </div>

                {/* Placeholder for additional members */}
                <p className="text-sm text-muted-foreground text-center py-4">
                  {currentOrgRole === 'owner' 
                    ? 'Invite team members to collaborate on your organization'
                    : 'Only organization owners can manage team members'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
