/// <reference types="vite/client" />

/**
 * Type definitions for custom Vite environment variables
 * Extends Vite's built-in ImportMetaEnv interface
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}
