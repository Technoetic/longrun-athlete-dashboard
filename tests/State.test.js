import { describe, it, expect, beforeAll } from 'vitest';
import { loadClass } from './setup.js';

let State;
beforeAll(() => { State = loadClass('State'); });

describe('State', () => {
  it('should initialize with default empty values', () => {
    const s = new State();
    expect(s.agreements).toEqual([false, false, false, false, false]);
    expect(s.sport).toBe('');
    expect(s.teamCode).toBe('');
    expect(s.nickname).toBe('');
    expect(s.athleteCode).toBe('');
    expect(s.watchConnected).toBe(false);
    expect(s.intensity).toBe(0);
    expect(s.intensityTime).toBe('');
    expect(s.watchInterval).toBeNull();
    expect(s.profilePhoto).toBe('');
  });

  it('should produce independent instances', () => {
    const a = new State();
    const b = new State();
    a.nickname = 'foo';
    expect(b.nickname).toBe('');
  });
});
