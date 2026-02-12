/**
 * FluxStudio Environment Configuration
 * Centralized configuration for different deployment environments
 */

export interface EnvironmentConfig {
  API_BASE_URL: string;
  SOCKET_URL: string;
  AUTH_URL: string;
  MESSAGING_URL: string;
  GOOGLE_CLIENT_ID: string;
  NODE_ENV: string;
  APP_URL: string;
  ENABLE_DEBUG: boolean;
  API_TIMEOUT: number;
  MAX_FILE_SIZE: number;
  SUPPORTED_FILE_TYPES: string[];
  ENABLE_FLUXPRINT: boolean;
}

// Environment detection
const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';
const isTest = import.meta.env.MODE === 'test';

// Get environment variables with fallbacks
const getEnvVar = (key: string, fallback: string = ''): string => {
  return import.meta.env[key] || fallback;
};

// Base configuration
const baseConfig = {
  NODE_ENV: import.meta.env.MODE || 'development',
  GOOGLE_CLIENT_ID: getEnvVar('VITE_GOOGLE_CLIENT_ID', '65518208813-f4rgudom5b57qad0jlhjtsocsrb26mfc.apps.googleusercontent.com'),
  ENABLE_DEBUG: isDevelopment,
  API_TIMEOUT: 30000, // 30 seconds
  MAX_FILE_SIZE: 104857600, // 100MB
  SUPPORTED_FILE_TYPES: ['png', 'jpg', 'jpeg', 'gif', 'pdf', 'figma', 'sketch', 'svg', 'webp'],
  ENABLE_FLUXPRINT: getEnvVar('VITE_ENABLE_FLUXPRINT', 'false') === 'true'
};

// Development configuration
// Use relative URLs to go through Vite proxy (configured in vite.config.ts)
const developmentConfig: EnvironmentConfig = {
  ...baseConfig,
  API_BASE_URL: '/api',
  SOCKET_URL: 'ws://localhost:3004',
  AUTH_URL: '/auth',
  MESSAGING_URL: '/api/messaging',
  APP_URL: 'http://localhost:5173',
};

// Production configuration
const productionConfig: EnvironmentConfig = {
  ...baseConfig,
  API_BASE_URL: getEnvVar('VITE_API_BASE_URL', '/api'),
  SOCKET_URL: getEnvVar('VITE_SOCKET_URL', 'wss://fluxstudio.art'),
  AUTH_URL: getEnvVar('VITE_AUTH_URL', '/api/auth'),
  MESSAGING_URL: getEnvVar('VITE_MESSAGING_URL', '/api/messaging'),
  APP_URL: getEnvVar('VITE_APP_URL', 'https://fluxstudio.art'),
  ENABLE_DEBUG: false,
};

// Test configuration
const testConfig: EnvironmentConfig = {
  ...baseConfig,
  API_BASE_URL: 'http://localhost:3001/api',
  SOCKET_URL: 'ws://localhost:3004',
  AUTH_URL: 'http://localhost:3001/api/auth',
  MESSAGING_URL: 'http://localhost:3004/api',
  APP_URL: 'http://localhost:3000',
  ENABLE_DEBUG: true,
};

// Export the appropriate configuration
export const config: EnvironmentConfig = (() => {
  if (isProduction) {
    return productionConfig;
  }
  if (isTest) {
    return testConfig;
  }
  return developmentConfig;
})();

// Utility functions
export const isDevMode = () => isDevelopment;
export const isProdMode = () => isProduction;
export const isTestMode = () => isTest;

// API URL builders
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = config.API_BASE_URL.endsWith('/')
    ? config.API_BASE_URL.slice(0, -1)
    : config.API_BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

export const buildAuthUrl = (endpoint: string): string => {
  const baseUrl = config.AUTH_URL.endsWith('/')
    ? config.AUTH_URL.slice(0, -1)
    : config.AUTH_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

export const buildMessagingUrl = (endpoint: string): string => {
  const baseUrl = config.MESSAGING_URL.endsWith('/')
    ? config.MESSAGING_URL.slice(0, -1)
    : config.MESSAGING_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Environment validation
export const validateEnvironment = (): boolean => {
  const requiredEnvVars = [
    'API_BASE_URL',
    'AUTH_URL',
    'MESSAGING_URL',
    'GOOGLE_CLIENT_ID'
  ];

  const missingVars = requiredEnvVars.filter(varName => {
    const value = config[varName as keyof EnvironmentConfig];
    return !value || value === '';
  });

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    return false;
  }

  return true;
};

// Configuration debug logging removed (was console.log)

export default config;