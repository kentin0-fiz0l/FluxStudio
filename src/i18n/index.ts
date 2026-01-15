/**
 * i18n Configuration for FluxStudio
 * @file src/i18n/index.ts
 *
 * Supports 8 languages with RTL support for Arabic
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enProjects from '../locales/en/projects.json';
import enMessages from '../locales/en/messages.json';
import enAdmin from '../locales/en/admin.json';

import esCommon from '../locales/es/common.json';
import esAuth from '../locales/es/auth.json';
import esProjects from '../locales/es/projects.json';
import esMessages from '../locales/es/messages.json';
import esAdmin from '../locales/es/admin.json';

import frCommon from '../locales/fr/common.json';
import frAuth from '../locales/fr/auth.json';
import frProjects from '../locales/fr/projects.json';
import frMessages from '../locales/fr/messages.json';
import frAdmin from '../locales/fr/admin.json';

import deCommon from '../locales/de/common.json';
import deAuth from '../locales/de/auth.json';
import deProjects from '../locales/de/projects.json';
import deMessages from '../locales/de/messages.json';
import deAdmin from '../locales/de/admin.json';

import jaCommon from '../locales/ja/common.json';
import jaAuth from '../locales/ja/auth.json';
import jaProjects from '../locales/ja/projects.json';
import jaMessages from '../locales/ja/messages.json';
import jaAdmin from '../locales/ja/admin.json';

import zhCNCommon from '../locales/zh-CN/common.json';
import zhCNAuth from '../locales/zh-CN/auth.json';
import zhCNProjects from '../locales/zh-CN/projects.json';
import zhCNMessages from '../locales/zh-CN/messages.json';
import zhCNAdmin from '../locales/zh-CN/admin.json';

import zhTWCommon from '../locales/zh-TW/common.json';
import zhTWAuth from '../locales/zh-TW/auth.json';
import zhTWProjects from '../locales/zh-TW/projects.json';
import zhTWMessages from '../locales/zh-TW/messages.json';
import zhTWAdmin from '../locales/zh-TW/admin.json';

import arCommon from '../locales/ar/common.json';
import arAuth from '../locales/ar/auth.json';
import arProjects from '../locales/ar/projects.json';
import arMessages from '../locales/ar/messages.json';
import arAdmin from '../locales/ar/admin.json';

// Language configuration
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

// Namespaces
export const NAMESPACES = ['common', 'auth', 'projects', 'messages', 'admin'] as const;
export type Namespace = typeof NAMESPACES[number];

// Resources
const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    projects: enProjects,
    messages: enMessages,
    admin: enAdmin,
  },
  es: {
    common: esCommon,
    auth: esAuth,
    projects: esProjects,
    messages: esMessages,
    admin: esAdmin,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    projects: frProjects,
    messages: frMessages,
    admin: frAdmin,
  },
  de: {
    common: deCommon,
    auth: deAuth,
    projects: deProjects,
    messages: deMessages,
    admin: deAdmin,
  },
  ja: {
    common: jaCommon,
    auth: jaAuth,
    projects: jaProjects,
    messages: jaMessages,
    admin: jaAdmin,
  },
  'zh-CN': {
    common: zhCNCommon,
    auth: zhCNAuth,
    projects: zhCNProjects,
    messages: zhCNMessages,
    admin: zhCNAdmin,
  },
  'zh-TW': {
    common: zhTWCommon,
    auth: zhTWAuth,
    projects: zhTWProjects,
    messages: zhTWMessages,
    admin: zhTWAdmin,
  },
  ar: {
    common: arCommon,
    auth: arAuth,
    projects: arProjects,
    messages: arMessages,
    admin: arAdmin,
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
