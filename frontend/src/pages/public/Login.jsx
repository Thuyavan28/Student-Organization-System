import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { FiLogIn, FiZap } from 'react-icons/fi';
import { apiErrorMessage } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { homeFor } from '../../utils/constants';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@skyline.example.com' },
  { label: 'Treasurer', email: 'treasurer@skyline.example.com' },
  { label: 'Volunteer', email: 'volunteer1@skyline.example.com' },
  { label: 'Member', email: 'student20@example.com' },
];
const DEMO_PASSWORD = 'Password@123';

function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ email: '', password: '' });
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
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-2xl font-bold text-primary-700">
          <FiZap aria-hidden="true" /> ClubFlow
        </Link>
        <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Log in</h1>
          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{formError}</p>
          )}
          <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
          <Input label="Password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
          <Button type="submit" className="w-full" icon={FiLogIn} loading={saving}>Log in</Button>
          <p className="text-center text-sm text-slate-600">
            New here? <Link className="font-medium text-primary-700 hover:underline" to="/register">Create an account</Link>
          </p>
        </form>

        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm">
          <p className="mb-2 font-medium text-slate-700">Demo accounts (password {DEMO_PASSWORD})</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                size="sm"
                variant="secondary"
                onClick={() => setForm({ email: account.email, password: DEMO_PASSWORD })}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
