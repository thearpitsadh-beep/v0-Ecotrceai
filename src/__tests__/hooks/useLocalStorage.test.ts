import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with default value', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    const [value] = result.current;
    expect(value).toBe('default');
  });

  it('should load from localStorage', () => {
    localStorage.setItem('key', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    const [value] = result.current;
    expect(value).toBe('stored');
  });

  it('should update value', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'));

    act(() => {
      const [, setValue] = result.current;
      setValue('updated');
    });

    const [value] = result.current;
    expect(value).toBe('updated');
    expect(localStorage.getItem('key')).toBe(JSON.stringify('updated'));
  });

  it('should support function update', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));

    act(() => {
      const [, setValue] = result.current;
      setValue((prev) => prev + 1);
    });

    const [value] = result.current;
    expect(value).toBe(1);
  });

  it('should remove value', () => {
    localStorage.setItem('key', JSON.stringify('value'));
    const { result } = renderHook(() => useLocalStorage('key', 'default'));

    act(() => {
      const [, , removeValue] = result.current;
      removeValue();
    });

    const [value] = result.current;
    expect(value).toBe('default');
    expect(localStorage.getItem('key')).toBeNull();
  });

  it('should handle complex objects', () => {
    const obj = { name: 'test', count: 42 };
    const { result } = renderHook(() => useLocalStorage('obj', { name: '', count: 0 }));

    act(() => {
      const [, setValue] = result.current;
      setValue(obj);
    });

    const [value] = result.current;
    expect(value).toEqual(obj);
  });

  it('should handle JSON parse errors gracefully', () => {
    localStorage.setItem('key', 'invalid json');
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    const [value] = result.current;
    expect(value).toBe('default');
  });
});
