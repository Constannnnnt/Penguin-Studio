import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// Re-export validation utilities
export * from './validation';

// Re-export error handling utilities
export * from './errorHandling';

// Re-export performance utilities
export * from './performance';
