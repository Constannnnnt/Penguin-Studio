import PenguinSVG from '@/assets/penguin';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

interface HeaderProps {
  onToggleLibrary?: () => void;
  onToggleAdvancedControls?: () => void;
  libraryCollapsed?: boolean;
  controlsCollapsed?: boolean;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="flex h-14 items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur shadow-sm" role="banner">
      <div className="flex items-center gap-3">
        <PenguinSVG />
        <p className="text-xs uppercase font-bold tracking-[0.2em] text-foreground/80">Penguin Studio</p>
      </div>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleLibrary}
            aria-pressed={!libraryCollapsed}
            className="gap-2"
          >
            <SidebarOpen className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-medium">
              {libraryCollapsed ? 'Show Library' : 'Hide Library'}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleAdvancedControls}
            aria-pressed={!controlsCollapsed}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-medium">
              {controlsCollapsed ? 'Show Controls' : 'Hide Controls'}
            </span>
          </Button>
        </div> */}

        <ThemeToggle />
      </div>
    </header >
  );
};
