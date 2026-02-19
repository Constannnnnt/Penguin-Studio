import * as React from 'react';
import { Slider } from '@/shared/components/ui/slider';
import { cn } from '@/shared/lib/utils';

interface PerformantSliderProps extends Omit<
  React.ComponentProps<typeof Slider>,
  'value' | 'defaultValue' | 'onValueChange' | 'onValueCommit'
> {
  value: number;
  onValueChange: (value: number) => void;
  /**
   * Optional: Display the current value on hover
   */
  showValueOnHover?: boolean;
}

export const PerformantSlider: React.FC<PerformantSliderProps> = ({
    value,
    onValueChange,
    className,
    showValueOnHover = true,
    disabled,
    ...props
}) => {
    const [localValue, setLocalValue] = React.useState(value);

    // Sync local value when prop changes externally (e.g. undo/redo or initial load)
    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    return (
        <div className={cn("relative flex items-center group py-2", className)}>
            <Slider
                {...props}
                value={[localValue]}
                disabled={disabled}
                onValueChange={(vals) => setLocalValue(vals[0])}
                onValueCommit={(vals) => onValueChange(vals[0])}
                className="[&_.range]:bg-primary [&_.thumb]:border-primary [&_.thumb]:bg-background"
            />
            {showValueOnHover && (
                <div className="absolute -top-1 right-0 text-[9px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {localValue}
                </div>
            )}
        </div>
    );
};
