export type InteractionType = 
  | 'change' 
  | 'focus' 
  | 'blur' 
  | 'submit' 
  | 'reset'
  | 'validate'
  | 'array_push'
  | 'array_pop'
  | 'array_insert'
  | 'array_remove';

export interface Interaction {
  type: InteractionType;
  path: string;
  value?: any;
  previousValue?: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface Action {
  type: string;
  payload: Record<string, any>;
}

export interface TextIntent {
  verb: string;
  target: string;
  value?: any;
  conditions?: Record<string, any>;
}

export interface EncodedDescription {
  raw: string;
  interactions: Interaction[];
  summary: string;
}
