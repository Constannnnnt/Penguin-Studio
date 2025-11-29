/**
 * Environment Variable Validation
 * 
 * This module validates and provides type-safe access to environment variables.
 * Environment variable validation
 */

interface EnvConfig {
  apiBaseUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Validate that required environment variables are present
 */
const validateEnv = (): void => {
  const requiredVars = ['VITE_API_BASE_URL'];
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!import.meta.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    console.warn(
      `Missing environment variables: ${missing.join(', ')}. Using defaults.`
    );
  }
};

/**
 * Validate URL format
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get and validate API base URL
 */
const getApiBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  
  if (!isValidUrl(url)) {
    console.error(`Invalid API base URL: ${url}. Using default.`);
    return 'http://localhost:8000';
  }
  
  return url;
};

/**
 * Initialize and validate environment configuration
 */
const initEnv = (): EnvConfig => {
  validateEnv();
  
  return {
    apiBaseUrl: getApiBaseUrl(),
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
  };
};

// Initialize and export configuration
export const env = initEnv();

// Log configuration in development
if (env.isDevelopment) {
  console.log('Environment Configuration:', {
    apiBaseUrl: env.apiBaseUrl,
    mode: import.meta.env.MODE,
  });
}
