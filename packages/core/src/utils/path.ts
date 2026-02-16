export function getValue(obj: any, path: string): any {
  if (!path) return obj;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

export function setValue(obj: any, path: string, value: any): any {
  if (!path) return value;
  const keys = path.split('.');
  const result = Array.isArray(obj) ? [...obj] : { ...obj };
  let current = result;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const nextIsNumber = /^\d+$/.test(nextKey);
    
    if (current[key] === undefined) {
      current[key] = nextIsNumber ? [] : {};
    } else {
      current[key] = Array.isArray(current[key]) 
        ? [...current[key]] 
        : { ...current[key] };
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return result;
}

export function hasPath(obj: any, path: string): boolean {
  return getValue(obj, path) !== undefined;
}

export function deletePath(obj: any, path: string): any {
  if (!path) return undefined;
  const keys = path.split('.');
  if (keys.length === 1) {
    if (Array.isArray(obj)) {
      const arr = [...obj];
      arr.splice(parseInt(path, 10), 1);
      return arr;
    }
    const result = { ...obj };
    delete result[path];
    return result;
  }
  
  const result = Array.isArray(obj) ? [...obj] : { ...obj };
  const lastKey = keys.pop()!;
  const parent = getValue(result, keys.join('.'));
  
  if (parent !== null && parent !== undefined) {
    if (Array.isArray(parent)) {
      parent.splice(parseInt(lastKey, 10), 1);
    } else {
      delete parent[lastKey];
    }
  }
  
  return result;
}

export function getParentPath(path: string): string {
  const lastDot = path.lastIndexOf('.');
  return lastDot > 0 ? path.substring(0, lastDot) : '';
}

export function getFieldName(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1];
}

export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('.');
}
