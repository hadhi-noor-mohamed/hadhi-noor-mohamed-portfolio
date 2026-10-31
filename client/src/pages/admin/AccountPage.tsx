import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  KeyRound,
  LogOut,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  UserCog,
} from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingBlock } from '@/components/ui/Spinner';
import { AdminPageHeader, AdminSection, DetailItem } from '@/components/admin/AdminUI';

interface AccountUser {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'EDITOR';
  totpEnabled: boolean;
  lastLoginAt: string | null;
}

interface AccountData {
  user: AccountUser;
  activeSessions: number;
}

interface TotpSetup {
  secret: string;
  otpauth: string;
  qr: string;
}

export function AdminAccountPage() {
  const query = useAsync<AccountData>(() => api.get<AccountData>('/api/admin/account').then((r) => r.data), []);

  return (
    <div>
      <AdminPageHeader
        title="Account & security"
        description="Manage your sign-in details, password, active sessions and optional two-factor authentication."
      />

      {query.loading ? (
        <LoadingBlock label="Loading account…" />
      ) : query.error ? (
        <AdminSection>
          <p className="flex items-start gap-2 text-sm text-red-400" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {errorMessage(query.error)}
          </p>
        </AdminSection>
      ) : query.data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <IdentityCard account={query.data} onRefresh={query.reload} />
          <SessionsCard account={query.data} />
          <PasswordCard />
          <TwoFactorCard account={query.data} onRefresh={query.reload} />
        </div>
      ) : null}
    </div>
  );
}

function IdentityCard({ account, onRefresh }: { account: AccountData; onRefresh: () => Promise<unknown> }) {
  const toast = useToast();
  const [name, setName] = useState(account.user.name);
  const [email, setEmail] = useState(account.user.email);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(account.user.name);
    setEmail(account.user.email);
  }, [account.user.name, account.user.email]);

  const dirty = name.trim() !== account.user.name || email.trim().toLowerCase() !== account.user.email;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch('/api/admin/account', { name: name.trim(), email: email.trim() });
      toast.success('Account details updated');
      await onRefresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSection
      title="Sign-in identity"
      description="Your name and the email address used to sign in."
      actions={<UserCog className="h-4 w-4" style={{ color: 'var(--muted)' }} aria-hidden="true" />}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="acc-name" required>
            <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </Field>
          <Field label="Email" htmlFor="acc-email" required>
            <Input id="acc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </Field>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <DetailItem label="Role">
            <Badge variant={account.user.role === 'OWNER' ? 'primary' : 'muted'}>{account.user.role}</Badge>
          </DetailItem>
          <DetailItem label="Two-factor">
            {account.user.totpEnabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="muted">Off</Badge>}
          </DetailItem>
          <DetailItem label="Last sign-in">
            {account.user.lastLoginAt ? timeAgo(account.user.lastLoginAt) : <span style={{ color: 'var(--muted)' }}>—</span>}
          </DetailItem>
        </dl>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={!dirty}>
            Save details
          </Button>
        </div>
      </form>
    </AdminSection>
  );
}

function SessionsCard({ account }: { account: AccountData }) {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const revoke = async () => {
    setWorking(true);
    try {
      await api.post('/api/admin/account/revoke-sessions');
      toast.success('All sessions revoked — you will need to sign in again');
      // The current session is revoked too, so send the user back to sign-in.
      window.location.assign('/admin/login');
    } catch (error) {
      toast.error(errorMessage(error));
      setWorking(false);
      setConfirmOpen(false);
    }
  };

  return (
    <AdminSection title="Active sessions" description="Signing out everywhere invalidates every existing session, including this one.">
      <p className="mb-4 text-sm">
        <span className="text-2xl font-bold">{account.activeSessions}</span>{' '}
        <span style={{ color: 'var(--muted)' }}>
          active {account.activeSessions === 1 ? 'session' : 'sessions'} for this account.
        </span>
      </p>
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          iconLeft={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
        >
          Sign out everywhere
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Sign out of all sessions?"
        description="Every device signed in to this account will be signed out, including the one you are using now."
        confirmLabel="Sign out everywhere"
        destructive
        loading={working}
        onConfirm={() => void revoke()}
        onCancel={() => setConfirmOpen(false)}
      />
    </AdminSection>
  );
}

function PasswordCard() {
  const toast = useToast();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/admin/account/change-password', { currentPassword, newPassword });
      toast.success('Password changed — please sign in again');
      try {
        await logout();
      } catch {
        // The session was already revoked server-side; ignore.
      }
      navigate('/admin/login', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSection
      title="Password"
      description="Chosen passwords must be at least 12 characters. Changing your password signs you out of every device."
      actions={<KeyRound className="h-4 w-4" style={{ color: 'var(--muted)' }} aria-hidden="true" />}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Current password" htmlFor="pw-current" required>
          <Input
            id="pw-current"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" htmlFor="pw-new" hint="At least 12 characters." required>
            <Input
              id="pw-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-confirm" error={mismatch ? 'Passwords do not match.' : undefined} required>
            <Input
              id="pw-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </Field>
        </div>

        {error ? (
          <p className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : null}

        <p className="flex items-start gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          <LogOut className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          After changing your password you will be returned to the sign-in page.
        </p>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={mismatch || !currentPassword || newPassword.length < 12}>
            Change password
          </Button>
        </div>
      </form>
    </AdminSection>
  );
}

function TwoFactorCard({ account, onRefresh }: { account: AccountData; onRefresh: () => Promise<unknown> }) {
  const toast = useToast();
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState('');
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disabling, setDisabling] = useState(false);

  const begin = async () => {
    setStarting(true);
    try {
      const result = await api.post<TotpSetup>('/api/admin/account/totp/setup');
      setSetup(result.data);
      setCode('');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setStarting(false);
    }
  };

  const enable = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/admin/account/totp/enable', { code: code.trim() });
      toast.success('Two-factor authentication enabled');
      setSetup(null);
      setCode('');
      await onRefresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const disable = async () => {
    setDisabling(true);
    try {
      await api.post('/api/admin/account/totp/disable', { code: disableCode.trim() });
      toast.success('Two-factor authentication disabled');
      setDisableOpen(false);
      setDisableCode('');
      await onRefresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = async () => {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      toast.success('Secret copied');
    } catch {
      toast.error('Could not copy — select and copy the code manually.');
    }
  };

  return (
    <AdminSection
      title="Two-factor authentication"
      description="Add a time-based one-time code from an authenticator app as a second sign-in step."
      actions={<Smartphone className="h-4 w-4" style={{ color: 'var(--muted)' }} aria-hidden="true" />}
    >
      {account.user.totpEnabled ? (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Two-factor authentication is enabled.
          </p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            You will be asked for a code from your authenticator app each time you sign in. Keep a backup of your recovery
            access in case you lose your device.
          </p>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setDisableOpen(true)}
              iconLeft={<ShieldOff className="h-4 w-4" aria-hidden="true" />}
            >
              Disable
            </Button>
          </div>
        </div>
      ) : setup ? (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Scan this QR code with your authenticator app, then enter the 6-digit code it shows to finish enabling.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <img
              src={setup.qr}
              alt="Two-factor setup QR code"
              className="h-[180px] w-[180px] rounded-lg border bg-white p-2"
              style={{ borderColor: 'var(--border)' }}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Or enter this secret manually
              </span>
              <div className="flex items-center gap-2">
                <code
                  className="min-w-0 flex-1 truncate rounded-lg border px-3 py-2 font-mono text-sm"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-strong, transparent)' }}
                >
                  {setup.secret}
                </code>
                <Button size="icon" variant="ghost" onClick={() => void copySecret()} aria-label="Copy secret">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>

          <Field label="Verification code" htmlFor="totp-enable-code" hint="Enter the current 6-digit code from your app." required>
            <Input
              id="totp-enable-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (code.trim().length >= 6) void enable();
                }
              }}
            />
          </Field>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setSetup(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={() => void enable()}
              loading={submitting}
              disabled={code.trim().length < 6}
              iconLeft={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            >
              Verify & enable
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Two-factor authentication is currently off. Enabling it adds a code from an authenticator app on top of your
            password.
          </p>
          <div className="flex justify-end">
            <Button
              onClick={() => void begin()}
              loading={starting}
              iconLeft={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            >
              Set up two-factor
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={disableOpen}
        title="Disable two-factor authentication?"
        description={
          <div className="space-y-3">
            <p>Enter a current code from your authenticator app to confirm. This weakens account security.</p>
            <Field label="Authentication code" htmlFor="totp-disable-code" required>
              <Input
                id="totp-disable-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
              />
            </Field>
          </div>
        }
        confirmLabel="Disable"
        destructive
        loading={disabling}
        onConfirm={() => void disable()}
        onCancel={() => {
          setDisableOpen(false);
          setDisableCode('');
        }}
      />
    </AdminSection>
  );
}
