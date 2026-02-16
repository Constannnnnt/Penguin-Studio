import React from 'react';
import { PerformantSlider } from '@/shared/components/ui/performant-slider';

interface PlanSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export const PlanSlider: React.FC<PlanSliderProps> = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
}) => {
  return (
    <PerformantSlider
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
    />
  );
};

export default PlanSlider;
