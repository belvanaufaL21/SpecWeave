/**
 * Common Utils Tests
 * Tests for shared utility functions
 */

import {
  deepClone,
  deepMerge,
  isEmpty,
  generateId,
  debounce,
  throttle,
  retry,
  safeJsonParse,
  safeJsonStringify,
  getNestedProperty,
  setNestedProperty,
  removeDuplicates,
  groupBy,
  sortBy,
  chunk,
  flatten,
  pick,
  omit,
  range,
  sleep,
  memoize
} from '../commonUtils.js';

describe('Common Utils', () => {
  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone(true)).toBe(true);
      expect(deepClone(null)).toBe(null);
    });

    it('should clone arrays', () => {
      const original = [1, 2, { a: 3 }];
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[2]).not.toBe(original[2]);
    });

    it('should clone objects', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });

    it('should clone dates', () => {
      const original = new Date('2023-01-01');
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });
  });

  describe('deepMerge', () => {
    it('should merge objects deeply', () => {
      const target = { a: 1, b: { c: 2 } };
      const source = { b: { d: 3 }, e: 4 };
      const result = deepMerge(target, source);
      
      expect(result).toEqual({
        a: 1,
        b: { c: 2, d: 3 },
        e: 4
      });
    });

    it('should handle multiple sources', () => {
      const target = { a: 1 };
      const source1 = { b: 2 };
      const source2 = { c: 3 };
      const result = deepMerge(target, source1, source2);
      
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('isEmpty', () => {
    it('should detect empty values', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);
    });

    it('should detect non-empty values', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty({ a: 1 })).toBe(false);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    it('should include prefix when provided', () => {
      const id = generateId('test');
      expect(id).toMatch(/^test_/);
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('should debounce function calls', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call immediately when immediate is true', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100, true);

      debouncedFn();
      expect(fn).toHaveBeenCalledTimes(1);

      debouncedFn();
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNestedProperty', () => {
    const obj = {
      a: {
        b: {
          c: 'value'
        }
      }
    };

    it('should get nested property', () => {
      expect(getNestedProperty(obj, 'a.b.c')).toBe('value');
    });

    it('should return default value for missing property', () => {
      expect(getNestedProperty(obj, 'a.b.d', 'default')).toBe('default');
    });

    it('should handle null/undefined objects', () => {
      expect(getNestedProperty(null, 'a.b.c', 'default')).toBe('default');
      expect(getNestedProperty(undefined, 'a.b.c', 'default')).toBe('default');
    });
  });

  describe('setNestedProperty', () => {
    it('should set nested property', () => {
      const obj = {};
      setNestedProperty(obj, 'a.b.c', 'value');
      
      expect(obj.a.b.c).toBe('value');
    });

    it('should overwrite existing properties', () => {
      const obj = { a: { b: { c: 'old' } } };
      setNestedProperty(obj, 'a.b.c', 'new');
      
      expect(obj.a.b.c).toBe('new');
    });
  });

  describe('removeDuplicates', () => {
    it('should remove duplicates from primitive array', () => {
      const arr = [1, 2, 2, 3, 3, 3];
      const result = removeDuplicates(arr);
      
      expect(result).toEqual([1, 2, 3]);
    });

    it('should remove duplicates by key', () => {
      const arr = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        { id: 1, name: 'John Doe' }
      ];
      const result = removeDuplicates(arr, 'id');
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });
  });

  describe('groupBy', () => {
    it('should group array by key', () => {
      const arr = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 }
      ];
      const result = groupBy(arr, 'category');
      
      expect(result.A).toHaveLength(2);
      expect(result.B).toHaveLength(1);
    });

    it('should group by function', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      const result = groupBy(arr, (item) => item % 2 === 0 ? 'even' : 'odd');
      
      expect(result.even).toEqual([2, 4, 6]);
      expect(result.odd).toEqual([1, 3, 5]);
    });
  });

  describe('chunk', () => {
    it('should chunk array into smaller arrays', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7];
      const result = chunk(arr, 3);
      
      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('should handle empty arrays', () => {
      expect(chunk([], 3)).toEqual([]);
    });

    it('should handle size larger than array', () => {
      const arr = [1, 2];
      const result = chunk(arr, 5);
      
      expect(result).toEqual([[1, 2]]);
    });
  });

  describe('flatten', () => {
    it('should flatten nested arrays', () => {
      const arr = [1, [2, 3], [4, [5, 6]]];
      const result = flatten(arr);
      
      expect(result).toEqual([1, 2, 3, 4, [5, 6]]);
    });

    it('should flatten with custom depth', () => {
      const arr = [1, [2, [3, [4]]]];
      const result = flatten(arr, 2);
      
      expect(result).toEqual([1, 2, 3, [4]]);
    });
  });

  describe('pick', () => {
    it('should pick specified properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['a', 'c']);
      
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should handle missing properties', () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, ['a', 'c']);
      
      expect(result).toEqual({ a: 1 });
    });
  });

  describe('omit', () => {
    it('should omit specified properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b']);
      
      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe('range', () => {
    it('should create range of numbers', () => {
      expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]);
      expect(range(1, 4)).toEqual([1, 2, 3]);
    });

    it('should handle custom step', () => {
      expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
    });

    it('should handle negative step', () => {
      expect(range(5, 0, -1)).toEqual([5, 4, 3, 2, 1]);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"a": 1}');
      expect(result).toEqual({ a: 1 });
    });

    it('should return default value for invalid JSON', () => {
      const result = safeJsonParse('invalid json', { default: true });
      expect(result).toEqual({ default: true });
    });
  });

  describe('safeJsonStringify', () => {
    it('should stringify valid objects', () => {
      const result = safeJsonStringify({ a: 1 });
      expect(result).toBe('{"a":1}');
    });

    it('should return default value for unstringifiable objects', () => {
      const circular = {};
      circular.self = circular;
      
      const result = safeJsonStringify(circular, 'error');
      expect(result).toBe('error');
    });
  });

  describe('memoize', () => {
    it('should memoize function results', () => {
      const fn = jest.fn((x) => x * 2);
      const memoizedFn = memoize(fn);

      expect(memoizedFn(5)).toBe(10);
      expect(memoizedFn(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use custom key function', () => {
      const fn = jest.fn((obj) => obj.value * 2);
      const memoizedFn = memoize(fn, (obj) => obj.id);

      const obj1 = { id: 1, value: 5 };
      const obj2 = { id: 1, value: 10 }; // Same ID, different value

      expect(memoizedFn(obj1)).toBe(10);
      expect(memoizedFn(obj2)).toBe(10); // Should return cached result
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const fn = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Failed');
        }
        return 'success';
      });

      const result = await retry(fn, 3, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const fn = jest.fn(() => {
        throw new Error('Always fails');
      });

      await expect(retry(fn, 2, 10)).rejects.toThrow('Always fails');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('sleep', () => {
    jest.useFakeTimers();

    it('should resolve after specified time', async () => {
      const promise = sleep(1000);
      jest.advanceTimersByTime(1000);
      
      await expect(promise).resolves.toBeUndefined();
    });
  });
});