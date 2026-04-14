import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_JS = resolve(__dirname, '../src/js');

export function loadClass(name) {
  const code = readFileSync(resolve(SRC_JS, `${name}.js`), 'utf8');
  const exposed = `${code}\n;globalThis.${name} = ${name};`;
  // eslint-disable-next-line no-eval
  (0, eval)(exposed);
  return globalThis[name];
}

export function makeToastEl(id = 'toast') {
  const el = document.createElement('div');
  el.id = id;
  document.body.appendChild(el);
  return el;
}

export function resetDOM() {
  document.body.innerHTML = '';
}
