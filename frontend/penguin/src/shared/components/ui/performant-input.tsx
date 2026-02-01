import * as React from 'react';
import { Input } from '@/shared/components/ui/input';

interface PerformantInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
    value: string | number;
    onValueCommit: (val: string) => void;
    // Optional: Allow standard onChange behavior if needed for some reason, though onValueCommit is preferred
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PerformantInput: React.FC<PerformantInputProps> = ({
    value,
    onChange,
    onValueCommit,
    ...props
}) => {
    const [localValue, setLocalValue] = React.useState(value);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value);
        if (onChange) onChange(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (onValueCommit) onValueCommit(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onValueCommit) {
            // @ts-ignore - value is definitely string in input context
            onValueCommit(localValue.toString());
            e.currentTarget.blur();
        }
    };

    return (
        <Input
            {...props}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
        />
    );
};
