import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../../api/auth';
import Button from '../../components/Button/Button';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('pawly_token');
    if (token) {
      navigate('/discover', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/discover');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <div className="login__card">
        <h1 className="login__title">Welcome back</h1>

        <p className="login__subtitle">
          Log in to continue to Pawly.
        </p>

        <form className="login__form" onSubmit={handleSubmit}>
          <div className="login__field">
            <label className="login__label">
              Email
            </label>

            <input
              className="login__input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login__field">
            <label className="login__label">
              Password
            </label>

            <input
              className="login__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="login__error">
              {error}
            </p>
          )}

          <Button
            type="submit"
            loading={loading}
            fullWidth
          >
            Log In
          </Button>
        </form>

        <p className="login__register">
          Don't have an account?{' '}
          <Link to="/register">Register</Link>
        </p>

        <div className="login__back-wrap">
          <Link to="/" className="login__back-link">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}