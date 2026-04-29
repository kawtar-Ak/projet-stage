import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

const savedLanguage = localStorage.getItem('i18nextLng') || 'fr';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      ar: { translation: ar },
    },
    lng: savedLanguage,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
  });

document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';

export default i18n;
