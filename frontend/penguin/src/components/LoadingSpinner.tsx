import * as React from 'react';

/**
 * Loading spinner component with accessibility support
 */
export const LoadingSpinner: React.FC = () => {
  return (
    <div 
      className="flex items-center justify-center w-full h-full min-h-[100px]" 
      role="status" 
      aria-live="polite"
    >
      <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-b-2 border-primary" />
      <span className="sr-only">Loading...</span>
    </div>
  );
};
