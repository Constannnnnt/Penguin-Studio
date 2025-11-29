import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

export interface ErrorOverlayProps {
  error: string;
  errorCode?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const ErrorOverlay: React.FC<ErrorOverlayProps> = ({
  error,
  errorCode,
  onRetry,
  isRetrying = false,
}) => {
  const getErrorTitle = (code?: string): string => {
    switch (code) {
      case 'NETWORK_ERROR':
        return 'Connection Failed';
      case 'INVALID_IMAGE':
        return 'Invalid Image';
      case 'BACKEND_ERROR':
        return 'Processing Failed';
      case 'TIMEOUT':
        return 'Request Timeout';
      case 'INVALID_METADATA':
        return 'Invalid Metadata';
      case 'FILE_TOO_LARGE':
        return 'File Too Large';
      default:
        return 'Segmentation Failed';
    }
  };

  const getErrorDescription = (code?: string): string | null => {
    switch (code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the segmentation service. Please check your connection.';
      case 'INVALID_IMAGE':
        return 'The image format is not supported. Please use PNG or JPEG.';
      case 'BACKEND_ERROR':
        return 'The segmentation service encountered an error. Please try again.';
      case 'TIMEOUT':
        return 'The request took too long to complete. Try with a smaller image.';
      case 'INVALID_METADATA':
        return 'The metadata file format is invalid. Please check the JSON structure.';
      case 'FILE_TOO_LARGE':
        return 'The image file is too large. Please use an image smaller than 10MB.';
      default:
        return null;
    }
  };

  const title = getErrorTitle(errorCode);
  const description = getErrorDescription(errorCode);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-destructive/10 p-4 md:p-6 animate-in fade-in duration-200"
      role="alert"
      aria-live="assertive"
    >
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-3">
          <div className="rounded-full bg-destructive/20 p-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        
        <h3 className="text-base md:text-lg font-semibold text-destructive mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-1">
          {description || error}
        </p>
        
        {description && error !== description && (
          <p className="text-xs text-muted-foreground/80 mt-2 font-mono">
            {error}
          </p>
        )}
        
        {onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        )}
      </div>
    </div>
  );
};
