export type ActionType =
  | 'SET_FIELD'
  | 'SET_DATA'
  | 'RESET'
  | 'UNDO'
  | 'REDO'
  | 'TOUCH_FIELD'
  | 'SET_ERROR'
  | 'CLEAR_ERROR'
  | 'ARRAY_PUSH'
  | 'ARRAY_POP'
  | 'ARRAY_INSERT'
  | 'ARRAY_REMOVE'
  | 'ARRAY_MOVE';

export interface BaseAction {
  type: ActionType;
}

export interface SetFieldAction extends BaseAction {
  type: 'SET_FIELD';
  path: string;
  value: any;
}

export interface SetDataAction extends BaseAction {
  type: 'SET_DATA';
  data: any;
}

export interface ResetAction extends BaseAction {
  type: 'RESET';
}

export interface UndoAction extends BaseAction {
  type: 'UNDO';
}

export interface RedoAction extends BaseAction {
  type: 'REDO';
}

export interface TouchFieldAction extends BaseAction {
  type: 'TOUCH_FIELD';
  path: string;
}

export interface SetErrorAction extends BaseAction {
  type: 'SET_ERROR';
  path: string;
  error: string;
}

export interface ClearErrorAction extends BaseAction {
  type: 'CLEAR_ERROR';
  path: string;
}

export interface ArrayPushAction extends BaseAction {
  type: 'ARRAY_PUSH';
  path: string;
  value: any;
}

export interface ArrayPopAction extends BaseAction {
  type: 'ARRAY_POP';
  path: string;
}

export interface ArrayInsertAction extends BaseAction {
  type: 'ARRAY_INSERT';
  path: string;
  index: number;
  value: any;
}

export interface ArrayRemoveAction extends BaseAction {
  type: 'ARRAY_REMOVE';
  path: string;
  index: number;
}

export interface ArrayMoveAction extends BaseAction {
  type: 'ARRAY_MOVE';
  path: string;
  fromIndex: number;
  toIndex: number;
}

export type FormAction =
  | SetFieldAction
  | SetDataAction
  | ResetAction
  | UndoAction
  | RedoAction
  | TouchFieldAction
  | SetErrorAction
  | ClearErrorAction
  | ArrayPushAction
  | ArrayPopAction
  | ArrayInsertAction
  | ArrayRemoveAction
  | ArrayMoveAction;

export interface ValidationError {
  path: string;
  message: string;
}

export interface FormState<T = any> {
  data: T;
  initialData: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  dirty: boolean;
  history: {
    past: any[];
    future: any[];
  };
}

export interface FormConfig<T = any> {
  initialData: T;
  validation?: (data: T) => Record<string, string>;
  onChange?: (data: T) => void;
  maxHistory?: number;
}

export type ChangeHandler = (path: string, value: any) => void;
export type SubmitHandler = (data: any) => void;
