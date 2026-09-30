const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(source, ctx, { timeout: 2000 });
let checks = 0;
function check(input, valid, exact) {
  ctx.testInput = input;
  const result = vm.runInContext('validarEFormatar(testInput)', ctx, { timeout: 2000 });
  assert.equal(result.valido, valid, JSON.stringify(input));
  if (valid) {
    assert.deepEqual(JSON.parse(result.resultado), JSON.parse(input));
    if (exact !== undefined) assert.equal(result.resultado, exact);
    ctx.testOutput = result.resultado;
    assert.equal(vm.runInContext('validarEFormatar(testOutput).resultado', ctx), result.resultado);
  } else {
    assert.ok(result.mensagem && typeof result.mensagem === 'string');
    if (result.linha !== undefined) {
      assert.ok(result.linha >= 1 && result.coluna >= 1);
    }
  }
  checks++;
}
for (const input of ['null','true','false','0','-0','1.0','1E+2','1e400','12345678901234567890','9007199254740993','0.100000000000000000001','""','"ação 日本語 😀"','{}','[]']) check(input,true,input);
check(' { "2": 2, "1": 1, "2":3 } ',true,'{\n  "2": 2,\n  "1": 1,\n  "2": 3\n}');
check('[ {"text":"a b\\n\\t\\\"\\\\\\u0061","empty": [ ]},null ]',true,'[\n  {\n    "text": "a b\\n\\t\\\"\\\\\\u0061",\n    "empty": []\n  },\n  null\n]');
check('{"html":"<img src=x onerror=alert(1)>"}',true);
for (const input of ['', ' \n\t', '[1,]', '{"a":1,}', "{'a':1}", 'undefined', 'NaN', 'Infinity', '+1', '.1', '01', '-01', '1.', '1e', '1e+', 'true false', '//comment\n{}', '{/*x*/}', '\ufeff{}', '"a\nb"', '"\\x00"', '"\\u00"', '"unterminated', '[', '{', '{"x":', '{"x" 1}', '[1 2]', '[1}', '{"x":1]', '[[1],]', '{"x":[1],"y":}', '{"😀":1,\n"x":}', '[trueX]', '[null0]', '[false_]', '[1e2e3]', '\u00a0{}']) check(input,false);
assert.equal(ctx.analisarJson('{\n "😀": 1,\n "b":\n}').linha,4);
assert.equal(ctx.analisarJson('{"😀":}').coluna,6);
assert.equal(ctx.analisarJson(ctx.EXEMPLO).valido,true);
let seed = 20260930;
function rand(n) { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed % n; }
function value(depth=0) {
  const choices = [null, true, false, rand(20000)-10000, 'texto 😀 \\ " \n\t '+rand(100)];
  if (depth<4) {
    choices.push(()=>Array.from({length:rand(5)},()=>value(depth+1)));
    choices.push(()=>Object.fromEntries(Array.from({length:rand(5)},(_,i)=>['campo_'+i,value(depth+1)])));
  }
  const picked = choices[rand(choices.length)];
  return typeof picked === 'function' ? picked() : picked;
}
for(let i=0;i<500;i++) {
  const input=JSON.stringify(value(),null,rand(4));
  check(input,true);
  const pos=rand(input.length+1);
  const mutated=input.slice(0,pos)+['}',']',',','x','"','\n'][rand(6)]+input.slice(pos);
  let valid=true;
  try { JSON.parse(mutated); } catch { valid=false; }
  check(mutated,valid);
}
check('['.repeat(100)+ '0' + ']'.repeat(100),true);
console.log(JSON.stringify({passed:checks,focusedChecks:'literal preservation, invalid JSON, Unicode error position, HTML as data, idempotence, example, nesting, deterministic generated/mutated cases'}));
