import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { loadClass, resetDOM } from './setup.js';

let TeamCode;
beforeAll(() => { TeamCode = loadClass('TeamCode'); });

beforeEach(() => {
  resetDOM();
  document.body.innerHTML = `
    <input id="newTeamCode" />
    <div id="homeTeamName"></div>
    <div id="homeTeamCode"></div>
  `;
});

describe('TeamCode', () => {
  it('should open modal with input HTML', () => {
    const state = { teamCode: '' };
    const modal = { open: vi.fn(), close: vi.fn() };
    const toast = { show: vi.fn() };
    const tc = new TeamCode(state, modal, toast);
    tc.showModal();
    expect(modal.open).toHaveBeenCalledOnce();
    const arg = modal.open.mock.calls[0][0];
    expect(arg.title).toBe('팀 코드 변경');
    expect(arg.descHTML).toContain('newTeamCode');
  });

  it('should reject empty input', () => {
    const state = { teamCode: '' };
    const modal = { close: vi.fn() };
    const toast = { show: vi.fn() };
    const tc = new TeamCode(state, modal, toast);
    document.getElementById('newTeamCode').value = '';
    tc.change();
    expect(toast.show).toHaveBeenCalledWith('팀 코드를 입력하세요', true);
    expect(modal.close).not.toHaveBeenCalled();
  });

  it('should update state and DOM on valid change', () => {
    const state = { teamCode: '' };
    const modal = { close: vi.fn() };
    const toast = { show: vi.fn() };
    const tc = new TeamCode(state, modal, toast);
    document.getElementById('newTeamCode').value = 'ab12cd';
    tc.change();
    expect(state.teamCode).toBe('AB12CD');
    expect(document.getElementById('homeTeamName').textContent).toBe('팀 AB12CD');
    expect(document.getElementById('homeTeamCode').textContent).toBe('AB12CD');
    expect(modal.close).toHaveBeenCalledOnce();
    expect(toast.show).toHaveBeenCalledWith('팀이 변경되었습니다');
  });
});
