import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { login } = useAuth(); // AuthContext-ൽ നിന്ന് login function എടുക്കുന്നു
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Location state-ൽ നിന്ന് error message set ചെയ്യുക
  useEffect(() => {
    if (
      location.state &&
      typeof location.state === 'object' &&
      (location.state as any).message
    ) {
      setError((location.state as any).message);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // login function ഇല്ലെങ്കിൽ crash ഒഴിവാക്കാൻ
    if (typeof login !== 'function') {
      setError('Login function not available. Please check AuthContext.');
      return;
    }

    try {
      await login(email, password);
      navigate('/'); // login വിജയിച്ചാൽ home page-ലേക്ക് പോകുക
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
