# Fontes e rastreabilidade

Coleta: **2026-10-20**, com horário UTC exato em [registry.json](registry.json). Os commits fixam a revisão consultada; não garantem compatibilidade com qualquer LLM, runtime ou cliente.

## Vídeo de origem

[O Arsenal de Guerra Para Criar APPs com IA (4 Pérolas Github)](https://www.youtube.com/watch?v=lK1iqKYEmp8&t=330s), canal **Maestros da IA**, publicado em **2026-06-27**, duração **24:42**. A pesquisa reuniu metadados, análise automática de 32 cenas e conferência dos projetos. Não foi obtida uma transcrição literal revisada pelo autor.

| Ponto aproximado | Conteúdo |
|---|---|
| [03:42](https://www.youtube.com/watch?v=lK1iqKYEmp8&t=222s) | Diagramas e arquitetura com draw.io |
| [08:52](https://www.youtube.com/watch?v=lK1iqKYEmp8&t=532s) | Ponytail e alterações enxutas |
| [10:47](https://www.youtube.com/watch?v=lK1iqKYEmp8&t=647s) | improve e planos de melhoria |
| [12:55](https://www.youtube.com/watch?v=lK1iqKYEmp8&t=775s) | Separação entre criação e revisão |
| [18:29](https://www.youtube.com/watch?v=lK1iqKYEmp8&t=1109s) | SkillSpector e análise de skills |
| [20:58](https://www.youtube.com/watch?v=lK1iqKYEmp8&t=1258s) | Interpretação dos alertas |

As instruções consultadas em outubro podem conter funcionalidades posteriores à gravação. O OrquestradorMaster é uma síntese própria para manutenção de projetos; não é um produto oficial dessas organizações.

## Repositórios registrados

| Projeto | Papel | Relação com o vídeo | Licença verificada |
|---|---|---|---|
| [jgraph/drawio](https://github.com/jgraph/drawio) | Editor de diagramas | Editor confirmado | [Apache-2.0](licenses/drawio.txt) |
| [jgraph/drawio-mcp](https://github.com/jgraph/drawio-mcp) | Integração oficial relacionada | Integração exata não confirmada | [Apache-2.0](licenses/drawio-mcp.txt) |
| [Agents365-ai/drawio-skill](https://github.com/Agents365-ai/drawio-skill) | Skill comunitária relacionada | Integração exata não confirmada | [MIT](licenses/drawio-skill-community.txt) |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | Menor alteração completa | Projeto identificado | [MIT](licenses/ponytail.txt) |
| [shadcn/improve](https://github.com/shadcn/improve) | Auditoria e planos executáveis | Projeto identificado | [MIT](licenses/improve.txt) |
| [NVIDIA/SkillSpector](https://github.com/NVIDIA/SkillSpector) | Inspeção de skills | Projeto identificado | [Apache-2.0](licenses/skillspector.txt) |

**[Não confirmado]** O repositório específico da skill de draw.io demonstrada no vídeo. As duas integrações relacionadas não devem ser apresentadas como essa identificação.

Cada entrada do registro inclui branch, commit completo, documentos relevantes, URL da licença na revisão fixada, arquivo da licença e seu SHA-256. As licenças foram copiadas para permitir conferência; os códigos dos projetos upstream não foram incorporados nem instalados por essa coleta. Nomes e marcas continuam pertencendo aos respectivos titulares.

## Documentação de integração

- [Skills no Codex](https://learn.chatgpt.com/docs/build-skills).
- [Plugins no Codex](https://learn.chatgpt.com/docs/plugins).
- [Comandos de desenvolvimento](https://learn.chatgpt.com/docs/developer-commands).
- [draw.io MCP](https://www.drawio.com/mcp/).
- [NVIDIA: inspeção de agent skills](https://docs.nvidia.com/skills/scanning-agent-skills/).

## Atualização

Use o verificador do projeto para comparar os commits consultados com as revisões atuais. Revise os documentos alterados, a licença e o comportamento antes de aceitar um novo pin. Registre a decisão e os testes no CHANGELOG. O registro histórico deve permitir distinguir conteúdo observado, proposta do OrquestradorMaster e comportamento efetivamente testado.
