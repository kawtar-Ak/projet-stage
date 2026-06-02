export const SERVICE_LABELS_BY_ID = {
  1: { fr: 'Cellule informatique', ar: 'خلية المعلوميات' },
  2: { fr: "Bureau d'ordre", ar: 'مكتب الضبط' },
  3: { fr: 'Ouverture des dossiers', ar: 'فتح الملفات' },
  4: { fr: 'Distribution', ar: 'التوزيع' },
  5: { fr: 'Chef de service', ar: 'رئيس المصلحة' },
  6: { fr: 'Administrateur systeme', ar: 'مدير النظام' },
  7: { fr: 'Notification', ar: 'التبليغ' },
  8: { fr: 'Expertise', ar: 'خبرة' },
  9: { fr: 'Cassation', ar: 'النقض' },
  10: { fr: 'Remise des copies', ar: 'تسليم النسخ' },
  11: { fr: 'Secretariat particulier', ar: 'الكتابة الخاصة' },
  13: { fr: 'Archivage', ar: 'الحفظ' },
  15: { fr: 'Conseiller rapporteur', ar: 'المستشار المقرر' },
  16: { fr: 'Refere', ar: 'الاستعجالي' },
  17: { fr: 'Jugement au fond', ar: 'قضاء الموضوع' },
  18: { fr: 'Commissaire royal', ar: 'المفوض الملكي' },
  19: { fr: 'Premier president', ar: 'الرئيس الأول' },
  20: { fr: 'Gestion de retrait', ar: 'تدبير السحب' },
  21: { fr: 'Procedures et audiences mardi', ar: 'إجراءات و جلسات الثلاثاء' },
  22: { fr: 'Procedures et audiences Jeudi', ar: 'إجراءات و جلسات الخميس' }
};

export function getCurrentLanguage(i18nOrLanguage) {
  const value = typeof i18nOrLanguage === 'string'
    ? i18nOrLanguage
    : i18nOrLanguage?.resolvedLanguage || i18nOrLanguage?.language || 'fr';

  return value.startsWith('ar') ? 'ar' : 'fr';
}

export function getLocalizedServiceName(serviceOrName, i18nOrLanguage, fallback = '-') {
  const language = getCurrentLanguage(i18nOrLanguage);
  const service = normalizeServiceInput(serviceOrName);
  const known = findKnownService(service);
  const primary = language === 'ar'
    ? firstText(service.nomService, service.serviceNom, service.name)
    : firstNonArabicText(service.description, service.nomService, service.serviceNom, service.name);

  if (known?.[language]) return known[language];
  if (primary) return primary;

  const secondary = language === 'ar'
    ? firstText(service.description)
    : firstText(service.nomService, service.serviceNom, service.name);

  return secondary || fallback;
}

export function getLocalizedStatus(value, t) {
  const status = String(value || '').toLowerCase();
  if (status.includes('attente')) return t('en_attente');
  if (status.includes('accept')) return t('acceptees');
  if (status.includes('retourn')) return t('retourne');
  if (status.includes('refus')) return t('refusees');
  if (status.includes('annul')) return t('annulees');
  return value || '-';
}

export function getLocalizedResponseMessage(value, t) {
  const status = String(value || '').toLowerCase();
  if (!status) return '-';
  if (status.includes('annul') && status.includes('emetteur')) return t('annulee_par_emetteur');
  return getLocalizedStatus(value, t);
}

export function formatLocalizedDateTime(value, i18nOrLanguage) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(getCurrentLanguage(i18nOrLanguage) === 'ar' ? 'ar-MA' : 'fr-FR');
}

function normalizeServiceInput(serviceOrName) {
  if (!serviceOrName) return {};
  if (typeof serviceOrName === 'object') return serviceOrName;
  return { nomService: String(serviceOrName) };
}

function findKnownService(service) {
  const id = Number(service.idService || service.serviceId || service.id);
  if (SERVICE_LABELS_BY_ID[id]) return SERVICE_LABELS_BY_ID[id];

  const candidates = [
    service.nomService,
    service.serviceNom,
    service.description,
    service.name
  ].map(normalizeText).filter(Boolean);

  return Object.values(SERVICE_LABELS_BY_ID).find((item) =>
    candidates.includes(normalizeText(item.fr)) ||
    candidates.includes(normalizeText(item.ar))
  );
}

function firstText(...values) {
  return values.find((value) => isUsableText(value)) || '';
}

function firstNonArabicText(...values) {
  return values.find((value) => isUsableText(value) && !hasArabic(value)) || '';
}

function isUsableText(value) {
  const text = String(value || '').trim();
  return Boolean(text && text !== '-' && text !== '—');
}

function hasArabic(value) {
  return /[\u0600-\u06FF]/.test(String(value || ''));
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ');
}
