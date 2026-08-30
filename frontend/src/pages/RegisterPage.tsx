import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Field } from '../components/Field';
import { Message } from '../components/Message';
import { ApiError } from '../services/apiClient';
import { authApi } from '../services/bankflow';

const MIN_PASSWORD_LENGTH = 8;

type FormErrors = Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate(): FormErrors {
    const errors: FormErrors = {};
    if (!form.name.trim()) {
      errors.name = 'Name is required.';
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (form.confirmPassword !== form.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.displayMessage : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Create your BankFlow account</h1>
        {error ? <Message tone="error">{error}</Message> : null}

        <Field
          id="name"
          label="Name"
          autoComplete="name"
          value={form.name}
          error={fieldErrors.name}
          onChange={(e) => update('name', e.target.value)}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          error={fieldErrors.email}
          onChange={(e) => update('email', e.target.value)}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          error={fieldErrors.password}
          onChange={(e) => update('password', e.target.value)}
        />
        <Field
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          error={fieldErrors.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)}
        />

        <button type="submit" className="button-primary" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
