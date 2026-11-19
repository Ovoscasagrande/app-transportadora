# GUIA PARA O ROBÔ — app TRANSPORTADORA

Este repositório é o app **da TRANSPORTADORA CASAGRANDE**, um dos três apps do grupo.
Leia inteiro antes de mexer em qualquer linha.

---

## 1. O que é este app

| | |
|---|---|
| URL | https://ovoscasagrande.github.io/app-transportadora/ |
| Repo | `Ovoscasagrande/app-transportadora` |
| Arquivo | **`index.html` único** (526 KB) com CSS, HTML e JS dentro. Não existe `.js` nem `.css` separado |
| Backend | Supabase `ppiqkrvlvtsnsthnfibg` — **o MESMO banco dos outros 2 apps** |
| Tema | Escuro (`#121212`), cor de destaque **azul `#1E5AA8`** |

## 2. Regra de ouro: este app é só da transportadora

Ele foi gerado a partir de um app único que atendia as 3 empresas. A separação é feita por um
bloco `window.APP` no fim do `<script>`:

```js
window.APP = {
  "empresa": "TRANSPORTADORA",
  "nome": "TRANSPORTADORA CASAGRANDE",
  "telas": [ ...23 telas... ]
}
```

Esse bloco faz:
1. **trava a empresa** (`empAtiva()` sempre devolve `TRANSPORTADORA`)
2. **filtra o menu** para as telas deste app
3. **bloqueia navegação** para tela que não existe aqui
4. **trava o login**: um motorista que trabalha em 2 empresas (perfil `MULTI` no banco) entra aqui
   travado na TRANSPORTADORA — sem criar conta nova

**Não remova nem edite esse bloco.** Ele é a única coisa que separa os apps.

## 3. O que você pode fazer

- Melhorar telas, layout, textos, atalhos, relatórios, filtros
- Criar telas **novas** que só existam aqui (acrescente o nome da tela em `window.APP.telas`)
- Ajustar regras de negócio específicas da transportadora (frete, roteiro, km, custo por viagem)
- Trocar a cor de destaque? **Não.** O azul `#1E5AA8` é a identidade da transportadora.

## 4. O que você NÃO pode fazer

| Proibido | Por quê |
|---|---|
| Renomear ou remover `id="..."` | O JS busca por `getElementById`. Hoje são **390 IDs**. Quebrar um derruba a tela |
| Renomear tabelas/colunas do Supabase | O banco é compartilhado com os outros 2 apps |
| Renomear as RPCs | Mesmo motivo |
| Mexer em `usuarios`, `motoristas`, `veiculos` | **Base compartilhada do grupo** — ver seção 6 |
| Usar `alert()` / `confirm()` / `prompt()` | O dono proíbe. Use `toast()` e o modal `#modal-wrap` |
| Trocar CDNs | Só os existentes (supabase-js, Chart.js, pdf.js, jsPDF, Lucide, Inter, Leaflet) |
| Colocar emoji dentro de `doc.text()` / `toast()` | jsPDF não desenha emoji (vira ■) e toast é texto puro |
| Mexer no `sw.js` sem subir a versão | O cache do celular impede a atualização |

## 5. Regras de produto (não negociáveis)

- Datas **DD-MM-AAAA** (ou DD/MM/AAAA).
- Valores em pt-BR com vírgula decimal. Use `parseBR()`; **nunca** `parseFloat` em campo digitado.
  Atenção: `21.500` = vinte e um mil e quinhentos.
- KM inicial vem de `veiculos.km_atual` e é **readonly**.
- Alvos de toque ≥ 48 px. O app é usado em caminhão, com uma mão.

## 6. O BANCO É COMPARTILHADO — leia com atenção

Os 3 apps usam o **mesmo Supabase**. As tabelas se dividem em dois grupos:

### Grupo A — base do grupo (compartilhada, mesmo registro nos 3 apps)
`usuarios` · `motoristas` · `veiculos` · `motorista_veiculo` · `veiculos_documentos` · `postos`
**O motorista é a mesma pessoa nos 3 apps.** Ele tem uma coluna `empresas` (jsonb) que diz onde ele trabalha.
Se você alterar a estrutura dessas tabelas, **quebra os outros dois apps**.

### Grupo B — dados de operação (têm coluna `empresa`)
`jornadas` · `abastecimentos` · `despesas` · `recebimentos` · `avisos` · `multas` · `ordens_servico` ·
`auditoria` · `tipos_despesa` · `tipos_recebimento`
Cada linha carrega `empresa = 'OVOS' | 'TRANSPORTADORA' | 'DISTRIBUIDORA' | 'AMBAS' | 'TODAS'`.
O app filtra por `empFilter()`, que aceita também `AMBAS` e `TODAS` (veículo/motorista que roda nas duas).

### Tabelas exclusivas dos outros apps (não use aqui)
- **DISTRIBUIDORA:** `clientes_dist`, `rotas`, `entregas`, `notas_fiscais`, `nf_itens`, `pedidos`
- **OVOS:** `clientes_promotoria`, `roteiros_promotoria`, `visitas`
- `pedagios` — leitura para todos, importação só pela gerência

## 7. Se precisar de mudança no banco

Você **não** roda SQL. Descreva a mudança e o **CASA** roda para você, avisando o dono.
Isso protege a base compartilhada.

## 8. Antes de publicar

1. `node validar_integracao.js NOVO.html ORIGINAL.html` → tem de terminar em **APROVADO**
2. Testar em 390 px de largura (celular)
3. Subir a versão do cache no `sw.js` (`cg-tran-v1` → `cg-tran-v2`)
4. Testar logado como **gerência** e como **motorista**

## 9. Perfis que este app atende

`gerencia` · `motorista` · `conferente` · `mecanico` · `pendente`
(Os perfis `promotor` e `vendedor` são de outros apps — se aparecerem aqui, o menu deles fica vazio.)

---

## Dúvida? Pergunte antes de inventar.

Uma linha errada derruba a tela de um motorista em produção. Perguntar custa 2 minutos;
errar custa um dia de operação parada.
