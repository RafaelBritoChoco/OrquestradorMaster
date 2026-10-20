# OrquestradorMaster

Uma skill em português para compreender, auditar, planejar e melhorar materiais de software, pesquisa, documentos, design ou organização.

**Beta pública 0.2.1.** O núcleo é um arquivo Markdown portátil, que você pode colar ou anexar em uma conversa. Não exige plugin instalado, Git, Python ou Codex para esse uso. Os resultados dependem do modelo, dos materiais e das capacidades disponíveis; a portabilidade do texto não significa compatibilidade universal testada.

## Escolher o pacote

| Pacote | Uso | Requisitos |
|---|---|---|
| [OrquestradorMaster 0.2.1](skills/orquestrador-master/SKILL.md) | Método geral autossuficiente; adapta-se ao LLM/runtime disponível | Markdown; Python 3.10+ apenas para os utilitários do repositório |
| [Maestro Econômico 3.1.0](skills/maestro-economico/SKILL.md) | Coordenação por conversas visíveis Codex, executores responsáveis e revisão independente | Ferramenta de conversas visíveis; Node.js 18+ para gerar fluxograma offline/resumo; Node.js 22+ apenas para Jev opcional |

Os pacotes são alternativas independentes. O Maestro não substitui o OrquestradorMaster nem configura o runtime. Para usá-lo, copie **a pasta inteira** `skills/maestro-economico` para um destino de skills compatível, preservando referências, scripts e licenças. O instalador abaixo continua copiando somente `orquestrador-master`; não instala o Maestro implicitamente. Confira destinos e preserve uma cópia recuperável antes de substituir uma instalação existente.

No Maestro, copie um [exemplo sintético](skills/maestro-economico/examples/new-project.json) para `project-state.json` no projeto atendido. Da pasta da skill, use os comandos abaixo com caminhos relativos adequados ao seu projeto:

```text
node scripts/project-state.mjs validate <projeto>/project-state.json
node scripts/project-state.mjs render <projeto>/project-state.json <projeto>/outputs
```

HTML e `PROJECT_STATE.md` derivam da mesma revisão JSON; o fluxograma funciona offline, sem CDN. Na versão 3.1, a abertura usa explicações simples e seleção com retorno; o mapa completo e os registros ficam opcionais. O responsável escreve os textos e escolhe o caminho em `presentation`, sem alterar os status originais. Estado, mapas, logs, caches e dados do projeto ficam fora da pasta da skill. Veja [contrato/CLI](skills/maestro-economico/references/project-state.md), [origem/licença](skills/maestro-economico/references/origin.md) e [Jev opcional](skills/maestro-economico/references/jev.md). Não é necessário serviço externo para o gerador.

## Primeiro uso: texto ou anexo

1. Abra [SKILL.md](skills/orquestrador-master/SKILL.md) e copie o conteúdo para uma conversa, ou baixe e anexe o arquivo. Você também pode obter o pacote na [release v0.2.1](https://github.com/RafaelBritoChoco/OrquestradorMaster/releases/tag/v0.2.1).
2. Acrescente o material que deseja trabalhar, por texto ou anexo, e informe objetivo, entrega esperada, critérios e limites.
3. Envie o prompt abaixo, adaptando os campos entre colchetes.

> Siga o OrquestradorMaster que colei ou anexei para [objetivo]. O material é [texto ou anexos]. Quero receber [entrega], considerando [critérios]. Respeite [limites]. Identifique as capacidades disponíveis, realize o trabalho autorizado e informe o que verificou, as evidências e as lacunas.

O núcleo é autossuficiente. Para aprofundar, as [referências](skills/orquestrador-master/references/inventario.md) da mesma pasta podem ser anexadas junto com ele. Sem ferramentas, o modelo pode analisar texto e anexos ou devolver conteúdo e orientações; não deve afirmar que alterou arquivos, navegou ou executou verificações.

### Exemplo sintético: revisar um aviso

Depois de colar ou anexar a skill, envie:

> Revise este aviso fictício: “A oficina será no dia 12, às 15h. Traga seus materiais. Inscrições até sexta.” Quero um aviso claro para pessoas que participarão pela primeira vez. Aponte informações ausentes e proponha uma versão revisada. Não invente mês, local, materiais necessários ou canal de inscrição; marque essas lacunas entre colchetes. Trabalhe apenas com o texto fornecido e não realize ações externas.

Uma entrega útil deve identificar as ambiguidades, apresentar o aviso revisado com campos a preencher e explicar como conferiu os critérios. Esse exemplo não requer ferramentas ou dados de um projeto real.

## Compartilhar feedback da beta

Use [feedback ou relato de problema](https://github.com/RafaelBritoChoco/OrquestradorMaster/issues/new/choose). Informe a versão ou commit da skill, o aplicativo/modelo, o tipo de material, um prompt reduzido e o esperado versus observado. Se não souber o modelo ou commit, diga isso.

Os relatos são públicos: substitua o caso real por um exemplo sintético neutro e remova dados pessoais, segredos, nomes, links, caminhos, código e logs de projetos atendidos. Sugestões sobre clareza e utilidade também são bem-vindas. Veja [como contribuir](CONTRIBUTING.md).

## Cópia local opcional

Se precisar de uma cópia organizada em disco, os utilitários exigem Python 3.10+. Baixe e extraia o pacote; Git é opcional. Execute os comandos a partir da pasta extraída. O destino deve existir; o layout padrão é `DESTINO/orquestrador-master`.

```text
python3 scripts/install_skill.py --destination /caminho/destino --dry-run
python3 scripts/install_skill.py --destination /caminho/destino
```

No Windows, substitua `python3` por `py -3.11 -X utf8`. Conteúdo idêntico não é reescrito; destino diferente, sobreposição com a origem, links simbólicos e pontos de redirecionamento são recusados. O instalador não altera configurações globais. Para quem usa Codex, há um [adaptador opcional](docs/codex.md) com layout explícito `--layout codex`.

## Método, fontes e limites do repositório

As quatro inspirações são mapa compreensível (Draw.io), menor mudança completa (Ponytail), auditoria e plano com evidências (improve) e inspeção crítica de instruções (SkillSpector). Esses projetos não são dependências e não são instalados ou executados por este pacote. Consulte [conceitos e atribuições](docs/conceitos.md), [fontes datadas](sources/README.md) e [avisos de terceiros](THIRD_PARTY_NOTICES.md).

Este repositório distribui os dois pacotes de skills, suas referências, fontes, utilitários e fixtures sintéticas próprias. Entregas de aplicação ficam no projeto atendido ou na resposta/anexo. Não inclua aqui nomes, links, diagnósticos, código, caminhos ou logs de qualquer projeto de aplicação.

## Verificação e manutenção opcionais

Para quem mantém a distribuição, com Python disponível:

```text
python3 -m unittest discover -s tests -v
python3 scripts/validate.py
# Para mudanças no Maestro (Node.js 22+; inclui Jev em dry-run sem rede):
node --test tests/maestro-state.test.mjs
```

Os testes usam fixtures sintéticas. A validação estrutural do pacote não comprova eficácia em todos os domínios ou modelos. `python3 scripts/check_sources.py` é uma consulta opcional de rede que requer Git e compara os pins registrados sem alterá-los. Veja [atualização](docs/atualizacao.md), [workflow](docs/workflow.md), [histórico](CHANGELOG.md) e [licença MIT](LICENSE).
