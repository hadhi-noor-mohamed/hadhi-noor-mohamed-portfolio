import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSeo } from '@/lib/seo';
import { errorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';

export function AdminLoginPage() {
  const { login, mfaRequired, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useSeo({ title: 'Sign in', robots: 'noindex, nofollow', exact: false }, []);

  if (user) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password, mfaRequired ? code.trim() : undefined);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
            style={{ backgroundImage: 'linear-gradient(120deg, var(--brand-primary), var(--brand-accent))' }}
            aria-hidden="true"
          >
            H
          </span>
          <h1 className="text-2xl font-bold">Portfolio CMS</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Sign in to manage site content.
          </p>
        </div>

        <Card className="card-elevated p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email" htmlFor="login-email" required>
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>

            <Field label="Password" htmlFor="login-password" required>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>

            {mfaRequired ? (
              <Field label="Two-factor code" htmlFor="login-code" hint="Enter the 6-digit code from your authenticator app." required>
                <Input
                  id="login-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  maxLength={10}
                  required
                />
              </Field>
            ) : null}

            {error ? (
              <p className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400" role="alert">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </p>
            ) : null}

            <Button
              type="submit"
              fullWidth
              loading={submitting}
              iconLeft={mfaRequired ? <KeyRound className="h-4 w-4" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
            >
              {mfaRequired ? 'Verify & sign in' : 'Sign in'}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-xs" style={{ color: 'var(--muted)' }}>
          <Link to="/" className="hover:underline">
            ← Back to the public site
          </Link>
        </p>
      </div>
    </div>
  );
}
