import get from 'lodash/get';
import set from 'lodash/set';
import cloneDeep from 'lodash/cloneDeep';
import { FormState, FormAction } from './types';

const lodashSet = set as any;
const lodashGet = get as any;
const lodashCloneDeep = cloneDeep as any;

export class Reducer {
  static reduce<T>(state: FormState<T>, action: FormAction): FormState<T> {
    switch (action.type) {
      case 'SET_FIELD':
        return this.setField(state, action.path, action.value);
      
      case 'SET_DATA':
        return this.setData(state, action.data);
      
      case 'RESET':
        return this.reset(state);
      
      case 'UNDO':
        return this.undo(state);
      
      case 'REDO':
        return this.redo(state);
      
      case 'TOUCH_FIELD':
        return this.touchField(state, action.path);
      
      case 'SET_ERROR':
        return this.setError(state, action.path, action.error);
      
      case 'CLEAR_ERROR':
        return this.clearError(state, action.path);
      
      case 'ARRAY_PUSH':
        return this.arrayPush(state, action.path, action.value);
      
      case 'ARRAY_POP':
        return this.arrayPop(state, action.path);
      
      case 'ARRAY_INSERT':
        return this.arrayInsert(state, action.path, action.index, action.value);
      
      case 'ARRAY_REMOVE':
        return this.arrayRemove(state, action.path, action.index);
      
      case 'ARRAY_MOVE':
        return this.arrayMove(state, action.path, action.fromIndex, action.toIndex);
      
      default:
        return state;
    }
  }

  private static setField<T>(state: FormState<T>, path: string, value: any): FormState<T> {
    const newData = lodashCloneDeep(state.data);
    lodashSet(newData, path, value);

    return {
      ...state,
      data: newData,
      dirty: true,
      history: {
        past: [...state.history.past, lodashCloneDeep(state.data)].slice(-50),
        future: [],
      },
    };
  }

  private static setData<T>(state: FormState<T>, data: any): FormState<T> {
    return {
      ...state,
      data: lodashCloneDeep(data),
      dirty: true,
    };
  }

  private static reset<T>(state: FormState<T>): FormState<T> {
    return {
      ...state,
      data: lodashCloneDeep(state.initialData),
      errors: {},
      touched: {},
      dirty: false,
      history: {
        past: [...state.history.past, lodashCloneDeep(state.data)].slice(-50),
        future: [],
      },
    };
  }

  private static undo<T>(state: FormState<T>): FormState<T> {
    if (state.history.past.length === 0) return state;

    const previous = state.history.past[state.history.past.length - 1];
    const newPast = state.history.past.slice(0, -1);

    return {
      ...state,
      data: previous,
      history: {
        past: newPast,
        future: [lodashCloneDeep(state.data), ...state.history.future].slice(0, 50),
      },
    };
  }

  private static redo<T>(state: FormState<T>): FormState<T> {
    if (state.history.future.length === 0) return state;

    const next = state.history.future[0];
    const newFuture = state.history.future.slice(1);

    return {
      ...state,
      data: next,
      history: {
        past: [...state.history.past, lodashCloneDeep(state.data)].slice(-50),
        future: newFuture,
      },
    };
  }

  private static touchField<T>(state: FormState<T>, path: string): FormState<T> {
    return {
      ...state,
      touched: {
        ...state.touched,
        [path]: true,
      },
    };
  }

  private static setError<T>(state: FormState<T>, path: string, error: string): FormState<T> {
    return {
      ...state,
      errors: {
        ...state.errors,
        [path]: error,
      },
    };
  }

  private static clearError<T>(state: FormState<T>, path: string): FormState<T> {
    const { [path]: _, ...rest } = state.errors;
    return {
      ...state,
      errors: rest,
    };
  }

  private static arrayPush<T>(state: FormState<T>, path: string, value: any): FormState<T> {
    const newData = lodashCloneDeep(state.data);
    const arr = lodashGet(newData, path, []);
    
    if (!Array.isArray(arr)) return state;
    
    arr.push(value);
    lodashSet(newData, path, arr);

    return {
      ...state,
      data: newData,
      dirty: true,
      history: {
        past: [...state.history.past, lodashCloneDeep(state.data)].slice(-50),
        future: [],
      },
    };
  }

  private static arrayPop<T>(state: FormState<T>, path: string): FormState<T> {
    const newData = lodashCloneDeep(state.data);
    const arr = lodashGet(newData, path, []);
    
    if (!Array.isArray(arr) || arr.length === 0) return state;
    
    arr.pop();
    lodashSet(newData, path, arr);

    return {
      ...state,
      data: newData,
      dirty: true,
      history: {
        past: [...state.history.past, lodashCloneDeep(state.data)].slice(-50),
        future: [],
      },
    };
  }

  private static arrayInsert<T>(state: FormState<T>, path: string, index: number, value: any): FormState<T> {
    const newData = lodashCloneDeep(state.data);
    const arr = lodashGet(newData, path, []);
    
    if (!Array.isArray(arr)) return state;
    
    arr.splice(index, 0, value);
    lodashSet(newData, path, arr);

    return {
      ...state,
      data: newData,
      dirty: true,
      history: {
        past: [...state.history.past, lodashCloneDeep(state.data)].slice(-50),
        future: [],
      },
    };
  }

  private static arrayRemove<T>(state: FormState<T>, path: string, index: number): FormState<T> {
    const newData = lodashCloneDeep(state.data);
    const arr = lodashGet(newData, path, []);
    
    if (!Array.isArray(arr) || index < 0 || index >= arr.length) return state;
    
    arr.splice(index, 1);
    lodashSet(newData, path, arr);

    return {
      ...state,
      data: newData,
      dirty: true,
      history: {
        past: [...state.history.past, lodashCloneDeep(state.data)].slice(-50),
        future: [],
      },
    };
  }

  private static arrayMove<T>(state: FormState<T>, path: string, fromIndex: number, toIndex: number): FormState<T> {
    const newData = lodashCloneDeep(state.data);
    const arr = lodashGet(newData, path, []);
    
    if (!Array.isArray(arr) || fromIndex < 0 || fromIndex >= arr.length) return state;
    if (toIndex < 0 || toIndex >= arr.length) return state;
    
    const [item] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, item);
    lodashSet(newData, path, arr);

    return {
      ...state,
      data: newData,
      dirty: true,
      history: {
        past: [...state.history.past, lodashCloneDeep(state.data)].slice(-50),
        future: [],
      },
    };
  }
}
