'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useUpdateProfile } from '@/hooks/use-account';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChangePasswordDialog } from '@/components/settings/change-password-dialog';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  if (!user) return null;

  async function handleProfileSave() {
    try {
      await updateProfile.mutateAsync({ name, email });
      toast({ title: 'Profile updated' });
    } catch (err: unknown) {
      const error = err as { status?: number };
      toast({
        title: error.status === 409 ? 'Email already in use' : 'Failed to update profile',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold">Account Settings</h1>

      {/* Profile section */}
      <div className="rounded-md border p-6 space-y-4">
        <h2 className="text-lg font-medium">Profile</h2>

        <div className="flex items-center gap-3">
          <Badge variant="secondary">{user.role}</Badge>
          <span className="text-sm text-muted-foreground">
            Member since {formatDate(user.createdAt)}
          </span>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setShowPasswordDialog(true)}
          >
            Change Password
          </Button>
          <Button
            onClick={handleProfileSave}
            disabled={updateProfile.isPending || (name === user.name && email === user.email)}
          >
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <ChangePasswordDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog} />
    </div>
  );
}
