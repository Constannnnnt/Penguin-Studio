import * as React from 'react';
import { Wand2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getShortcutDisplay } from '@/hooks/useKeyboardShortcuts';

interface PromptControlsProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export const PromptControls: React.FC<PromptControlsProps> = ({
  prompt,
  onPromptChange,
  onGenerate,
  isLoading,
}) => {
  const isDisabled = isLoading || prompt.length < 10;

  const generateShortcut = getShortcutDisplay({ key: 'g', ctrl: true, handler: () => {} });

  return (
    <TooltipProvider>
      <div className="space-y-3 md:space-y-4">
        <Label htmlFor="prompt-input" className="text-xs md:text-sm font-medium">
          Scene Description
        </Label>
        <div className="flex gap-2 items-start">
          <Textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Describe your scene... (minimum 10 characters)"
            rows={3}
            aria-describedby="prompt-help"
            aria-required="true"
            className="flex-1 resize-none transition-all duration-150 focus:ring-2 text-sm"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onGenerate}
                disabled={isDisabled}
                className="h-9 md:h-10 px-3 md:px-4 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] text-sm self-start"
                aria-label={`Generate image from configuration (${generateShortcut})`}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Generate ({generateShortcut})</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p id="prompt-help" className="text-xs text-muted-foreground">
          Minimum 10 characters required
        </p>
      </div>
    </TooltipProvider>
  );
};
