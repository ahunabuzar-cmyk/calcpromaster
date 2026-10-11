import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { isRetryable, backoffMs, withRetry } = require('../../scripts/lib/gsc-inspect.cjs');

const httpErr = (status) => Object.assign(new Error('HTTP ' + status), { status });

describe('GSC transport / isRetryable', () => {
  it('retries throttling and Google-side failures', () => {
    expect(isRetryable(httpErr(429))).toBe(true);
    expect(isRetryable(httpErr(500))).toBe(true);
    expect(isRetryable(httpErr(503))).toBe(true);
    expect(isRetryable(httpErr(408))).toBe(true);
  });

  it('never retries a permissions or not-found error', () => {
    expect(isRetryable(httpErr(403))).toBe(false);
    expect(isRetryable(httpErr(404))).toBe(false);
    expect(isRetryable(httpErr(400))).toBe(false);
  });

  it('retries network-level failures', () => {
    expect(isRetryable(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }))).toBe(true);
    expect(isRetryable(Object.assign(new Error('timeout after 30000ms'), { code: 'ETIMEDOUT' }))).toBe(true);
    expect(isRetryable(new Error('unparseable response: <html>'))).toBe(true);
  });

  it('treats a missing error as not retryable', () => {
    expect(isRetryable(null)).toBe(false);
    expect(isRetryable(undefined)).toBe(false);
  });
});

describe('GSC transport / backoffMs', () => {
  it('grows exponentially inside its jitter band', () => {
    expect(backoffMs(1, 1000, 30000)).toBeGreaterThanOrEqual(700);
    expect(backoffMs(1, 1000, 30000)).toBeLessThanOrEqual(1300);
    expect(backoffMs(2, 1000, 30000)).toBeGreaterThanOrEqual(1400);
    expect(backoffMs(3, 1000, 30000)).toBeGreaterThanOrEqual(2800);
  });

  it('never exceeds the cap, even with jitter and a high attempt number', () => {
    for (let attempt = 1; attempt <= 12; attempt++) {
      expect(backoffMs(attempt, 1000, 30000)).toBeLessThanOrEqual(30000);
    }
  });
});

describe('GSC transport / withRetry', () => {
  // No real waiting in tests.
  const sleep = () => Promise.resolve();

  it('returns the first successful result without retrying', async () => {
    let calls = 0;
    const out = await withRetry(async () => { calls++; return 'ok'; }, { sleep });
    expect(out).toBe('ok');
    expect(calls).toBe(1);
  });

  it('retries a throttled call and succeeds', async () => {
    let calls = 0;
    const retries = [];
    const out = await withRetry(async () => {
      calls++;
      if (calls < 3) throw httpErr(429);
      return 'ok after ' + calls;
    }, { sleep, onRetry: (info) => retries.push(info) });
    expect(out).toBe('ok after 3');
    expect(retries.map((r) => r.attempt)).toEqual([1, 2]);
    expect(retries.every((r) => r.wait > 0)).toBe(true);
  });

  it('gives up after the configured attempts and throws the last error', async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw httpErr(503); }, { attempts: 3, sleep }))
      .rejects.toThrow(/HTTP 503/);
    expect(calls).toBe(3);
  });

  it('fails fast on an error that will not fix itself', async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw httpErr(403); }, { attempts: 4, sleep }))
      .rejects.toThrow(/HTTP 403/);
    expect(calls).toBe(1);
  });
});
