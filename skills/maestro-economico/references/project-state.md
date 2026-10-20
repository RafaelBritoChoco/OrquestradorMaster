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

## Fluxograma e segurança

Posicione blocos com row/col em ordem de fluxo; ramificações em colunas. O helper traça percursos ortogonais pelos intervalos livres entre linhas e colunas, com saída inferior e terminação no topo correto de cada bloco. Assim, retornos e relações entre vizinhos não atravessam blocos intermediários. Rótulos reservam espaço livre nesses intervalos; corredores exteriores adicionais são usados se necessário. O texto visível pode quebrar em até três linhas e terminar em reticências; o rótulo completo permanece no tooltip e nos detalhes da relação. Rotas de uma mesma origem podem compartilhar trechos antes da ramificação. Use fluxos/camadas para mapas grandes e inspecione visualmente setas/rótulos após mudar layout. Filtros mostram apenas conexões cujas duas pontas estão visíveis; a seleção mantém relações globais nos detalhes. O contêiner tem rolagem para preservar leitura em 320px; não comprime texto/setas até ficarem ilegíveis. Clique/Enter/Espaço selecionam componente. Status também é textual. Campos são texto, nunca HTML executável; não incluir segredos, dados pessoais/conversas reais. Nenhuma URL é buscada automaticamente e não existe CDN.
