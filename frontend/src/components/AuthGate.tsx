import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Feather, LoaderCircle, LockKeyhole } from 'lucide-react';
import { useAuth } from '../lib/auth/AuthProvider';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, message, messageType } = useAuth();

  if (status === 'loading' || status === 'verifying') {
    return (
      <main className="auth-shell" aria-live="polite">
        <div className="auth-card glass-panel">
          <LoaderCircle className="loading-icon" size={22} />
          <p>{status === 'loading' ? 'Restoring your session…' : 'Verifying your session…'}</p>
        </div>
      </main>
    );
  }

  if (status === 'authenticated') {
    return children;
  }

  return (
    <SignInScreen
      message={message}
      messageType={messageType}
      configurationMissing={status === 'needs-config'}
    />
  );
}

function SignInScreen({
  message,
  messageType,
  configurationMissing,
}: {
  message: string | null;
  messageType: 'error' | 'success' | null;
  configurationMissing: boolean;
}) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function changeMode(nextMode: 'sign-in' | 'sign-up') {
    setMode(nextMode);
    setError(null);
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const safeFullName = fullName
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 100);
    if (!safeFullName) {
      setError('Enter your full name.');
      return;
    }
    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await signUp(safeFullName, email.trim(), password);
    } catch (signUpError) {
      const errorCode = signUpError && typeof signUpError === 'object' && 'code' in signUpError
        ? signUpError.code
        : null;
      const errorMessage = signUpError instanceof Error ? signUpError.message : 'Unable to create your account.';
      setError(
        errorCode === 'user_already_exists' || errorCode === 'email_exists' || /already registered/i.test(errorMessage)
          ? 'An account with this email already exists. Try signing in instead.'
          : errorMessage
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card glass-panel" aria-labelledby="signin-title">
        <div className="auth-brand">
          <span className="brand-mark"><Feather size={20} /></span>
          <span className="brand-name">STORYFORGE <span>AI</span></span>
        </div>
        <div className="page-kicker">Your next chapter awaits</div>
        <h1 id="signin-title">{mode === 'sign-in' ? 'Return to your library' : 'Create your account'}</h1>
        {configurationMissing ? (
          <p className="form-message error" role="alert">
            Authentication is not configured. Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_API_BASE_URL in the frontend environment.
          </p>
        ) : (
          <>
            <p className="auth-subtitle">
              {mode === 'sign-in'
                ? 'Sign in to continue to your stories and worlds.'
                : 'Create an account to begin building your library.'}
            </p>
            {(error || (mode === 'sign-in' ? message : null)) && (
              <p
                className={`form-message ${error || messageType !== 'success' ? 'error' : 'success'}`}
                role={error || messageType !== 'success' ? 'alert' : 'status'}
              >
                {error ?? message}
              </p>
            )}
            <form className="auth-form" onSubmit={mode === 'sign-in' ? handleSignIn : handleSignUp}>
              {mode === 'sign-up' && (
                <label>
                  Full name
                  <input
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={100}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    disabled={submitting}
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={submitting}
                />
              </label>
              <label>
                Password
                <span className="auth-password-control">
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                    aria-pressed={passwordVisible}
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    disabled={submitting}
                  >
                    {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>
              {mode === 'sign-up' && (
                <>
                  <label>
                    Confirm password
                    <span className="auth-password-control">
                      <input
                        type={passwordVisible ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        aria-label={passwordVisible ? 'Hide passwords' : 'Show passwords'}
                        aria-pressed={passwordVisible}
                        onClick={() => setPasswordVisible((visible) => !visible)}
                        disabled={submitting}
                      >
                        {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </span>
                  </label>
                  <p className="auth-password-hint">Use at least 8 characters. Supabase enforces the project’s password policy.</p>
                </>
              )}
              <button className="new-story-button auth-submit" type="submit" disabled={submitting}>
                {submitting
                  ? <LoaderCircle className="loading-icon" size={16} />
                  : mode === 'sign-in' ? <LockKeyhole size={16} /> : <Feather size={16} />}
                {submitting ? (mode === 'sign-in' ? 'Signing in…' : 'Creating account…') : mode === 'sign-in' ? 'Sign in' : 'Create account'}
              </button>
            </form>
            <p className="auth-mode-switch">
              {mode === 'sign-in' ? 'New to StoryForge AI?' : 'Already have an account?'}
              <button
                type="button"
                className="auth-mode-link"
                onClick={() => changeMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
                disabled={submitting}
              >
                {mode === 'sign-in' ? 'Create account' : 'Back to sign in'}
              </button>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
