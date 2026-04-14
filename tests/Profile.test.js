import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { loadClass, resetDOM } from './setup.js';

let Profile;
beforeAll(() => { Profile = loadClass('Profile'); });

beforeEach(() => {
  resetDOM();
  document.body.innerHTML = `
    <div id="profileName"></div>
    <div id="profileAthleteCode"></div>
    <img id="profileAvatarImg" />
    <span id="profileAvatarText"></span>
    <div id="homeAvatar"></div>
    <div id="homeName"></div>
    <input id="profileNickInput" />
  `;
});

function makeDeps() {
  return {
    state: { nickname: '', athleteCode: '', profilePhoto: '' },
    router: { go: vi.fn() },
    modal: { open: vi.fn(), close: vi.fn() },
    toast: { show: vi.fn() },
    intensity: { reset: vi.fn() }
  };
}

describe('Profile.init', () => {
  it('should render fallbacks when state empty', () => {
    const d = makeDeps();
    const p = new Profile(d.state, d.router, d.modal, d.toast, d.intensity);
    p.init();
    expect(document.getElementById('profileName').textContent).toBe('선수님');
    expect(document.getElementById('profileAthleteCode').textContent).toBe('LR-0000');
  });

  it('should render photo when present', () => {
    const d = makeDeps();
    d.state.nickname = '철수';
    d.state.athleteCode = 'LR-1234';
    d.state.profilePhoto = 'data:image/png;base64,xyz';
    const p = new Profile(d.state, d.router, d.modal, d.toast, d.intensity);
    p.init();
    expect(document.getElementById('profileAvatarImg').src).toContain('data:image/png');
    expect(document.getElementById('profileAvatarImg').style.display).toBe('');
    expect(document.getElementById('profileAvatarText').style.display).toBe('none');
  });
});

describe('Profile.changeName', () => {
  it('should reject empty input', () => {
    const d = makeDeps();
    const p = new Profile(d.state, d.router, d.modal, d.toast, d.intensity);
    p.changeName();
    expect(d.toast.show).toHaveBeenCalledWith('이름을 입력하세요', true);
  });

  it('should update state and DOM on valid input', () => {
    const d = makeDeps();
    const p = new Profile(d.state, d.router, d.modal, d.toast, d.intensity);
    document.getElementById('profileNickInput').value = '영희';
    p.changeName();
    expect(d.state.nickname).toBe('영희');
    expect(document.getElementById('profileName').textContent).toBe('영희님');
    expect(document.getElementById('homeName').textContent).toBe('영희님');
    expect(document.getElementById('profileNickInput').value).toBe('');
    expect(d.toast.show).toHaveBeenCalledWith('이름이 변경되었습니다');
  });
});

describe('Profile.copyAthleteCode', () => {
  it('should write to clipboard and toast', async () => {
    const d = makeDeps();
    d.state.athleteCode = 'LR-9999';
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
    const p = new Profile(d.state, d.router, d.modal, d.toast, d.intensity);
    p.copyAthleteCode();
    await new Promise(r => setTimeout(r, 0));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('LR-9999');
    expect(d.toast.show).toHaveBeenCalledWith('고유코드가 복사되었습니다');
  });
});

describe('Profile modals', () => {
  it('showPolicyModal should call modal.open', () => {
    const d = makeDeps();
    const p = new Profile(d.state, d.router, d.modal, d.toast, d.intensity);
    p.showPolicyModal('약관A');
    expect(d.modal.open).toHaveBeenCalledOnce();
    expect(d.modal.open.mock.calls[0][0].title).toBe('약관A');
  });

  it('handleLogout should open confirmation modal', () => {
    const d = makeDeps();
    const p = new Profile(d.state, d.router, d.modal, d.toast, d.intensity);
    p.handleLogout();
    expect(d.modal.open).toHaveBeenCalledOnce();
    expect(d.modal.open.mock.calls[0][0].title).toBe('로그아웃');
  });

  it('confirmLogout should reset state and navigate', () => {
    const d = makeDeps();
    d.state.nickname = '철수';
    d.state.athleteCode = 'LR-1234';
    d.state.teamCode = 'AB12CD';
    d.state.intensity = 5;
    d.state.profilePhoto = 'data:...';
    const p = new Profile(d.state, d.router, d.modal, d.toast, d.intensity);
    p.confirmLogout();
    expect(d.state.nickname).toBe('');
    expect(d.state.athleteCode).toBe('');
    expect(d.state.teamCode).toBe('');
    expect(d.state.intensity).toBe(0);
    expect(d.state.profilePhoto).toBe('');
    expect(d.intensity.reset).toHaveBeenCalledOnce();
    expect(d.router.go).toHaveBeenCalledWith('login');
    expect(d.toast.show).toHaveBeenCalledWith('로그아웃 되었습니다');
  });
});
