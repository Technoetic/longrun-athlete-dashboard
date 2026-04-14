import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadClass, resetDOM } from './setup.js';

let Home;
beforeAll(() => { Home = loadClass('Home'); });

beforeEach(() => {
  resetDOM();
  document.body.innerHTML = `
    <div id="homeName"></div>
    <div id="homeTeamName"></div>
    <div id="homeTeamCode"></div>
  `;
});

describe('Home', () => {
  it('should render default placeholder when nickname empty', () => {
    const h = new Home({ nickname: '', teamCode: '' });
    h.init();
    expect(document.getElementById('homeName').textContent).toBe('선수님');
    expect(document.getElementById('homeTeamName').textContent).toBe('');
  });

  it('should render nickname and team code when set', () => {
    const h = new Home({ nickname: '철수', teamCode: 'AB12CD' });
    h.init();
    expect(document.getElementById('homeName').textContent).toBe('철수님');
    expect(document.getElementById('homeTeamName').textContent).toBe('팀 AB12CD');
    expect(document.getElementById('homeTeamCode').textContent).toBe('AB12CD');
  });
});
