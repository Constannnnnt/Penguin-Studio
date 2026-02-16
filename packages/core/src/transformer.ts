import get from 'lodash/get';
import set from 'lodash/set';
import cloneDeep from 'lodash/cloneDeep';

export class Transformer {
  /**
   * Deep update a value in a JSON object using a path string (e.g., 'a.b[0].c')
   */
  static update(obj: any, path: string, value: any): any {
    const newObj = cloneDeep(obj);
    set(newObj, path, value);
    return newObj;
  }

  /**
   * Get a value from a JSON object using a path string
   */
  static get(obj: any, path: string, defaultValue?: any): any {
    return get(obj, path, defaultValue);
  }

  /**
   * Transform a flat map of updates back into a nested object structure
   */
  static fromFlatMap(updates: Record<string, any>, originalObj: any): any {
    let newObj = cloneDeep(originalObj);
    for (const [path, value] of Object.entries(updates)) {
      set(newObj, path, value);
    }
    return newObj;
  }
}
