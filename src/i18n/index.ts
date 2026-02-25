/**
 * i18n Configuration for FluxStudio
 * @file src/i18n/index.ts
 *
 * Supports 8 languages with RTL support for Arabic.
 *
 * Bundle optimization (Sprint 89):
 * - Only English (fallback) locale is bundled in the initial chunk.
 * - All other locales are lazy-loaded on demand via dynamic import()
 *   when the user switches language or the browser language detector
 *   resolves to a non-English locale.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Only English is statically imported (always needed as fallback)
import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enProjects from '../locales/en/projects.json';
import enMessages from '../locales/en/messages.json';
import enAdmin from '../locales/en/admin.json';

// Language configuration
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '\u{1F1FA}\u{1F1F8}', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Espa\u00f1ol', flag: '\u{1F1EA}\u{1F1F8}', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Fran\u00e7ais', flag: '\u{1F1EB}\u{1F1F7}', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '\u65e5\u672c\u8a9e', flag: '\u{1F1EF}\u{1F1F5}', dir: 'ltr' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '\u7b80\u4f53\u4e2d\u6587', flag: '\u{1F1E8}\u{1F1F3}', dir: 'ltr' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '\u7e41\u9ad4\u4e2d\u6587', flag: '\u{1F1F9}\u{1F1FC}', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', flag: '\u{1F1F8}\u{1F1E6}', dir: 'rtl' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

// Namespaces
export const NAMESPACES = ['common', 'auth', 'projects', 'messages', 'admin'] as const;
export type Namespace = typeof NAMESPACES[number];

/**
 * Lazy locale loaders — each returns all 5 namespaces for a language.
 * Vite will code-split these into separate chunks that are fetched
 * only when the language is activated.
 */
type LocaleBundle = Record<Namespace, Record<string, unknown>>;

const localeLoaders: Record<string, () => Promise<LocaleBundle>> = {
  es: async () => {
    const [common, auth, projects, messages, admin] = await Promise.all([
      import('../locales/es/common.json'),
      import('../locales/es/auth.json'),
      import('../locales/es/projects.json'),
      import('../locales/es/messages.json'),
      import('../locales/es/admin.json'),
    ]);
    return {
      common: common.default,
      auth: auth.default,
      projects: projects.default,
      messages: messages.default,
      admin: admin.default,
    };
  },
  fr: async () => {
    const [common, auth, projects, messages, admin] = await Promise.all([
      import('../locales/fr/common.json'),
      import('../locales/fr/auth.json'),
      import('../locales/fr/projects.json'),
      import('../locales/fr/messages.json'),
      import('../locales/fr/admin.json'),
    ]);
    return {
      common: common.default,
      auth: auth.default,
      projects: projects.default,
      messages: messages.default,
      admin: admin.default,
    };
  },
  de: async () => {
    const [common, auth, projects, messages, admin] = await Promise.all([
      import('../locales/de/common.json'),
      import('../locales/de/auth.json'),
      import('../locales/de/projects.json'),
      import('../locales/de/messages.json'),
      import('../locales/de/admin.json'),
    ]);
    return {
      common: common.default,
      auth: auth.default,
      projects: projects.default,
      messages: messages.default,
      admin: admin.default,
    };
  },
  ja: async () => {
    const [common, auth, projects, messages, admin] = await Promise.all([
      import('../locales/ja/common.json'),
      import('../locales/ja/auth.json'),
      import('../locales/ja/projects.json'),
      import('../locales/ja/messages.json'),
      import('../locales/ja/admin.json'),
    ]);
    return {
      common: common.default,
      auth: auth.default,
      projects: projects.default,
      messages: messages.default,
      admin: admin.default,
    };
  },
  'zh-CN': async () => {
    const [common, auth, projects, messages, admin] = await Promise.all([
      import('../locales/zh-CN/common.json'),
      import('../locales/zh-CN/auth.json'),
      import('../locales/zh-CN/projects.json'),
      import('../locales/zh-CN/messages.json'),
      import('../locales/zh-CN/admin.json'),
    ]);
    return {
      common: common.default,
      auth: auth.default,
      projects: projects.default,
      messages: messages.default,
      admin: admin.default,
    };
  },
  'zh-TW': async () => {
    const [common, auth, projects, messages, admin] = await Promise.all([
      import('../locales/zh-TW/common.json'),
      import('../locales/zh-TW/auth.json'),
      import('../locales/zh-TW/projects.json'),
      import('../locales/zh-TW/messages.json'),
      import('../locales/zh-TW/admin.json'),
    ]);
    return {
      common: common.default,
      auth: auth.default,
      projects: projects.default,
      messages: messages.default,
      admin: admin.default,
    };
  },
  ar: async () => {
    const [common, auth, projects, messages, admin] = await Promise.all([
      import('../locales/ar/common.json'),
      import('../locales/ar/auth.json'),
      import('../locales/ar/projects.json'),
      import('../locales/ar/messages.json'),
      import('../locales/ar/admin.json'),
    ]);
    return {
      common: common.default,
      auth: auth.default,
      projects: projects.default,
      messages: messages.default,
      admin: admin.default,
    };
  },
};

/** Track which locales have already been loaded to avoid re-fetching. */
const loadedLocales = new Set<string>(['en']);

/**
 * Dynamically load a locale's resource bundles and register them with i18next.
 * Returns immediately if the locale is already loaded.
 */
async function loadLocale(lang: string): Promise<void> {
  // Normalise: "es-MX" -> "es", "zh-CN" stays "zh-CN"
  const key = localeLoaders[lang] ? lang : lang.split('-')[0];

  if (loadedLocales.has(key) || !localeLoaders[key]) return;

  try {
    const bundles = await localeLoaders[key]();
    for (const ns of NAMESPACES) {
      if (bundles[ns]) {
        i18n.addResourceBundle(key, ns, bundles[ns], true, true);
      }
    }
    loadedLocales.add(key);
  } catch (err) {
    console.error(`[i18n] Failed to load locale "${key}":`, err);
    // Fall back to English — already loaded
  }
}

// Resources — only English is bundled statically
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    projects: enProjects,
    messages: enMessages,
    admin: enAdmin,
  },
};

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: NAMESPACES,

    // partialBundledLanguages tells i18next that not all languages are
    // in the initial `resources` object — it prevents the library from
    // logging "no resources for language X" warnings before the lazy
    // bundles have been fetched.
    partialBundledLanguages: true,

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'fluxstudio-language',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: true,
    },
  });

// When the language changes (via detector at startup, or user switch),
// ensure the locale bundles are loaded.
i18n.on('languageChanged', (lng) => {
  loadLocale(lng).catch(() => {});
});

// Eagerly load the detected language at startup (if non-English)
if (i18n.language && i18n.language !== 'en') {
  loadLocale(i18n.language).catch(() => {});
}

// Helper to get current language config
export function getCurrentLanguageConfig() {
  const currentLang = i18n.language;
  return SUPPORTED_LANGUAGES.find(lang => lang.code === currentLang) || SUPPORTED_LANGUAGES[0];
}

// Helper to check if current language is RTL
export function isRTL(): boolean {
  const config = getCurrentLanguageConfig();
  return config.dir === 'rtl';
}

// Helper to change language
export async function changeLanguage(code: LanguageCode): Promise<void> {
  // Ensure locale bundles are loaded before switching
  await loadLocale(code);
  await i18n.changeLanguage(code);

  // Update document direction for RTL support
  const config = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  if (config) {
    document.documentElement.dir = config.dir;
    document.documentElement.lang = code;
  }
}

// Helper to get language by code
export function getLanguageByCode(code: string) {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

export default i18n;
