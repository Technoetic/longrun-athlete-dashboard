import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { loadClass, resetDOM } from './setup.js';

let Router;
beforeAll(() => { Router = loadClass('Router'); });

beforeEach(() => {
  resetDOM();
  document.body.innerHTML = `
    <div class="screen active" id="screen-a"></div>
    <div class="screen" id="screen-b"></div>
  `;
});

describe('Router', () => {
  it('should switch active screen', () => {
    const r = new Router();
    r.go('b');
    expect(document.getElementById('screen-a').classList.contains('active')).toBe(false);
    expect(document.getElementById('screen-b').classList.contains('active')).toBe(true);
  });

  it('should call beforeEnter hook', () => {
    const r = new Router();
    const spy = vi.fn();
    r.on('b', spy);
    r.go('b');
    expect(spy).toHaveBeenCalledOnce();
  });

  it('should ignore unknown screen id without crashing', () => {
    const r = new Router();
    expect(() => r.go('zzz')).not.toThrow();
  });
});
