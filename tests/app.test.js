import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_JS = resolve(__dirname, '../src/js');

const ORDER = [
  'State', 'Toast', 'Modal', 'Router', 'AuthForm', 'PhoneVerify',
  'Signup', 'WatchSimulator', 'Intensity', 'Injury', 'TeamCode',
  'Home', 'Profile', 'Clock'
];

describe('app.js composition root', () => {
  beforeAll(() => {
    document.body.innerHTML = `
      <div id="toast"></div>
      <div id="modal" class="modal-overlay"><div id="modalTitle"></div><div id="modalDesc"></div><div id="modalActions"></div></div>
      <div id="statusTime"></div>
    `;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 14, 9, 0, 0));
    for (const name of ORDER) {
      const code = readFileSync(resolve(SRC_JS, `${name}.js`), 'utf8');
      (0, eval)(code + `\n;globalThis.${name} = ${name};`);
    }
    const appCode = readFileSync(resolve(SRC_JS, 'app.js'), 'utf8');
    (0, eval)(appCode);
  });
  afterEach(() => { vi.useRealTimers(); });

  it('should expose 29 window bindings', () => {
    const expected = [
      'goScreen', 'showToast', 'togglePw', 'switchFindTab', 'handleLogin',
      'startPhoneVerify', 'confirmVerify', 'goSignup2', 'goSignup3', 'goSignup4',
      'toggleAgreement', 'toggleAllAgreements', 'selectSport', 'codeNext', 'completeSignup',
      'toggleWatch', 'selectIntensity', 'resetIntensity', 'submitDaily', 'toggleInjuryTag',
      'showTeamCodeModal', 'changeTeam', 'closeModal', 'handleProfilePhoto', 'changeProfileName',
      'copyAthleteCode', 'showPolicyModal', 'handleLogout', 'confirmLogout'
    ];
    for (const name of expected) {
      expect(typeof globalThis[name], `${name} missing`).toBe('function');
    }
    expect(expected.length).toBe(29);
  });

  it('should initialize clock with HH:MM', () => {
    expect(document.getElementById('statusTime').textContent).toBe('09:00');
  });
});
