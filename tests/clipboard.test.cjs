const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

// The clipboard is an asynchronous external API. Control its completion while
// exercising the application's real input/button handlers and rendered state.
function page() {
  const ids = ['entrada','resultado','estado-entrada','estado-resultado','validar','formatar','exemplo','limpar','copiar'];
  const elements = Object.fromEntries(ids.map(id => [id, {
    value: '', textContent: '', className: '', disabled: false, events: {},
    addEventListener(name, fn) { this.events[name] = fn; },
    focus() {}, select() {}
  }]));
  const pending = [], fallback = [];
  const context = vm.createContext({
    document: {
      readyState: 'complete', getElementById: id => elements[id],
      execCommand() { fallback.push(elements.resultado.value); return true; }
    },
    navigator: { clipboard: { writeText(text) {
      return new Promise((resolve, reject) => pending.push({text, resolve, reject}));
    } } },
    window: { confirm: () => true }
  });
  vm.runInContext(source, context);
  function click(id) { elements[id].events.click(); }
  function enter(text) { elements.entrada.value=text; elements.entrada.events.input(); }
  function format(text) { enter(text); click('formatar'); }
  return {elements,pending,fallback,click,enter,format};
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('a delayed copy success does not replace the edited-input message', async () => {
  const p=page(); p.format('{"old":1}'); p.click('copiar'); p.enter('{"new":2}');
  const status=p.elements['estado-resultado'].textContent;
  p.pending[0].resolve(); await settle();
  assert.equal(p.elements['estado-resultado'].textContent,status);
  assert.equal(p.elements.resultado.value,'');
});
test('a rejected old copy never copies a newly formatted result', async () => {
  const p=page(); p.format('{"old":1}'); p.click('copiar'); p.format('{"new":2}');
  p.pending[0].reject(new Error('clipboard denied')); await settle();
  assert.deepEqual(p.fallback,[]);
  assert.equal(p.elements['estado-resultado'].textContent,'Formatado com recuo de 2 espaços.');
});
test('clearing the page invalidates an outstanding copy notification', async () => {
  const p=page(); p.format('true'); p.click('copiar'); p.click('limpar');
  p.pending[0].resolve(); await settle();
  assert.equal(p.elements['estado-resultado'].textContent,'');
});
test('copying the current result succeeds normally', async () => {
  const p=page(); p.format('{"n":12345678901234567890}'); p.click('copiar');
  assert.equal(p.pending[0].text,p.elements.resultado.value);
  p.pending[0].resolve(); await settle();
  assert.equal(p.elements['estado-resultado'].textContent,'Resultado copiado.');
});
test('a denied current copy uses the fallback for the same result', async () => {
  const p=page(); p.format('false'); p.click('copiar');
  p.pending[0].reject(new Error('clipboard denied')); await settle();
  assert.deepEqual(p.fallback,['false']);
  assert.equal(p.elements['estado-resultado'].textContent,'Resultado copiado.');
});
