import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/utils';

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  minWidth: number;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ onResize }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent): void => {
      const delta = e.clientX - startXRef.current;
      onResize(delta);
      startXRef.current = e.clientX;
    };

    const handleMouseUp = (): void => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onResize]);

  return (
    <div
      className={cn(
        'w-1 cursor-col-resize hover:bg-primary/50 transition-all duration-150 hover:w-1.5',
        isDragging && 'bg-primary w-1.5'
      )}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
    />
  );
};
