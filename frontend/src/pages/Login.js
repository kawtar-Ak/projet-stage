import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const defaultAdminLogin = 'admin';
const defaultAdminPassword = '1q2w3E*';

function Login() {
  const [login, setLogin] = useState(defaultAdminLogin);
  const [password, setPassword] = useState(defaultAdminPassword);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login: loginUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    try {
      await loginUser(login, password);
      navigate('/dashboard');
    } catch (err) {
      setError(getLoginErrorMessage(err, t('identifiants_incorrects')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>{t('app_name')}</h2>
        <p>{t('ministere_justice')}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={t('nom_utilisateur')}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t('mot_de_passe')}
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
            <label htmlFor="remember">{t('se_souvenir')}</label>
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? t('chargement') : t('se_connecter')}
          </button>
          <p style={{ color: '#5f6b7a', marginTop: 10, fontSize: 13 }}>
            admin / 1q2w3E* | archive / 1q2w3E* | bureauordre / 1q2w3E*
          </p>
          {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}

function getLoginErrorMessage(error, fallback) {
  const data = error.response?.data;
  return data?.error_description ||
    (typeof data?.error === 'string' ? data.error : data?.error?.message) ||
    data?.message ||
    fallback;
}

export default Login;
