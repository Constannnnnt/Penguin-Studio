import * as React from 'react';
import { useConfigStore } from '@/features/scene/store/configStore';
import { useSegmentationStore } from '@/features/segmentation/store/segmentationStore';
import { BackgroundSection } from '@/features/scene/components/BackgroundSection';
import { CameraSection } from '@/features/scene/components/CameraSection';
import { LightingSection } from '@/features/scene/components/LightingSection';
import { AestheticsSection } from '@/features/scene/components/AestheticsSection';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle, RefreshCw, Box, Camera, Lightbulb, Palette } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { apiClient } from '@/core/services/api';
import { 
  ApiError, 
  NetworkError, 
  ValidationError,
  type LoadingState,
  handleError,
  safeParseJSONMetadata,
} from '@/shared/lib/errorHandling';
import { 
  useDebouncedCallback, 
  measureOperation,
  memoize,
} from '@/shared/lib/performance';
import type { SceneConfiguration } from '@/core/types';

let LAST_PARSED_METADATA_HASH: string | null = null;
let LAST_PARSED_SCENE_CACHE: SceneConfiguration | null = null;

interface SceneTabProps {
  className?: string;
}

type SceneSubTab = 'background' | 'camera' | 'lighting' | 'aesthetics';

const SCENE_SUB_TABS = [
  { id: 'background' as const, label: 'Background', icon: Box },
  { id: 'camera' as const, label: 'Camera', icon: Camera },
  { id: 'lighting' as const, label: 'Lighting', icon: Lightbulb },
  { id: 'aesthetics' as const, label: 'Aesthetics', icon: Palette },
];

export const SceneTab: React.FC<SceneTabProps> = ({ className }) => {
  const lastParsedMetadataRef = React.useRef<string | null>(LAST_PARSED_METADATA_HASH);
  const lastParsedSceneRef = React.useRef<SceneConfiguration | null>(LAST_PARSED_SCENE_CACHE);
  const [activeSubTab, setActiveSubTab] = React.useState<SceneSubTab>('background');
  
  const sceneConfig = useConfigStore((state) => state.sceneConfig);
  const setSceneConfig = useConfigStore((state) => state.setSceneConfig);
  const resetConfig = useConfigStore((state) => state.resetConfig);

  const segmentationResults = useSegmentationStore((state) => state.results);
  const currentMetadata = segmentationResults?.metadata;

  const [loadingState, setLoadingState] = React.useState<LoadingState>({
    isLoading: false,
  });

  const validateMetadata = React.useMemo(() => 
    memoize((metadata: unknown) => {
      return measureOperation('validateMetadata', () => {
        return safeParseJSONMetadata(metadata);
      });
    }),
    []
  );

  const buildSceneConfigFromParsed = React.useCallback((parsedData: any, prevScene: SceneConfiguration): SceneConfiguration => ({
    background_setting: parsedData.background_setting,
    aspect_ratio: prevScene.aspect_ratio, // Preserve existing aspect ratio
    photographic_characteristics: {
      camera_angle: parsedData.photographic_characteristics.camera_angle.value,
      lens_focal_length: parsedData.photographic_characteristics.lens_focal_length.value,
      depth_of_field: parsedData.photographic_characteristics.depth_of_field.value,
      focus: parsedData.photographic_characteristics.focus.value,
    },
    lighting: {
      conditions: parsedData.lighting.conditions.value,
      direction: parsedData.lighting.direction.value,
      shadows: parsedData.lighting.shadows.value,
    },
    aesthetics: {
      style_medium: parsedData.aesthetics.style_medium.value,
      aesthetic_style: parsedData.aesthetics.aesthetic_style.value,
      composition: prevScene.aesthetics.composition,
      color_scheme: prevScene.aesthetics.color_scheme,
      mood_atmosphere: prevScene.aesthetics.mood_atmosphere,
    },
  }), []);





  const handleSemanticParsing = React.useCallback(async (jsonMetadata: unknown) => {
    setLoadingState({
      isLoading: true,
      operation: 'Validating metadata...',
      progress: 10,
    });

    try {
      const validationResult = validateMetadata(jsonMetadata);
      
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid metadata format',
          [validationResult.error || 'Unknown validation error']
        );
      }

      const sanitizedMetadata = validationResult.data || {};

      setLoadingState({
        isLoading: true,
        operation: 'Parsing scene configuration...',
        progress: 30,
      });

      const parsedData = await apiClient.parseSceneMetadata(sanitizedMetadata);

      setLoadingState({
        isLoading: true,
        operation: 'Applying configuration...',
        progress: 80,
      });

      const nextSceneConfig = buildSceneConfigFromParsed(parsedData, sceneConfig);
      setSceneConfig(nextSceneConfig);
      lastParsedSceneRef.current = nextSceneConfig;
      LAST_PARSED_SCENE_CACHE = nextSceneConfig;

      setLoadingState({
        isLoading: true,
        operation: 'Configuration applied successfully',
        progress: 100,
      });

      setTimeout(() => {
        setLoadingState({ isLoading: false });
      }, 500);
      
      try {
        lastParsedMetadataRef.current = JSON.stringify(jsonMetadata) || null;
        LAST_PARSED_METADATA_HASH = lastParsedMetadataRef.current;
      } catch {
        lastParsedMetadataRef.current = null;
        LAST_PARSED_METADATA_HASH = null;
      }

    } catch (error) {
      handleError(error, {
        operation: 'parse scene configuration',
        userMessage: 'Failed to parse scene configuration from metadata',
        showToast: false,
      });

      let errorMessage = 'Failed to parse scene configuration';
      
      if (error instanceof ValidationError) {
        errorMessage = `Validation Error: ${error.errors.join(', ')}`;
      } else if (error instanceof ApiError) {
        errorMessage = `API Error: ${error.message}`;
        if (error.statusCode === 429) {
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
        } else if (error.statusCode && error.statusCode >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error instanceof NetworkError) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setLoadingState((prev) => ({
        isLoading: false,
        error: errorMessage,
        retryCount: (prev.retryCount || 0) + 1,
      }));
    }
  }, [buildSceneConfigFromParsed, validateMetadata, sceneConfig, setSceneConfig]);

  const handleReset = React.useCallback(() => {
    resetConfig();
    setLoadingState({ isLoading: false });
    lastParsedMetadataRef.current = null;
    lastParsedSceneRef.current = null;
    LAST_PARSED_METADATA_HASH = null;
    LAST_PARSED_SCENE_CACHE = null;
  }, [resetConfig]);

  const debouncedSemanticParsing = useDebouncedCallback(
    handleSemanticParsing,
    800,
    [handleSemanticParsing],
    { maxWait: 3000 }
  );

  React.useEffect(() => {
    if (currentMetadata && !loadingState.isLoading) {
      const hash = (() => {
        try {
          return JSON.stringify(currentMetadata);
        } catch {
          return null;
        }
      })();
      if (hash && hash === lastParsedMetadataRef.current) {
        return;
      }
      debouncedSemanticParsing(currentMetadata);
    }
  }, [currentMetadata, debouncedSemanticParsing, loadingState.isLoading]);



  const clearError = React.useCallback(() => {
    setLoadingState(prev => ({ ...prev, error: undefined }));
  }, []);

  if (loadingState.isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 space-y-6', className)}>
        <div className="relative">
          <LoadingSpinner />
          {loadingState.progress !== undefined && (
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
              <div className="text-xs text-muted-foreground">
                {Math.round(loadingState.progress)}%
              </div>
            </div>
          )}
        </div>
        
        <div className="text-center space-y-3 max-w-md">
          <h3 className="text-lg font-medium text-foreground">
            Processing Scene Configuration
          </h3>
          <p className="text-sm text-muted-foreground">
            {loadingState.operation || 'Loading...'}
          </p>
          
          {loadingState.progress !== undefined && (
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, loadingState.progress))}%` }}
              />
            </div>
          )}
          
          {loadingState.retryCount && loadingState.retryCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Retry attempt {loadingState.retryCount}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {loadingState.error && (
        <Alert variant="destructive" className="mb-4 mx-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <p className="font-medium">Error Processing Configuration</p>
                  <p className="text-sm mt-1">{loadingState.error}</p>
                  {loadingState.retryCount && loadingState.retryCount > 0 && (
                    <p className="text-xs mt-1 opacity-75">
                      Failed after {loadingState.retryCount} attempt{loadingState.retryCount > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={clearError}
                  className="text-sm underline hover:no-underline whitespace-nowrap"
                  type="button"
                >
                  Dismiss
                </button>
              </div>
              
              <div className="flex gap-2 pt-2 border-t border-destructive/20">
                <Button
                  onClick={() => {
                    clearError();
                    if (currentMetadata) {
                      handleSemanticParsing(currentMetadata);
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-background hover:bg-muted"
                  disabled={!currentMetadata}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
                <Button
                  onClick={() => {
                    clearError();
                    handleReset();
                  }}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-background hover:bg-muted"
                >
                  Reset to Defaults
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-center gap-1 p-1 bg-muted rounded-lg mx-4 mt-4">
        {SCENE_SUB_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeSubTab === id;

          return (
            <Button
              key={id}
              variant="ghost"
              onClick={() => setActiveSubTab(id)}
              className={cn(
                'relative gap-2 h-10 text-sm font-medium transition-all duration-300 ease-in-out',
                isActive 
                  ? 'flex-grow px-4 text-primary-background shadow-sm' 
                  : 'flex-shrink-0 w-10 px-0 text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-primary rounded-lg -z-10 transition-all duration-300" />
              )}
              <Icon 
                className={cn(
                  'h-4 w-4 flex-shrink-0 transition-all duration-300',
                  isActive ? 'text-primary' : 'text-current'
                )} 
              />
              <span 
                className={cn(
                  'truncate transition-all duration-300 overflow-hidden whitespace-nowrap',
                  isActive ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0'
                )}
              >
                {label}
              </span>
            </Button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeSubTab === 'background' && (
          <div className="h-full overflow-y-auto p-4 animate-in fade-in duration-200">
            <BackgroundSection />
          </div>
        )}
        
        {activeSubTab === 'camera' && (
          <div className="h-full overflow-y-auto p-4 animate-in fade-in duration-200">
            <CameraSection />
          </div>
        )}
        
        {activeSubTab === 'lighting' && (
          <div className="h-full overflow-y-auto p-4 animate-in fade-in duration-200">
            <LightingSection />
          </div>
        )}
        
        {activeSubTab === 'aesthetics' && (
          <div className="h-full overflow-y-auto p-4 animate-in fade-in duration-200">
            <AestheticsSection />
          </div>
        )}
      </div>

      {import.meta.env.DEV && (
        <details className="mt-6 p-4 bg-muted rounded-lg mx-4 mb-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Current Configuration
          </summary>
          <pre className="mt-2 text-xs text-muted-foreground overflow-auto">
            {JSON.stringify(sceneConfig, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default SceneTab;
