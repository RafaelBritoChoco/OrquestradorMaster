# Verificação do pacote — 2026-10-20

Esta nota registra somente verificações da distribuição 0.2.0 e de seus utilitários, realizadas em Linux (Python 3.12) e Windows (Python 3.11). Não comprova compatibilidade com todas as LLMs.

| Verificação | Resultado observado |
| --- | --- |
| Suíte em Linux: `python3 -m unittest discover -s tests -v` | 21 testes: 20 aprovados; junction real Windows ignorado por exigir Windows |
| Suíte em Windows: `py -3.11 -B -X utf8 -m unittest discover -s tests -v` | 21 testes aprovados, incluindo junction real Windows |
| `scripts/validate.py` em ambos os ambientes | 0 erros estruturais: arquivos obrigatórios, links Markdown, seis IDs únicos e campos essenciais do registry, hashes das seis licenças |
| Validador original da skill-creator no Windows | `Skill is valid!` |
| Instalador com materiais sintéticos | Layout portable padrão, Codex explícito, dry-run, idempotência sem reescrita, divergências preservadas, redirecionamentos e sobreposição origem/destino recusados |
| Entradas inválidas do validador | Ausências, link quebrado, registro malformado, fonte removida/duplicada, campo essencial ausente e hash divergente detectados |
| Revisão independente | Conteúdo e interfaces inspecionados; dois achados sobre sobreposição e registro incompleto corrigidos e rechecados |

A consulta de fontes remotas não foi repetida nesta revisão: registry, metadados e bytes das licenças da coleta datada foram preservados e os hashes conferidos localmente. Nenhum código upstream foi executado.

O núcleo foi inspecionado para uso com texto/anexos e para adaptar etapas a recursos disponíveis. Isso é verificação das instruções e da estrutura; não é um teste de execução em todos os modelos, aplicativos ou domínios. Resultados de aplicação pertencem ao projeto atendido ou à resposta/anexo e não integram esta distribuição.
