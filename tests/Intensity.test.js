import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { loadClass, resetDOM } from './setup.js';

let Intensity;
beforeAll(() => { Intensity = loadClass('Intensity'); });

beforeEach(() => {
  resetDOM();
  let html = `
    <div id="intensitySelector"></div>
    <div id="intensityResult" style="display:none">
      <div id="intensityResultValue"></div>
      <div id="intensityResultTime"></div>
    </div>
    <button id="intensityResetBtn" style="display:none"></button>
  `;
  for (let i = 0; i < 10; i++) {
    html += `<button class="intensity-btn" style="--c:#ff0000"></button>`;
  }
  document.body.innerHTML = html;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 3, 14, 14, 30, 0));
});
afterEach(() => { vi.useRealTimers(); });

describe('Intensity.select', () => {
  it('should record intensity and show result view', () => {
    const state = {};
    const toast = { show: vi.fn() };
    const intensity = new Intensity(state, toast);
    const btns = document.querySelectorAll('.intensity-btn');
    intensity.select(5, btns[4]);
    expect(state.intensity).toBe(5);
    expect(state.intensityTime).toBe('14:30');
    expect(document.getElementById('intensityResult').style.display).toBe('');
    expect(document.getElementById('intensityResultValue').textContent).toBe('5');
    expect(document.getElementById('intensityResultTime').textContent).toContain('14:30');
    expect(document.getElementById('intensitySelector').style.display).toBe('none');
    expect(document.getElementById('intensityResetBtn').style.display).toBe('');
  });
});

describe('Intensity.reset', () => {
  it('should clear state and restore selector', () => {
    const state = { intensity: 7, intensityTime: '10:00' };
    const intensity = new Intensity(state, { show: vi.fn() });
    intensity.reset();
    expect(state.intensity).toBe(0);
    expect(state.intensityTime).toBe('');
    expect(document.getElementById('intensitySelector').style.display).toBe('');
    expect(document.getElementById('intensityResult').style.display).toBe('none');
    expect(document.getElementById('intensityResetBtn').style.display).toBe('none');
  });
});

describe('Intensity.submitDaily', () => {
  it('should reject when intensity not set', () => {
    const toast = { show: vi.fn() };
    const intensity = new Intensity({ intensity: 0 }, toast);
    intensity.submitDaily();
    expect(toast.show).toHaveBeenCalledWith('운동 강도를 선택하세요', true);
  });

  it('should toast success when intensity set', () => {
    const toast = { show: vi.fn() };
    const intensity = new Intensity({ intensity: 5 }, toast);
    intensity.submitDaily();
    expect(toast.show).toHaveBeenCalledWith('오늘의 기록이 제출되었습니다');
  });
});

describe('Intensity.scheduleMidnightReset', () => {
  it('should fire reset at midnight', () => {
    const state = { intensity: 8, intensityTime: '23:00' };
    const toast = { show: vi.fn() };
    const intensity = new Intensity(state, toast);
    intensity.scheduleMidnightReset();
    // Advance to midnight
    const now = new Date(2026, 3, 14, 14, 30, 0);
    const midnight = new Date(2026, 3, 15, 0, 0, 0);
    vi.advanceTimersByTime(midnight - now);
    expect(state.intensity).toBe(0);
    expect(toast.show).toHaveBeenCalledWith('00:00 - 운동 강도가 초기화되었습니다');
  });
});
