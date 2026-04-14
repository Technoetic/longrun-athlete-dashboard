import { describe, it, expect, beforeAll } from 'vitest';
import { loadClass } from './setup.js';

let Injury;
beforeAll(() => { Injury = loadClass('Injury'); });

describe('Injury', () => {
  it('should toggle selected class', () => {
    const el = document.createElement('span');
    const i = new Injury();
    i.toggleTag(el);
    expect(el.classList.contains('selected')).toBe(true);
    i.toggleTag(el);
    expect(el.classList.contains('selected')).toBe(false);
  });
});
