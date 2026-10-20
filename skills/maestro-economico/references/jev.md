# Jev onde uma decisão estruturada substitui trabalho mais caro

Use a skill oficial `typesafe-ai` e consulte seus documentos vivos antes de integrar.

Jev não programa nem conversa. Responde Choice (alternativa), Noul (probabilidade de sim) ou Score (posição numa rubrica). Não configure `model="jev-latest"` como modelo principal de um agente Codex.

## Rota útil

Código/busca primeiro → Jev opcional para várias decisões semânticas delimitadas → LLM somente para geração, ambiguidade ou julgamento complexo → verificação objetiva e integração.

Exemplos: selecionar candidatos de evidência, classificar itens de uma fila e verificar campos contra uma fonte. Evite chamar Jev para cada prompt simples, cada arquivo ou conta aritmética. Não use confiança como autorização, corretude comprovada ou probabilidade de acerto do projeto inteiro.

Perguntas independentes sobre o mesmo estado cabem numa chamada; uma pergunta não vê a resposta da outra. Quando a etapa seguinte depende do resultado anterior, monte novo estado. Batching reduz repetição do estado, mas perguntas extras ainda são cobradas.

## Helper opcional

Requer Node.js 22+ para o helper Jev opcional. Da pasta da skill:

```text
node scripts/jev-evaluate.mjs examples/jev-batch.json
node scripts/jev-evaluate.mjs examples/jev-batch.json --live --cache-dir <diretorio-do-projeto> --ledger <arquivo-jsonl>
```

Sem `--live`, valida e mostra o tamanho da requisição, sem rede. Com `--live`, precisa de `TYPESAFE_API_KEY` no processo e faz no máximo uma chamada. Não passa a chave em argumentos, logs ou arquivos. Configure o ambiente seguro; processos Windows já abertos podem precisar de nova sessão para herdar uma variável de usuário criada depois.

O helper fixa `jev-1.13.0`, limita entradas e valida respostas. Cache é opt-in, por conteúdo completo, modelo e contrato; guarda respostas, não o texto de entrada. Essas respostas ainda podem conter informação sensível: use diretório privado do projeto. Nunca reutilize um cache de um modelo/contrato diferente. Uma resposta de cache não representa novo gasto de tokens. Este cache Jev é distinto do cache de prefixo do LLM; preserve prefixos estáveis somente enquanto o contexto for válido. Erros após envio podem ter custo desconhecido; não há retry ou troca de provedor automática.

Desde o pacote 2.0.1, a identidade usa o JSON exato enviado, preservando a ordem das alternativas e de outros campos. A TypeSafe documenta sensibilidade à ordem em Choice. O contrato de cache mudou para `maestro-jev-evaluation-v2`; arquivos antigos permanecem no disco, mas não são reutilizados. Uma próxima execução com `--live` pode precisar de nova chamada. Não use cache para fingir uma repetição independente do mesmo experimento.

Choice deve incluir alternativa inconclusiva quando necessário. Noul próximo de 0,5 é incerteza entre sim/não, não intensidade média. Score usa níveis ordenados. Limiar de confiança exige avaliação no domínio; não imponha um limiar universal ao projeto. O helper retorna julgamentos e não executa comandos, alterações ou aprovações sugeridas.

Em máquinas com proxy, preserve proxy e CA. Node 24 pode usar suporte nativo de proxy; não desative TLS. Em ambiente incompatível, falhe explicitamente e use o SDK/transporte apropriado.

## Medir antes de afirmar economia

Preço publicado em 12/10/2026 para `jev-1.13.0`: US$0,042 por milhão de tokens de entrada; saída gratuita. A estimativa calculada de `usage.input_tokens` é informativa, não fatura nem teto garantido. Revalide preços ao atualizar o modelo.

Compare custo total por entrega aprovada com qualidade equivalente: chamadas Jev + chamadas LLM de todos os agentes + retries/falhas + revisão e retrabalho. Métrica ausente é desconhecida, não zero; com zero aprovações, a razão é indefinida. O protocolo opcional e os limites de um gateway externo estão em `measurement.md`.

Fontes: [Jev e agentes de código](https://docs.typesafe.ai/introduction/coding-agents), [API](https://docs.typesafe.ai/api), [modelos/preços](https://docs.typesafe.ai/models), [confiança](https://docs.typesafe.ai/confidence), [perguntas paralelas](https://docs.typesafe.ai/cookbooks/parallel_questions).

## Usos prioritários e o que ainda falta implementar

Revisão das fontes em 12/10/2026. O helper fornece transporte, validação, cache e consumo por chamada. A escolha do uso, a reunião de fontes, a política de escalada e a medição de qualidade ainda dependem do orquestrador; não existe uma integração automática que aplique estas receitas em todas as etapas do Codex.

1. **Selecionar evidências antes de carregar contexto caro.** Busca determinística gera candidatos com ID, origem/linha, versão e trecho. Jev pode avaliar relevância, suporte e contradição; código preserva as referências e encaminha os trechos úteis. Para várias evidências simultaneamente válidas, use perguntas independentes, sem forçar uma única opção Choice. Preserve contradições e lacunas; um ranking não recupera um candidato que a busca omitiu. Se o principal já leu tudo para preparar o pedido Jev, contabilize esse trabalho duplicado. Fonte: [classificação de passagens](https://docs.typesafe.ai/cookbooks/classifying_rag_passages).
2. **Verificar afirmações contra a fonte.** Primeiro conferir em código se o trecho citado existe; depois avaliar suporte, contradição ou ausência de evidência. Uma paráfrase que não corresponde literalmente não prova fabricação. Isso pode complementar a revisão de documentação e relatórios; testes e revisão de código continuam necessários. Fonte: [verificação de citações](https://docs.typesafe.ai/cookbooks/citation_check).
3. **Sugerir skills em catálogos grandes e ambíguos.** Classificar candidatos e inspecionar os melhores com descrição completa, permitindo nenhum resultado. A receita oficial usa duas chamadas e mantém o catálogo inteiro no agente: não elimina automaticamente os tokens desse catálogo. Não substitua uma skill explicitamente solicitada. O ganho publicado foi em Hermes/Haiku, não no Codex. Fonte: [sugestão de skill](https://docs.typesafe.ai/cookbooks/skill_suggestion).
4. **Selecionar memória do projeto.** Usar fatos atribuídos à fonte, escopo, versão e status de verificação; recuperar apenas o necessário. Jev pode ajudar a avaliar relevância ou conflito. Seu julgamento não vira fato confirmado nem preferência global por si só. A receita de memória é uma demonstração que acumula registros sem limite e pode reforçar uma resposta errada. Fonte: [memória simples](https://docs.typesafe.ai/cookbooks/basic_memory).
5. **Roteamento dinâmico de modelo.** Existe `ModelRouterMiddleware` no LangChain, marcado experimental. Ele escolhe a partir da última mensagem humana para a execução; não é um plugin automático do Codex nem avalia sozinho o estado completo do projeto. Nesta skill, o roteamento ocorre por conversas visíveis e escolha dinâmica; só adicionar um roteador semântico se a avaliação demonstrar ganho sobre essa política. Fonte: [integração LangChain](https://docs.langchain.com/oss/python/integrations/providers/typesafe).

## Avaliar sem confundir demonstração com melhoria

Mantenha regras determinísticas, política e julgamentos separados. Calibre limiares em exemplos rotulados do domínio e confira em conjunto reservado, incluindo português, evidência ausente, mudanças de estado, alternativas reordenadas e conteúdo adversarial. Recalcular a política sobre julgamentos guardados não exige repetir a inferência quando o estado e as perguntas forem os mesmos.

Compare leitura direta, busca sem Jev e busca com Jev em tarefas equivalentes. Registre decisões corretas/incorretas, evidências omitidas, tempo, consumo Jev, esforço do LLM, escaladas e retrabalho por entrega aceita. Não use redução de contexto como único critério de sucesso. Observação paralela é uma fase de avaliação que acrescenta custo, não economia imediata.

A [lista oficial de limitações](https://docs.typesafe.ai/model-jaggedness/jev-1.13) registra problemas com aritmética, datas, indirection, alternativas reordenadas, conteúdo adversarial e estado irrelevante. Inglês é o idioma com melhor desempenho declarado; português exige avaliação própria. Contexto relevante adicional pode ajudar: limite o ruído, não retire evidência necessária por um teto arbitrário. Não use o modelo como único aprovador da correção de código ou como barreira de segurança.
