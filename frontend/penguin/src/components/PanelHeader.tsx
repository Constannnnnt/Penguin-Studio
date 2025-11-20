import { Tooltip, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { getShortcutDisplay } from '@/hooks/useKeyboardShortcuts';

interface PanelHeaderProps {
  title: string;
  position?: 'left' | 'right';
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  position = 'left',
}) => {
  const shortcut = position === 'left'
    ? getShortcutDisplay({ key: 'b', ctrl: true, handler: () => {} })
    : getShortcutDisplay({ key: 'b', ctrl: true, shift: true, handler: () => {} });

  const titleSpace = position === "right"? "ml-8" : "";
  return (
    <TooltipProvider>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/50">
        <>
        <h2 className={`text-sm ${titleSpace} font-semibold text-foreground`}>{title}</h2>
        </>
        <Tooltip>
          <TooltipContent>
            <p className="text-xs">Collapse ({shortcut})</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
