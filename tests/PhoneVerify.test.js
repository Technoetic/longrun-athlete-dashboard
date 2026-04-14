import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { loadClass, resetDOM } from './setup.js';

let PhoneVerify;
beforeAll(() => { PhoneVerify = loadClass('PhoneVerify'); });

beforeEach(() => {
  resetDOM();
  document.body.innerHTML = `
    <div id="verifyCodeGroup" style="display:none"></div>
    <div id="verifyTimer"></div>
  `;
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); });

describe('PhoneVerify', () => {
  it('should reveal code group and start countdown', () => {
    const toast = { show: vi.fn() };
    const v = new PhoneVerify(toast);
    v.start();
    expect(document.getElementById('verifyCodeGroup').style.display).toBe('');
    expect(toast.show).toHaveBeenCalledWith('인증번호가 발송되었습니다');
    vi.advanceTimersByTime(1000);
    expect(document.getElementById('verifyTimer').textContent).toContain('2:59');
  });

  it('should clear timer on confirm', () => {
    const toast = { show: vi.fn() };
    const v = new PhoneVerify(toast);
    v.start();
    v.confirm();
    expect(document.getElementById('verifyTimer').textContent).toBe('');
    expect(toast.show).toHaveBeenCalledWith('전화번호가 인증되었습니다');
  });

  it('should restart cleanly when start called twice', () => {
    const toast = { show: vi.fn() };
    const v = new PhoneVerify(toast);
    v.start();
    v.start();
    expect(toast.show).toHaveBeenCalledTimes(2);
  });
});
