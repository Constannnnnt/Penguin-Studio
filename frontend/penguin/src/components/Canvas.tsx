import * as React from 'react';
import { useState, useEffect } from 'react';
import { Plus, Wand2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ObjectList } from './ObjectList';
import { LoadingSpinner } from './LoadingSpinner';
import { GeneratedImage } from './GeneratedImage';
import { useConfigStore } from '@/store/configStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useGeneration } from '@/hooks/useGeneration';
import { cn } from '@/lib/utils';

/**
 * Main canvas component for scene configuration and preview
 * 
 * Performance optimizations:
 * - Selective store subscriptions
 * - Memoized callbacks
 * - Debounced input updates
 */
export const Canvas: React.FC = () => {
  // Selective store subscriptions - only subscribe to what we need
  const shortDescription = useConfigStore((state) => state.config.short_description);
  const config = useConfigStore((state) => state.config);
  const updateConfig = useConfigStore((state) => state.updateConfig);
  const addObject = useConfigStore((state) => state.addObject);
  
  // Local state for scene description with debouncing
  const [localDescription, setLocalDescription] = useState(shortDescription);
  const debouncedDescription = useDebounce(localDescription, 300);

  // Generation hook
  const { generateImage, isLoading, generatedImage, error } = useGeneration();

  // Update store when debounced value changes
  useEffect(() => {
    if (debouncedDescription !== shortDescription) {
      updateConfig('short_description', debouncedDescription);
    }
  }, [debouncedDescription, shortDescription, updateConfig]);

  // Sync local state when config changes externally
  useEffect(() => {
    setLocalDescription(shortDescription);
  }, [shortDescription]);

  // Memoized callback to prevent unnecessary re-renders
  const handleGenerate = React.useCallback((): void => {
    // Generate image from current configuration
    generateImage(config);
  }, [config, generateImage]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 sm:pb-4 md:pb-6">
        <CardTitle id="canvas-title" className="text-lg sm:text-xl md:text-2xl">
          Scene Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 md:space-y-5">
        {/* Scene Description Input*/}
        <div>
          <Label htmlFor="scene-description" className="text-sm sm:text-base">
            Scene Description
          </Label>
          <Textarea
            id="scene-description"
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            placeholder="Describe your scene... (minimum 10 characters)"
            rows={3}
            aria-describedby="scene-description-help"
            aria-required="true"
            className="resize-none text-sm sm:text-base mt-2"
          />
          <p id="scene-description-help" className="text-xs sm:text-sm text-muted-foreground mt-1">
            Minimum 10 characters required
          </p>
        </div>

        {/* 16:9 Preview Area */}
        <div
          role="img"
          aria-label={generatedImage ? 'Generated image preview' : 'Image preview area'}
          className="relative aspect-video bg-muted rounded-lg overflow-hidden"
        >
          {/* Loading State*/}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <LoadingSpinner />
            </div>
          )}

          {/* Generated Image*/}
          {generatedImage && !isLoading && (
            <GeneratedImage
              src={generatedImage}
              alt="Generated scene"
            />
          )}

          {/* Empty State */}
          {!generatedImage && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center text-muted-foreground">
                <div className="mb-2">
                  <svg
                    className="mx-auto h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 opacity-20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm md:text-base font-medium">No image generated</p>
                <p className="text-xs sm:text-sm mt-1">Configure your scene and click Generate</p>
              </div>
            </div>
          )}

          {/* Error State  */}
          {error && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 p-4">
              <div className="text-center text-destructive">
                <p className="text-xs sm:text-sm md:text-base font-medium">Generation Failed</p>
                <p className="text-xs sm:text-sm mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Object List */}
        <ObjectList />

        {/* Action Buttons*/}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            onClick={addObject}
            variant="outline"
            className="flex-1 min-h-[44px] text-sm sm:text-base"
            aria-label="Add new object to scene"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="hidden xs:inline">Add Object</span>
            <span className="xs:hidden">Add</span>
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isLoading || config.short_description.length < 10}
            className={cn(
              'flex-1 min-h-[44px] text-sm sm:text-base',
              isLoading && 'cursor-not-allowed'
            )}
            aria-label="Generate image from configuration"
          >
            <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            {isLoading ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
