# json-formatter-web

A lightweight JSON formatter and validator.

Ferramenta gratuita, em português do Brasil, para estudantes e desenvolvedores colarem um JSON, verificarem se ele é válido, organizarem a formatação e copiarem o resultado. Tudo acontece no navegador.

## Funcionalidades

- **Validar**: informa se o texto é um JSON válido. Quando não é, explica o problema em português e indica linha e coluna quando consegue localizar o erro.
- **Formatar**: gera uma versão legível, com recuo de 2 espaços.
- **Copiar resultado**: copia o JSON formatado e confirma. Se o navegador bloquear a cópia, o texto é selecionado e a página orienta a copiar manualmente.
- **Carregar exemplo**: preenche o campo com um JSON de dados fictícios.
- **Limpar**: esvazia a entrada e o resultado.

Comportamentos importantes:

- Aceita qualquer valor JSON: objetos, listas, strings, números, `true`, `false` e `null`.
- Rejeita entrada vazia, comentários, vírgulas finais, aspas simples e outras sintaxes fora do JSON padrão (RFC 8259).
- A formatação altera **somente** espaços e quebras de linha fora das strings. Valores, ordem dos campos, sequências de escape e a escrita dos números (inclusive números grandes, como `12345678901234567890`, ou `1.0` e `1E+2`) ficam exatamente como foram digitados.
- Um erro nunca apaga o que foi digitado.
- Ao editar a entrada, o resultado anterior é descartado, para que ninguém copie dados desatualizados.

## Como executar localmente

Não há instalação, dependências nem etapa de compilação.

1. Baixe ou clone o repositório.
2. Abra o arquivo `index.html` no navegador.

Para servir como site estático (opcional), qualquer servidor de arquivos funciona. Por exemplo, com Python instalado:

```
python3 -m http.server 8000
```

Depois, acesse `http://localhost:8000`.

### Publicar no GitHub Pages

No repositório, abra **Settings → Pages**, escolha **Deploy from a branch**, selecione a branch principal e a pasta `/ (root)`. Os quatro arquivos devem ficar na raiz.

## Estrutura

| Arquivo      | Conteúdo                                         |
| ------------ | ------------------------------------------------ |
| `index.html` | Estrutura da página                              |
| `styles.css` | Aparência, modo claro e escuro, layout responsivo |
| `app.js`     | Validação, formatação e comportamento da página  |
| `README.md`  | Este documento                                   |
| `tests/`    | Verificações de validação, formatação e cópia     |

## Privacidade

- Seu JSON é processado apenas no navegador. Ele não é enviado a nenhum servidor ou API.
- Não há cadastro, analytics, rastreadores, cookies, bibliotecas de terceiros, fontes externas ou CDN.
- A aplicação não salva os dados em `localStorage`, `sessionStorage`, cookies ou outro armazenamento persistente. O próprio navegador pode restaurar o conteúdo dos campos ao reabrir ou recarregar uma página; use **Limpar** antes de sair se não quiser deixar o texto no campo.
- A página declara uma Content-Security-Policy que bloqueia conexões de dados e permite scripts e estilos apenas da própria origem, como proteção adicional.
- O conteúdo colado é sempre exibido como texto, nunca interpretado como HTML.

Atenção: o botão **Copiar resultado** coloca o JSON na área de transferência do seu dispositivo, a seu pedido. A partir daí, ele fica sujeito ao que o sistema e outros aplicativos fazem com a área de transferência.

## Como funciona

A validade é decidida pelo `JSON.parse` do próprio navegador. O resultado do `JSON.parse` não é usado para montar a saída: o formatador percorre o texto original e copia strings, números e literais caractere por caractere, trocando apenas os espaços entre eles. Antes de mostrar o resultado, a página confere que entrada e saída são idênticas quando se ignoram os espaços fora das strings.

Quando o JSON é inválido, um analisador próprio localiza o primeiro erro para montar a mensagem em português. Se ele não conseguir localizar o erro, a página diz apenas que o JSON é inválido, sem inventar uma posição.

## Limitações conhecidas

- Chaves repetidas em um objeto (`{"a":1,"a":2}`) são aceitas e preservadas, sem aviso, pois o JSON padrão não as proíbe.
- Apenas o primeiro erro de sintaxe é relatado.
- A coluna do erro é contada em caracteres; uma tabulação conta como um caractere.
- Não há realce de sintaxe, numeração de linhas, modo compacto (minificar), escolha do tamanho do recuo nem abertura de arquivos.
- Arquivos muito grandes (vários megabytes) podem deixar a página lenta por alguns segundos, porque o processamento ocorre na mesma thread da interface. Estruturas com milhares de níveis de aninhamento podem ser recusadas.
- Formatos derivados, como JSON5, JSONC e JSON Lines, não são aceitos.
- A cópia automática depende do navegador. Em alguns contextos ela é bloqueada, e a página orienta a cópia manual.
- As verificações automatizadas do núcleo e da cópia foram executadas com Node.js. A interface foi conferida em um navegador baseado em Chromium, via servidor local HTTP, incluindo uma tela de 320 px. Firefox, Safari e a abertura direta por `file://` não foram verificados nesta revisão.
- Requer um navegador atual (com suporte a ES2015 e à flag `y` de expressões regulares).

## Verificações automatizadas

Com Node.js 22 ou mais recente instalado, execute na raiz do projeto:

```sh
node --test tests/core.test.cjs tests/clipboard.test.cjs
```

Não é necessário instalar dependências. Os testes cobrem exemplos válidos e inválidos, números grandes, caracteres escapados, preservação do texto e respostas atrasadas da área de transferência. Node.js é necessário apenas para esses testes, não para usar a ferramenta.

## Como contribuir

Contribuições são bem-vindas, especialmente correções e melhorias de acessibilidade.

1. Abra uma *issue* descrevendo o problema ou a sugestão. **Não inclua dados reais ou sensíveis** nos exemplos: use dados fictícios.
2. Faça um *fork*, crie uma branch e envie um *pull request* pequeno e focado.
3. Mantenha os princípios do projeto: HTML, CSS e JavaScript puros, sem dependências, sem compilação, sem chamadas de rede e sem armazenamento de dados.
4. Antes de enviar, teste abrindo o `index.html` e confira ao menos: JSON válido e inválido, strings com aspas e barras escapadas, números grandes, edição da entrada após formatar, navegação pelo teclado e uma tela estreita (320 px).

O projeto é intencionalmente pequeno. Funcionalidades que exijam servidor, contas ou serviços externos estão fora do escopo.
