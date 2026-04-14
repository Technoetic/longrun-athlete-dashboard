import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { loadClass, resetDOM } from './setup.js';

let Signup;
beforeAll(() => { Signup = loadClass('Signup'); });

function makeDom() {
  document.body.innerHTML = `
    <input id="signNick" />
    <input id="signEmail" />
    <input id="signPw" />
    <input id="signPw2" />
    <div data-agree="0" class="check-circle"></div>
    <div data-agree="1" class="check-circle"></div>
    <div data-agree="2" class="check-circle"></div>
    <div data-agree="3" class="check-circle"></div>
    <div data-agree="4" class="check-circle"></div>
    <div id="agreeAll" class="check-circle"></div>
    <div class="sport-card"></div>
    <div class="sport-card"></div>
    <input id="tc0" /><input id="tc1" /><input id="tc2" />
    <input id="tc3" /><input id="tc4" /><input id="tc5" />
    <div id="welcomeName"></div>
    <div id="athleteCode"></div>
  `;
}

beforeEach(() => { resetDOM(); makeDom(); });

describe('Signup.goSignup2', () => {
  function freshState() {
    return { agreements: [false, false, false, false, false], sport: '', teamCode: '', nickname: '', athleteCode: '' };
  }

  it('should reject empty nickname', () => {
    const state = freshState();
    const router = { go: vi.fn() };
    const toast = { show: vi.fn() };
    const s = new Signup(state, router, toast);
    s.goSignup2();
    expect(toast.show).toHaveBeenCalledWith('닉네임을 입력하세요', true);
    expect(router.go).not.toHaveBeenCalled();
  });

  it('should reject mismatched passwords', () => {
    const state = freshState();
    const router = { go: vi.fn() };
    const toast = { show: vi.fn() };
    const s = new Signup(state, router, toast);
    document.getElementById('signNick').value = 'kim';
    document.getElementById('signEmail').value = 'k@k.com';
    document.getElementById('signPw').value = 'abcdefgh';
    document.getElementById('signPw2').value = 'wrongggg';
    s.goSignup2();
    expect(toast.show).toHaveBeenCalledWith('비밀번호가 일치하지 않습니다', true);
  });

  it('should reject short password', () => {
    const state = freshState();
    const router = { go: vi.fn() };
    const toast = { show: vi.fn() };
    const s = new Signup(state, router, toast);
    document.getElementById('signNick').value = 'kim';
    document.getElementById('signEmail').value = 'k@k.com';
    document.getElementById('signPw').value = '123';
    document.getElementById('signPw2').value = '123';
    s.goSignup2();
    expect(toast.show).toHaveBeenCalledWith('비밀번호 8자 이상 입력하세요', true);
  });

  it('should pass with valid input', () => {
    const state = freshState();
    const router = { go: vi.fn() };
    const toast = { show: vi.fn() };
    const s = new Signup(state, router, toast);
    document.getElementById('signNick').value = 'kim';
    document.getElementById('signEmail').value = 'k@k.com';
    document.getElementById('signPw').value = 'abcdefgh';
    document.getElementById('signPw2').value = 'abcdefgh';
    s.goSignup2();
    expect(state.nickname).toBe('kim');
    expect(router.go).toHaveBeenCalledWith('signup2');
  });
});

describe('Signup agreements', () => {
  it('toggleAgreement should flip and update UI', () => {
    const state = { agreements: [false, false, false, false, false] };
    const s = new Signup(state, { go: vi.fn() }, { show: vi.fn() });
    s.toggleAgreement(0);
    expect(state.agreements[0]).toBe(true);
    expect(document.querySelector('[data-agree="0"]').classList.contains('checked')).toBe(true);
  });

  it('toggleAllAgreements should set all on then all off', () => {
    const state = { agreements: [false, false, false, false, false] };
    const s = new Signup(state, { go: vi.fn() }, { show: vi.fn() });
    s.toggleAllAgreements();
    expect(state.agreements).toEqual([true, true, true, true, true]);
    s.toggleAllAgreements();
    expect(state.agreements).toEqual([false, false, false, false, false]);
  });

  it('goSignup3 should require all 4 mandatory agreements', () => {
    const state = { agreements: [true, true, true, false, false] };
    const router = { go: vi.fn() };
    const toast = { show: vi.fn() };
    const s = new Signup(state, router, toast);
    s.goSignup3();
    expect(toast.show).toHaveBeenCalledWith('필수 항목에 모두 동의해주세요', true);
    expect(router.go).not.toHaveBeenCalled();
  });

  it('goSignup3 should pass when all 4 mandatory agreed', () => {
    const state = { agreements: [true, true, true, true, false] };
    const router = { go: vi.fn() };
    const s = new Signup(state, router, { show: vi.fn() });
    s.goSignup3();
    expect(router.go).toHaveBeenCalledWith('signup3');
  });
});

describe('Signup sport & team code', () => {
  it('selectSport should mark selected and store name', () => {
    const state = { sport: '' };
    const s = new Signup(state, { go: vi.fn() }, { show: vi.fn() });
    const cards = document.querySelectorAll('.sport-card');
    s.selectSport(cards[1], '축구');
    expect(state.sport).toBe('축구');
    expect(cards[1].classList.contains('selected')).toBe(true);
    expect(cards[0].classList.contains('selected')).toBe(false);
  });

  it('goSignup4 should reject empty sport', () => {
    const state = { sport: '' };
    const toast = { show: vi.fn() };
    const s = new Signup(state, { go: vi.fn() }, toast);
    s.goSignup4();
    expect(toast.show).toHaveBeenCalledWith('운동 종목을 선택하세요', true);
  });

  it('codeNext should focus next input', () => {
    const s = new Signup({}, { go: vi.fn() }, { show: vi.fn() });
    const tc0 = document.getElementById('tc0');
    tc0.value = 'A';
    s.codeNext(tc0, 0);
    expect(document.activeElement.id).toBe('tc1');
  });

  it('getTeamCode should concatenate uppercase', () => {
    const s = new Signup({}, { go: vi.fn() }, { show: vi.fn() });
    ['a', 'b', '1', '2', 'c', 'd'].forEach((v, i) => { document.getElementById('tc' + i).value = v; });
    expect(s.getTeamCode()).toBe('AB12CD');
  });

  it('completeSignup should set athleteCode and navigate', () => {
    const state = { teamCode: '', athleteCode: '', nickname: '철수' };
    const router = { go: vi.fn() };
    const s = new Signup(state, router, { show: vi.fn() });
    ['a', 'b', '1', '2', 'c', 'd'].forEach((v, i) => { document.getElementById('tc' + i).value = v; });
    s.completeSignup();
    expect(state.teamCode).toBe('AB12CD');
    expect(state.athleteCode).toMatch(/^LR-\d{4}$/);
    expect(document.getElementById('welcomeName').textContent).toBe('철수님, 환영합니다!');
    expect(router.go).toHaveBeenCalledWith('welcome');
  });
});
