import { stroopsToXLM, truncateAddress } from '../src/utils/format';
import { xlmToStroops } from '../src/utils/validation';
import { retry } from '../src/utils/retry';
import { SimpleCache } from '../src/utils/cache';

describe('format', () => {
  it('converts stroops to XLM', () => { expect(stroopsToXLM(10_000_000n)).toBe('1'); });
  it('converts XLM to stroops', () => { expect(xlmToStroops('1')).toBe(10_000_000n); });
  it('truncates long address', () => { expect(truncateAddress('GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toContain('...'); });
});

describe('SimpleCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('stores and retrieves values', () => {
    const cache = new SimpleCache<string, number>(1000);
    cache.set('key', 42);
    expect(cache.get('key')).toBe(42);
  });

  it('uses default TTL when no custom TTL is provided', () => {
    const cache = new SimpleCache<string, number>(1000);
    cache.set('key', 42);

    jest.advanceTimersByTime(500);
    expect(cache.get('key')).toBe(42);

    jest.advanceTimersByTime(600);
    expect(cache.get('key')).toBeUndefined();
  });

  it('uses custom TTL when provided', () => {
    const cache = new SimpleCache<string, number>(1000);
    cache.set('key', 42, 500);

    jest.advanceTimersByTime(400);
    expect(cache.get('key')).toBe(42);

    jest.advanceTimersByTime(150);
    expect(cache.get('key')).toBeUndefined();
  });

  it('lazily evicts expired entries on get', () => {
    const cache = new SimpleCache<string, number>(1000);
    cache.set('key', 42);
    expect(cache.size()).toBe(1);

    jest.advanceTimersByTime(1100);
    expect(cache.get('key')).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it('deletes keys explicitly', () => {
    const cache = new SimpleCache<string, number>(1000);
    cache.set('key1', 1);
    cache.set('key2', 2);
    expect(cache.size()).toBe(2);

    cache.delete('key1');
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe(2);
    expect(cache.size()).toBe(1);
  });

  it('clears all entries', () => {
    const cache = new SimpleCache<string, number>(1000);
    cache.set('key1', 1);
    cache.set('key2', 2);
    cache.set('key3', 3);
    expect(cache.size()).toBe(3);

    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
    expect(cache.get('key3')).toBeUndefined();
  });

  it('returns size correctly', () => {
    const cache = new SimpleCache<string, number>(1000);
    expect(cache.size()).toBe(0);

    cache.set('a', 1);
    expect(cache.size()).toBe(1);

    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.size()).toBe(3);

    cache.delete('b');
    expect(cache.size()).toBe(2);
  });

  it('handles multiple keys with different expiry times', () => {
    const cache = new SimpleCache<string, number>(1000);
    cache.set('fast', 1, 100);
    cache.set('medium', 2, 500);
    cache.set('slow', 3, 1000);

    jest.advanceTimersByTime(150);
    expect(cache.get('fast')).toBeUndefined();
    expect(cache.get('medium')).toBe(2);
    expect(cache.get('slow')).toBe(3);

    jest.advanceTimersByTime(400);
    expect(cache.get('medium')).toBeUndefined();
    expect(cache.get('slow')).toBe(3);

    jest.advanceTimersByTime(550);
    expect(cache.get('slow')).toBeUndefined();
  });

  it('allows re-setting expired keys', () => {
    const cache = new SimpleCache<string, number>(1000);
    cache.set('key', 1);

    jest.advanceTimersByTime(1100);
    expect(cache.get('key')).toBeUndefined();

    cache.set('key', 2, 500);
    expect(cache.get('key')).toBe(2);

    jest.advanceTimersByTime(300);
    expect(cache.get('key')).toBe(2);

    jest.advanceTimersByTime(250);
    expect(cache.get('key')).toBeUndefined();
  });

  it('handles generic types correctly', () => {
    const stringCache = new SimpleCache<string, string>(1000);
    stringCache.set('greeting', 'hello');
    expect(stringCache.get('greeting')).toBe('hello');

    const objectCache = new SimpleCache<string, { id: number; name: string }>(1000);
    const obj = { id: 42, name: 'test' };
    objectCache.set('data', obj);
    expect(objectCache.get('data')).toEqual(obj);
  });

  it('expires at exact boundary', () => {
    const cache = new SimpleCache<string, number>(1000);
    cache.set('key', 42);

    // At exactly the expiry time (1000ms), should be expired since Date.now() > entry.expiresAt
    jest.advanceTimersByTime(1000);
    expect(cache.get('key')).toBeUndefined();
  });
});

describe('retry', () => {
  it('resolves on first success', async () => {
    const result = await retry(async () => 'ok', 3, 100);
    expect(result).toBe('ok');
  });
});
