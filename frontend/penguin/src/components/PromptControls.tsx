import * as React from 'react';
import { Wand2, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getShortcutDisplay } from '@/hooks/useKeyboardShortcuts';

interface PromptControlsProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  onRefine: () => void;
  isLoading: boolean;
}

export const PromptControls: React.FC<PromptControlsProps> = ({
  prompt,
  onPromptChange,
  onGenerate,
  onRefine,
  isLoading,
}) => {
  const isDisabled = isLoading || prompt.length < 10;

  const generateShortcut = getShortcutDisplay({ key: 'g', ctrl: true, handler: () => {} });
  const refineShortcut = getShortcutDisplay({ key: 'r', ctrl: true, handler: () => {} });

  return (
    <TooltipProvider>
      <div className="space-y-3 md:space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt-input" className="text-xs md:text-sm font-medium">
            Scene Description
          </Label>
          <Textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Describe your scene... (minimum 10 characters)"
            rows={3}
            aria-describedby="prompt-help"
            aria-required="true"
            className="resize-none transition-all duration-150 focus:ring-2 text-sm"
          />
          <p id="prompt-help" className="text-xs text-muted-foreground">
            Minimum 10 characters required
          </p>
        </div>

        <div className="flex gap-2 md:gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onGenerate}
                disabled={isDisabled}
                className="flex-1 h-9 md:h-10 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] text-sm"
                aria-label={`Generate image from configuration (${generateShortcut})`}
              >
                <Wand2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                {isLoading ? 'Generating...' : 'Generate'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Generate ({generateShortcut})</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onRefine}
                disabled={isDisabled}
                variant="secondary"
                className="flex-1 h-9 md:h-10 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] text-sm"
                aria-label={`Refine existing image (${refineShortcut})`}
              >
                <Sparkles className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Refine
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Refine ({refineShortcut})</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
