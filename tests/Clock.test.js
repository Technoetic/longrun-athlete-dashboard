import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { loadClass, resetDOM } from './setup.js';

let Clock;
beforeAll(() => { Clock = loadClass('Clock'); });

beforeEach(() => {
  resetDOM();
  const el = document.createElement('span');
  el.id = 'time';
  document.body.appendChild(el);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 3, 14, 9, 5, 0));
});
afterEach(() => { vi.useRealTimers(); });

describe('Clock', () => {
  it('should update with HH:MM zero-padded', () => {
    const c = new Clock('time');
    c.update();
    expect(document.getElementById('time').textContent).toBe('09:05');
  });

  it('should re-update every 30s after start', () => {
    const c = new Clock('time');
    c.start();
    expect(document.getElementById('time').textContent).toBe('09:05');
    vi.setSystemTime(new Date(2026, 3, 14, 9, 6, 0));
    vi.advanceTimersByTime(30000);
    expect(document.getElementById('time').textContent).toBe('09:06');
  });
});
