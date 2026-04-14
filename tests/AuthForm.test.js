import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { loadClass, resetDOM } from './setup.js';

let AuthForm;
beforeAll(() => { AuthForm = loadClass('AuthForm'); });

beforeEach(() => {
  resetDOM();
  document.body.innerHTML = `
    <input id="loginEmail" />
    <input id="loginPw" type="password" />
    <button id="pwBtn">••</button>
    <div id="screen-findAccount">
      <div class="tab-item active"></div>
      <div class="tab-item"></div>
    </div>
    <div id="findTab0"></div>
    <div id="findTab1"></div>
  `;
});

describe('AuthForm', () => {
  it('togglePw should switch type and label', () => {
    const af = new AuthForm({}, {}, {});
    const btn = document.getElementById('pwBtn');
    af.togglePw('loginPw', btn);
    expect(document.getElementById('loginPw').type).toBe('text');
    expect(btn.textContent).toBe('AB');
    af.togglePw('loginPw', btn);
    expect(document.getElementById('loginPw').type).toBe('password');
  });

  it('switchFindTab should toggle visibility and active class', () => {
    const af = new AuthForm({}, {}, {});
    const tabs = document.querySelectorAll('#screen-findAccount .tab-item');
    af.switchFindTab(1, tabs[1]);
    expect(tabs[0].classList.contains('active')).toBe(false);
    expect(tabs[1].classList.contains('active')).toBe(true);
    expect(document.getElementById('findTab0').style.display).toBe('none');
    expect(document.getElementById('findTab1').style.display).toBe('');
  });

  it('handleLogin should reject empty fields', () => {
    const state = {};
    const router = { go: vi.fn() };
    const toast = { show: vi.fn() };
    const af = new AuthForm(state, router, toast);
    af.handleLogin();
    expect(toast.show).toHaveBeenCalledWith('이메일과 비밀번호를 입력하세요', true);
    expect(router.go).not.toHaveBeenCalled();
  });

  it('handleLogin should derive nickname from email and navigate', () => {
    const state = {};
    const router = { go: vi.fn() };
    const toast = { show: vi.fn() };
    const af = new AuthForm(state, router, toast);
    document.getElementById('loginEmail').value = 'kim@example.com';
    document.getElementById('loginPw').value = 'pw';
    af.handleLogin();
    expect(state.nickname).toBe('kim');
    expect(state.athleteCode).toMatch(/^LR-\d{4}$/);
    expect(router.go).toHaveBeenCalledWith('home');
  });
});
