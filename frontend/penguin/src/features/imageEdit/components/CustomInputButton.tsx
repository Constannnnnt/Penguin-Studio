import React, { useState, useRef, useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { validateCustomInput } from '@/shared/lib/validation';
import { useDebouncedCallback } from '@/shared/lib/performance';

export interface CustomInputButtonProps {
  label: string;
  value?: string;
  onSubmit: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
}

export const CustomInputButton: React.FC<CustomInputButtonProps> = ({
  label,
  value,
  onSubmit,
  placeholder = 'Enter custom value...',
  className,
  disabled = false,
  maxLength = 100,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string }>({ valid: true });
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value || '');
    setValidationResult({ valid: true });
  }, [value]);

  // Debounced validation to prevent excessive validation calls
  const debouncedValidation = useDebouncedCallback(
    (val: string) => {
      const result = validateCustomInput(val, {
        maxLength,
        allowEmpty: false,
        fieldName: label,
      });
      setValidationResult(result);
    },
    300,
    [maxLength, label]
  );

  // Enhanced validation with detailed error messages
  const validateInput = (val: string): { valid: boolean; error?: string } => {
    return validateCustomInput(val, {
      maxLength,
      allowEmpty: false,
      fieldName: label,
    });
  };

  const handleExpand = (): void => {
    if (disabled) return;
    setIsExpanded(true);
    setInputValue(value || '');
    setValidationResult({ valid: true });
  };

  const handleCancel = (): void => {
    setIsExpanded(false);
    setInputValue(value || '');
    setValidationResult({ valid: true });
  };

  const handleSubmit = (): void => {
    const trimmed = inputValue.trim();
    const validation = validateInput(trimmed);
    
    setValidationResult(validation);
    
    if (validation.valid) {
      onSubmit(trimmed);
      setIsExpanded(false);
      setValidationResult({ valid: true });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Trigger debounced validation
    debouncedValidation(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!isExpanded) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExpand}
        disabled={disabled}
        className={cn(
          'transition-all duration-200 ease-out',
          value && 'bg-primary/10 border-primary/20 text-primary',
          className
        )}
        aria-label={`${label} - Click to enter custom value`}
      >
        {value || label}
      </Button>
    );
  }

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center gap-2 p-2 border border-input rounded-md bg-background transition-all duration-200 ease-out',
          !validationResult.valid && 'border-destructive',
          className
        )}
        role="group"
        aria-label={`Custom input for ${label}`}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          className={cn(
            'flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground',
            !validationResult.valid && 'text-destructive'
          )}
          aria-label={`Enter custom ${label.toLowerCase()}`}
          aria-invalid={!validationResult.valid}
          aria-describedby={!validationResult.valid ? 'custom-input-error' : undefined}
        />
        
        {/* Validation indicator */}
        {!validationResult.valid && (
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
        )}
        
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleSubmit}
            disabled={!validationResult.valid || inputValue.trim().length === 0}
            className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-950"
            aria-label="Submit custom value"
          >
            <Check className="h-3 w-3" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
            aria-label="Cancel custom input"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Enhanced error display */}
      {!validationResult.valid && validationResult.error && (
        <div
          id="custom-input-error"
          className="absolute top-full left-0 mt-1 p-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md z-10 max-w-xs"
          role="alert"
          aria-live="polite"
        >
          {validationResult.error}
        </div>
      )}
    </div>
  );
};