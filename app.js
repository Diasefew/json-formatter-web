/*
 * json-formatter-web
 * Valida e formata JSON inteiramente no navegador.
 * Nenhum dado é enviado, salvo ou registrado.
 */
'use strict';

/* ==========================================================================
   Núcleo: funções puras, sem acesso à página
   ========================================================================== */

var RECUO = '  ';
var PONTUACAO = ',:{}[]"';

function ehEspaco(c) {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}

/*
 * Reescreve um JSON JÁ VALIDADO alterando somente os espaços fora das strings.
 * Strings, números e literais são copiados caractere por caractere do texto
 * original, então nada é arredondado, reordenado ou reescapado.
 * Com formatado = false, remove todos os espaços fora das strings.
 */
function reescrever(texto, formatado) {
  var saida = [];
  var nivel = 0;
  var i = 0;
  var n = texto.length;

  function novaLinha() {
    if (formatado) {
      saida.push('\n' + RECUO.repeat(nivel));
    }
  }

  while (i < n) {
    var c = texto[i];

    if (ehEspaco(c)) {
      i += 1;
    } else if (c === '"') {
      var fim = i + 1;
      while (fim < n && texto[fim] !== '"') {
        fim += texto[fim] === '\\' ? 2 : 1;
      }
      saida.push(texto.slice(i, fim + 1));
      i = fim + 1;
    } else if (c === '{' || c === '[') {
      var fecha = c === '{' ? '}' : ']';
      var prox = i + 1;
      while (prox < n && ehEspaco(texto[prox])) {
        prox += 1;
      }
      if (texto[prox] === fecha) {
        saida.push(c + fecha);
        i = prox + 1;
      } else {
        saida.push(c);
        nivel += 1;
        novaLinha();
        i += 1;
      }
    } else if (c === '}' || c === ']') {
      nivel -= 1;
      novaLinha();
      saida.push(c);
      i += 1;
    } else if (c === ',') {
      saida.push(',');
      novaLinha();
      i += 1;
    } else if (c === ':') {
      saida.push(formatado ? ': ' : ':');
      i += 1;
    } else {
      var fimValor = i;
      while (
        fimValor < n &&
        !ehEspaco(texto[fimValor]) &&
        PONTUACAO.indexOf(texto[fimValor]) === -1
      ) {
        fimValor += 1;
      }
      saida.push(texto.slice(i, fimValor));
      i = fimValor;
    }
  }

  return saida.join('');
}

function formatarJson(texto) {
  return reescrever(texto, true);
}

function compactarJson(texto) {
  return reescrever(texto, false);
}

/* Converte uma posição no texto em linha e coluna (ambas começando em 1). */
function linhaEColuna(texto, posicao) {
  var linha = 1;
  var inicioDaLinha = 0;
  for (var i = 0; i < posicao && i < texto.length; i += 1) {
    var c = texto[i];
    if (c === '\n' || (c === '\r' && texto[i + 1] !== '\n')) {
      linha += 1;
      inicioDaLinha = i + 1;
    }
  }
  // Array.from conta caracteres visíveis (pares substitutos contam como um).
  var coluna = Array.from(texto.slice(inicioDaLinha, posicao)).length + 1;
  return { linha: linha, coluna: coluna };
}

function descrever(c) {
  if (c === undefined) {
    return 'o fim do texto';
  }
  if (c === '\n' || c === '\r') {
    return 'uma quebra de linha';
  }
  if (c === '\t') {
    return 'uma tabulação';
  }
  return '“' + c + '”';
}

/*
 * Procura o primeiro erro de sintaxe e devolve { posicao, mensagem },
 * ou null se não encontrar nenhum. Só é usada para EXPLICAR um erro que o
 * JSON.parse do navegador já confirmou; quem decide se o JSON é válido é
 * sempre o JSON.parse.
 */
function localizarErro(texto) {
  var n = texto.length;
  var i = 0;
  var pilha = [];
  var estado = 'valor';
  var depoisDeVirgula = false;
  var NUMERO = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;

  function erro(posicao, mensagem) {
    return { posicao: posicao, mensagem: mensagem };
  }

  // Lê uma string a partir da aspa de abertura. Devolve um erro ou null.
  function lerString() {
    var abertura = i;
    i += 1;
    while (i < n) {
      var c = texto[i];
      if (c === '"') {
        i += 1;
        return null;
      }
      if (c === '\\') {
        var e = texto[i + 1];
        if (e === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(texto.slice(i + 2, i + 6))) {
            return erro(i, 'a sequência \\u precisa de exatamente 4 dígitos hexadecimais.');
          }
          i += 6;
        } else if (e !== undefined && '"\\/bfnrt'.indexOf(e) !== -1) {
          i += 2;
        } else if (e === undefined) {
          break;
        } else {
          return erro(i, 'a sequência de escape \\' + e + ' não existe no JSON.');
        }
      } else if (c.charCodeAt(0) < 0x20) {
        return erro(
          i,
          'há ' + (c === '\n' || c === '\r' ? 'uma quebra de linha' : c === '\t' ? 'uma tabulação' : 'um caractere de controle') +
            ' dentro de uma string. Use uma sequência de escape, como \\n ou \\t.'
        );
      } else {
        i += 1;
      }
    }
    return erro(abertura, 'a string aberta aqui não foi fechada com aspas duplas.');
  }

  function erroDeValor() {
    var c = texto[i];
    if (c === undefined) {
      return erro(i, 'o texto terminou onde deveria haver um valor.');
    }
    if (depoisDeVirgula && (c === ']' || c === '}')) {
      return erro(i, 'há uma vírgula sobrando antes de “' + c + '”. O JSON não aceita vírgula final.');
    }
    if (c === '/') {
      return erro(i, 'o JSON não aceita comentários.');
    }
    if (c === "'") {
      return erro(i, 'strings devem usar aspas duplas ("), não aspas simples.');
    }
    if (c === ',') {
      return erro(i, 'há uma vírgula onde deveria haver um valor.');
    }
    if (c === '+' || c === '.') {
      return erro(i, 'número inválido. Números não podem começar com “' + c + '”.');
    }
    if (/[A-Za-z_$]/.test(c)) {
      return erro(
        i,
        'valor não reconhecido. Textos precisam de aspas duplas; os únicos valores sem aspas são números, true, false e null (em minúsculas).'
      );
    }
    return erro(i, 'era esperado um valor, mas foi encontrado ' + descrever(c) + '.');
  }

  function lerValor() {
    var c = texto[i];
    if (c === '{') {
      pilha.push('objeto');
      estado = 'chaveOuFim';
      i += 1;
      return null;
    }
    if (c === '[') {
      pilha.push('lista');
      estado = 'valorOuFim';
      i += 1;
      return null;
    }
    estado = 'depois';
    if (c === '"') {
      return lerString();
    }
    if (c === '-' || (c >= '0' && c <= '9')) {
      NUMERO.lastIndex = i;
      var m = NUMERO.exec(texto);
      if (!m) {
        return erro(i, 'número inválido. Depois do sinal de menos deve haver um dígito.');
      }
      var fim = i + m[0].length;
      var seguinte = texto[fim];
      if (seguinte !== undefined && /[0-9.eE+\-]/.test(seguinte)) {
        if (/^-?0$/.test(m[0]) && /[0-9]/.test(seguinte)) {
          return erro(i, 'número inválido. Números não podem ter zeros à esquerda.');
        }
        return erro(i, 'número inválido. Confira o ponto decimal e o expoente.');
      }
      i = fim;
      return null;
    }
    var literais = ['true', 'false', 'null'];
    for (var k = 0; k < literais.length; k += 1) {
      var lit = literais[k];
      if (texto.startsWith(lit, i) && !/[A-Za-z0-9_$]/.test(texto[i + lit.length] || '')) {
        i += lit.length;
        return null;
      }
    }
    return erroDeValor();
  }

  while (true) {
    while (i < n && ehEspaco(texto[i])) {
      i += 1;
    }
    var c = texto[i];
    var falha = null;

    if (estado === 'valor') {
      falha = lerValor();
      depoisDeVirgula = false;
    } else if (estado === 'valorOuFim') {
      if (c === ']') {
        pilha.pop();
        estado = 'depois';
        i += 1;
      } else {
        falha = lerValor();
      }
    } else if (estado === 'chaveOuFim' || estado === 'chave') {
      if (c === '}' && estado === 'chaveOuFim') {
        pilha.pop();
        estado = 'depois';
        i += 1;
      } else if (c === '"') {
        falha = lerString();
        estado = 'doisPontos';
      } else if (c === '}' && depoisDeVirgula) {
        falha = erro(i, 'há uma vírgula sobrando antes de “}”. O JSON não aceita vírgula final.');
      } else if (c === undefined) {
        falha = erro(i, 'o texto terminou antes de o objeto ser fechado com “}”.');
      } else if (c === '/') {
        falha = erro(i, 'o JSON não aceita comentários.');
      } else {
        falha = erro(i, 'o nome de cada campo deve ser uma string entre aspas duplas, mas foi encontrado ' + descrever(c) + '.');
      }
      depoisDeVirgula = false;
    } else if (estado === 'doisPontos') {
      if (c === ':') {
        estado = 'valor';
        i += 1;
      } else {
        falha = erro(i, 'depois do nome do campo deve vir “:”, mas foi encontrado ' + descrever(c) + '.');
      }
    } else {
      // estado === 'depois': acabou de ler um valor completo
      var dentro = pilha[pilha.length - 1];
      if (dentro === undefined) {
        if (c === undefined) {
          return null;
        }
        if (c === '/') {
          return erro(i, 'o JSON não aceita comentários.');
        }
        return erro(i, 'há conteúdo sobrando depois do fim do JSON: ' + descrever(c) + '.');
      }
      var fechamento = dentro === 'objeto' ? '}' : ']';
      if (c === ',') {
        estado = dentro === 'objeto' ? 'chave' : 'valor';
        depoisDeVirgula = true;
        i += 1;
      } else if (c === fechamento) {
        pilha.pop();
        i += 1;
      } else if (c === undefined) {
        falha = erro(i, 'o texto terminou antes de ' + (dentro === 'objeto' ? 'o objeto' : 'a lista') + ' ser fechad' + (dentro === 'objeto' ? 'o' : 'a') + ' com “' + fechamento + '”.');
      } else if (c === '/') {
        falha = erro(i, 'o JSON não aceita comentários.');
      } else {
        falha = erro(i, 'era esperado “,” ou “' + fechamento + '”, mas foi encontrado ' + descrever(c) + '.');
      }
    }

    if (falha) {
      return falha;
    }
  }
}

/*
 * Analisa o texto e devolve:
 *   { valido: true }
 *   { valido: false, mensagem, linha?, coluna? }
 * Linha e coluna só aparecem quando a localização é confiável.
 */
function analisarJson(texto) {
  if (texto.trim() === '') {
    return { valido: false, mensagem: 'A entrada está vazia. Cole ou digite um JSON para continuar.' };
  }

  try {
    JSON.parse(texto);
    return { valido: true };
  } catch (excecao) {
    if (!(excecao instanceof SyntaxError)) {
      return {
        valido: false,
        mensagem: 'O navegador não conseguiu analisar este JSON. Isso pode acontecer quando há níveis demais de objetos ou listas, uns dentro dos outros.'
      };
    }
  }

  if (texto.charCodeAt(0) === 0xfeff) {
    return {
      valido: false,
      linha: 1,
      coluna: 1,
      mensagem: 'JSON inválido na linha 1, coluna 1: o texto começa com um caractere invisível (BOM). Apague-o e tente de novo.'
    };
  }

  var achado = null;
  try {
    achado = localizarErro(texto);
  } catch (ignorado) {
    achado = null;
  }

  if (!achado) {
    return { valido: false, mensagem: 'JSON inválido. Não foi possível determinar a posição do erro.' };
  }

  var onde = linhaEColuna(texto, achado.posicao);
  return {
    valido: false,
    linha: onde.linha,
    coluna: onde.coluna,
    mensagem: 'JSON inválido na linha ' + onde.linha + ', coluna ' + onde.coluna + ': ' + achado.mensagem
  };
}

/*
 * Valida e formata. Antes de entregar o resultado, confere que a entrada e a
 * saída são idênticas quando se ignoram os espaços fora das strings.
 */
function validarEFormatar(texto) {
  var analise = analisarJson(texto);
  if (!analise.valido) {
    return analise;
  }
  var resultado;
  var confere;
  try {
    resultado = formatarJson(texto);
    confere = compactarJson(resultado) === compactarJson(texto);
  } catch (excecao) {
    // Ex.: milhares de níveis de aninhamento geram um texto maior do que o navegador suporta.
    return {
      valido: false,
      mensagem: 'O JSON é válido, mas o resultado formatado ficaria grande demais para este navegador.'
    };
  }
  if (!confere) {
    return {
      valido: false,
      mensagem: 'O JSON é válido, mas a formatação falhou em uma conferência interna e foi cancelada para não alterar seus dados. Por favor, relate o problema no repositório, sem incluir dados reais.'
    };
  }
  return { valido: true, resultado: resultado };
}

var EXEMPLO =
  '{"curso":"Introdução ao JSON","ativo":true,"cargaHoraria":12.5,' +
  '"codigo":12345678901234567890,"turma":null,' +
  '"alunos":[{"nome":"Ana Exemplo","idade":21,"linguagens":["JavaScript","Python"]},' +
  '{"nome":"Bruno Modelo","idade":34,"linguagens":[]}],' +
  '"observacao":"Aspas \\"escapadas\\", barra \\\\ e acentuação: ção, é, ü, 日本語.",' +
  '"configuracoes":{}}';

/* ==========================================================================
   Interface
   ========================================================================== */

function iniciarInterface() {
  var entrada = document.getElementById('entrada');
  var resultado = document.getElementById('resultado');
  var estadoEntrada = document.getElementById('estado-entrada');
  var estadoResultado = document.getElementById('estado-resultado');
  var botaoValidar = document.getElementById('validar');
  var botaoFormatar = document.getElementById('formatar');
  var botaoExemplo = document.getElementById('exemplo');
  var botaoLimpar = document.getElementById('limpar');
  var botaoCopiar = document.getElementById('copiar');
  var versaoResultado = 0;

  // Sempre textContent/value: o conteúdo colado nunca é interpretado como HTML.
  function avisar(elemento, tipo, texto) {
    elemento.className = 'estado' + (tipo ? ' estado--' + tipo : '');
    elemento.textContent = texto;
  }

  function definirResultado(texto) {
    versaoResultado += 1;
    resultado.value = texto;
    botaoCopiar.disabled = texto === '';
  }

  function validar() {
    var analise = analisarJson(entrada.value);
    if (analise.valido) {
      avisar(estadoEntrada, 'ok', 'JSON válido.');
    } else {
      avisar(estadoEntrada, 'erro', analise.mensagem);
    }
  }

  function formatar() {
    var r = validarEFormatar(entrada.value);
    if (r.valido) {
      definirResultado(r.resultado);
      resultado.scrollTop = 0;
      avisar(estadoEntrada, 'ok', 'JSON válido.');
      avisar(estadoResultado, 'ok', 'Formatado com recuo de 2 espaços.');
    } else {
      definirResultado('');
      avisar(estadoEntrada, 'erro', r.mensagem);
      avisar(estadoResultado, '', 'Nada para copiar: corrija a entrada e formate de novo.');
    }
  }

  // Qualquer mudança na entrada invalida o que foi dito e produzido antes.
  function aoMudarEntrada() {
    avisar(estadoEntrada, '', '');
    if (resultado.value !== '') {
      definirResultado('');
      avisar(estadoResultado, '', 'A entrada mudou. Formate de novo para atualizar o resultado.');
    }
  }

  function carregarExemplo() {
    var atual = entrada.value;
    if (atual.trim() !== '' && atual !== EXEMPLO) {
      if (!window.confirm('Substituir o conteúdo atual pelo exemplo?')) {
        return;
      }
    }
    entrada.value = EXEMPLO;
    definirResultado('');
    avisar(estadoEntrada, '', 'Exemplo carregado, com dados fictícios.');
    avisar(estadoResultado, '', '');
    entrada.focus();
  }

  function limpar() {
    entrada.value = '';
    definirResultado('');
    avisar(estadoEntrada, '', '');
    avisar(estadoResultado, '', '');
    entrada.focus();
  }

  function copiarPeloComandoAntigo() {
    try {
      resultado.focus();
      resultado.select();
      return document.execCommand('copy');
    } catch (ignorado) {
      return false;
    }
  }

  function copiar() {
    var texto = resultado.value;
    var versaoCopiada = versaoResultado;
    if (texto === '') {
      return;
    }

    function sucesso() {
      if (versaoCopiada === versaoResultado) {
        avisar(estadoResultado, 'ok', 'Resultado copiado.');
      }
    }

    function falha() {
      // Uma tentativa antiga não pode copiar ou alterar o estado de outro resultado.
      if (versaoCopiada !== versaoResultado) {
        return;
      }
      if (copiarPeloComandoAntigo()) {
        sucesso();
        return;
      }
      resultado.focus();
      resultado.select();
      avisar(
        estadoResultado,
        'erro',
        'O navegador bloqueou a cópia. O resultado foi selecionado: copie manualmente com Ctrl+C (ou Cmd+C no Mac). No celular, toque no texto, segure e escolha “Copiar”.'
      );
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(texto).then(sucesso, falha);
    } else {
      falha();
    }
  }

  entrada.addEventListener('input', aoMudarEntrada);
  botaoValidar.addEventListener('click', validar);
  botaoFormatar.addEventListener('click', formatar);
  botaoExemplo.addEventListener('click', carregarExemplo);
  botaoLimpar.addEventListener('click', limpar);
  botaoCopiar.addEventListener('click', copiar);

  // Alguns navegadores restauram o texto do campo ao recarregar a página.
  definirResultado('');
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarInterface);
  } else {
    iniciarInterface();
  }
}
