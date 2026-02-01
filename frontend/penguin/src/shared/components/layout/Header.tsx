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
    <header className="flex h-14 items-center justify-between px-6 border-b border-border/40 bg-background/60 backdrop-blur-xl relative z-50" role="banner">
      <div className="flex items-center gap-4 group">
        <div className="p-1.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-all duration-300">
          <PenguinSVG />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tighter text-foreground leading-none">Penguin</span>
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60 leading-none mt-0.5">Studio</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-6 mr-4">
          <span className="text-xs font-mono font-medium text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-default">v0.1.0-alpha</span>
        </div>
        <ThemeToggle />
      </div>
    </header >
  );
};
