# Conceitos e evidências do vídeo

Referência: [vídeo de Maestros da IA](https://www.youtube.com/watch?v=lK1iqKYEmp8), publicado em 2026-06-27, duração 24:42. Consulta e comparação dos repositórios em 2026-10-20. A análise automática cobriu 32 cenas; os pontos abaixo são síntese, não transcrição literal.

| Momento | Tema observado | Aplicação neste pacote |
| --- | --- | --- |
| 03:42 | Draw.io | Arquitetura compreensível, com ligações evidenciadas |
| 08:52 | Ponytail | Menor alteração que complete os requisitos |
| 10:47 | improve | Auditoria sustentada por leitura e evidências |
| 12:55 | Separar execução e revisão | Papéis distintos quando disponíveis e autorizados |
| 18:29 | SkillSpector | Inspecionar skills antes de confiar nelas |
| 20:58 | Falsos positivos | Confirmar achados antes de recomendar correções |

O editor jgraph/drawio foi confirmado. jgraph/drawio-mcp é integração oficial relacionada; Agents365-ai/drawio-skill é alternativa comunitária relacionada. Nenhuma delas foi confirmada como a skill exata demonstrada. Consulte o [índice de fontes](../sources/README.md) e seus commits datados para separar o conteúdo do vídeo do estado posterior dos projetos.

Ponytail inspira escopo focado, não omissão de segurança, acessibilidade ou correção. As modalidades review/audit upstream produzem relatórios; isso não impede o orquestrador de implementar uma mudança autorizada usando o papel executor. improve inspira evidências verificadas e um plano; o execute atual usa executor isolado, uma característica do upstream atual, não uma certeza sobre a versão do vídeo.

SkillSpector é scanner CLI. A análise estática sem LLM não executa a skill analisada; consultas OSV enviam nomes/versões, e uso opcional de LLM pode transmitir conteúdo ao provedor. Scanner não é sandbox nem garantia de segurança. Antes de usar, leia a [documentação NVIDIA](https://docs.nvidia.com/skills/scanning-agent-skills/) e considere os dados autorizados a sair do projeto. Este pacote não instala nem chama o scanner.

## Adaptação própria

O núcleo transforma essas inspirações em um procedimento que também atende pesquisa, documentos, design e organização. Descoberta de capacidades, modo texto/anexos, critérios por domínio e separação entre pasta da skill e projeto atendido são decisões próprias desta versão, não regras atribuídas ao vídeo. Não há dependência de pacotes externos nem garantia de compatibilidade universal testada.
