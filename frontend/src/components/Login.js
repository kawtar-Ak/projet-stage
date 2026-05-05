import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function Login() {
  const { t } = useTranslation();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login: loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await loginUser(login, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || t('erreur_connexion'));
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '50px auto' }}>
      <h2>{t('connexion')}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>{t('login')}</label>
          <input type="text" value={login} onChange={e => setLogin(e.target.value)} required />
        </div>
        <div>
          <label>{t('mot_de_passe')}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button type="submit">{t('se_connecter')}</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
}

export default Login;
