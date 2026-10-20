# OrquestradorMaster

Uma skill em português para compreender, auditar, planejar e melhorar projetos de software, pesquisa, documentos, design ou organização. Versão 0.2.0. O núcleo em Markdown é independente de LLM/runtime; sua execução se adapta às capacidades reais do ambiente. Isso não significa compatibilidade universal testada.

## Usar agora em qualquer conversa

Copie ou anexe [SKILL.md](skills/orquestrador-master/SKILL.md), forneça os materiais relevantes e use este prompt:

> Siga o OrquestradorMaster anexado para [objetivo]. O projeto/material é [descrição ou anexos]. O resultado esperado é [entrega] e os critérios são [critérios]. Os limites são [restrições]. Descubra as capacidades disponíveis, faça o trabalho autorizado e informe evidências e lacunas.

O núcleo é autossuficiente. Para aprofundar, copie/anexe também as referências da mesma pasta. Sem ferramentas, o LLM pode analisar texto/anexos e devolver conteúdo ou um plano, mas não deve afirmar que modificou arquivos ou executou verificações. Resultados reais dependem dos materiais, ferramentas e qualidade do modelo utilizado.

## Cópia opcional para um destino local

Python 3.10+ é necessário somente para utilitários, não para ler a skill. O destino deve existir. O layout padrão é neutro: `DESTINO/orquestrador-master`.

```text
python3 scripts/install_skill.py --destination /caminho/destino --dry-run
python3 scripts/install_skill.py --destination /caminho/destino
```

No Windows, substitua `python3` por `py -3.11 -X utf8`. Conteúdo idêntico não é reescrito; destino diferente, sobreposição com a origem, links simbólicos e pontos de redirecionamento são recusados. Não altera configurações globais. Codex é um [adaptador opcional](docs/codex.md), com layout explícito `--layout codex`.

## Método e separação

As quatro inspirações são mapa compreensível (Draw.io), menor mudança completa (Ponytail), auditoria e plano com evidências (improve) e inspeção crítica de instruções (SkillSpector). Esses projetos não são dependências e não são instalados ou executados por este pacote. Leia [conceitos e atribuições](docs/conceitos.md), [fontes datadas](sources/README.md) e [notices](THIRD_PARTY_NOTICES.md).

Este repositório distribui somente a skill, suas referências, fontes e utilitários. Produtos de aplicação pertencem exclusivamente ao projeto atendido ou à resposta/anexo. Aplicar e testar a skill em outro projeto é uma atividade separada; não se adicionam aqui código, diagnóstico, links, dependências ou logs desse projeto.

## Verificar e manter

```text
python3 -m unittest discover -s tests -v
python3 scripts/validate.py
```

Os testes usam fixtures sintéticas. O validador local exige o pacote completo e suas fontes, sem bypass de staging; não comprova eficácia em todos os domínios. `python3 scripts/check_sources.py` é uma consulta opcional de rede que requer Git e compara os pins registrados, sem alterá-los. Veja [atualização](docs/atualizacao.md), [workflow](docs/workflow.md) e [licença MIT](LICENSE).
