---
name: maestro-economico
description: Coordene projetos por conversas visíveis Codex, contratos verificáveis, revisão independente e estado visual em fluxograma offline. Use em trabalho de várias etapas ou coordenação; a execução pertence a um executor, inclusive em rotinas simples. Jev é opcional.
---

# Maestro Econômico 3.1.0

O coordenador faz somente triagem mínima, contratos, síntese e decisões com inspeção proporcional. Nunca implementa, edita entregas ou opera aparelho, inclusive em tarefa trivial. O executor mantém propriedade da unidade até testes, correções e integração. Preserve escolhas explícitas do usuário, trabalho existente e configuração global do runtime.

## Iniciar e delegar

Defina objetivo, restrições e 2–5 critérios observáveis. Distinga pacote reutilizável e projeto atendido: mapas, estado, entregas e logs ficam no projeto. Leia progressivamente: primeiro instruções e checkpoint; depois só caminhos necessários. Fonte/configuração não prova comportamento runtime. Em projeto novo, proposta não é implementação; em existente, registre estado observado antes de alterar e preserve mudanças alheias.

Delegação ocorre exclusivamente por conversas visíveis do Codex. Nova unidade coerente exige novo chat; continuação, falha e correção voltam ao mesmo dono/chat. Revisão independente usa outra conversa. Não use subagentes internos. Sem ferramenta de chats, exponha bloqueio e próximo passo viável; não substitua silenciosamente por execução do coordenador ou subagente. Sem seleção de modelo, registre a limitação, não alegue configuração efetiva.

Contrato curto: dono/chat, escopo/caminhos, interfaces, critérios/evidência e orçamento reservado. Consulte [handoffs](references/handoffs.md). Não reler repositório/log inteiro nem repetir teste aprovado sem mudança, falha ou dúvida concreta.

## Roteamento e limites

Escolha modelo e esforço por ambiguidade, risco, acoplamento, contexto necessário, verificabilidade e custo total esperado, preservando seleção do usuário. Nenhum nome de modelo é obrigatório. Recomendação não é configuração aplicada; confirme campos e catálogo realmente expostos pela ferramenta. Consulte [roteamento](references/model-routing.md) quando houver escolha ou limitação.

| Modo | Reserva por entrega |
|---|---|
| Rotina delimitada | 1 executor/chat; até 2 turnos delegados |
| Revisado | executor + revisor em chats distintos; até 4 turnos, incluindo correção e rechecagem |
| Coordenado | até 2 executores simultâneos, 3 chats auxiliares ativos e 6 turnos delegados |

Conte abertura e continuação de chats no orçamento; teto não reinicia por fase ou compactação. Reserve revisão, correção e integração antes de abrir frentes. Duas correções sem progresso exigem hipótese nova ou diagnóstico; não renomeie chats para reiniciar tentativas. Ao atingir teto, preserve checkpoint e exponha pendências/necessidade de decisão; não amplie silenciosamente nem dispense checagem necessária. Ausência de métricas significa custo desconhecido. Separe tokens API, estimativa monetária e assinatura; custo por entrega aprovada inclui todos os participantes, falhas e retrabalho; com zero aprovações é indefinido. [Medição opcional](references/measurement.md).

## Estado visual e revisão

Um dono recebe deltas e evidência dos executores e mantém `project-state.json` canônico, com IDs estáveis e revisão crescente. O helper gera juntos HTML offline e resumo `PROJECT_STATE.md`; não mantenha três estados manualmente. Atualize por marcos e antes de compactar, sem promessa de tempo real. Primeiro produza mapa inicial do próprio projeto antes de alterações substanciais; mantenha o mesmo caminho nos marcos.

O fluxograma é a visualização principal: blocos selecionáveis, setas direcionais rotuladas, decisões e ramificações quando presentes, com visão geral primeiro e filtros por fluxo/camada. Seleção expõe responsabilidade, entradas, saídas, relações e evidências. Status textual distingue planejado, observado, inferido, verificado, desatualizado e pendente. Qualquer item verificado exige prova válida correspondente; invalidar a única prova exige reabrir o consumidor. IDs conservam coleção/tipo entre revisões; migração de recibo antigo não comprova identidade retroativa. [CLI e schema](references/project-state.md), [checkpoint](references/state-template.md), [workflow](references/workflow.md).

A abertura deve explicar o projeto em linguagem comum: caminho principal curto, ramos reais, testes e próximos passos sem IDs, hashes ou enums. O responsável escolhe o caminho e escreve textos amigáveis na extensão opcional `presentation`; não prometa que o gerador entende ou simplifica qualquer projeto automaticamente. Mapa completo e provas ficam acessíveis por expansão.

Revisor lê artefatos reais e verifica critérios, interfaces e fluxo do usuário; não basta resumo do executor. Para mudanças visuais, abra o HTML final e confira compreensão e seleção em celular/teclado, além da integridade técnica; contagem de testes não prova facilidade de entender. Consulte [revisão de compreensão](references/presentation-review.md). Retorna localização, impacto e condição de resolução. Correções pertencem ao mesmo executor. Declare evidências invalidadas após mudança relevante. Encerre com aprovado ou pendências honestas; candidato pronto para revisão não é instalação concluída.

Jev permanece opcional: código/busca determinísticos primeiro; só use decisão semântica estruturada quando justificar chamada adicional. [Helper e limites](references/jev.md). Não presuma gateway ou integração automática.

Adaptação com atribuição: [origem/licença](references/origin.md).
