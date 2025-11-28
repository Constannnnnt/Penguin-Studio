import type { SemanticJSON, SaveResult } from './types';

/**
 * Save semantic JSON to a file and trigger browser download
 * @param json - Semantic JSON object to save
 * @param filename - Output filename (should end with .json)
 * @returns Promise resolving to save result
 */
export const saveSemanticJSONToFile = async (
  json: SemanticJSON,
  filename: string
): Promise<SaveResult> => {
  try {
    // Ensure filename has .json extension
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

    // Convert to JSON string with formatting
    const jsonString = JSON.stringify(json, null, 2);

    // Create a blob
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Cleanup after a short delay to ensure download starts
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

    return {
      success: true,
      filename: finalFilename,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[FileSaver] Failed to save file:', error);

    return {
      success: false,
      error: `Failed to save file: ${errorMessage}`,
    };
  }
};

/**
 * Generate a filename for semantic JSON based on timestamp
 * @param prefix - Optional prefix for the filename (default: 'scene')
 * @returns Filename string with timestamp
 */
export const generateSemanticJSONFilename = (prefix: string = 'scene'): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}_${timestamp}.json`;
};

/**
 * Validate filename for safety
 * @param filename - Filename to validate
 * @returns True if filename is safe, false otherwise
 */
export const isValidFilename = (filename: string): boolean => {
  // Check for empty filename
  if (!filename || filename.trim().length === 0) {
    return false;
  }

  // Check for invalid characters (path traversal, etc.)
  const invalidChars = /[<>:"|?*\\/]/;
  if (invalidChars.test(filename)) {
    return false;
  }

  // Check for reserved names on Windows
  const reservedNames = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
  const nameWithoutExt = filename.replace(/\.[^.]*$/, '');
  if (reservedNames.test(nameWithoutExt)) {
    return false;
  }

  return true;
};

/**
 * Sanitize filename by removing invalid characters
 * @param filename - Filename to sanitize
 * @returns Sanitized filename
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove invalid characters
  let sanitized = filename.replace(/[<>:"|?*\\/]/g, '_');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Ensure it's not empty
  if (sanitized.length === 0) {
    sanitized = 'scene';
  }

  // Ensure .json extension
  if (!sanitized.endsWith('.json')) {
    sanitized = `${sanitized}.json`;
  }

  return sanitized;
};
