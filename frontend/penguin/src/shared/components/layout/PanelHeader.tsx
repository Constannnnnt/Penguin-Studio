import type { ReactNode } from 'react';

interface PanelHeaderProps {
  title: string;
  position?: 'left' | 'right';
  actions?: ReactNode;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  position: _position = 'left',
  actions,
}) => {

  const padding = _position == "right"? "pl-10":"";

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/50">
      <h2 className={`text-sm ${padding} font-semibold text-foreground`}>{title}</h2>
      <div className="flex items-center gap-2 min-h-[32px]">
        {actions}
      </div>
    </div>
  );
};
