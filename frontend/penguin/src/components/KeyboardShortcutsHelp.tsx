import * as React from 'react';
import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * KeyboardShortcutsHelp Component
 * 
 * Displays keyboard shortcuts and accessibility features
 */
export const KeyboardShortcutsHelp: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  /**
   * Handle keyboard shortcut to open help (? key)
   */
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Only trigger if not in an input field
        const target = event.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          event.preventDefault();
          setOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Show keyboard shortcuts"
          title="Keyboard shortcuts (Press ? for help)"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts & Accessibility</DialogTitle>
          <DialogDescription>
            Navigate Penguin Studio efficiently using your keyboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Global Navigation */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Global Navigation</h3>
            <div className="space-y-2">
              <ShortcutRow
                keys={['Tab']}
                description="Move focus to next interactive element"
              />
              <ShortcutRow
                keys={['Shift', 'Tab']}
                description="Move focus to previous interactive element"
              />
              <ShortcutRow
                keys={['?']}
                description="Show this keyboard shortcuts help"
              />
            </div>
          </section>

          {/* Panel Navigation */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Panel Navigation</h3>
            <div className="space-y-2">
              <ShortcutRow
                keys={['←', '→']}
                description="Navigate between panel tabs"
              />
              <ShortcutRow
                keys={['Home']}
                description="Jump to first panel tab"
              />
              <ShortcutRow
                keys={['End']}
                description="Jump to last panel tab"
              />
            </div>
          </section>

          {/* Button Grids */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Button Grids (Options)</h3>
            <div className="space-y-2">
              <ShortcutRow
                keys={['←', '→', '↑', '↓']}
                description="Navigate between options in a grid"
              />
              <ShortcutRow
                keys={['Home']}
                description="Jump to first option"
              />
              <ShortcutRow
                keys={['End']}
                description="Jump to last option"
              />
              <ShortcutRow
                keys={['Enter', 'Space']}
                description="Select focused option"
              />
            </div>
          </section>

          {/* Object List */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Object List</h3>
            <div className="space-y-2">
              <ShortcutRow
                keys={['Enter', 'Space']}
                description="Select focused object"
              />
              <ShortcutRow
                keys={['Tab']}
                description="Navigate to remove button"
              />
            </div>
          </section>

          {/* Accessibility Features */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Accessibility Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>All interactive elements support keyboard navigation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Visible focus indicators (2px outline) on all focusable elements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>ARIA labels and roles for screen reader compatibility</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Logical tab order throughout the application</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Skip links available at the top of the page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Touch-friendly button sizes (minimum 44x44px)</span>
              </li>
            </ul>
          </section>

          {/* Screen Reader Tips */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Screen Reader Tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Use landmarks to navigate: main content, complementary (panels), banner (header)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Panel tabs use ARIA tab pattern with proper roles and states</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Button grids announce selection state (pressed/not pressed)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Form fields have associated labels and help text</span>
              </li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * ShortcutRow Component
 * Displays a keyboard shortcut with its description
 */
interface ShortcutRowProps {
  keys: string[];
  description: string;
}

const ShortcutRow: React.FC<ShortcutRowProps> = ({ keys, description }) => {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{description}</span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            {index > 0 && <span className="text-muted-foreground mx-1">+</span>}
            <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded">
              {key}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
