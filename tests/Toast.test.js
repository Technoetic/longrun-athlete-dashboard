import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { loadClass, resetDOM, makeToastEl } from './setup.js';

let Toast;
beforeAll(() => { Toast = loadClass('Toast'); });
beforeEach(() => { resetDOM(); makeToastEl(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('Toast', () => {
  it('should set message and show class', () => {
    const t = new Toast('toast');
    t.show('hello');
    const el = document.getElementById('toast');
    expect(el.textContent).toBe('hello');
    expect(el.className).toBe('toast show');
  });

  it('should add error class when isError', () => {
    const t = new Toast('toast');
    t.show('oops', true);
    expect(document.getElementById('toast').className).toBe('toast show error');
  });

  it('should hide after 2500ms', () => {
    const t = new Toast('toast');
    t.show('msg');
    vi.advanceTimersByTime(2500);
    expect(document.getElementById('toast').className).toBe('toast');
  });
});
