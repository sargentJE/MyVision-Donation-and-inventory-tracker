'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  useReactivateUser,
  useResetPassword,
} from '@/hooks/use-users';
import { useToast } from '@/hooks/use-toast';
import { Shield, MoreHorizontal, Plus, UserX, UserCheck, KeyRound, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { TableEmptyState } from '@/components/shared/table-empty-state';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  active: boolean;
  createdAt: string;
}

type DialogMode =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; user: UserSummary }
  | { type: 'reset-password'; user: UserSummary }
  | { type: 'deactivate'; user: UserSummary };

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogMode>({ type: 'closed' });

  const { data, isLoading } = useUsers({ page, pageSize: 25 });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();
  const reactivateUser = useReactivateUser();
  const resetPassword = useResetPassword();

  // Redirect staff away — belt-and-suspenders (backend enforces too)
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  const users = data?.data ?? [];
  const meta = data?.meta;

  async function handleCreate(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as 'ADMIN' | 'STAFF';

    try {
      await createUser.mutateAsync({ name, email, password, role });
      setDialog({ type: 'closed' });
      toast({ title: 'User created', description: `${name} has been added.` });
    } catch (err: unknown) {
      const error = err as { status?: number };
      toast({
        title: 'Failed to create user',
        description: error.status === 409 ? 'Email already exists.' : 'Please try again.',
        variant: 'destructive',
      });
    }
  }

  async function handleEdit(formData: FormData) {
    if (dialog.type !== 'edit') return;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const role = formData.get('role') as 'ADMIN' | 'STAFF';

    try {
      await updateUser.mutateAsync({ id: dialog.user.id, name, email, role });
      setDialog({ type: 'closed' });
      toast({ title: 'User updated' });
    } catch {
      toast({ title: 'Failed to update user', variant: 'destructive' });
    }
  }

  async function handleDeactivate() {
    if (dialog.type !== 'deactivate') return;
    try {
      await deactivateUser.mutateAsync(dialog.user.id);
      setDialog({ type: 'closed' });
      toast({
        title: 'User deactivated',
        description: `${dialog.user.name} can no longer sign in.`,
      });
    } catch {
      toast({ title: 'Failed to deactivate user', variant: 'destructive' });
    }
  }

  async function handleReactivate(user: UserSummary) {
    try {
      await reactivateUser.mutateAsync(user.id);
      toast({ title: 'User reactivated', description: `${user.name} can now sign in.` });
    } catch {
      toast({ title: 'Failed to reactivate user', variant: 'destructive' });
    }
  }

  async function handleResetPassword(formData: FormData) {
    if (dialog.type !== 'reset-password') return;
    const newPassword = formData.get('newPassword') as string;
    try {
      await resetPassword.mutateAsync({ id: dialog.user.id, newPassword });
      setDialog({ type: 'closed' });
      toast({ title: 'Password reset', description: `Password updated for ${dialog.user.name}.` });
    } catch {
      toast({ title: 'Failed to reset password', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">User Management</h1>
        <Button onClick={() => setDialog({ type: 'create' })}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12" role="status" aria-label="Loading users">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="sr-only">Loading users...</span>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table aria-label="User accounts">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? 'default' : 'destructive'}>
                        {user.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions for {user.name}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setDialog({ type: 'edit', user })}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setDialog({ type: 'reset-password', user })
                            }
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          {user.active ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setDialog({ type: 'deactivate', user })
                              }
                              disabled={user.id === currentUser?.id}
                              className="text-destructive"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleReactivate(user)}
                              disabled={reactivateUser.isPending}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              {reactivateUser.isPending ? 'Reactivating...' : 'Reactivate'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableEmptyState
                    colSpan={5}
                    icon={Shield}
                    message="No users found."
                  />
                )}
              </TableBody>
            </Table>
          </div>

          {meta && <PaginationControls meta={meta} onPageChange={setPage} />}
        </>
      )}

      {/* Create User Dialog */}
      <Dialog
        open={dialog.type === 'create'}
        onOpenChange={(open) => !open && setDialog({ type: 'closed' })}
      >
        <DialogContent key="create-user-dialog">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Create a new user account. They will be able to sign in immediately.
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input id="create-name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input id="create-email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                name="password"
                type="password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <select
                id="create-role"
                name="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue="STAFF"
              >
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog({ type: 'closed' })}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={dialog.type === 'edit'}
        onOpenChange={(open) => !open && setDialog({ type: 'closed' })}
      >
        <DialogContent key={dialog.type === 'edit' ? `edit-${dialog.user.id}` : 'edit'}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {dialog.type === 'edit' && (
            <form action={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={dialog.user.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={dialog.user.email}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <select
                  id="edit-role"
                  name="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue={dialog.user.role}
                >
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialog({ type: 'closed' })}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={dialog.type === 'reset-password'}
        onOpenChange={(open) => !open && setDialog({ type: 'closed' })}
      >
        <DialogContent key={dialog.type === 'reset-password' ? `reset-${dialog.user.id}` : 'reset'}>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              {dialog.type === 'reset-password' &&
                `Set a new password for ${dialog.user.name}. They will be signed out of all sessions.`}
            </DialogDescription>
          </DialogHeader>
          <form action={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                minLength={8}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog({ type: 'closed' })}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={resetPassword.isPending}>
                {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={dialog.type === 'deactivate'}
        onOpenChange={(open) => !open && setDialog({ type: 'closed' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              {dialog.type === 'deactivate' &&
                `Are you sure you want to deactivate ${dialog.user.name}? They will be immediately signed out and unable to log in until reactivated.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ type: 'closed' })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivateUser.isPending}
            >
              {deactivateUser.isPending ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
