export interface BaseWidgetProps {
  path: string;
  value: any;
  onChange: (value: any) => void;
  schema: any;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  description?: string;
}
