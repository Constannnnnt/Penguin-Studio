import { type MaskMetadata } from '@/store/segmentationStore';
import { cn } from '@/lib/utils';

interface PromptSectionProps {
  mask: MaskMetadata;
}

const getPromptTierVariant = (tier: string): string => {
  switch (tier) {
    case 'CORE':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'CORE_VISUAL':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'CORE_VISUAL_SPATIAL':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
};

export const PromptSection: React.FC<PromptSectionProps> = ({ mask }) => {
  if (!mask.promptTier && !mask.promptText) {
    return null;
  }

  return (
    <div className="space-y-2">
      {mask.promptTier && (
        <div>
          <h5 className="text-xs font-semibold text-muted-foreground mb-1">Prompt</h5>
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
              getPromptTierVariant(mask.promptTier)
            )}
          >
            {mask.promptTier} 
            {mask.promptText && (
              <div>
                {/* <h5 className="text-xs font-semibold text-muted-foreground mb-1">Prompt Text</h5> */}
                <p className="text-xs bg-muted ml-3 p-2 rounded font-mono break-words">{mask.promptText}</p>
              </div>
            )}
          </span>

        </div>
      )}


    </div>
  );
};
