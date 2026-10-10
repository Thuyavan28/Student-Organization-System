import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LuCircleAlert, LuInfo, LuMail, LuUser, LuUserPlus } from 'react-icons/lu';
import { apiErrorBody, apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import GoogleAuthButton, { OrDivider } from '../../components/feature/GoogleAuthButton';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import SignInTransition from '../../components/ui/SignInTransition';
import { useAuth } from '../../hooks/useAuth';
import { usePostLogin } from '../../hooks/usePostLogin';
import { homeFor } from '../../utils/constants';

function validate(form) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'Enter your full name';
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address';
  if (form.password.length < 8) errors.password = 'Use at least 8 characters';
  if (form.confirm !== form.password) errors.confirm = 'Passwords do not match';
  return errors;
}

export default function Register() {
  const { user, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  // Sent by the login page when a Google email has no account yet.
  const redirected = useLocation().state;
  const [form, setForm] = useState({ name: '', email: redirected?.email ?? '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const post = usePostLogin();

  if (post.transition) return <SignInTransition {...post.transition} />;
  if (user && !post.active.current) return <Navigate to={homeFor(user.role)} replace />;

  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    setSaving(true);
    post.begin();
    try {
      const created = await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      await post.finish(created, homeFor(created.role));
    } catch (error) {
      post.cancel();
      const body = apiErrorBody(error);
      // Already registered with this email: take them to log in with it instead of showing a dead end.
      if (body?.code === 'EMAIL_TAKEN') {
        navigate('/login', { replace: true, state: { email: form.email.trim(), notice: body.message } });
        return;
      }
      setErrors(apiFieldErrors(error));
      setFormError(apiErrorMessage(error, 'Could not create your account'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Buy tickets and order merchandise, or join the club for member prices."
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
        <Input id="name" label="Full name" icon={LuUser} placeholder="Your full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <Input id="email" label="Email" type="email" icon={LuMail} placeholder="you@example.com" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordInput id="password" label="Password" placeholder="At least 8 characters" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} helpText="Use at least 8 characters" />
        <PasswordInput id="confirm" label="Confirm password" placeholder="Repeat your password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" size="lg" className="w-full" icon={LuUserPlus} loading={saving}>Sign up</Button>
        <OrDivider />
        <GoogleAuthButton
          text="signup_with"
          onCredential={async (accessToken) => {
            post.begin();
            try {
              const signedIn = await loginWithGoogle(accessToken, 'signup');
              await post.finish(signedIn, homeFor(signedIn.role));
            } catch (error) {
              post.cancel();
              const body = apiErrorBody(error);
              // This Google email already has an account: do not sign in as if it were new, go to log in.
              if (body?.code === 'ACCOUNT_EXISTS') {
                navigate('/login', { replace: true, state: { email: body.details?.email, notice: body.message } });
                return;
              }
              throw error;
            }
          }}
          onError={setFormError}
        />
        <p className="text-center text-sm text-cf-muted">
          Already registered? <Link className="font-semibold text-cf-fg underline-offset-4 hover:underline" to="/login">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
