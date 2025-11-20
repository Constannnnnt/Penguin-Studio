import { useEffect, useRef } from 'react';
import { Box, Camera, Lightbulb, Palette, Brush } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfigStore } from '@/store/configStore';
import type { PanelType } from '@/types';

// ============================================================================
// Panel Configuration
// ============================================================================

interface PanelConfig {
  id: PanelType;
  label: string;
  icon: typeof Box;
}

const PANELS: readonly PanelConfig[] = [
  { id: 'scene', label: 'Scene', icon: Box },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'lighting', label: 'Light', icon: Lightbulb },
  { id: 'aesthetics', label: 'Style', icon: Palette },
  { id: 'medium', label: 'Art', icon: Brush },
] as const;

// ============================================================================
// PanelNav Component
// ============================================================================

export const PanelNav: React.FC = () => {
  const activePanel = useConfigStore((state) => state.activePanel);
  const setActivePanel = useConfigStore((state) => state.setActivePanel);
  const tabListRef = useRef<HTMLDivElement>(null);

  /**
   * Handles keyboard navigation for panel tabs
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const currentIndex = PANELS.findIndex((panel) => panel.id === activePanel);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : PANELS.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < PANELS.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = PANELS.length - 1;
        break;
      default:
        return;
    }

    setActivePanel(PANELS[newIndex].id);
  };

  /**
   * Focus management for keyboard navigation
   */
  useEffect(() => {
    if (tabListRef.current) {
      const activeButton = tabListRef.current.querySelector(
        `[data-panel-id="${activePanel}"]`
      ) as HTMLButtonElement;
      activeButton?.focus();
    }
  }, [activePanel]);

  return (
    <div
      ref={tabListRef}
      className="flex p-1 bg-muted rounded-lg"
      role="tablist"
      aria-label="Configuration panels"
      onKeyDown={handleKeyDown}
    >
      {PANELS.map(({ id, label, icon: Icon }) => {
        const isActive = activePanel === id;

        return (
          <Button
            key={id}
            id={`tab-${id}`}
            data-panel-id={id}
            variant="ghost"
            onClick={() => setActivePanel(id)}
            className={`
              flex-1 relative min-w-0 gap-2 h-10 px-3 text-sm font-medium transition-all duration-200
              ${isActive 
                ? 'text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }
            `}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${id}`}
            tabIndex={isActive ? 0 : -1}
          >
            {isActive && (
              <div className="absolute inset-0 bg-primary rounded-lg -z-10 transition-all duration-200" />
            )}
            <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'text-current'}`} aria-hidden="true" />
            <span className="hidden sm:inline truncate">{label}</span>
          </Button>
        );
      })}
    </div>
  );
};
