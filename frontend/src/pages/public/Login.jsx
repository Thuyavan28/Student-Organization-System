import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LuCircleAlert, LuCoins, LuInfo, LuLogIn, LuMail, LuShieldCheck, LuUser, LuUsers } from 'react-icons/lu';
import { apiErrorBody, apiErrorMessage } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import GoogleAuthButton, { OrDivider } from '../../components/feature/GoogleAuthButton';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import { useAuth } from '../../hooks/useAuth';
import { homeFor } from '../../utils/constants';

const DEMO_ACCOUNTS = [
  { label: 'Admin', icon: LuShieldCheck, email: 'admin@skyline.example.com' },
  { label: 'Treasurer', icon: LuCoins, email: 'treasurer@skyline.example.com' },
  { label: 'Volunteer', icon: LuUsers, email: 'volunteer1@skyline.example.com' },
  { label: 'Member', icon: LuUser, email: 'student20@example.com' },
];
const DEMO_PASSWORD = 'Password@123';

function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

export default function Login() {
  const { user, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Sent by the sign-up page when the email already has an account.
  const redirected = useLocation().state;
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ email: redirected?.email ?? '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  if (user) return <Navigate to={next ?? homeFor(user.role)} replace />;

  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) found.email = 'Enter a valid email address';
    if (!form.password) found.password = 'Enter your password';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const signedIn = await login(form.email.trim(), form.password);
      navigate(next ?? homeFor(signedIn.role), { replace: true });
    } catch (error) {
      setFormError(apiErrorMessage(error, 'Could not log in'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to manage your tickets, orders and membership."
      footer={
        <div className="rounded-2xl border border-dashed border-cf-border/40 p-4">
          <p className="mb-3 text-xs font-medium text-cf-muted">Try a demo account (password {DEMO_PASSWORD})</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                size="sm"
                variant="secondary"
                icon={account.icon}
                onClick={() => {
                  setForm({ email: account.email, password: DEMO_PASSWORD });
                  setErrors({});
                  setFormError('');
                }}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {redirected?.notice && !formError && (
          <p className="flex items-start gap-2 rounded-xl border border-cf-border bg-cf-subtle px-3 py-2.5 text-sm text-cf-fg" role="status">
            <LuInfo className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {redirected.notice}
          </p>
        )}
        {formError && (
          <p className="flex items-start gap-2 rounded-xl border border-cf-accent/30 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
            <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {formError}
          </p>
        )}
        <Input id="email" label="Email" type="email" icon={LuMail} placeholder="you@example.com" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordInput id="password" label="Password" placeholder="Enter your password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
        <Button type="submit" size="lg" className="w-full" icon={LuLogIn} loading={saving}>Log in</Button>
        <OrDivider />
        <GoogleAuthButton
          text="continue_with"
          onCredential={async (accessToken) => {
            try {
              const signedIn = await loginWithGoogle(accessToken, 'login');
              navigate(next ?? homeFor(signedIn.role), { replace: true });
            } catch (error) {
              const body = apiErrorBody(error);
              // No account for this Google email yet: send them to sign up instead of creating one silently.
              if (body?.code === 'ACCOUNT_NOT_FOUND') {
                navigate('/register', { replace: true, state: { email: body.details?.email, notice: body.message } });
                return;
              }
              throw error;
            }
          }}
          onError={setFormError}
        />
        <p className="text-center text-sm text-cf-muted">
          New here? <Link className="font-semibold text-cf-fg underline-offset-4 hover:underline" to="/register">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
