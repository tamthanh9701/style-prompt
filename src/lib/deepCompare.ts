/**
 * Recursively deep compares two objects.
 * Features:
 * - Normalizes empty values (null, undefined, "", []) as equivalent.
 * - Ignores array order for arrays of primitives (e.g. ['a', 'b'] equals ['b', 'a']).
 * - Coerces string to number where applicable (e.g. "30" == 30).
 */
export function deepCompare(obj1: any, obj2: any): boolean {
  // Normalize empty
  const isEmpty = (v: any) =>
    v === null ||
    v === undefined ||
    v === '' ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && v !== null && Object.keys(v).length === 0);

  if (isEmpty(obj1) && isEmpty(obj2)) return true;
  if (isEmpty(obj1) !== isEmpty(obj2)) return false;

  // Type mismatch (after empty check)
  if (typeof obj1 !== typeof obj2) {
    // Try to coerce string/number
    if (
      (typeof obj1 === 'string' && typeof obj2 === 'number') ||
      (typeof obj1 === 'number' && typeof obj2 === 'string')
    ) {
      if (!isNaN(Number(obj1)) && !isNaN(Number(obj2))) {
        return Number(obj1) === Number(obj2);
      }
    }
    return false;
  }

  // Primitives
  if (typeof obj1 !== 'object') {
    return obj1 === obj2;
  }

  // Arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    
    // Check if it's an array of primitives
    const isPrimitiveArray1 = obj1.every((o) => typeof o !== 'object');
    const isPrimitiveArray2 = obj2.every((o) => typeof o !== 'object');
    
    if (isPrimitiveArray1 && isPrimitiveArray2) {
      const sorted1 = [...obj1].sort();
      const sorted2 = [...obj2].sort();
      return sorted1.every((val, index) => val === sorted2[index]);
    }
    
    // Fallback for object arrays (we assume same order for objects in this app)
    for (let i = 0; i < obj1.length; i++) {
        if (!deepCompare(obj1[i], obj2[i])) return false;
    }
    return true;
  }

  // Objects
  const keys1 = Object.keys(obj1).filter((k) => !isEmpty(obj1[k]));
  const keys2 = Object.keys(obj2).filter((k) => !isEmpty(obj2[k]));

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!deepCompare(obj1[key], obj2[key])) return false;
  }

  return true;
}
