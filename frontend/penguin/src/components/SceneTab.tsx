import * as React from 'react';
import { useConfigStore, useSegmentationStore } from '@/store';
import { BackgroundSection } from '@/components/BackgroundSection';
import { CameraSection } from '@/components/CameraSection';
import { LightingSection } from '@/components/LightingSection';
import { AestheticsSection } from '@/components/AestheticsSection';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Box, Camera, Lightbulb, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apiClient } from '@/services/api';
import { 
  ApiError, 
  NetworkError, 
  ValidationError,
  type LoadingState,
  handleError,
  safeParseJSONMetadata,
} from '@/lib/errorHandling';
import { 
  useDebouncedCallback, 
  measureOperation,
  memoize,
} from '@/lib/performance';
import type { SceneConfiguration, PenguinConfig, LightingDirection } from '@/types';

// Persist parsed state across tab mounts to avoid re-parsing on every tab switch
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

export const SceneTab: React.FC<SceneTabProps> = ({ 
  className 
}) => {
  const lastParsedMetadataRef = React.useRef<string | null>(LAST_PARSED_METADATA_HASH);
  const lastParsedSceneRef = React.useRef<SceneConfiguration | null>(LAST_PARSED_SCENE_CACHE);
  const [activeSubTab, setActiveSubTab] = React.useState<SceneSubTab>('background');
  // Enhanced store subscriptions
  const sceneConfig = useConfigStore((state) => state.sceneConfig);
  const setSceneConfig = useConfigStore((state) => state.setSceneConfig);
  const resetConfig = useConfigStore((state) => state.resetConfig);
  const baseConfig = useConfigStore((state) => state.config);
  const setConfig = useConfigStore((state) => state.setConfig);

  // Segmentation store subscriptions for metadata
  const segmentationResults = useSegmentationStore((state) => state.results);
  const currentMetadata = segmentationResults?.metadata;

  // Enhanced loading state for semantic parsing operations
  const [loadingState, setLoadingState] = React.useState<LoadingState>({
    isLoading: false,
  });

  // Memoized metadata validation
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

  const sceneEquals = React.useCallback((a: SceneConfiguration | null, b: SceneConfiguration | null): boolean => {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }, []);

  const convertSceneToConfig = React.useCallback((scene: SceneConfiguration, base: PenguinConfig): PenguinConfig => {
    const toDepth = (v: number) => (v <= 33 ? 'shallow' : v <= 66 ? 'medium' : 'deep');
    const toFocus = (v: number) => (v <= 33 ? 'soft' : v <= 66 ? 'selective' : 'sharp');
    const toDirection = (dir: SceneConfiguration['lighting']['direction']): LightingDirection => {
      let resolved: LightingDirection = 'front-lit';
      if (dir.y < 33) resolved = 'top-lit';
      else if (dir.y > 67) resolved = 'bottom-lit';
      if (dir.x < 33 || dir.x > 67) resolved = 'side-lit';
      return resolved;
    };
    const toShadows = (v: number) => {
      if (v <= 0) return 'none';
      if (v === 1) return 'subtle';
      if (v === 2) return 'soft';
      if (v === 3) return 'subtle';
      if (v === 4) return 'hard';
      return 'dramatic';
    };

    return {
      ...base,
      background_setting: scene.background_setting,
      photographic_characteristics: {
        camera_angle: scene.photographic_characteristics.camera_angle,
        lens_focal_length: scene.photographic_characteristics.lens_focal_length,
        depth_of_field: toDepth(scene.photographic_characteristics.depth_of_field),
        focus: toFocus(scene.photographic_characteristics.focus),
      },
      lighting: {
        conditions: scene.lighting.conditions,
        direction: toDirection(scene.lighting.direction),
        shadows: toShadows(scene.lighting.shadows),
      },
      aesthetics: {
        ...base.aesthetics,
        composition: scene.aesthetics.composition,
        color_scheme: scene.aesthetics.color_scheme,
        mood_atmosphere: scene.aesthetics.mood_atmosphere,
      },
      style_medium: scene.aesthetics.style_medium as any,
      artistic_style: scene.aesthetics.aesthetic_style as any,
    };
  }, []);

  const handleSemanticParsing = React.useCallback(async (jsonMetadata: unknown) => {
    setLoadingState({
      isLoading: true,
      operation: 'Validating metadata...',
      progress: 10,
    });

    try {
      // Validate and sanitize metadata first
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

      // Call the backend API for semantic parsing
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

      // Complete after a short delay to show success state
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
        showToast: false, // We'll handle the error display in the component
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

  /**
   * Handle configuration reset
   */
  const handleReset = React.useCallback(() => {
    resetConfig();
    setLoadingState({ isLoading: false });
    lastParsedMetadataRef.current = null;
    lastParsedSceneRef.current = null;
    LAST_PARSED_METADATA_HASH = null;
    LAST_PARSED_SCENE_CACHE = null;
  }, [resetConfig]);



  /**
   * Debounced semantic parsing for rapid metadata changes
   */
  const debouncedSemanticParsing = useDebouncedCallback(
    handleSemanticParsing,
    800, // 800ms debounce
    [handleSemanticParsing],
    { maxWait: 3000 } // Maximum wait of 3 seconds
  );

  /**
   * Auto-load metadata when component mounts or metadata changes (debounced)
   */
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

  const isDirty = React.useMemo(
    () => !sceneEquals(sceneConfig, lastParsedSceneRef.current),
    [sceneConfig, sceneEquals]
  );

  const handleSave = React.useCallback(() => {
    const source = isDirty
      ? sceneConfig
      : (lastParsedSceneRef.current ?? sceneConfig);
    const nextConfig = convertSceneToConfig(source, baseConfig);
    setConfig(nextConfig);
  }, [isDirty, sceneConfig, baseConfig, convertSceneToConfig, setConfig]);

  // ========================================================================
  // Error Handling
  // ========================================================================

  /**
   * Clear error state
   */
  const clearError = React.useCallback(() => {
    setLoadingState(prev => ({ ...prev, error: undefined }));
  }, []);

  // ========================================================================
  // Render Loading State
  // ========================================================================

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
          
          {/* Progress Bar */}
          {loadingState.progress !== undefined && (
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, loadingState.progress))}%` }}
              />
            </div>
          )}
          
          {/* Retry indicator */}
          {loadingState.retryCount && loadingState.retryCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Retry attempt {loadingState.retryCount}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ========================================================================
  // Main Render
  // ========================================================================

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* <div className="flex items-center justify-between px-4 pt-4 gap-3">
        <div className="text-sm text-muted-foreground">
          {lastParsedSceneRef.current
            ? (isDirty ? 'You have unsaved scene edits' : 'Parsed scene from metadata')
            : 'Edit scene settings or parse metadata to start'}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (lastParsedSceneRef.current) {
                setSceneConfig(lastParsedSceneRef.current);
              }
            }}
            disabled={!lastParsedSceneRef.current || loadingState.isLoading}
          >
            Revert to Parsed
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={loadingState.isLoading || (!isDirty && !lastParsedSceneRef.current)}
          >
            Save Scene
          </Button>
        </div>
      </div> */}

      {/* Error Alert */}
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
              
              {/* Retry Actions */}
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

      {/* Enhanced Metadata Actions */}
      {/* <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg border mx-4 mt-4">
        <div className="flex-1 min-w-0">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {currentMetadata 
                ? 'Scene configuration parsed from current metadata'
                : 'Load an example or upload an image to enable automatic parsing'
              }
            </p>
            {loadingState.isLoading && loadingState.operation && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{loadingState.operation}</span>
                {loadingState.progress !== undefined && (
                  <span>({Math.round(loadingState.progress)}%)</span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleLoadCurrentMetadata}
            disabled={loadingState.isLoading || !currentMetadata}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loadingState.isLoading && "animate-spin")} />
            {loadingState.isLoading ? 'Parsing...' : 'Refresh from Metadata'}
          </Button>
          <Button
            onClick={handleReset}
            disabled={loadingState.isLoading}
            size="sm"
            variant="outline"
          >
            Reset to Defaults
          </Button>
        </div>
      </div> */}

      {/* Scene Sub-Navigation */}
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
                  ? 'flex-grow px-4 text-primary-foreground shadow-sm' 
                  : 'flex-shrink-0 w-10 px-0 text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-primary rounded-lg -z-10 transition-all duration-300" />
              )}
              <Icon 
                className={cn(
                  'h-4 w-4 flex-shrink-0 transition-all duration-300',
                  isActive ? 'text-primary-foreground' : 'text-current'
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

      {/* Content Area */}
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



      {/* Configuration Summary - Hidden by default, can be shown for debugging */}
      {import.meta.env.DEV && (
        <details className="mt-6 p-4 bg-muted rounded-lg mx-4 mb-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Current Configuration (Debug)
          </summary>
          <pre className="mt-2 text-xs text-muted-foreground overflow-auto">
            {JSON.stringify(sceneConfig, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

// ============================================================================
// Export
// ============================================================================

export default SceneTab;
