import { Reducer } from './Reducer';
import { FormState, FormAction, FormConfig, ValidationError } from './types';

export class StateMachine<T = any> {
  private state: FormState<T>;
  private config: FormConfig<T>;
  private listeners: Set<(state: FormState<T>) => void> = new Set();

  constructor(config: FormConfig<T>) {
    this.config = config;
    this.state = this.createInitialState(config.initialData);
  }

  private createInitialState(initialData: T): FormState<T> {
    return {
      data: initialData,
      initialData: initialData,
      errors: {},
      touched: {},
      dirty: false,
      history: {
        past: [],
        future: [],
      },
    };
  }

  getState(): FormState<T> {
    return this.state;
  }

  dispatch(action: FormAction): void {
    this.state = Reducer.reduce(this.state, action);
    this.notify();
    
    if (this.config.onChange) {
      this.config.onChange(this.state.data);
    }
  }

  subscribe(listener: (state: FormState<T>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  setField(path: string, value: any): void {
    this.dispatch({ type: 'SET_FIELD', path, value });
  }

  setData(data: T): void {
    this.dispatch({ type: 'SET_DATA', data });
  }

  reset(): void {
    this.dispatch({ type: 'RESET' });
  }

  undo(): void {
    this.dispatch({ type: 'UNDO' });
  }

  redo(): void {
    this.dispatch({ type: 'REDO' });
  }

  touchField(path: string): void {
    this.dispatch({ type: 'TOUCH_FIELD', path });
  }

  setError(path: string, error: string): void {
    this.dispatch({ type: 'SET_ERROR', path, error });
  }

  clearError(path: string): void {
    this.dispatch({ type: 'CLEAR_ERROR', path });
  }

  validate(validationFn?: (data: T) => Record<string, string>): ValidationError[] {
    const errors: ValidationError[] = [];
    const validation = validationFn || this.config.validation;

    if (validation) {
      const result = validation(this.state.data);
      for (const [path, message] of Object.entries(result)) {
        errors.push({ path, message });
        this.setError(path, message);
      }
    }

    return errors;
  }

  canUndo(): boolean {
    return this.state.history.past.length > 0;
  }

  canRedo(): boolean {
    return this.state.history.future.length > 0;
  }

  isDirty(): boolean {
    return this.state.dirty;
  }

  getErrors(): Record<string, string> {
    return this.state.errors;
  }

  getTouched(): Record<string, boolean> {
    return this.state.touched;
  }
}
