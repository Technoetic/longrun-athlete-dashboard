import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadClass, resetDOM } from './setup.js';

let Modal;
beforeAll(() => { Modal = loadClass('Modal'); });

beforeEach(() => {
  resetDOM();
  document.body.innerHTML = `
    <div id="overlay" class="modal-overlay">
      <div id="title"></div>
      <div id="desc"></div>
      <div id="actions"></div>
    </div>
  `;
});

describe('Modal', () => {
  it('should open with HTML description', () => {
    const m = new Modal('overlay', 'title', 'desc', 'actions');
    m.open({ title: 'Hi', descHTML: '<b>x</b>', actionsHTML: '<button>OK</button>' });
    expect(document.getElementById('title').textContent).toBe('Hi');
    expect(document.getElementById('desc').innerHTML).toBe('<b>x</b>');
    expect(document.getElementById('actions').innerHTML).toBe('<button>OK</button>');
    expect(document.getElementById('overlay').classList.contains('show')).toBe(true);
  });

  it('should open with text description', () => {
    const m = new Modal('overlay', 'title', 'desc', 'actions');
    m.open({ title: 'T', descText: '<plain>', actionsHTML: '' });
    expect(document.getElementById('desc').textContent).toBe('<plain>');
    expect(document.getElementById('desc').innerHTML).toBe('&lt;plain&gt;');
  });

  it('should close', () => {
    const m = new Modal('overlay', 'title', 'desc', 'actions');
    document.getElementById('overlay').classList.add('show');
    m.close();
    expect(document.getElementById('overlay').classList.contains('show')).toBe(false);
  });
});
