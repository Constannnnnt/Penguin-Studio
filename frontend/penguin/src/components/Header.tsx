// import { Sparkles, SidebarOpen, SlidersHorizontal } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
// import { Button } from '@/components/ui/button';
import PenguinSVG from '@/assets/penguin';

interface HeaderProps {
  onToggleLibrary?: () => void;
  onToggleAdvancedControls?: () => void;
  libraryCollapsed?: boolean;
  controlsCollapsed?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  // onToggleLibrary = () => {},
  // onToggleAdvancedControls = () => {},
  // libraryCollapsed = false,
  // controlsCollapsed = false,
}) => {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="banner">
      <div className="flex items-center gap-2">
        {/* <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" /> */}
        <div className="flex items-center gap-2">
          <PenguinSVG/>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Penguin Studio</p>
        </div>
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
    </header>
  );
};
