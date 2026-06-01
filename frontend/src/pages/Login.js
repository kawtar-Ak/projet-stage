import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login: loginUser } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'fr').split('-')[0];
  const isArabic = currentLanguage === 'ar';
  const ministryLogoUrl = 'https://upload.wikimedia.org/wikipedia/commons/d/d3/MJ-Maroc.png';

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    try {
      await loginUser(login, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getLoginErrorMessage(err, t('identifiants_incorrects')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSceneMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    e.currentTarget.style.setProperty('--scene-x', x.toFixed(2));
    e.currentTarget.style.setProperty('--scene-y', y.toFixed(2));
  };

  return (
    <div className={`login-page ${isArabic ? 'login-page-rtl' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="login-ambient" aria-hidden="true">
        <span className="login-orb login-orb-one" />
        <span className="login-orb login-orb-two" />
        <span className="login-orb login-orb-three" />
        <span className="login-grid" />
      </div>

      <div className="language-switcher login-language-switcher" aria-label={t('changer_langue')}>
        <button type="button" onClick={() => changeLanguage('fr')} className={currentLanguage === 'fr' ? 'active' : ''}>
          <strong>FR</strong>
        </button>
        <button type="button" onClick={() => changeLanguage('ar')} className={currentLanguage === 'ar' ? 'active' : ''}>
          <strong>AR</strong>
        </button>
      </div>

      <section className="login-showcase" onMouseMove={handleSceneMove}>
        <div className="login-left-grid" aria-hidden="true" />
        <div className="legal-cards">
          <button type="button" className="legal-card legal-card-one" aria-label={t('carte_dossier_ministere')}>
            <span className="legal-card-mark">MJ</span>
            <span />
            <span />
            <span />
          </button>
          <button type="button" className="legal-card legal-card-two" aria-label={t('carte_loi')}>
            <span className="legal-card-mark">LOI</span>
            <span />
            <span />
            <span />
          </button>
          <button type="button" className="legal-card legal-card-three" aria-label={t('carte_acte_judiciaire')}>
            <span className="legal-card-mark">ACTE</span>
            <span />
            <span />
            <span />
          </button>
        </div>
        <div className="left-scale" aria-hidden="true">
          <span className="left-scale-line" />
          <span className="left-scale-post" />
          <span className="left-scale-pan left-scale-pan-one" />
          <span className="left-scale-pan left-scale-pan-two" />
        </div>
        <div className="login-left-content">
          <h1>
            {t('login_title_top')}
            <span>{t('login_title_middle')}</span>
            {t('login_title_bottom')}
          </h1>
        </div>
      </section>

      <div className="login-card">
        <img
          className="login-ministry-logo"
          src={ministryLogoUrl}
          alt={t('ministere_justice')}
          loading="eager"
        />
        <form onSubmit={handleSubmit}>
          <label className="login-field">
            <span>{t('nom_utilisateur')}</span>
            <div className="login-input-shell">
              <span className="field-icon">⌕</span>
              <input
                type="text"
                placeholder={t('nom_utilisateur')}
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
              />
            </div>
          </label>
          <label className="login-field">
            <span>{t('mot_de_passe')}</span>
            <div className="login-input-shell password-shell">
              <span className="field-icon">♙</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('mot_de_passe')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? t('masquer_mot_de_passe') : t('afficher_mot_de_passe')}
              >
                {showPassword ? '◉' : '◌'}
              </button>
            </div>
          </label>
          <div className="login-options">
            <div className="checkbox">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label htmlFor="remember">{t('se_souvenir')}</label>
            </div>
          </div>
          <button className="login-submit" type="submit" disabled={submitting}>
            <span className="submit-icon">↪</span>
            <span>{submitting ? t('chargement') : t('se_connecter')}</span>
          </button>
          {error && <p className="login-error">{error}</p>}
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
