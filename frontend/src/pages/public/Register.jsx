import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LuUserPlus, LuZap } from 'react-icons/lu';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
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
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const created = await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      navigate(homeFor(created.role), { replace: true });
    } catch (error) {
      setErrors(apiFieldErrors(error));
      setFormError(apiErrorMessage(error, 'Could not create your account'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-2xl font-bold text-primary-700">
          <LuZap aria-hidden="true" /> ClubFlow
        </Link>
        <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-600">After signing up you can buy tickets and order merchandise, or join the club for member prices.</p>
          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{formError}</p>
          )}
          <Input label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
          <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
          <Input label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters" />
          <Input label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
          <Button type="submit" className="w-full" icon={LuUserPlus} loading={saving}>Sign up</Button>
          <p className="text-center text-sm text-slate-600">
            Already registered? <Link className="font-medium text-primary-700 hover:underline" to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
