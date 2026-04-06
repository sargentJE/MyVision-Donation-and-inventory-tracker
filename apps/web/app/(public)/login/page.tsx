'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Validate redirect is a safe internal path — prevents open redirect */
function getSafeRedirect(value: string | null): string {
  if (!value) return '/';
  // Must start with / and not // (protocol-relative URL)
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '/';
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const redirect = getSafeRedirect(searchParams.get('redirect'));
  const sessionExpired = searchParams.get('expired') === '1';
  const { isAuthenticated, isLoading, login, loginError, isLoggingIn } =
    useAuth();

  // Show session expiry toast on mount if redirected due to 401
  useEffect(() => {
    if (sessionExpired) {
      toast({
        title: 'Session expired',
        description: 'Your session has expired. Please sign in again.',
        variant: 'destructive',
      });
    }
  }, [sessionExpired, toast]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirect);
    }
  }, [isAuthenticated, redirect, router]);

  async function onSubmit(values: LoginValues) {
    try {
      await login(values);
      router.push(redirect);
    } catch {
      // Error is captured in loginError
    }
  }

  // Show nothing while checking auth state
  if (isLoading) {
    return null;
  }

  const errorMessage =
    loginError &&
    ('status' in loginError
      ? (loginError as { status: number }).status === 401
        ? 'Invalid email or password'
        : 'Something went wrong. Please try again.'
      : 'Something went wrong. Please try again.');

  return (
    <div className="w-full max-w-sm space-y-6 rounded-lg border border-t-4 border-border border-t-primary bg-background p-6 shadow-sm">
      <div className="space-y-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/myvision-logo.svg"
          alt="MyVision Oxfordshire"
          className="mx-auto h-10"
        />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Equipment Tracker
          </h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@myvision.org.uk"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoggingIn}>
            {isLoggingIn ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
