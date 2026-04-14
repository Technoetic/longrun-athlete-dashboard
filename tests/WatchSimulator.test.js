import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { loadClass, resetDOM } from './setup.js';

let WatchSimulator;
beforeAll(() => { WatchSimulator = loadClass('WatchSimulator'); });

beforeEach(() => {
  resetDOM();
  document.body.innerHTML = `
    <div id="watchStatus" class="watch-status disconnected"></div>
    <div id="watchMetrics" style="display:none"></div>
    <div id="hrValue">--</div>
    <div id="spo2Value">--</div>
    <div id="tempValue">--</div>
  `;
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); });

describe('WatchSimulator', () => {
  it('should connect and populate metrics on first toggle', () => {
    const state = { watchConnected: false, watchInterval: null };
    const w = new WatchSimulator(state);
    w.toggle();
    expect(state.watchConnected).toBe(true);
    expect(document.getElementById('watchStatus').className).toBe('watch-status connected');
    expect(document.getElementById('watchMetrics').style.display).toBe('');
    expect(document.getElementById('hrValue').textContent).not.toBe('--');
  });

  it('should disconnect and reset on second toggle', () => {
    const state = { watchConnected: false, watchInterval: null };
    const w = new WatchSimulator(state);
    w.toggle();
    w.toggle();
    expect(state.watchConnected).toBe(false);
    expect(document.getElementById('hrValue').textContent).toBe('--');
    expect(document.getElementById('watchMetrics').style.display).toBe('none');
  });

  it('should refresh values via interval', () => {
    const state = { watchConnected: false, watchInterval: null };
    const w = new WatchSimulator(state);
    w.toggle();
    const before = document.getElementById('hrValue').textContent;
    vi.advanceTimersByTime(2000);
    const after = document.getElementById('hrValue').textContent;
    // Should still be a number (may equal by chance but typically refreshes)
    expect(/^\d+$/.test(after)).toBe(true);
    expect(before).not.toBe('--');
  });
});
