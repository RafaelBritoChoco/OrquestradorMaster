# Estado canônico e gerador offline

Requer Node.js 18+ e nenhuma dependência externa. Execute na pasta da skill (ou use caminho absoluto do script):

```text
node scripts/project-state.mjs validate <projeto>/project-state.json
node scripts/project-state.mjs render <projeto>/project-state.json <projeto>/outputs --html-name project-map.html
```

Copie `examples/new-project.json` ou `examples/existing-project.json` para o projeto e adapte. Não grave estado de aplicação no pacote da skill. O dono do estado recebe deltas/evidência, edita JSON, incrementa `revision` e executa render por marco. HTML é fluxograma principal standalone/offline; resumo e HTML mostram revisão/hash idênticos. `.project-state-receipt.json` é índice derivado de continuidade, não outra fonte manual. Preserve-o junto às saídas para validar IDs e histórico entre atualizações. Sem ele, continuidade com geração anterior não pode ser comprovada.

## Schema versão 1

Objeto raiz: `schemaVersion:1`, `revision` inteiro positivo; `projectId`, `title`, `objective`, `stateOwner`, `nextStep` textos. Coleções obrigatórias (podem ser vazias): `components`, `connections`, `tasks`, `chats`, `decisions`, `issues`, `evidence`, `criteria`, `changes`. Limite de 300 itens por coleção; textos não vazios até 4000 caracteres. Use mapas pequenos e filtros por fluxo/camada, não um painel gigante.

Todo item: `id` global único, estável, regex `^[a-z][a-z0-9-]{0,63}$`; `title`; `status`; `evidenceIds` lista de IDs existentes. Estados: `planejado`, `observado`, `inferido`, `verificado`, `desatualizado`, `pendente`. Qualquer consumidor `verificado` (componente, tarefa, critério, conexão, decisão etc.) exige ao menos uma prova referenciada com status `verificado` e `supports` incluindo o ID desse consumidor. O próprio registro de prova é a exceção. Prova desatualizada, observada ou sem suporte correspondente não basta; pode coexistir com outra prova válida. O helper rejeita o estado sem modificar saídas: reabra o consumidor como pendente ou forneça nova prova válida. Não corrige o estado silenciosamente. A verificação estrutural não julga se o conteúdo da prova realmente sustenta a afirmação: executor/revisor conferem correspondência e versão.

| Coleção | Campos adicionais obrigatórios |
|---|---|
| components | responsibility, inputs/outputs (listas de textos), flow, layer; kind: process/decision/start/end; row/col inteiros 0–30, célula única |
| connections | from/to IDs de componentes distintos; label textual rastreável; decisions usam conexões com rótulos sim/não ou alternativas reais |
| tasks | owner; chatId (ID em chats ou null quando ainda não aberto); componentIds; blockedBy (IDs em issues) |
| chats | owner, recommendedModel, recommendedEffort, effectiveModel, effectiveEffort; desconhecido quando não confirmado; não guardar mensagens reais |
| evidence | source (caminho/comando/localizador), result, kind: source/runtime/review, revision da fonte inteira até revisão atual; supports lista dos IDs que a prova sustenta |
| decisions/issues/changes | detail; mudanças históricas são imutáveis e acrescidas em revisões posteriores |
| criteria | evidência correspondente via evidenceIds; pendente até validação real |

IDs não podem desaparecer nem migrar de coleção em atualização no mesmo destino; uma decisão não se torna um problema reutilizando seu ID. Mantenha a entidade antiga como desatualizada e dê ID novo à nova entidade. Alterar conteúdo exige revisão crescente; render idêntico da mesma revisão é permitido. Não reutilize ID para outra entidade. Registre alterações em `changes`. A validação ocorre antes de escrita: erro de estado não sobrescreve últimas saídas válidas. Escrita usa temporários e restaura os anteriores em erro recuperável; não há garantia de transação conjunta contra queda abrupta de energia/processo. Hash/revisão permitem detectar divergência; render novamente recupera a dupla a partir da fonte. Um dono serializa atualizações; não executar render concorrente no mesmo destino.

### Continuidade e migração de recibo

O estado continua em schema 1. O recibo derivado tem `receiptVersion:2`, `entityTypes` (ID→coleção), revisão/hash, IDs, histórico e `identityBaselineRevision`. Novas gerações verificam a associação desde esse baseline. Propriedades descritivas da mesma entidade podem mudar; a coleção não pode mudar.

Um recibo antigo com apenas IDs planos não comprova o tipo anterior. Para migrá-lo, execute `render` primeiro com o JSON original exato da revisão/hash registrados no recibo e o mesmo destino/nome HTML. O helper emite aviso e grava baseline v2 nessa revisão, com `identityHistoryBeforeBaseline:unverified`; só depois aplique a revisão seguinte. Uma revisão nova diretamente sobre recibo antigo é recusada sem perda de saídas. Não há garantia retroativa: se o JSON original faltar ou já for inválido, preserve saídas/recibo antigos e exponha o limite. Um destino novo inicia outro baseline, cuja quebra de continuidade deve ser registrada explicitamente; não finja migração comprovada. Não edite manualmente o recibo para contornar a checagem.

## Apresentação em linguagem comum (opcional desde 3.1)

A fonte continua sendo o mesmo JSON de schema 1. `presentation` é somente uma camada de textos e escolha de percurso; não copia status nem evidências. Use `presentation.schemaVersion:1` para ativá-la. Metadados antigos sem esse discriminador, inclusive `presentation.version`, permanecem intactos e recebem o fallback; não são reinterpretados.

Campos: `title` (até 100 caracteres), `intro` e `nextStep` (até 400), `mainPath` (IDs de componentes na ordem de uso), `branches` (lista de `{after, componentIds}`), `componentText` (objeto ID→`{title,description,input?,output?}`), `itemText` opcional (objeto ID de tarefa/problema/critério→`{title,description}`). Títulos de itens/etapas até 90; explicações e entrada/saída até 220. Há exemplo completo nos dois templates sintéticos.

Cada componente visível precisa de título e explicação escritos para quem usa o projeto. IDs não podem repetir entre principal/ramos. Pares consecutivos do principal e de cada ramo precisam de conexão dirigida real; a primeira etapa do ramo deve ter conexão real saindo de `after`, que pertence ao principal. As setas usam as conexões e rótulos canônicos entre as etapas visíveis, inclusive retornos. O planejamento separa corredores, portas e margens de retornos independentes, incluindo os aninhados. Ele é validado antes de escrever: se o resumo vertical não puder separar percursos ou ficar estreito demais no celular, a geração é recusada com orientação para escolher um caminho menor e preservar o restante no mapa completo. As últimas saídas válidas permanecem intactas; não há substituição silenciosa por um desenho ambíguo. Nomeie ramos com precisão (Sim/Não somente se realmente responderem à pergunta). Não existe sequência ou quantidade obrigatória de seis etapas: escolha um percurso pequeno apropriado ao domínio, incluindo suas alternativas necessárias. Outros componentes ficam disponíveis no mapa completo.

`componentText` e `itemText` não alteram o estado da fonte. O gerador não julga se o texto é claro nem se promete mais que a prova: autor e revisor precisam conferir o significado. Escreva `nextStep` em linguagem comum, coerente com as tarefas reais. Não inclua caminhos internos/IDs/jargão no texto de abertura.

Sem essa extensão, nenhum dado antigo é perdido. O HTML avisa explicitamente que falta preparar a apresentação e mostra apenas um trecho sem bifurcação (até cinco partes, escolhido mecanicamente pela ordem do arquivo), com nomes genéricos. Isso não é escolha semântica de caminho principal nem promessa de boa linguagem automática. O mapa técnico completo mantém todos os componentes, conexões, filtros, status, IDs e registros.

O que foi apenas encontrado aparece como “Encontrado no projeto; ainda precisa de teste”. Um item `verificado` com prova de fonte/revisão não vira teste de uso: “O que já foi testado” exige tarefa verificada e prova `runtime` válida correspondente. Provas têm alcance limitado; nenhum selo significa “funciona em todos os casos”. Critérios, tarefas e problemas que não estão verificados entram em “O que falta verificar”, inclusive quando a tarefa correspondente já foi concluída ou a conferência ficou desatualizada. Usa-se itemText quando fornecido; seleção mantém acesso ao status e às provas originais. Os demais itens ficam por expansão; uma leitura concluída não apaga um critério pendente.

## Interação, mapa completo e segurança

A abertura usa fluxo vertical com ramos/retornos direcionais; no celular não exige percorrer um mural lateral. Seleção por toque, clique ou Enter/Espaço abre uma explicação dentro da janela, foca o título e oferece “Voltar à etapa”. Voltar/Escape restaura foco e visibilidade da origem; a abertura não move foco nem rola a página. Conteúdo longo pode rolar dentro da explicação. O mapa completo e os registros ficam fechados por padrão e não abrem por selecionar etapa.

A pasta inteira precisa ser copiada: o helper usa `scripts/project-presentation.mjs` e `assets/project-map.html`, todos locais. O HTML final é standalone/offline sem rede/CDN. Textos entram escapados ou por textContent; nunca HTML executável. Não incluir segredos/conversas reais. No mapa técnico, row/col continuam posicionando blocos; retornos usam intervalos livres e rótulos reservam espaço, com tooltip para texto completo. IDs/hash/enums ficam somente nas partes opcionais. Filtros mostram conexões com ambas as pontas visíveis; detalhes da seleção mantêm as relações globais.

A revisão precisa abrir exemplos renderizados, avaliar se uma pessoa consegue explicar o uso e exercitar celular/teclado. Veja [revisão de compreensão](presentation-review.md); passar validação/contar testes não substitui essa etapa.
