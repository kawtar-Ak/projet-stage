import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const { login: loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await loginUser(login, password);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, 'Identifiants incorrects'));
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Gestion Courrier</h2>
        <p>Ministère de la Justice</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="checkbox">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label htmlFor="remember">Se souvenir de moi</label>
          </div>
          <button type="submit">Se connecter</button>
          {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}

function getErrorMessage(error, fallback) {
  if (typeof error.response?.data === 'string') return error.response.data;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message === 'Network Error') return 'Backend indisponible. Verifiez que http://localhost:5127 est lance.';
  return fallback;
}

export default Login;
