import { type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ResizeHandle } from '@/features/objects/components/ResizeHandle';
import { cn } from '@/shared/lib/utils';

interface CollapsiblePanelProps {
  side: 'left' | 'right';
  title: string;
  width: number;
  collapsed: boolean;
  onToggle: () => void;
  onResize: (delta: number) => void;
  collapsedSize?: number;
  children: ReactNode;
}

const DEFAULT_COLLAPSED_WIDTH = 56;

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  side,
  title,
  width,
  collapsed,
  onToggle,
  onResize,
  collapsedSize = DEFAULT_COLLAPSED_WIDTH,
  children,
}) => {
  const isLeft = side === 'left';
  const displayWidth = collapsed ? collapsedSize : width;
  const ToggleIcon = collapsed
    ? isLeft
      ? ChevronRight
      : ChevronLeft
    : isLeft
      ? ChevronLeft
      : ChevronRight;

  const toggleLabel = collapsed ? `Expand ${title}` : `Collapse ${title}`;

  return (
    <div
      className={cn(
        'relative flex h-full items-stretch bg-background/40',
        !isLeft && 'flex-row-reverse'
      )}
    >
      <div
        style={{ width: `${displayWidth}px` }}
        className={cn(
          'relative flex h-full flex-col overflow-hidden border-border bg-muted/30 transition-[width] duration-200 ease-out',
          isLeft ? 'border-r' : 'border-l',
          collapsed && 'bg-transparent'
        )}
        aria-label={title}
        aria-expanded={!collapsed}
      >
        <div className={cn('flex h-full flex-col', collapsed && 'pointer-events-none')}>
          {collapsed ? (
            <div className="flex h-full items-center justify-center">
              <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground [writing-mode:vertical-rl] rotate-180">
                {title}
              </span>
            </div>
          ) : (
            children
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={onToggle}
          aria-label={toggleLabel}
          className={cn(
            'absolute top-3 z-20 h-8 w-8 rounded-full border border-border bg-background/80 shadow-md backdrop-blur hover:bg-foreground hover:text-background',
            isLeft ? 'right-3' : 'left-3'
          )}
        >
          <ToggleIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {!collapsed && (
        <ResizeHandle
          onResize={onResize}
          minWidth={0}
        />
      )}
    </div>
  );
};
