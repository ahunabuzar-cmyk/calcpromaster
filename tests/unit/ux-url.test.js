// Unit tests for the UX & URL state modules (real shipped code — no inline copies)
// Run: npm run test:unit
import { describe, it, expect, vi } from 'vitest';
import ux from '../../js/ux-utils.js';
import url from '../../js/url-state.js';

const { UXUtils } = ux;
const { URLStateManager } = url;

describe('UXUtils.debounce', () => {
  it('coalesces rapid calls into one trailing execution', async () => {
    const fn = vi.fn();
    const debounced = UXUtils.debounce(fn, 50);
    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 120));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('preserves the latest arguments', async () => {
    const fn = vi.fn();
    const debounced = UXUtils.debounce(fn, 50);
    debounced('a');
    debounced('b');
    await new Promise((r) => setTimeout(r, 120));
    expect(fn).toHaveBeenCalledWith('b');
  });

  it('respects the leading edge timing (first call wins the window)', async () => {
    const fn = vi.fn();
    const debounced = UXUtils.debounce(fn, 100);
    debounced(1);
    await new Promise((r) => setTimeout(r, 150));
    debounced(2);
    await new Promise((r) => setTimeout(r, 150));
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('UXUtils.throttle', () => {
  it('fires leading edge immediately, then at most once per window', async () => {
    const fn = vi.fn();
    const throttled = UXUtils.throttle(fn, 60);
    throttled(1);
    expect(fn).toHaveBeenCalledTimes(1); // leading edge
    throttled(2); // suppressed — inside the 60ms window
    throttled(3); // suppressed
    expect(fn).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 100)); // past window → trailing fires
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[1]).toEqual([3]); // trailing carries the latest args
  });

  it('resets the window after the trailing call', async () => {
    const fn = vi.fn();
    const throttled = UXUtils.throttle(fn, 40);
    throttled('a');
    await new Promise((r) => setTimeout(r, 90));
    throttled('b');
    await new Promise((r) => setTimeout(r, 90));
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('UXUtils.rafThrottle', () => {
  it('returns a function and clamps within [0,1]', () => {
    expect(typeof UXUtils.rafThrottle).toBe('function');
    expect(UXUtils.clamp(5, 0, 1)).toBe(1);
    expect(UXUtils.clamp(-2, 0, 1)).toBe(0);
    expect(UXUtils.clamp(0.5, 0, 1)).toBe(0.5);
  });
});

describe('URLStateManager.serializeValues', () => {
  const tool = {
    inputs: [
      { id: 'amount', type: 'number', def: 100000 },
      { id: 'rate', type: 'number', def: 8.5 },
      { id: 'years', type: 'number', def: 5 },
      { id: 'isNew', type: 'checkbox', def: false },
      { id: 'note', type: 'text', def: '' }
    ]
  };

  it('serializes numeric + checkbox values, skipping empty', () => {
    const params = URLStateManager.serializeValues(tool, { amount: 200000, rate: 6.5, years: 10, isNew: true, note: '' });
    expect(params).toEqual({ amount: '200000', rate: '6.5', years: '10', isNew: 'true' });
  });

  it('handles empty / undefined values gracefully', () => {
    const params = URLStateManager.serializeValues(tool, {});
    expect(params).toEqual({});
  });

  it('returns empty for null tool', () => {
    expect(URLStateManager.serializeValues(null, { a: 1 })).toEqual({});
  });
});

describe('URLStateManager edge behavior', () => {
  it('readState returns null when no query string', () => {
    // No DOM window.location in Node — guard must not throw
    expect(URLStateManager.readState()).toBeNull();
  });

  it('pushState/restore are safe no-ops outside a browser', () => {
    expect(() => URLStateManager.pushState({ inputs: [] }, {})).not.toThrow();
    expect(() => URLStateManager.restore({ inputs: [] })).not.toThrow();
  });
});
